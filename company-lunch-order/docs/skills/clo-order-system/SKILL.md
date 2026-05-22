---
name: clo-order-system
description: >
  適用於公司午餐訂購系統（CLO）的「點餐系統、庫存交易與訂單合併邏輯」模組開發。
  當需要修改點餐邏輯、下單時的 Firestore Transaction 庫存扣減、每日訂單序號生成、重複點餐偵測（checkDuplicateOrder）、以及同訂單合併（mergeOrder）邏輯時，務必使用此技能。
  觸發關鍵字包含：下單邏輯、訂單合併、庫存扣減、runTransaction、checkDuplicateOrder、mergeOrder、dailyOrderCounter、orderService、MobileOptimizedMenu、customization、客製化。
---

# CLO 點餐系統、庫存交易與訂單合併開發技能

## 系統定位

- **專案名稱**：company-lunch-order (公司午餐訂購系統)
- **技術棧**：React + Firestore Direct Access (`orders`, `stores`, `counters` collections) + Firestore Transactions
- **核心目標**：確保在多人併發點餐下庫存扣減的**原子性 (Atomicity)**，並透過「重下合併」機制優化使用者體驗。

---

## 模組架構與檔案關聯

```
src/
├── services/
│   └── orderService.js          ← 點餐系統核心服務，含創建訂單、重複檢查、訂單合併、狀態變更
├── components/
│   ├── StoreMenu.js             ← 電腦版/平板點餐介面，包含側邊欄與商品列表
│   └── MobileOptimizedMenu.js   ← 行動端優化點餐介面（含客製化配方彈窗、購物車、重下合併 UI 提示）
```

---

## 核心技術實現與交易安全規則

### 1. 原子性庫存扣減與當日序號生成 (`createOrder`)
為防止超賣與單號衝突，點餐必須在 `runTransaction` 內執行。步驟包含：
1. 讀取店家菜單，確認每樣商品的即時庫存是否足夠。
2. 扣減商品庫存，並更新店家 `categories` 資料。
3. 讀取並遞增當日訂單計數器 (`counters/dailyOrderCounter`)，生成 `yyyyMMdd-XXXX` 格式的唯一單號（例如 `20260522-0005`）。
4. 寫入新訂單到 `orders` 集合。

```javascript
export const createOrder = async (orderData) => {
  return await runTransaction(db, async (transaction) => {
    // A. 讀取並驗證庫存
    const storeRef = doc(db, 'stores', orderData.storeType, 'list', orderData.restaurantId);
    const storeDoc = await transaction.get(storeRef);
    const storeData = storeDoc.data();
    const newCategories = [...storeData.categories];
    
    for (const orderItem of orderData.items) {
      // 尋找商品並扣減庫存
      // 若庫存不足，丟出 Error 中斷交易 (自動 Rollback)
    }

    // B. 更新店家庫存
    transaction.update(storeRef, { categories: newCategories });

    // C. 遞增當日計數器
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const counterRef = doc(db, 'counters', 'dailyOrderCounter');
    const counterDoc = await transaction.get(counterRef);
    let currentSeq = 1;
    if (counterDoc.exists() && counterDoc.data().date === todayStr) {
      currentSeq = counterDoc.data().count + 1;
    }
    transaction.set(counterRef, { date: todayStr, count: currentSeq });

    // D. 寫入訂單
    const orderNumber = `${todayStr}-${String(currentSeq).padStart(4, '0')}`;
    const newOrderRef = doc(collection(db, 'orders'));
    transaction.set(newOrderRef, { ...orderData, orderNumber, status: '待確認' });
    
    return { id: newOrderRef.id, orderNumber };
  });
};
```

### 2. 重複點餐偵測機制 (`checkDuplicateOrder`)
當使用者在同一天於同一店家重複點餐時，系統會先偵測是否有狀態為 `PENDING` (待確認) 的現存訂單。

```javascript
export const checkDuplicateOrder = async (userId, restaurantId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const q = query(
    collection(db, 'orders'),
    where('userId', '==', userId),
    where('restaurantId', '==', restaurantId),
    where('status', '==', '待確認')
  );
  const snapshot = await getDocs(q);
  // 過濾出時間在今天之內的文件
};
```

### 3. 訂單智能合併邏輯 (`mergeOrder`)
當使用者同意合併訂單時，系統會在 Transaction 中讀取原訂單，並將新訂單的項目「智能合併」入原訂單：
- **客製化比對基準**：若兩個商品 `id` 相同，**且**其客製化選項 (`customization`，包括甜度、冰量、配料) 完全一致，則將數量相加。
- **新增品項**：若客製化選項不一致，則視為新商品，直接追加至項目清單。
- 自動重算 `totalAmount` 並更新 `updatedAt`。

---

## 客製化資料結構 (Customization Specification)

對於飲料與特定點心，點餐系統必須完整支援客製化配方。資料結構規範如下：

```json
{
  "id": "item_black_tea",
  "name": "經典紅茶",
  "price": 35,
  "quantity": 2,
  "customization": {
    "sweetness": "微糖",
    "ice": "去冰",
    "toppings": ["珍珠", "椰果"]
  }
}
```

> [!WARNING]
> **合併比對地雷**：
> 在 `mergeOrder` 中比對客製化時，不可使用簡單的 `==` 比較物件。因為 JavaScript 的物件參照不同，必須將客製化物件進行標準化（例如欄位排序後轉為 JSON 字串 `JSON.stringify(item.customization)`）再進行比對，否則會導致相同配方的飲料被錯誤拆分成多行！

---

## 測試與驗證計畫

1. **併發庫存測試 (Concurrency)**：設定商品庫存為 1，兩名使用者同時點購該商品，驗證是否僅有一名使用者下單成功，另一名被交易 Rollback 攔截並提示「庫存不足」。
2. **客製化合併測試**：
   - 點購「紅茶、微糖去冰、加珍珠」+「紅茶、微糖去冰、加珍珠」，確認合併後為一列，數量為 2。
   - 點購「紅茶、微糖去冰、加珍珠」+「紅茶、半糖正常冰、加珍珠」，確認合併後為兩列，客製化各自獨立。
3. **單號遞增驗證**：連續下單，驗證訂單編號（如 `20260522-0001`、`20260522-0002`）是否連續遞增且無碰撞。
