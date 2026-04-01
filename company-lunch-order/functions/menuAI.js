// functions/menuAI.js
// P4: AI 菜單辨識 Cloud Function — 使用 Gemini 2.5 Flash Vision API
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { GoogleGenAI } = require("@google/genai");
const { jsonrepair } = require("jsonrepair");

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

## 回傳格式要求

請回傳合法 JSON：
{
  "categories": [
    {
      "name": "分類名稱",
      "items": [
        {
          "name": "品項名稱",
          "price": 120,
          "description": "",
          "variants": [{"name": "大杯(L)", "price": 50}],
          "customizations": []
        }
      ]
    }
  ],
  "globalOptions": [
    {
      "name": "選項分類(如：甜度)",
      "values": [
        {"name": "正常", "price": 0},
        {"name": "半糖", "price": 0}
      ]
    }
  ],
  "storeType": "drinks",
  "confidence": 0.9
}

## 嚴格辨識規則（極重要，避免解析失敗）

1. 絕不翻譯或捏造：所有名稱必須100%忠於原始菜單（繁體中文），絕對不要自行添加英文描述！
2. description 欄位：除非菜單有特別加註（例如：辣度、含花生等），否則一律留空字串 ""。
3. 價格處理：純整數。如有不同尺寸（如大/中杯），才使用 variants 陣列。
4. 全店通用客製化選項 (globalOptions)：
   - 如果菜單上有明確列出「全店/全分類通用的選項」（例如：飲料店的甜度冰度表、全店加料表），請務必將其抽離並歸類到最外層的 \`globalOptions\` 中。
   - **絕對不要**將這些全店通用的選項重複塞進每一個 \`items\` 的 \`customizations\` 裡！這樣會導致字數過長解析失敗。
   - 只有「該品項專屬」的少數特殊選項（如：加蛋 +10元），才保留在該 \`items\` 內的 \`customizations\` 中。
5. 語言：強制保持繁體中文，不要出現任何英文翻譯。
6. 盡量精簡：為避免回傳字數超過上限而遭到截斷，請提供最精簡的文字，不要有不必要的備註。`;

// 飲料店專用 Prompt 補充
const DRINKS_PROMPT_SUFFIX = `
- **主價格同步 (必須)**：
  - **item 的 \`price\` 絕對不能是 0**。若有 \`variants\`，其 \`price\` 應填入第一個變體的價格。
- **全系列完整性與防止截斷 (極度重要)**：
  - 這張菜單包含大量系列：**「鮮奶系列」、「鮮榨系列」、「特調系列」、「魔爪系列」、「日本靜岡抹茶系列」、「百香系列」、「冷壓甘蔗系列」**，必須依序全部辨識！
  - 為了讓 JSON 不被截斷，請大幅精簡 \`description\`，除非像「三兄弟」有特定配料才寫，其餘請保持空字串。
  - **不得跳過任何大分類標題下的品項**。
- **視覺錨點與規格命名**：
  - 識別頂部「L」與「瓶裝」標題位置。
  - 產出 \`variants\` 名稱必須為「大杯(L)」與「瓶裝」，絕非小/中/大杯。
- **區域與分類強制處理**：
  - **區域包含**：必須辨識紅框內的酒精飲料。
  - **冬瓜獨立**：名稱含「冬瓜」者，請將其從原區移出，獨立建立一個「冬瓜系列」分類。
- **標籤映射**：⭐ 轉為 [推薦]，🆕 轉為 [新品]。
- **應對合併命名**：斜線 \`/\` 分割者務必拆解為獨立商品。`;

// 便當/餐點店專用 Prompt 補充
const MEALS_PROMPT_SUFFIX = `
## 便當/餐點店額外辨識重點
- 注意是否有「加飯」、「加麵」、「加蛋」、「加起司」等加價選項，放入 customizations 中。
- 如果有「可選三樣配菜」或「可加購 A/B/C 套餐」的說明，也請嘗試將其結構化放入 customizations。
- 辨識常見分類：主食、單點、湯品、小菜等。`;

/**
 * Cloud Function: analyzeMenuImage
 * 接收菜單圖片，呼叫 Gemini Vision API 進行辨識
 */
exports.analyzeMenuImage = onCall(
    {
        maxInstances: 10,
        timeoutSeconds: 120,
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
            const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT || "company-lunch-order";
            const ai = new GoogleGenAI({ 
                vertexai: true, 
                project: projectId, 
                location: "us-central1" 
            });

            // 組裝 Prompt
            let prompt = MENU_RECOGNITION_PROMPT;
            if (storeType === "drinks") {
                prompt += DRINKS_PROMPT_SUFFIX;
            } else if (storeType === "meals") {
                prompt += MEALS_PROMPT_SUFFIX;
            }

            console.log("Calling Gemini 2.5 Flash API via Google GenAI SDK...");
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    {
                        role: "user",
                        parts: [
                            {
                                inlineData: {
                                    mimeType: mimeType || "image/jpeg",
                                    data: imageBase64,
                                }
                            },
                            { text: prompt }
                        ],
                    },
                ],
                config: {
                    temperature: 0.0, // 極致精確
                    maxOutputTokens: 16384, // 加倍輸出空間，容納整張大菜單
                }
            });

            // 從 response 中提取文字內容
            let textContent = response.text || "";

            console.log(`Response text length: ${textContent.length} chars`);

            if (!textContent) {
                console.error("Gemini returned empty response. Full response:", JSON.stringify(response).substring(0, 500));
                return {
                    success: false,
                    error: "AI 未回傳有效結果，請嘗試更清晰的照片",
                };
            }

            // 5. Parse and Validate JSON
            let parsedResult;
            try {
                let cleanText = textContent;
                
                // 過濾掉可能存在的思考過程 <think> ... </think>
                const thinkEndIndex = cleanText.lastIndexOf('</think>');
                if (thinkEndIndex !== -1) {
                    cleanText = cleanText.substring(thinkEndIndex + 8);
                }

                // 過濾掉 Markdown 區塊標記
                cleanText = cleanText.replace(/```json/gi, '').replace(/```/g, '');

                // 物理擷取大括號開頭，避免前面有雜訊
                const firstBrace = cleanText.indexOf('{');
                if (firstBrace !== -1) {
                    cleanText = cleanText.substring(firstBrace);
                }
                
                // 使用 jsonrepair 強制閉合所有因 Token 切斷的未完成引號與陣列括號
                try {
                    cleanText = jsonrepair(cleanText);
                    console.log(`Successfully repaired JSON string of length ${cleanText.length}`);
                } catch (repairError) {
                    console.error("jsonrepair failed:", repairError.message);
                }

                parsedResult = JSON.parse(cleanText);
            } catch (parseError) {
                console.error("JSON parse failed:", parseError.message);
                console.error("Raw text (first 500):", textContent.substring(0, 500));
                console.error("Raw text (last 500):", textContent.substring(textContent.length - 500));

                return {
                    success: false,
                    error: "AI 回傳格式異常，無法解析為有效資料。請重新嘗試。",
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

            // 清理與驗證 globalOptions
            const globalOptions = Array.isArray(parsedResult.globalOptions)
                ? parsedResult.globalOptions.map((c) => ({
                    name: String(c.name || "選項").trim(),
                    values: Array.isArray(c.values)
                        ? c.values.map((v) => ({
                            name: String(v.name || "").trim(),
                            price: parseInt(v.price) || 0,
                        }))
                        : [],
                }))
                : [];

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
                        customizations: Array.isArray(item.customizations)
                            ? item.customizations.map((c) => ({
                                name: String(c.name || "選項").trim(),
                                values: Array.isArray(c.values)
                                    ? c.values.map((v) => ({
                                        name: String(v.name || "").trim(),
                                        price: parseInt(v.price) || 0,
                                    }))
                                    : [],
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
                `Parsed: ${parsedResult.categories.length} categories, ${totalItems} items, ${globalOptions.length} global options`
            );

            return {
                success: true,
                data: {
                    globalOptions,
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
