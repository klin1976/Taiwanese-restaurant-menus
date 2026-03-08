// functions/menuAI.js
// P4: AI 菜單辨識 Cloud Function — 使用 Gemini 2.5 Flash Vision API
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { VertexAI } = require("@google-cloud/vertexai");

// 速率限制器（簡易版：基於記憶體的計數器）
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 分鐘
const RATE_LIMIT_MAX = 5; // 每分鐘最多 5 次

function checkRateLimit(uid) {
    const now = Date.now();
    const userLimit = rateLimitMap.get(uid);

    if (!userLimit || now - userLimit.windowStart > RATE_LIMIT_WINDOW) {
        rateLimitMap.set(uid, { windowStart: now, count: 1 });
        return true;
    }

    if (userLimit.count >= RATE_LIMIT_MAX) {
        return false;
    }

    userLimit.count++;
    return true;
}

// 菜單辨識的 Prompt
const MENU_RECOGNITION_PROMPT = `你是一位專業的台灣餐飲菜單辨識專家。請仔細分析這張菜單照片，並將所有可辨識的品項整理為結構化的 JSON 格式。

## 回傳格式要求（嚴格遵守）

請回傳一個合法的 JSON 物件，格式如下：

{
  "categories": [
    {
      "name": "分類名稱（例如：招牌料理、飲品、套餐等）",
      "items": [
        {
          "name": "品項名稱",
          "price": 120,
          "description": "品項描述或備註（選填，沒有就留空字串）",
          "variants": []
        }
      ]
    }
  ],
  "storeType": "meals 或 drinks",
  "confidence": 0.85,
  "notes": "辨識過程中的備註，例如模糊區域、無法辨識的部分等"
}

## 辨識規則

1. **價格**：必須為純數字（整數），不可包含 $ 或 元 等符號。若有多種價格，請使用 variants。
2. **分類**：盡量保持菜單上原有的分類名稱。若菜單無明確分類，請依品項性質自動分類。
3. **多規格/大小杯**：若品項有多種規格（如 大/中/小、冰/熱），請放入 variants 陣列：
   "variants": [{"name": "大杯", "price": 55}, {"name": "中杯", "price": 45}]
4. **飲料店判斷**：若菜單主要為飲料、茶飲、咖啡類，storeType 設為 "drinks"；否則設為 "meals"。
5. **信心度 (confidence)**：根據照片清晰度和辨識確定性，給出 0-1 之間的浮點數。
6. **語言**：品項名稱保持菜單原文（繁體中文）。
7. **不要虛構**：只回傳照片中實際可見的品項，不要自行添加。

## 重要

- 只回傳 JSON，不要加任何 markdown 格式或說明文字。
- 確保 JSON 語法正確，可被 JSON.parse() 解析。`;

// 飲料店專用 Prompt 補充
const DRINKS_PROMPT_SUFFIX = `
## 飲料店額外辨識重點
- 注意大杯/中杯/小杯的價格差異
- 常見分類：茶飲、鮮奶茶、果汁、特調、咖啡等
- 如果有冰/溫/熱 的標示，在 description 中備註`;

/**
 * Cloud Function: analyzeMenuImage
 * 接收菜單圖片，呼叫 Gemini Vision API 進行辨識
 */
exports.analyzeMenuImage = onCall(
    {
        maxInstances: 10,
        timeoutSeconds: 60,
        memory: "512MiB",
    },
    async (request) => {
        console.log("=== analyzeMenuImage Start ===");

        // 1. Auth Check
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "使用者必須登入");
        }

        const uid = request.auth.uid;
        console.log(`User: ${uid}`);

        // 2. Rate Limit Check
        if (!checkRateLimit(uid)) {
            throw new HttpsError(
                "resource-exhausted",
                "辨識請求過於頻繁，請稍後再試（每分鐘最多 5 次）"
            );
        }

        // 3. Validate Input
        const { imageBase64, storeType, mimeType } = request.data || {};

        if (!imageBase64) {
            throw new HttpsError("invalid-argument", "缺少圖片資料");
        }

        // 檢查 Base64 大小 (約 4MB 限制)
        const imageSizeBytes = Buffer.from(imageBase64, "base64").length;
        const maxSizeMB = 4;
        if (imageSizeBytes > maxSizeMB * 1024 * 1024) {
            throw new HttpsError(
                "invalid-argument",
                `圖片大小超過 ${maxSizeMB}MB 限制（目前 ${(imageSizeBytes / 1024 / 1024).toFixed(1)}MB）`
            );
        }

        console.log(
            `Image size: ${(imageSizeBytes / 1024).toFixed(1)}KB, storeType: ${storeType || "auto"}, mimeType: ${mimeType || "image/jpeg"}`
        );

        // 4. Call Gemini Vision API
        try {
            const vertexAI = new VertexAI({
                project: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT,
                location: "asia-east1",
            });

            const model = vertexAI.getGenerativeModel({
                model: "gemini-2.5-flash-preview-05-20",
                generationConfig: {
                    maxOutputTokens: 4096,
                    temperature: 0.1, // 低溫度 = 更精確
                    topP: 0.8,
                },
            });

            // 組裝 Prompt
            let prompt = MENU_RECOGNITION_PROMPT;
            if (storeType === "drinks") {
                prompt += DRINKS_PROMPT_SUFFIX;
            }

            const imagePart = {
                inlineData: {
                    mimeType: mimeType || "image/jpeg",
                    data: imageBase64,
                },
            };

            console.log("Calling Gemini API...");
            const result = await model.generateContent({
                contents: [
                    {
                        role: "user",
                        parts: [imagePart, { text: prompt }],
                    },
                ],
            });

            const response = result.response;
            const textContent =
                response.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!textContent) {
                console.error("Gemini returned empty response");
                return {
                    success: false,
                    error: "AI 未回傳有效結果，請嘗試更清晰的照片",
                };
            }

            console.log(`Gemini response length: ${textContent.length} chars`);

            // 5. Parse and Validate JSON
            let parsedResult;
            try {
                // 清理可能的 markdown 包裹
                let cleanJson = textContent.trim();
                if (cleanJson.startsWith("```json")) {
                    cleanJson = cleanJson.slice(7);
                }
                if (cleanJson.startsWith("```")) {
                    cleanJson = cleanJson.slice(3);
                }
                if (cleanJson.endsWith("```")) {
                    cleanJson = cleanJson.slice(0, -3);
                }
                cleanJson = cleanJson.trim();

                parsedResult = JSON.parse(cleanJson);
            } catch (parseError) {
                console.error("JSON parse failed:", parseError.message);
                console.error("Raw text:", textContent.substring(0, 500));
                return {
                    success: false,
                    error: "AI 回傳格式異常，請重新嘗試",
                    rawText: textContent.substring(0, 200),
                };
            }

            // 6. Validate Structure
            if (!parsedResult.categories || !Array.isArray(parsedResult.categories)) {
                return {
                    success: false,
                    error: "辨識結果格式不正確（缺少 categories）",
                };
            }

            // 清理與驗證每個品項
            let totalItems = 0;
            parsedResult.categories = parsedResult.categories.map((cat) => ({
                name: String(cat.name || "未分類").trim(),
                items: (cat.items || []).map((item) => {
                    totalItems++;
                    return {
                        name: String(item.name || "").trim(),
                        price: parseInt(item.price) || 0,
                        description: String(item.description || "").trim(),
                        variants: Array.isArray(item.variants)
                            ? item.variants.map((v) => ({
                                name: String(v.name || "").trim(),
                                price: parseInt(v.price) || 0,
                            }))
                            : [],
                    };
                }),
            }));

            // 過濾掉空品項
            parsedResult.categories = parsedResult.categories
                .map((cat) => ({
                    ...cat,
                    items: cat.items.filter((item) => item.name),
                }))
                .filter((cat) => cat.items.length > 0);

            console.log(
                `Parsed: ${parsedResult.categories.length} categories, ${totalItems} items, confidence: ${parsedResult.confidence}`
            );

            return {
                success: true,
                data: {
                    categories: parsedResult.categories,
                    storeType: parsedResult.storeType || storeType || "meals",
                    confidence: parseFloat(parsedResult.confidence) || 0.5,
                    notes: parsedResult.notes || "",
                    totalItems,
                    totalCategories: parsedResult.categories.length,
                },
            };
        } catch (error) {
            console.error("Gemini API Error:", error);

            if (error.message?.includes("PERMISSION_DENIED")) {
                return {
                    success: false,
                    error: "Vertex AI API 權限不足，請確認 GCP 專案已啟用 Vertex AI API",
                };
            }

            return {
                success: false,
                error: `辨識失敗: ${error.message}`,
            };
        }
    }
);
