---
name: clo-db-migration
description: >
  適用於公司午餐訂購系統（CLO）的「Firestore 安全規則與資料初始/轉移」模組開發。
  當需要修改 firestore.rules 安全防護、設計 diff().affectedKeys() 限制、實作資料庫種子資料初始化（initializeStores）、以及執行資料結構升級遷移（dataMigration）時，務必使用此技能。
  觸發關鍵字包含：安全規則、資料遷移、種子資料、firestore.rules、dataMigration、initializeStores、diff().affectedKeys()、affectedKeys、hasOnly、安全漏洞。
---

# CLO Firestore 安全規則與資料初始化/轉移開發技能

## 系統定位

- **專案名稱**：company-lunch-order (公司午餐訂購系統)
- **技術棧**：Cloud Firestore Security Rules + React / Node.js 資料遷移腳本
- **核心目標**：在前端直接存取資料庫 (Single-Layer) 的架構下，透過極其嚴格的 `firestore.rules` 確保資料安全性，防範越權存取與惡意修改；並提供種子資料初始與無損結構升級方案。

---

## 模組架構與檔案關聯

```
company-lunch-order/
├── firestore.rules          ← Firestore 全域安全規則，定義所有集合的讀寫權限與欄位約束
└── src/
    └── utils/
        ├── initializeStores.js  ← 資料庫初始化腳本，當資料庫為空時寫入預設店家與菜單種子資料
        └── dataMigration.js     ← 資料庫無損升級遷移腳本，包含清創歷史記錄、補齊遺漏單號與預設庫存
```

---

## Firestore 核心安全規則剖析 (`firestore.rules`)

為了在前端直連資料庫時確保安全，`firestore.rules` 實作了精妙的權限防禦：

### 1. 權限卡控輔助函數 (Helper Functions)
```
function isAuthenticated() { return request.auth != null; }
function isUser(userId) { return isAuthenticated() && request.auth.uid == userId; }
function getUserRole() { return get(/databases/$(database)/documents/userRoles/$(request.auth.uid)).data.role; }
function isAdmin() { return isAuthenticated() && (getUserRole() in ['ADMIN', 'SUPER_ADMIN', 'admin', 'superadmin', 'super_admin']); }
function isSuperAdmin() { return isAuthenticated() && (getUserRole() in ['SUPER_ADMIN', 'superadmin', 'super_admin']); }
```

### 2. 訂單防篡改：`diff().affectedKeys()` 深度防禦 (重要)
> [!CAUTION]
> **一般使用者越權修改訂單漏洞**：
> 一般使用者必須能夠寫入自己的訂單，且在下單後，若餐點尚未製作，使用者應被允許「取消訂單」。然而，若直接給予 update 權限，惡意用戶可能會透過代碼修改訂單的價格、商品數量或他人 uid。
> 
> **解決方案 (受限差分驗證)**：
> 安全規則中，一般使用者對其訂單的 `update` 權限被嚴格限制——**僅允許修改 `status` 與 `updatedAt` 兩個欄位，且 `status` 必須變更為 `cancelled` (已取消)**。其餘任何欄位異動皆會被資料庫直接拒絕：

```
match /orders/{orderId} {
  allow read: if isAdmin() || (isAuthenticated() && resource.data.userId == request.auth.uid);
  allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
  
  // 核心安全卡控：
  allow update: if isAdmin() || (
    isUser(resource.data.userId) && 
    request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'updatedAt']) && 
    request.resource.data.status == 'cancelled'
  );
}
```

---

## 資料初始化與遷移升級服務

### 1. 種子資料初始化 (`initializeStores.js`)
當新系統部署時，前端 `App.js` 會在使用者登入後自動執行 `initializeStores`。它會檢查 `stores/lunch/list` 是否有任何文件，若無，則批次寫入種子店家（如富家小鋪、MACU 飲料等），並生成預設營業時間與完整的初始菜單。

### 2. 無損資料遷移 (`dataMigration.js`)
當系統從舊版本升級（例如 `v0.1.0` 升級至 `v0.2.0`），舊有 Document 的結構可能與新程式碼不相容（例如舊訂單缺少單號、舊商品缺少 `stock` 與 `tags`）。

`dataMigration.js` 提供了自動修補腳本：
- **補齊遺漏單號**：遍歷所有舊訂單，依據 `createdAt` 的日期和累加序號，補齊符合新規格的 `orderNumber`。
- **清除歷史巨大 categories**：自動跑批清理 `/stores` 下所有店家的 `history` 陣列，執行「歷史清創」，將舊有的大 categories 陣列轉為輕量級字串，釋放文件空間，徹底防禦 1MB 崩潰。

---

## 測試與驗證計畫

1. **安全越權測試 (Security Rules)**：
   - 使用一般使用者帳號登入。
   - 嘗試透過 Firestore SDK 更新他人訂單，或更新自己訂單的 `totalAmount` (金額) 欄位。
   - 驗證 Firestore 是否回傳 `FirebaseError: Missing or insufficient permissions` 權限拒絕錯誤。
2. **訂單取消權限測試**：
   - 一般使用者嘗試將自己的訂單 `status` 欄位修改為 `cancelled`。
   - 驗證是否修改成功（應允許）。
3. **初始化與遷移測試**：在空資料庫上啟動 App，確認種子資料是否被完整寫入，且 `dataMigration` 執行後，舊訂單皆已補上正確的補丁。
