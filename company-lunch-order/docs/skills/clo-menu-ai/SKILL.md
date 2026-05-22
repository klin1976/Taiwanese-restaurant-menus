---
name: clo-menu-ai
description: >
  適用於公司午餐訂購系統（CLO）的「Gemini AI 多模態菜單圖像識別」模組開發。
  當需要修改或優化 Cloud Functions 菜單辨識 Prompt、Rate Limiting 頻率卡控、Gemini 模型參數、jsonrepair 解析修復、以及前端 menuAIService 整合呼叫時，務必使用此技能。
  觸發關鍵字包含：AI 菜單識別、menuAI.js、functions/menuAI.js、analyzeMenuImage、Vertex AI、Gemini 1.5 Flash、Rate Limiting、jsonrepair、Prompt 提示詞、menuAIService。
---

# CLO Gemini AI 菜單圖像識別開發技能

## 系統定位

- **專案名稱**：company-lunch-order (公司午餐訂購系統)
- **技術棧**：Firebase Cloud Functions (v2 HTTPS Call) + Node.js 18 + Vertex AI SDK + Google Gemini 1.5 Flash + React 前端
- **核心目標**：允許管理員直接上傳菜單照片，由 Gemini 多模態模型自動辨識並解析出結構化的菜單 JSON 資料（包含分類與商品單價），免去人工輸入的繁瑣。

---

## 模組架構與檔案關聯

```
functions/ (Cloud Functions 後端)
├── index.js                  ← Functions 入口，匯出 analyzeMenuImage 雲端函式
└── menuAI.js                 ← AI 辨識主程式，含 Rate Limiting、Vertex AI 呼叫、Prompt 與 jsonrepair 修復

src/ (React 前端)
├── services/
│   └── menuAIService.js      ← 前端呼叫 Functions 的服務封裝 (httpsCallable)
└── components/
    └── admin/
        └── StoreManagement/  ← 店家菜單管理介面，整合「AI 辨識上傳」按鈕與預覽確認 UI
```

---

## 核心技術實現與安全限制

### 1. 基於 Firestore 的 Rate Limiting (防刷防爆卡控)
為防範恶意的 API 呼叫造成 Gemini API 額度暴增，後端在處理請求前會先利用 Firestore (`counters/rateLimits/{userId}`) 進行每分鐘最多 5 次的頻率限制：

```javascript
// functions/menuAI.js 限流邏輯
const limitRef = admin.firestore().collection("counters").doc(`rateLimits_${userId}`);
const doc = await limitRef.get();
const now = Date.now();

if (doc.exists()) {
  const data = doc.data();
  if (now - data.windowStart < 60000) {
    if (data.count >= 5) {
      throw new HttpsError("resource-exhausted", "呼叫過於頻繁，每分鐘限制 5 次");
    }
    await limitRef.update({ count: data.count + 1 });
  } else {
    await limitRef.set({ windowStart: now, count: 1 });
  }
} else {
  await limitRef.set({ windowStart: now, count: 1 });
}
```

### 2. 多模態提示詞分流 (Dual-Prompt Design)
系統針對「午餐店家」(飯麵食) 與「飲料店家」載入完全不同的 AI Prompt，以提高辨識精準度：
- **`LUNCH_PROMPT`**：聚焦於主食、配菜、套餐、素食標記與價格。
- **`DRINK_PROMPT`**：聚焦於茶飲分類、冰沙、加料選項（例如珍珠+10元）、客製化甜度冰量。
- **支援自訂 Hint**：管理員在上傳時，可輸入額外提示字眼（例如 "這張圖裡的單價都是加大後的價格"），此 `promptHints` 會被動態拼接到 Prompt 中。

### 3. 強健 JSON 解析器 (`jsonrepair`)
> [!TIP]
> Gemini 回傳的結果為 Markdown 格式的 JSON 區塊（例如 ` ```json ... ``` `），且有時尾部可能被截斷或缺少括號。
> 
> 後端採用 `jsonrepair` 庫，在 `JSON.parse` 前先對 AI 回傳的 text 進行結構修復，大幅度提高辨識成功率：

```javascript
const { jsonrepair } = require("jsonrepair");

let cleanedText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
try {
  // 優先嘗試標準解析
  return JSON.parse(cleanedText);
} catch (e) {
  try {
    // 標準解析失敗時，使用 jsonrepair 自動修補括號或引號
    const repairedText = jsonrepair(cleanedText);
    return JSON.parse(repairedText);
  } catch (repairError) {
    throw new Error("JSON 結構毀損嚴重，修復失敗");
  }
}
```

---

## 前後端通訊與介面規格

### 1. 前端呼叫封裝 (`menuAIService.js`)
前端將圖片壓縮並轉為 Base64 字串，攜帶店家類型與參數呼叫後端：

```javascript
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

export const uploadMenuImageAndAnalyze = async (base64Image, storeType, promptHints = '') => {
  const analyzeMenuImageFn = httpsCallable(functions, 'analyzeMenuImage');
  const response = await analyzeMenuImageFn({
    image: base64Image,       // 圖片 base64 資料
    storeType: storeType,     // 'lunch' | 'drinks'
    promptHints: promptHints  // 管理員微調提示
  });
  return response.data; // 回傳結構化的 categories 陣列
};
```

---

## 測試與驗證計畫

1. **限流驗證 (Rate Limit)**：連續點擊「AI 辨識」按鈕，第 6 次呼叫應被攔截，並拋出 `resource-exhausted` 錯誤，提示每分鐘限 5 次。
2. **圖片大小驗證**：上傳一張超過 4MB 的圖片，系統應即時阻擋，並提示「圖片大小限制 4MB 內」。
3. **辨識結果結構驗證**：上傳菜單圖片，確認 AI 回傳的 categories 結構完整，且 `price` 欄位為數值（Number），而非帶有 "$" 的字串。
