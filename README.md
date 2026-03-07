# 企業餐飲點餐管理系統 (Enterprise Catering Order System)

![Version](https://img.shields.io/badge/version-v0.2.5-blue)
![React](https://img.shields.io/badge/React-18.x-61dafb?logo=react)
![Firebase](https://img.shields.io/badge/Firebase-v10.x-ffca28?logo=firebase)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38bdf8?logo=tailwind-css)

這是一個專為企業內部設計的餐飲點餐管理系統，旨在簡化公司團購、午餐訂購及飲品點餐流程。系統結合了即時通知、智慧庫存管理與強大的菜單編輯功能。

## 🌟 核心特色

### 1. 職能店家管理 (Store Management)
- **完整的店家維護**：支援店家基本資訊、地圖地址、電話及 16:9 主圖上傳（內建裁切器）。
- **智慧營業判定**：支援週一至週日的定期營業時間設定，以及**自定義訂餐截止時間**功能。
- **店家複製功能**：一鍵複製現有店家及其菜單，快速建立連鎖分店資料。

### 2. 進階菜單編輯器 (Menu Editor)
- **多維度商品結構**：支援商品分類、變體（不同規格/價格）及客製化選項群組（如甜度、冰塊、加料）。
- **智慧標籤系統**：內建 36 種標準化商品標籤，提升搜尋與分類效率。
- **快速範本**：內建飲料店等常用範本，可一鍵套用標準規格。

### 3. 強大資料導入與備份
- **CSV 智慧匯入 (P0)**：支援 CSV 批次匯入菜單，具備前端 Diff 差異比對功能，可自動識別新商品與更新項。
- **JSON 完整備份 (P1)**：支援全店菜單 JSON 匯出與匯入，100% 保留所有變體與排序邏輯。

### 4. 訂單與通知系統
- **訂單流程管理**：Pending → Confirmed → Preparing → Ready → Completed 的完整狀態流轉。
- **自動化通知**：
  - **店家端**：整合 Microsoft Teams Webhook，新訂單即時推播至管理頻道。
  - **員工端**：實作站內即時通知 (Notification Manager)，訂單狀態變更時自動跳出提示。
- **庫存管理**：下單自動扣除剩餘庫存，支援庫存不足卡控。

### 5. 極致使用者體驗
- **響應式設計**：支援手機端優化介面，點餐流程流暢直覺。
- **深色模式**：支援系統層級的 Dark Mode 切換。
- **收藏系統**：使用者可標記常用店家，並透過篩選功能快速查找。

## 🛠️ 技術棧
- **前端框架**: React 18, Lucide React (Icons)
- **樣式工具**: Tailwind CSS, PostCSS
- **後端服務**: Google Firebase
  - **Firestore**: 即時資料庫與交易處理 (Transactions)
  - **Authentication**: Google 登入與身份驗證
  - **Functions**: 中繼通知服務與後端邏輯
- **版本控制**: Git (GitHub)

## 🚀 快速開始

### 環境需求
- Node.js 16.x 以上
- npm 或 yarn

### 安裝步驟
1. 克隆專案：
   ```bash
   git clone https://github.com/klin1976/Taiwanese-restaurant-menus.git
   ```
2. 進入專案目錄：
   ```bash
   cd company-lunch-order
   ```
3. 安裝依賴：
   ```bash
   npm install
   ```
4. 設定 Firebase：
   建立 `.env` 檔案並填入您的 Firebase 配置資訊。
5. 啟動開發伺服器：
   ```bash
   npm start
   ```

## 📈 最近更新 (2026-03)
- [P0] 實作 CSV 智慧匯入介面與 Diff 比對邏輯。
- [P1] 支援 JSON 完整備份/還原。
- [P1] 實作全域站內通知系統。
- [P2] 新增訂餐截止時間控制邏輯。
- [P2] 清理冗餘備份檔案，整合 Git 版本管理。

---
© 2026 企業餐飲訂購系統開發團隊
