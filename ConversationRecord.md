# 專案對話紀錄：Taiwanese restaurant menus

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
> 以上紀錄為今日（2026-03-22）的工作彙整。歷史紀錄請參閱 [ConversationRecord.txt](./ConversationRecord.txt)。
