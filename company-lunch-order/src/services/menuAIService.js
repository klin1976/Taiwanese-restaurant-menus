// src/services/menuAIService.js
// P4: AI 菜單辨識前端服務層
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';

/**
 * 壓縮圖片至指定大小以內
 * @param {File} file - 原始圖片檔案
 * @param {number} maxSizeMB - 最大允許大小 (MB)
 * @param {number} maxDimension - 最大邊長 (px)
 * @returns {Promise<{base64: string, mimeType: string}>}
 */
export const compressImage = (file, maxSizeMB = 3, maxDimension = 2048) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                // 等比例縮放
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    } else {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // 嘗試不同品質壓縮
                let quality = 0.85;
                let base64 = canvas.toDataURL('image/jpeg', quality);

                // 如果超過大小限制，逐步降低品質
                while (base64.length * 0.75 > maxSizeMB * 1024 * 1024 && quality > 0.3) {
                    quality -= 0.1;
                    base64 = canvas.toDataURL('image/jpeg', quality);
                }

                // 移除 data:image/jpeg;base64, 前綴
                const pureBase64 = base64.split(',')[1];

                resolve({
                    base64: pureBase64,
                    mimeType: 'image/jpeg',
                    originalSize: file.size,
                    compressedSize: Math.round(pureBase64.length * 0.75),
                    width,
                    height,
                    quality
                });
            };
            img.onerror = () => reject(new Error('圖片載入失敗'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('檔案讀取失敗'));
        reader.readAsDataURL(file);
    });
};

/**
 * 呼叫 Cloud Function 進行菜單辨識
 * @param {File} imageFile - 菜單圖片檔案
 * @param {string} storeType - 店家類型 ('meals' | 'drinks')
 * @returns {Promise<Object>} 辨識結果
 */
export const analyzeMenuImage = async (imageFile, storeType = 'meals') => {
    // 1. 壓縮圖片
    const compressed = await compressImage(imageFile);
    console.log(`📷 圖片壓縮: ${(compressed.originalSize / 1024).toFixed(0)}KB → ${(compressed.compressedSize / 1024).toFixed(0)}KB (${compressed.width}×${compressed.height}, q=${compressed.quality.toFixed(2)})`);

    // 2. 呼叫 Cloud Function
    const analyzeFunction = httpsCallable(functions, 'analyzeMenuImage', {
        timeout: 120000, // 120 秒超時，對齊 Cloud Function 設定
    });

    const result = await analyzeFunction({
        imageBase64: compressed.base64,
        storeType,
        mimeType: compressed.mimeType,
    });

    return result.data;
};

/**
 * 將 AI 辨識結果轉換為系統菜單格式
 * 對齊 MenuEditor 的 categories 資料結構
 * @param {Object} aiResult - AI 回傳的辨識結果
 * @param {Object} currentStore - 現有店家資料（用於衝突檢測）
 * @returns {Object} { categories, conflicts, stats }
 */
export const convertAIResultToMenuFormat = (aiResult, currentStore) => {
    const categories = [];
    const conflicts = [];
    let globalOptions = [];
    const stats = {
        totalItems: 0,
        newItems: 0,
        conflictItems: 0,
        newCategories: 0,
    };

    // 建立現有資料的快速查找表
    const existingCategories = new Map();
    const existingItems = new Map();

    if (currentStore?.categories) {
        currentStore.categories.forEach(cat => {
            existingCategories.set(cat.name, cat);
            (cat.items || []).forEach(item => {
                existingItems.set(`${cat.name}::${item.name}`, item);
            });
        });
    }

    // 處理全域選項 (方案A)
    if (aiResult.globalOptions && Array.isArray(aiResult.globalOptions)) {
        globalOptions = aiResult.globalOptions.map(c => ({
            id: `global_group_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            name: c.name,
            type: (c.name.includes('甜度') || c.name.includes('冰度')) ? 'single' : 'multiple',
            required: (c.name.includes('甜度') || c.name.includes('冰度')),
            maxSelections: (c.name.includes('甜度') || c.name.includes('冰度')) ? 1 : 10,
            choices: (c.values || []).map(v => ({
                id: `global_choice_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                name: v.name,
                priceAdjustment: v.price || 0,
                stock: null,
                available: true,
                isDefault: false
            }))
        }));
    }

    // 轉換 AI 結果為系統格式
    (aiResult.categories || []).forEach(aiCat => {
        const isNewCategory = !existingCategories.has(aiCat.name);
        if (isNewCategory) stats.newCategories++;

        const convertedItems = (aiCat.items || []).map(aiItem => {
            stats.totalItems++;
            const existingKey = `${aiCat.name}::${aiItem.name}`;
            const existingItem = existingItems.get(existingKey);

            // 自動補價邏輯：若主價格為 0 且有變體，取第一個變體的價格
            let finalPrice = aiItem.price || 0;
            if (finalPrice === 0 && aiItem.variants && aiItem.variants.length > 0) {
                finalPrice = aiItem.variants[0].price || 0;
            }

            const newItem = {
                id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                name: aiItem.name,
                price: finalPrice,
                description: aiItem.description || '',
                status: 'available',
                tags: [],
                variants: (aiItem.variants || []).map(v => ({
                    id: `var_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                    name: v.name,
                    price: v.price || 0,
                    stock: -1,
                })),
                options: (aiItem.customizations || []).map(c => ({
                    id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                    name: c.name,
                    type: (c.name.includes('甜度') || c.name.includes('冰度')) ? 'single' : 'multiple',
                    required: (c.name.includes('甜度') || c.name.includes('冰度')),
                    maxSelections: (c.name.includes('甜度') || c.name.includes('冰度')) ? 1 : 10,
                    choices: (c.values || []).map(v => ({
                        id: `choice_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                        name: v.name,
                        priceAdjustment: v.price || 0,
                        stock: null,
                        available: true,
                        isDefault: false
                    }))
                })),
                _isNew: true,
                _aiGenerated: true,
            };

            if (existingItem) {
                stats.conflictItems++;
                conflicts.push({
                    categoryName: aiCat.name,
                    itemName: aiItem.name,
                    existing: existingItem,
                    incoming: newItem,
                    action: 'skip', // 預設跳過衝突項目
                });
            } else {
                stats.newItems++;
            }

            return newItem;
        });

        categories.push({
            id: isNewCategory
                ? `cat_ai_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`
                : existingCategories.get(aiCat.name)?.id,
            name: aiCat.name,
            items: convertedItems,
            _isNew: isNewCategory,
        });
    });

    return { categories, conflicts, stats, globalOptions };
};

/**
 * 將 AI 辨識結果合併至現有菜單
 * @param {Array} existingCategories - 現有分類
 * @param {Array} aiCategories - AI 辨識的分類
 * @param {Array} conflicts - 衝突清單及使用者選擇
 * @returns {Array} 合併後的完整分類
 */
export const mergeAIResultToMenu = (existingCategories, aiCategories, conflicts) => {
    // 複製現有分類
    const merged = existingCategories.map(cat => ({
        ...cat,
        items: [...(cat.items || [])],
    }));

    // 建立衝突行為的查找表
    const conflictActions = new Map();
    conflicts.forEach(c => {
        conflictActions.set(`${c.categoryName}::${c.itemName}`, c.action);
    });

    aiCategories.forEach(aiCat => {
        const existingCatIndex = merged.findIndex(c => c.name === aiCat.name);

        if (existingCatIndex >= 0) {
            // 分類已存在：逐一加入新品項
            aiCat.items.forEach(item => {
                const conflictKey = `${aiCat.name}::${item.name}`;
                const action = conflictActions.get(conflictKey);

                if (action === 'skip') {
                    // 跳過衝突項目
                    return;
                } else if (action === 'overwrite') {
                    // 覆蓋：移除舊的，加入新的
                    merged[existingCatIndex].items = merged[existingCatIndex].items.filter(
                        i => i.name !== item.name
                    );
                    merged[existingCatIndex].items.push(item);
                } else {
                    // 新品項：直接加入
                    merged[existingCatIndex].items.push(item);
                }
            });
        } else {
            // 新分類：整個加入
            merged.push({
                id: aiCat.id,
                name: aiCat.name,
                items: aiCat.items,
            });
        }
    });

    return merged;
};
