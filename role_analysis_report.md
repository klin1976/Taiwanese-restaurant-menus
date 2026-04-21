# 企業餐飲訂購系統：角色分工與模組規劃報告

## 一、現況盤點

**技術棧：** React 18 + Firebase (Firestore / Auth / Functions) + Tailwind CSS  
**部署：** Firebase Hosting  
**目前版本：** v0.2.5

### 現有 Firestore 資料集合

| Collection | 說明 |
|---|---|
| `users` | 使用者基本資料 |
| `userRoles` | 角色權限對應 |
| `stores/{type}/list/{storeId}` | 店家與菜單資料 |
| `orders` | 訂單資料 |
| `statistics` | 統計資料 |
| `counters` | 訂單流水號 |
| `system` | 系統初始化旗標 |

---

## 二、角色定義（3 種使用者角色）

從 `firestore.rules` 和 `AuthContext.js` 的 `ROLES` 可確認目前有三個角色：

```
USER  →  ADMIN  →  SUPER_ADMIN
```

| 角色 | 對應職責 | 人員 |
|---|---|---|
| **USER（一般員工）** | 訂餐、查看自己的訂單 | 全公司員工 |
| **ADMIN（管理員）** | 管理店家與菜單、查看所有訂單與統計 | 行政/採購 |
| **SUPER_ADMIN（超管）** | 角色指派、系統維護、批次修復工具 | IT / 系統負責人 |

---

## 三、角色對應模組詳細分析

### 🟢 Role 1：USER — 一般員工

**可見功能（App.js 呈現邏輯）：**
- 午餐訂購
- 飲料訂購
- 訂單記錄

#### 包含模組

| 模組 | 檔案 | 說明 |
|---|---|---|
| **登入模組** | `Login.js` / `LoginPage.js` | Google OAuth 登入，行動/桌面自動切換 popup/redirect |
| **店家瀏覽** | `StoreCardList.js` / `EnhancedStoreList.js` | 依類型（lunch/drinks）篩選店家 |
| **菜單點餐** | `MobileOptimizedMenu.js` / `StoreMenu.js` | 選商品、規格、客製化選項，建立訂單 |
| **訂單歷史** | `OrderHistory.js` | 查看個人訂單狀態（Pending→Completed 流程） |
| **訂單狀態操作** | `OrderStatusManager.js` | 使用者只能 cancel pending/confirmed 訂單 |
| **站內通知** | `NotificationManager.js` | 即時通知（訂單狀態變更跳出提示） |

---

### 🟡 Role 2：ADMIN — 管理員

**在 USER 所有功能之上，額外可見：**
- 店家管理（含菜單編輯、CSV/JSON 匯入匯出）
- 訂單統計報表

#### 包含模組

| 模組 | 檔案 | 說明 |
|---|---|---|
| **店家管理** | `admin/StoreManagement/` | CRUD 店家、16:9 主圖裁切、地址設定、複製店家 |
| **菜單編輯器** | `MenuEditor.js` | 多分類/變體/客製選項管理，36 種標籤，飲料範本 |
| **CSV 智慧匯入** | `utils/csvImporter.js` | Diff 比對新舊菜單，識別新增/更新項 |
| **CSV 匯出** | `utils/csvExporter.js` | 匯出菜單 CSV |
| **訂單統計** | `admin/OrderStatistics.js` | 店家營業統計、報表，可匯出 CSV |
| **訂單狀態管理** | `OrderStatusManager.js` | Admin 可推進全部訂單狀態 |
| **AI 菜單辨識** | `services/menuAIService.js` | 圖片上傳 → Gemini AI 辨識菜單 |

---

### 🔴 Role 3：SUPER_ADMIN — 超級管理員

**在 ADMIN 所有功能之上，額外可見：**
- 角色管理（指派/降階）
- 批次修復工具（修復缺少角色文件的舊帳號）

#### 包含模組

| 模組 | 檔案 | 說明 |
|---|---|---|
| **角色管理** | `RoleManagement.js` | 列出所有使用者、指派 USER/ADMIN/SUPER_ADMIN |
| **批次修復工具** | `admin/FixUserRoles.js` | 掃描缺少 userRoles 文件的使用者並修復 |
| **系統初始化** | `InitSuperAdmin.js` | development 模式下初始化第一個超管 |

---

## 四、Agent Manager 視視角：多代理人分工規劃

對應圖片中的設計，我們將專案開發任務分配給不同 AI 代理：

### Agent C — 架構師（制定規格）
- 負責：Firestore Schema 規格設計、Firebase Rules 安全規則、API 合約。

### Agent A — 前端工程師（UI 互動模組）
- 負責：各角色的點餐畫面、管理後台 UI、響應式佈局適配。

### Agent B — 後端/Firebase 工程師（核心邏輯）
- 負責：Cloud Functions (Gemini AI 辨識、Teams 通知)、資料遷移腳本。

### Agent D1-D3 — 品保（多層驗證）
- 負責：API 獨立測試、UI 模擬測試（越權嘗試）、E2E 全鏈路整合。

---

## 五、目前缺口 (Gap Analysis)

1. **版本冗餘**：`admin/OrderStatistics.js` 與 `components/OrderStatistics.js` 並存。
2. **安全風險**：缺乏「截止時間後鎖定下單」的 Guard。
3. **路徑雜亂**：`MenuEditor.js` 放在根目錄而非 admin 子目錄。
