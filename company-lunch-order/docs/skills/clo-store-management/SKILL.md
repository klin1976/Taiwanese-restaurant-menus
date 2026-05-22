---
name: clo-store-management
description: >
  適用於公司午餐訂購系統（CLO）的「店家與嵌入式菜單管理（CRUD）」模組開發。
  當需要修改店家基本資料、嵌入式菜單結構（類別與商品）、店家營業時間設定、拼音自動識別生成 ID、以及歷史記錄清創以防止 Firestore 檔案肥大時，務必使用此技能。
  觸發關鍵字包含：店家管理、菜單管理、storeManagementService、EnhancedStoreList、pinyinService、taiwanDistricts、imageUpload、duplicateStore、歷史記錄清創、1MB上限。
---

# CLO 店家與嵌入式菜單管理開發技能

## 系統定位

- **專案名稱**：company-lunch-order (公司午餐訂購系統)
- **技術棧**：React + Firestore Direct Access (`stores` collection) + `pinyin` 拼音轉換庫
- **核心架構**：採用 Firestore **嵌入式子文件 (Nested Arrays)** 架構。每家店的所有菜單分類 (`categories`) 與商品項目 (`items`) 均直接嵌入在店家的單一 Firestore 文件中，以極大化查詢效能。

---

## 模組架構與檔案關聯

```
src/
├── services/
│   ├── storeManagementService.js  ← 店家 CRUD 核心服務，含啟用/停用、複製、訂閱與即時監聽
│   ├── pinyinService.js            ← 拼音服務，將中文店名轉為英文拼音以生成語意 Document ID
│   └── imageUploadService.js       ← 圖片上傳服務（支援 Firebase Storage）
├── components/
│   ├── admin/
│   │   └── StoreManagement/       ← 店家與菜單管理介面元件集
│   ├── StoreCardList.js           ← 桌面版/首頁店家卡片清單（支援收藏功能）
│   └── EnhancedStoreList.js       ← 帶有進階變體、多選選項與庫存的商品展售元件
└── utils/
    ├── pinyinService.js / pinyin   ← 拼音解析器
    ├── taiwanCities.js             ← 台灣縣市選單資料
    └── taiwanDistricts.js          ← 台灣鄉鎮市區選單配置
```

---

## 資料結構與儲存策略

店家文件儲存於 `/stores/{storeType}/list/{storeId}`：
- `storeType`：`lunch` (午餐) 或 `drinks` (飲料)
- `storeId`：中文名稱自動轉換的拼音 (例如 `fu-jia-xiao-pu`)

### 嵌入式菜單結構 (Nested Category List)
```json
{
  "id": "fu-jia-xiao-pu",
  "name": "富家小鋪",
  "type": "lunch",
  "categories": [
    {
      "id": "cat_lunch_01",
      "name": "美味蓋飯",
      "items": [
        {
          "id": "item_beef_rice",
          "name": "香爆牛肉蓋飯",
          "price": 90,
          "stock": 25,
          "imageUrl": "https://...",
          "tags": ["辣", "熱銷"]
        }
      ]
    }
  ]
}
```

---

## 關鍵技術與安全避坑指南 (重要)

### 1. 歷史記錄清創機制 (防禦 Firestore 1MB 上限)
> [!CAUTION]
> **Firestore 單一文件上限為 1MB**。
> 舊版系統在更新店家資訊或菜單時，會將整份巨型菜單對象 (`categories`) 直接塞入 `history` 陣列中做備份。隨著更新次數增加，`history` 陣列迅速膨脹，導致文件大小超過 1MB 而頻繁拋出 `Permission Denied` 錯誤。
> 
> **新開發規範 (清創手術)**：
> 在 `storeManagementService.js` 中更新店家時，**必須**將巨型欄位轉換為輕量描述字串，並清除舊有歷史中的大陣列：

```javascript
export const updateStore = async (storeId, type, updates, currentUser) => {
  const storeRef = doc(db, 'stores', type, 'list', storeId);

  // 1. 將即將寫入歷史的 categories 轉換為輕量字串描述，不備份實體對象
  const safeDetails = { ...updates };
  if (safeDetails.categories) {
    safeDetails.categories = `[Updated ${safeDetails.categories.length} categories]`;
  }

  const historyEntry = {
    at: Timestamp.now(),
    by: currentUser.uid,
    action: 'update_store',
    details: safeDetails
  };

  const storeSnap = await getDoc(storeRef);
  let existingHistory = storeSnap.exists() ? (storeSnap.data().history || []) : [];

  // 2. 清除舊有歷史中可能殘留的肥大陣列，將其「字串化」
  existingHistory = existingHistory.map(entry => {
    if (entry.details && Array.isArray(entry.details.categories)) {
      return {
        ...entry,
        details: { ...entry.details, categories: `[Cleaned legacy info]` }
      };
    }
    return entry;
  });

  // 3. 限制歷史紀錄長度上限為 20 筆
  if (existingHistory.length > 20) {
    existingHistory = existingHistory.slice(-20);
  }

  await updateDoc(storeRef, {
    ...updates,
    updatedAt: Timestamp.now(),
    history: [...existingHistory, historyEntry]
  });
};
```

### 2. 語意 ID：自動店名拼音生成
為便於管理與維護 URL，系統不使用隨機亂碼作為 Document ID。新店家建立時，呼叫 `pinyinService.js` 將店名轉為英文拼音：

```javascript
import pinyin from 'pinyin';

export const generateUniqueStoreId = async (storeName, storeType) => {
  // 將中文店名轉換為小寫、橫線連接的拼音
  let pinyinStr = pinyin(storeName, {
    style: pinyin.STYLE_NORMAL,
    heteronym: false
  }).map(word => word[0].toLowerCase()).join('-');

  pinyinStr = pinyinStr.replace(/[^a-z0-9-]/g, ''); // 移除特殊字元
  
  // 檢查是否重複，若重複則自動加上隨機後綴
  const storeRef = doc(db, 'stores', storeType, 'list', pinyinStr);
  const snap = await getDoc(storeRef);
  if (snap.exists()) {
    return `${pinyinStr}-${Math.random().toString(36).substr(2, 5)}`;
  }
  return pinyinStr;
};
```

### 3. 一鍵複製店家功能
系統支援一鍵複製店家（含整套菜單與結構），在複製時，為了避免複製出來的商品與分類 ID 與來源完全相同而導致 UI 操作衝突，**必須重新為所有分類與商品生成隨機唯一的 ID**。

---

## 測試與驗證

1. **基本 CRUD 測試**：建立新店家，並確認 Document ID 是否為正確轉換的拼音格式。
2. **容量與清創驗證**：連續編輯店家菜單 25 次，確認 `history` 陣列長度不超過 20 筆，且資料庫中無肥大對象，以防 1MB 崩潰。
3. **行政區劃同步**：在編輯店家時，選擇不同的「縣市」應即時過濾並連動更新「鄉鎮市區」ComboBox 的可選清單。
