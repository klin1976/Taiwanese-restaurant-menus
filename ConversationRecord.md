# 專案對話紀錄：Taiwanese restaurant menus

---

### [2026-05-25 09:33] AI 回應
**專案自訂技能 Native 化部署、路徑修復與 GitHub 分支歸檔推送：**

1. **Bug 診斷與修復**：修復了 `docs/Agents_skill_EN/SKILL.md` 中所有損壞的相對路徑，轉換為具備可點選跳轉功能的 Markdown 連結。
2. **全域 Native 技能載入 (Native Skills)**：在全域插件配置目錄中建立 `clo-plugin`，並成功部署了包含 11 個自訂點餐技能與 `agents-md` 技能在內的 12 個核心 Skills。
3. **雙向相容根目錄對齊**：在專案根目錄 `company-lunch-order/` 對齊建立 `skills/` 目錄，使 `AGENTS.md` 與 `api_spec.md` 中引用的 `"skills/..."` 路徑在以專案根目錄為起點運行時，能夠 100% 成功軟性引用與讀取。
4. **Git 新分支提交與推送**：在 `.gitignore` 排除了重複檔案，成功在 GitHub 建立新分支 `feature/skills-alignment-fix` 並將全部變更推送，提供一鍵 PR 連結並詳細解說 Git/PR 的底層工作原理。

---

### [2026-04-21 14:55] AI 回應
**角色權限與模組分工優化分析：**

1.  **角色權限盤點**：釐清 `USER`、`ADMIN`、`SUPER_ADMIN` 三層架構。
2.  **產出分析報告**：建立 `role_analysis_report.md` 詳列各角色模組與職責。
3.  **缺口分析**：識別版本冗餘與路徑管理等優化方向。
4.  **Agent 協作開發**：規劃各領域 AI Agent 的分工職責。

---

### [2026-04-21 14:50] 用戶提問
**關閉專案**

---

### [2026-04-20 15:50] AI 回應
**AI 菜單辨識系統的多圖合併邏輯優化：**

1.  **多圖辨識整合**：
    *   在 `menuAIService.js` 中實作 `mergeRecognitionResults` 函數，支援將多張圖片的辨識結果進行智慧合併。
2.  **品項去重邏輯**：
    *   合併過程中會自動檢查分類與品項名稱，避免重複匯入相同的餐點，確保資料一致性。
3.  **前端元件更新**：
    *   優化 `AIMenuScanner.js` 以配合多圖處理流程，提升使用者介面互動感與操作效率。
4.  **雲端函數調整**：
    *   同步更新 Firebase Functions 中的 `menuAI.js` 以支援合併後的資料結構與大型 JSON 回傳。

---

### [2026-04-20 15:47] 用戶提問
**關閉專案**

---

### [2026-04-02 21:05] AI 回應
**AI 菜單辨識優化與審計：**

1.  **技術實現**：
    *   完成多圖處理功能，支援同時上傳與辨識多張菜單圖片。
    *   實作持久化速率限制機制，防止過度調用 AI API。
2.  **提示詞優化**：
    *   增強針對特定餐點的 Prompt 工程，提升辨識精準度與分類正確率。
3.  **介面更新**：
    *   新增可編輯的預覽功能，讓使用者在儲存前手動修正 AI 辨識內容，大幅提升資料正確性。
4.  **專案審計**：
    *   完成全面的技術審計與優化實作，確保系統穩定性並產出審計報告。

---

### [2026-03-27 10:52] AI 回應
**完成「重複訂單優化」與「整合式通知系統」開發與部署：**

1.  **重複訂單合併 (Merge Order)**：
    *   將強制阻擋邏輯改為「提示後合併」，透過 Firestore Transaction 確保庫存與總價更新的原子性。
    *   優化偵測邏輯，避開索引限制。
2.  **通知系統精進**：
    *   實作整合式通知，清楚顯示「原有清單」、「追加內容」與金額統計。
3.  **前端 UI 優化**：
    *   在 `MobileOptimizedMenu` 加入互動式合併詢問視窗。
4.  **部署與同步**：
    *   完成 Firebase Functions 與 Hosting 部署，更新 `task.md` 與 `walkthrough.md`。

---

### [2026-03-23 11:15] AI 回應
**修復 AI 菜單辨識穩定性與 Firestore 儲存極限問題 (V5~V9 終極修補)：**

1.  **SDK 升級與亂碼修復 (V6)**：
    *   針對長篇幅輸出時產生的 UTF8 截斷亂碼問題，將核心 SDK 從舊版 `@google-cloud/vertexai` 全面更換為 Google 最新官方推薦的 `@google/genai` 套件。
    *   顯著提升了長菜單辨識的穩定性與編碼正確率。
2.  **導入 JSON 修復引擎 (V8)**：
    *   解決 AI 回傳觸發 Token 上限 (8192 tokens) 而導致 JSON 結構「斷尾」的問題。
    *   整合 `jsonrepair` 套件，在 Cloud Function 內部自動偵測並強制閉合未完成的括號與引號。
    *   讓使用者即使在面對超大型菜單時，也能成功取回 90% 以上已辨識出的商品，不再報格式錯誤。
3.  **Firestore 資料毒化清創 (V7 & V9)**：
    *   **問題診斷**：修復 AI 辨識後無法儲存的 `Missing or insufficient permissions` 報錯。確認主因為文件累積的「歷史紀錄 (History)」過於臃腫，導致寫入時突破了 Firestore 單一文件 20,000 個複合索引欄位的上限。
    *   **核心修復方案**：在 `storeManagementService.js` 中實作「清創手術」，前端在寫入資料庫前，會自動過濾並壓縮舊歷史紀錄中的巨大陣列垃圾，將其轉為輕量化的字串摘要。
4.  **功能盤點與分析報告**：
    *   撰寫 `ai_menu_ocr_analysis.md` 技術報告，詳盡紀錄開發歷程與解決極端坑洞的「黑科技」方案。
    *   完成繁體中文版檔案同步分析報告 `analysis_note.txt`。

---

### [2026-03-22 21:02] AI 回應
**配置 GitHub CLI 認證輔助 (gh-cli 整合)：**

1.  **認證設定**：
    *   使用 GitHub CLI (`gh`) 進行身分驗證，避免將明碼 Token 儲存在專案目錄的 `.git/config` 中，提升安全性。
    *   透過 `gh auth login --with-token` 成功將 Personal Access Token (PAT) 匯入系統。
2.  **Git 整合**：
    *   執行 `gh auth setup-git` 將 `gh` 設定為 Git 的認證輔助工具 (Credential Helper)。
3.  **連線驗證**：
    *   執行 `git fetch origin master` 驗證，確認無需再輸入帳號密碼即可成功與遠端 GitHub 倉庫進行通訊。

---

### [2026-03-22 20:42] AI 回應
**修復權限拒絕與管理員身分判定問題 (Firestore 安全規則與前端常數同步)：**

1.  **問題診斷**：
    *   管理員在儲存菜單時遇到 `Missing or insufficient permissions` 報錯。
    *   帳號登入後無法看到管理員介面，權限被判定為一般使用者。
2.  **核心修復方案**：
    *   **Firestore 規則優化**：修改 `firestore.rules` 中的 `isAdmin` 與 `isSuperAdmin` 邏輯，從嚴格的單一字串比對改為陣列比對（兼容 `SUPER_ADMIN`, `superadmin`, `super_admin` 等大小寫格式），避免因前端常數定義不同而導致的寫入阻斷。
    *   **資料庫修正**：將 Firebase Console 中 `userRoles` 集合內使用者的 `role` 欄位從大寫 `SUPER_ADMIN` 還原為前端通用的小寫 `superadmin`。
3.  **部署測試**：
    *   透過 `npx firebase-tools` 成功部署新版安全規則。
    *   確認前端 UI 已恢復超級管理員顯示，且菜單儲存功能恢復正常。

---

### [2026-03-19 21:40] AI 回應
**修復 P4 AI 菜單辨識穩定性 (解決 JSON 解析與思考模式干擾)：**

1.  **問題診斷**：確認 Gemini 2.5 Flash 在生成回應時，有時會混雜「思考模式 (thinking mode)」的文字與 JSON 結構，造成前端 `JSON.parse` 報錯及截斷現象。
2.  **核心修復方案 (menuAI.js)**：
    *   實作強效提取機制：透過 `indexOf('{')` 與 `lastIndexOf('}')` 精確計算 JSON 物理邊界，物理性隔離所有非 JSON 的推理文字或日誌資訊。
    *   強化 Response 文字累加邏輯：確保多段 (Multi-part) 回應能被完整拼接。
3.  **模型與部署優化**：
    *   驗證 `gemini-2.0-flash-001` 在當前環境的可用性（目前回傳 404），決定退回並深耕穩定的 `gemini-2.5-flash`。
    *   修正 `menuAI.js` 語法錯誤（大括號閉合問題），確保程式碼品質。
    *   成功重新部署 Cloud Functions 至 Firebase `asia-east1`。

---

### [2026-03-08 18:45] AI 回應
**實作 P4 AI 菜單圖片辨識功能：**

1.  **架構設計**：結合 Gemini 2.5 Flash Vision API 與 Firebase Cloud Functions，在確保 API Key 安全的同時提供高效能的影像圖片辨識（約 3~8 秒）。
2.  **前端元件 (AIMenuScanner.js)**：
    *   實作具備拖拉上傳與手機直接拍照的介面。
    *   內建前端 Canvas 影像壓縮，確保圖片大小低於 API 限制 (4MB)。
    *   整合 CSVImportPanel 的 Diff UI，提供辨識結果預覽、與現有菜單衝突比對（覆蓋 / 跳過）的視覺化能力。
3.  **後端服務 (menuAI.js)**：
    *   設計高穩定度繁體中文 Prompt，準確解析商品、價格、規格與分類。
    *   提供嚴密的 JSON 取代正規化驗證。
    *   內建基於 Memory Cache 的簡易防護與限制（Rate Limit: 5次/分），以防止惡意呼叫耗盡額度。

---

### [2026-03-08 19:30] AI 回應
**修正錯誤 - 解決 AI 菜單辨識 CORS 阻擋問題：**

經排查日誌與原始碼，發現最初上線版本遇到 `Access to fetch ... blocked by CORS policy` 錯誤由以下兩點引發：
1. **Region 設定生效時機**：`functions/index.js` 中 `require("./menuAI")` 在 `setGlobalOptions({ region: "asia-east1" })` **之前**執行，導致 Cloud Function `analyzeMenuImage` 默默被佈署到了預設的 `us-central1` 伺服器，使前端找不到正確端點而觸發 CORS 機制。
2. **2nd Gen 無法自動讀取 GCLOUD_PROJECT 環境變數**：在本地端測試後發現函數執行會因為找不到專案 ID 拋出 `Could not load the default credentials` 給 Vertex AI SDK，已將 `GCLOUD_PROJECT` 退回/相容 2nd Gen 的 `GCP_PROJECT` 變數提取方式。

上述缺失已完全修正並重新覆蓋上線至 `asia-east1` 伺服器。

---

### [2026-03-07 23:05] AI 回應

1.  **部署環境遷移 (解決 Build 卡住)**：
    *   偵測到在雲端同步磁碟 (I: 槽) 執行 `npm build` 因檔案鎖定 (File Lock) 導致效能極低 (>20min)。
    *   順利協助將專案複製至實體本機 (D: 槽) 執行，建置時間降至約 2 分鐘。
2.  **Firebase Hosting 正式上線**：
    *   網址：[https://company-lunch-order.web.app](https://company-lunch-order.web.app)
3.  **Firestore 安全規則修復**：
    *   修正 `firestore.rules` 中 `userRoles` 的讀取權限，確保管理員 (Admin) 具備全體成員角色的清單查詢權限。
    *   解決了「部署後看不到資料」的連線報錯。
4.  **技術文件完備**：完成根目錄 `README.md` 並同步推送至 GitHub。

---

### [2026-03-07 21:08] AI 回應
**完成 P2 項目開發與整體優化：**

1.  **訂餐截止時間 (Cut-off Time)**：
    *   實作店家級別的截止時間設定。
    *   重構 `isStoreOpen` 判斷邏輯，整合營業時間與截止時間檢查。
2.  **自動營業狀態判定優化**：重構 `isStoreOpen` 函數，相容新舊版營業時間格式。
3.  **店家收藏功能驗證**：確認前端收藏切換與篩選機制已完整與 Firebase 整合。

---

### [2026-03-07 20:55] AI 回應
**完成「店家管理功能缺口分析」與核心功能補完：**

1.  **功能缺口分析**：產出 `cross_reference_analysis.md`。
2.  **CSV 匯入優化 (P0)**：實作智慧 Diff 比對系統。
3.  **JSON 備份功能 (P1)**：加入菜單完整備份與還原功能。
4.  **即時站內通知 (P1)**：建立 `NotificationManager` 實作狀態即時推播。

---

> [!NOTE]
> 以上紀錄為今日（2026-04-21）的工作彙整。歷史紀錄請參閱 [ConversationRecord.txt](./ConversationRecord.txt)。
