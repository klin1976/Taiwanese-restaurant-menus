---
name: clo-auth-role
description: >
  適用於公司午餐訂購系統（CLO）的「認證與角色權限管理（RBAC）」模組開發。
  當需要修改或實作 Google 登入、權限 Context、使用者角色管理、超級管理員初始化、以及 firestore.rules 權限控制時，務必使用此技能。
  觸發關鍵字包含：Google 登入、RBAC、AuthContext、roleService、RoleManagement、InitSuperAdmin、FixUserRoles、userRoles、superadmin、admin、user、權限卡控。
---

# CLO 認證與角色權限管理（RBAC）開發技能

## 系統定位

- **專案名稱**：company-lunch-order (公司午餐訂購系統)
- **技術棧**：React (Context API) + Firebase Auth (Google Provider) + Firestore (`userRoles` & `users` collections)
- **核心功能**：實現基於角色的存取控制 (RBAC)，管理四個層級（一般使用者、管理員、超級管理員、開發模式 SuperAdmin）的系統權限。

---

## 模組架構與檔案關聯

```
src/
├── contexts/
│   └── AuthContext.js          ← 認證狀態管理中心，提供登入、登出及 hasPermission 檢查
├── services/
│   └── roleService.js          ← 角色權限常數定義與 Firestore 角色資料讀寫服務
└── components/
    ├── Login.js / LoginPage.js ← 登入介面，提供 Google 帳號授權登入
    ├── RoleManagement.js       ← 超級管理員專用：用戶清單、角色指派與權限查看
    ├── InitSuperAdmin.js       ← 開發模式（development）專用：初始化第一個超級管理員
    └── admin/
        └── FixUserRoles.js     ← 批次修復工具：針對無角色記錄之使用者自動補設為 'user'
```

---

## 角色與權限矩陣定義 (`roleService.js`)

系統內定義了三個核心角色與其對應的權限矩陣：

### 1. 角色常數
```javascript
export const ROLES = {
  USER: 'user',           // 一般使用者
  ADMIN: 'admin',         // 管理員
  SUPER_ADMIN: 'superadmin'  // 超級管理員
};

export const ROLE_NAMES = {
  [ROLES.USER]: '一般使用者',
  [ROLES.ADMIN]: '管理員',
  [ROLES.SUPER_ADMIN]: '超級管理員'
};
```

### 2. 權限矩陣 (`PERMISSIONS`)
- **`user`** (一般使用者)：僅能訂餐、查看/取消自身訂單、瀏覽店家與菜單。
- **`admin`** (管理員)：除一般權限外，可查看所有訂單、更新訂單狀態、查看營業統計與報表、管理店家與菜單。
- **`superadmin`** (超級管理員)：擁有系統最高權限，可管理使用者、指派角色、管理店家菜單、存取系統設定。

---

## 關鍵技術實現與規則

### 1. Google 帳號登入與 Persistence 策略
在 `AuthContext.js` 中，登入流程採用 `signInWithPopup`，並針對行動裝置/手機瀏覽器自動降級（Fallback）使用 `signInWithRedirect`，確保跨裝置相容性：

```javascript
const loginWithGoogle = async () => {
  setLoginStatusMessage('正在導向至 Google 登入...');
  try {
    // 優先使用 Popup，行動裝置或特定瀏覽器失敗時自動降級使用 Redirect
    if (isMobileDevice()) {
      await signInWithRedirect(auth, googleProvider);
    } else {
      await signInWithPopup(auth, googleProvider);
    }
  } catch (error) {
    if (error.code === 'auth/popup-blocked') {
      // 彈窗被阻擋，降級使用 Redirect
      await signInWithRedirect(auth, googleProvider);
    } else {
      throw error;
    }
  }
};
```

### 2. Firestore 角色存取安全規則 (`firestore.rules`)
Firestore 中的 `userRoles` 集合用來儲存使用者的角色。安全規則確保只有超級管理員（`SUPER_ADMIN`）可以寫入角色記錄：

```
match /userRoles/{userId} {
  allow read: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
  allow write: if isSuperAdmin();
}
```

### 3. 用戶角色缺失之批次修復邏輯 (`FixUserRoles.js`)
當新用戶首次透過 Google 登入時，系統若未在 `userRoles` 寫入角色資料，將導致該用戶無權限操作。`FixUserRoles` 提供管理員批次修復工具，自動將沒有角色記錄的用戶補設為 `user`：

```javascript
const handleFixAll = async () => {
  let successCount = 0;
  for (const user of unassignedUsers) {
    try {
      await setUserRole(user.uid, 'user', currentUser.uid);
      successCount++;
    } catch (err) {
      console.error(`修復使用者 ${user.uid} 失敗:`, err);
    }
  }
  alert(`修復完成！共成功修復 ${successCount} 筆資料。`);
};
```

---

## 開發注意事項與常見 Gotchas

> [!WARNING]
> **1. 角色名稱大小寫不一致地雷**
> 舊版本在 `firestore.rules` 曾混用大寫（`ADMIN`, `SUPER_ADMIN`）與小寫（`admin`, `superadmin`）。
> **新開發規範**：在 Firestore `userRoles` 寫入時**統一使用小寫** (`user`, `admin`, `superadmin`)。安全規則中已做相容處理，但程式碼中請嚴格遵守小寫。

> [!IMPORTANT]
> **2. 權限快取與即時更新**
> `AuthContext.js` 在初始化時會載入 `userRole` 與 `userPermissions` 並存放在 React State 中。當超級管理員在 `RoleManagement` 中修改了某使用者的角色後，該使用者需要重新整理網頁，或呼叫 `reloadPermissions()` 才能使新權限生效。

> [!TIP]
> **3. 開發模式下的第一個 SuperAdmin**
> 首次部署系統時，資料庫為空，無人是 `superadmin`。在 `App.js` 中，當偵測到為 `development` 環境時，會加載 `InitSuperAdmin` 元件，允許當前登入的開發者一鍵將自己提升為第一個 `superadmin`，以利後續的店家與角色管理。
