# 專案對話紀錄：Taiwanese restaurant menus

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
> 以上紀錄為今日（2026-03-07）的工作彙整。歷史紀錄請參閱 [ConversationRecord.txt](./ConversationRecord.txt)。
