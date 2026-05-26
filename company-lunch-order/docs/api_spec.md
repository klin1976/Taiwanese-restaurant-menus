# CLO 系統 API 與資料交互規格文件 (Company Lunch Order)

> [!IMPORTANT]
> **架構聲明**：本專案採用 **Firebase Single-Layer 架構 (React 前端直連 Firestore)**，無傳統獨立 API 後端伺服器。
> 所有的資料庫 CRUD 讀寫操作、Transaction 事務邏輯與 Firestore 全域安全規則，即構成此系統之實質 API 規格。
> 專案內唯一的 Cloud Functions 為 Gemini AI 菜單圖像識別服務（`/api/menu-ai`）。

---

## 📚 開發引用規範 (Skill Reference)

> [!IMPORTANT]
> 本文件定義 CLO 系統之**核心資料結構與交互規格**。實際開發與修改時，必須強制搭配以下 7 大核心 Skill 作為技術落地指標：

| Skill 文件 | 適用情境 / 功能模組 | 引用方式 | 核心看點 |
|-----------|-------------------|---------|---------|
| [`clo-auth-role/SKILL.md`](../skills/clo-auth-role/SKILL.md) | 權限認證、登入降級與 RBAC | **強制引用** | 開發者調試模式 Google Auth 降級登入與角色分配 |
| [`clo-store-management/SKILL.md`](../skills/clo-store-management/SKILL.md) | 店家菜單嵌入、拼音生成與備份清創 | **強制引用** | 拼音 ID 自動生成與 Firestore 1MB 上限崩潰防禦 |
| [`clo-order-system/SKILL.md`](../skills/clo-order-system/SKILL.md) | 原子性交易下單、每日限量與訂單合併 | **強制引用** | 扣減限量份數之 `runTransaction` 與 `mergeOrder` 邏輯 |
| [`clo-menu-ai/SKILL.md`](../skills/clo-menu-ai/SKILL.md) | Gemini 多模態菜單識別、限流與修補 | **強制引用** | Vertex AI 限流防刷、`jsonrepair` 文字層級結構修補 |
| [`clo-statistics-reporting/SKILL.md`](../skills/clo-statistics-reporting/SKILL.md) | 營業報表統計、數據聚合與 CSV 匯出 | **強制引用** | 前端高度效能數據聚合與 Windows Excel 中文 BOM 亂碼修復 |
| [`clo-notification-system/SKILL.md`](../skills/clo-notification-system/SKILL.md) | 實時監聽、雙軌通知與 Teams Webhook | **強制引用** | `onSnapshot` 監聽、雙軌通知與 Teams Webhook 推送規格 |
| [`clo-db-migration/SKILL.md`](../skills/clo-db-migration/SKILL.md) | Firestore 安全規則防禦與資料遷移 | **強制引用** | 訂單防篡改安全規則與測試資料遷移腳本 |

---

## ⚠️ Firestore 規格化資料與 API 交互協定

### 1. 權限認證與角色管理 (clo-auth-role)
*   **用途**：管理使用者註冊、登入與角色權限分配。
*   **Google Auth 降級策略**：當 Google 登入在開發環境受阻時，系統支援「開發者調試模式」，前端可模擬指定 UID 登入並獲取測試角色。

#### 實質 API：`users` Collection
*   **Path**: `/users/{uid}`
*   **Schema**:
    ```typescript
    interface UserDocument {
      uid: string;          // 使用者唯一 UID
      email: string;        // 使用者 Google 信箱
      displayName: string;  // 顯示名稱
      photoURL?: string;    // 頭像圖片 URL
      role: 'admin' | 'member'; // 系統角色 (RBAC)
      createdAt: Timestamp; // 建立時間
      updatedAt: Timestamp; // 更新時間
    }
    ```

#### 實質 API：`roles` Collection
*   **Path**: `/roles/{uid}`
*   **Schema**:
    ```typescript
    interface RoleDocument {
      uid: string;
      role: 'admin' | 'member'; // 與 user.role 鏡像同步，用於安全規則快速讀取
      updatedAt: Timestamp;
    }
    ```

---

### 2. 店家與菜單管理 (clo-store-management)
*   **用途**：維護店家基本資料與嵌入式菜單品項，支援拼音 ID 生成與防爆備份。
*   **Firestore 1MB 上限防禦 (歷史清創手術)**：
    > ⚠️ 當管理員更新店家資料時，系統會將舊資料備份至 `history` 陣列。為防範因「嵌入式巨型菜單 `categories`」反覆儲存導致文件大小突破 Firestore 1MB 上限，`history` 中**僅保存異動說明與基本資料字串，不儲存 `categories` 欄位**，且 `history` 長度限制最大 **20** 筆。

#### 實質 API：`stores` Collection
*   **Path**: `/stores/{storePinyinId}`
*   **ID 生成規則**：將店家中文名稱自動轉換為拼音並連字串接。例如：`"麥當勞"` $\rightarrow$ `storePinyinId: "mai-dang-la"`。
*   **Schema**:
    ```typescript
    interface StoreDocument {
      id: string;               // 拼音產生的唯一 ID (即 storePinyinId)
      name: string;             // 店家中文名稱
      phone: string;            // 店家電話
      address: string;          // 店家地址
      categories: Array<{       // 嵌入式菜單分類
        name: string;           // 分類名稱 (如 "主食", "飲料")
        items: Array<{          // 菜單品項
          id: string;           // 品項唯一 ID
          name: string;         // 品項名稱 (如 "大麥克")
          price: number;        // 單價
          isLimited: boolean;   // 是否每日限量
          limitQty?: number;    // 每日限量份數 (可選)
          remainingQty?: number;// 當日剩餘份數 (下單扣減用，可選)
        }>;
      }>;
      history?: Array<{         // 歷史備份 (防爆版)
        updatedAt: Timestamp;
        updaterUid: string;
        actionDescription: string; // "修改電話", "更新菜單"
        // ⚠️ 不得在此儲存 categories 欄位！
      }>;
      createdAt: Timestamp;
      updatedAt: Timestamp;
    }
    ```

---

### 3. 點餐與限量扣減交易 (clo-order-system)
*   **用途**：處理使用者下單、商品剩餘限量更新與訂單自動合併。
*   **下單 Transaction 原子性保障**：
    下單時前端必須發起 `runTransaction`，同時讀取該店家商品之 `remainingQty`，確認足夠後予以扣減，並寫入點餐紀錄。若庫存不足，Transaction 必須回滾 (Rollback) 並拋出錯誤。
*   **智能合併 (mergeOrder)**：
    同一個點餐時段下，同一位使用者若對同一店家發起多次點餐，系統會自動在同一張 `order` 中進行品項合併（而不是產生多張獨立訂單），累加品項數量與訂單總金額。

#### 實質 API：`orders` Collection
*   **Path**: `/orders/{orderId}`
*   **Schema**:
    ```typescript
    interface OrderDocument {
      id: string;               // 系統自動生成 UUID
      storeId: string;          // 店家拼音 ID
      storeName: string;        // 店家名稱
      userUid: string;          // 下單使用者 UID
      userName: string;         // 使用者姓名
      items: Array<{            // 點餐品項細項
        itemId: string;         // 品項 ID
        itemName: string;       // 品項名稱
        price: number;          // 品項單價
        qty: number;            // 點餐數量
        customization?: string; // 客製化備註 (如: 去冰無糖)
      }>;
      totalPrice: number;       // 訂單總金額
      status: 'pending' | 'completed' | 'cancelled'; // 訂單狀態
      orderDate: string;        // 下單日期 (YYYY-MM-DD)
      createdAt: Timestamp;
      updatedAt: Timestamp;
    }
    ```

---

### 4. Cloud Functions：Gemini AI 菜單識別 API (clo-menu-ai)
*   **用途**：透過 Gemini 1.5 Pro 多模態模型，將上傳的店家菜單圖片自動識別為結構化的 JSON 菜單。
*   **Vertex AI 限流防刷**：設有防暴力重複呼叫之防刷邏輯，限制單一使用者每分鐘僅能發起一次 AI 識別。
*   **jsonrepair 修補**：Vertex AI 回傳字串常夾帶 Markdown 標記或不完整括號。Cloud Function 在解析前必須先呼叫 `jsonrepair` 套件進行語法層級修正，再執行 `JSON.parse`。

*   **Endpoint**: `/api/menu-ai`
*   **Method**: `POST`
*   **Headers**:
    - `Content-Type`: `application/json`
    - `Authorization`: `Bearer {firebaseUserToken}`
*   **Request Body**:
    ```json
    {
      "image": "data:image/jpeg;base64,...", // 菜單圖片的 Base64 字串
      "storeName": "測試便當店"
    }
    ```
*   **Response (成功 200)**:
    ```json
    {
      "success": true,
      "storeName": "測試便當店",
      "categories": [
        {
          "name": "主食",
          "items": [
            {
              "name": "排骨飯",
              "price": 100
            },
            {
              "name": "雞腿飯",
              "price": 120
            }
          ]
        }
      ]
    }
    ```
*   **Response (限流 429)**:
    ```json
    {
      "success": false,
      "message": "AI 辨識服務冷卻中，請稍候再試 (每分鐘限制一次)。"
    }
    ```

---

### 5. 營業報表與 CSV 導出規範 (clo-statistics-reporting)
*   **用途**：統計每日訂單營業額、各品項銷量與人員扣款總表，並提供管理員下載 Excel 報表。
*   **前端聚合邏輯**：前端透過拉取當日所有訂單後，使用高效 reducer 聚合為品項統計表與個人統計表，降低 Firestore 讀取開銷。
*   **Excel 中文 BOM 亂碼解法**：
    > ⚠️ 當使用 PapaParse 將統計數據轉換為 CSV 字串後，在匯出 File 時，**必須強制於 Blob 資料最前端附加 UTF-8 BOM 標記 `\uFEFF`**。否則 Windows 電腦的 Excel 開啟該 CSV 時會產生嚴重的中文亂碼。

*   **實作虛擬程式碼**：
    ```javascript
    const csvString = Papa.unparse(data);
    const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, "lunch_report.csv");
    ```

---

### 6. 實時通知與 Teams Webhook (clo-notification-system)
*   **用途**：當訂單狀態變更或發起新店家點餐時，即時發布系統通知並同步推播至公司 Teams 頻道。
*   **即時監聽**：前端使用 `onSnapshot` 訂閱特定日期 `/orders` 變動，即時跳出 Toast 提醒。
*   **Teams Webhook 推送規格**：
    - **Webhook URL**: 專案 `.env` 內設定之 `TEAMS_WEBHOOK_URL`
    - **Payload Format**:
        ```json
        {
          "@type": "MessageCard",
          "@context": "http://schema.org/extensions",
          "themeColor": "0078D7",
          "summary": "今日午餐揪團通知",
          "title": "🎉 今日午餐開放點餐！",
          "text": "今天吃 **麥當勞** 喔！欲點餐同仁請儘速在系統上下單！",
          "potentialAction": [
            {
              "@type": "OpenUri",
              "name": "前往系統點餐",
              "targets": [
                { "os": "default", "uri": "https://clo-system-url.web.app" }
              ]
            }
          ]
        }
        ```

---

### 7. Firestore 全域安全規則設計 (clo-db-migration)
*   **用途**：保護 Firestore 資料不受前端惡意修改，落實極致防禦。
*   **安全規則重點 (訂單防篡改)**：
    1.  **使用者文件防護**：只有 `uid` 與當前登入 `request.auth.uid` 相同的使用者，才能寫入 `users/{uid}`，且 `role` 欄位禁止由一般使用者自行修改。
    2.  **店家文件防護**：非管理員 (`admin`) 角色，一律禁止 `write` 店家檔案。
    3.  **訂單極致防護 (最核心)**：
        - 允許一般使用者建立自己的訂單 (`request.resource.data.userUid == request.auth.uid`)。
        - 允許一般使用者修改自己的訂單，但是**限定只能修改 `status` 與 `updatedAt` 欄位 (做訂單取消操作)**。任何企圖篡改他人 uid、訂單金額 `totalPrice` 或修改為其他狀態的行為，皆會被規則強行阻斷。
        - 阻斷規則使用 `diff()` 檢測：
            ```javascript
            // 僅能修改特定欄位
            request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'updatedAt'])
            ```

---

### 🗄️ Firestore 全域規則檔案實體 (firestore.rules)
有關目前專案實體之安全防護程式碼，請隨時參閱根目錄下的 [firestore.rules](file:///f:/Antigravity/Taiwanese%20restaurant%20menus/company-lunch-order/firestore.rules)。
