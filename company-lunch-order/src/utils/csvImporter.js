// src/utils/csvImporter.js
import Papa from 'papaparse';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { initializeProductTags } from './productTags';
import { getDrinkStandardOptions } from './dataMigration';

/**
 * CSV 匯入工具
 * 負責解析 CSV、驗證資料、並將資料轉換為 Firestore 儲存格式
 */

// CSV 必要欄位定義
const REQUIRED_FIELDS = ['分類名稱', '商品名稱', '價格'];

// 欄位對應（CSV Header -> 系統欄位）
const FIELD_MAPPING = {
  '分類名稱': 'categoryName',
  '商品名稱': 'name',
  '價格': 'price',
  '描述': 'description',
  '狀態': 'status', // available, unavailable
  '標籤': 'tags',   // 使用 / 分隔，例如 "熱門/推薦"
  '商品類型': 'productType', // 餐點, 飲料
  '選項範本': 'optionTemplate' // 飲料標準
};

/**
 * 解析 CSV 檔案
 * @param {File} file - 上傳的檔案
 * @returns {Promise<Array>} 解析後的資料陣列
 */
export const parseCSV = (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8', // 嘗試 UTF-8
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          // 過濾掉一些常見的非致命錯誤（如空行）
          const fatalErrors = results.errors.filter(e => e.type !== 'FieldMismatch');
          if (fatalErrors.length > 0) {
            reject(new Error(`CSV 解析失敗: ${fatalErrors[0].message}`));
            return;
          }
        }
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

/**
 * 驗證並處理 CSV 資料
 * @param {Array} rawData - 解析後的原始資料
 * @param {Object} currentStore - 目前店家資料（用於比對）
 * @returns {Object} 處理結果 { validItems, errors, previewStats }
 */
export const processImportData = (rawData, currentStore) => {
  const processedItems = [];
  const errors = [];
  const stats = {
    total: rawData.length,
    newItems: 0,
    updatedItems: 0,
    newCategories: 0,
    invalid: 0
  };

  // 1. 建立現有分類與商品的快速查找 Map
  const categoryMap = new Map(); // Name -> Category Object
  const itemMap = new Map();     // CategoryName:ItemName -> Item Object

  if (currentStore.categories) {
    currentStore.categories.forEach(cat => {
      categoryMap.set(cat.name, { ...cat });
      if (cat.items) {
        cat.items.forEach(item => {
          itemMap.set(`${cat.name}:${item.name}`, item);
        });
      }
    });
  }

  // 2. 遍歷 CSV 資料
  rawData.forEach((row, index) => {
    const rowNumber = index + 2; // CSV 行號（包含 Header 為 1）
    const itemData = {};
    let isValid = true;
    let missingFields = [];

    // 欄位對應與基本檢查
    Object.entries(FIELD_MAPPING).forEach(([csvHeader, sysField]) => {
      // 處理 BOM (Byte Order Mark) 可能導致的第一個欄位名稱問題
      const actualHeader = Object.keys(row).find(key => key.trim() === csvHeader);

      if (REQUIRED_FIELDS.includes(csvHeader)) {
        if (!actualHeader || !row[actualHeader] || row[actualHeader].toString().trim() === '') {
          isValid = false;
          missingFields.push(csvHeader);
        }
      }

      if (actualHeader && row[actualHeader] !== undefined) {
        itemData[sysField] = row[actualHeader].toString().trim();
      }
    });

    if (!isValid) {
      errors.push({
        row: rowNumber,
        message: `缺少必要欄位: ${missingFields.join(', ')}`,
        data: row
      });
      stats.invalid++;
      return;
    }

    // 資料格式轉換與清理
    try {
      // 價格轉換
      const price = parseInt(itemData.price);
      if (isNaN(price) || price < 0) {
        throw new Error(`價格格式錯誤: ${itemData.price}`);
      }
      itemData.price = price;

      // 狀態轉換
      const validStatuses = ['available', 'unavailable', 'sold_out'];
      if (itemData.status && !validStatuses.includes(itemData.status)) {
        itemData.status = 'available'; // 預設值
      } else if (!itemData.status) {
        itemData.status = 'available';
      }

      // 標籤處理
      const tags = initializeProductTags();
      if (itemData.tags) {
        const tagNames = itemData.tags.split('/').map(t => t.trim());
        // 簡單對應：如果有自訂標籤名稱，嘗試啟動對應的 tag
        // 注意：這裡簡化處理，僅將 CSV 提到的標籤視為 true，實際應用可能需要更複雜的對應
        Object.keys(tags).forEach(tagKey => {
          // 這裡假設 tagKey 對應顯示名稱，或者 CSV 輸入的是 key
          // 實務上可能需要一個 Tag Name -> Key 的反向查找表
          // 暫時僅支援幾個通用標籤
          if (tagNames.includes('熱門') && tags.isPopular !== undefined) tags.isPopular = true;
          if (tagNames.includes('推薦') && tags.isRecommended !== undefined) tags.isRecommended = true;
          if (tagNames.includes('素食') && tags.isVegetarian !== undefined) tags.isVegetarian = true;
          if (tagNames.includes('辣') && tags.isSpicy !== undefined) tags.isSpicy = true;
        });
      }
      itemData.tags = tags;

      // 範本處理 (Smart Template)
      // 如果類型是「飲料」或範本指定「飲料標準」，自動套用範本
      if (itemData.productType === '飲料' || itemData.optionTemplate === '飲料標準') {
        itemData.hasOptions = true;
        itemData.optionGroups = getDrinkStandardOptions();
      }

      // 判斷是新增還是更新
      const existingItem = itemMap.get(`${itemData.categoryName}:${itemData.name}`);
      const existingCategory = categoryMap.get(itemData.categoryName);

      if (!existingCategory) {
        stats.newCategories++; // 統計上這是一個新分類導致的新增
      }

      if (existingItem) {
        itemData.id = existingItem.id; // 保留 ID
        itemData.isUpdate = true;
        itemData.oldData = existingItem; // 新增：保留舊資料以供 Diff 比較
        
        // 判斷是否資料完全一致 (跳過沒必要的更新)
        const isIdentical = 
          existingItem.name === itemData.name &&
          existingItem.price === itemData.price &&
          (existingItem.description || '') === (itemData.description || '') &&
          existingItem.status === itemData.status;

        itemData.isIdentical = isIdentical;
        
        if (!isIdentical) {
          stats.updatedItems++;
        }
      } else {
        itemData.id = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        itemData.isUpdate = false;
        stats.newItems++;
      }

      processedItems.push(itemData);

    } catch (e) {
      errors.push({
        row: rowNumber,
        message: e.message,
        data: row
      });
      stats.invalid++;
    }
  });

  return { processedItems, errors, stats };
};

/**
 * 將匯入資料合併到目前分類中 (純前端操作)
 * @param {Array} processedItems - 處理後的資料
 * @param {Array} currentCategories - 既有的分類資料
 * @param {Array} skipIds - 使用者決定跳過(不覆蓋)的商品 ID 集合
 * @returns {Array} 合併後的新分類陣列
 */
export const mergeImportDataToCategories = (processedItems, currentCategories, skipIds = []) => {
  let newCategories = currentCategories ? JSON.parse(JSON.stringify(currentCategories)) : [];

  processedItems.forEach(item => {
    // 檢查是否被使用者手動標記跳過，或是資料完全一致而自動跳過
    if (skipIds.includes(item.id) || item.isIdentical) return;

    // 1. 處理分類
    let category = newCategories.find(c => c.name === item.categoryName);

    if (!category) {
      category = {
        id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: item.categoryName,
        sortOrder: newCategories.length + 1,
        items: []
      };
      newCategories.push(category);
    }
    if (!category.items) category.items = [];

    // 2. 處理商品
    const itemIndex = category.items.findIndex(i => i.id === item.id || i.name === item.name);

    const newItemData = {
      id: item.id,
      name: item.name,
      price: item.price,
      basePrice: item.price,
      description: item.description || '',
      status: item.status,
      tags: item.tags,
      images: itemIndex > -1 && category.items[itemIndex].images ? category.items[itemIndex].images : { main: '', gallery: [] },
      hasVariants: itemIndex > -1 ? category.items[itemIndex].hasVariants : false,
      variants: itemIndex > -1 ? category.items[itemIndex].variants : [],
      hasOptions: item.hasOptions !== undefined ? item.hasOptions : (itemIndex > -1 ? category.items[itemIndex].hasOptions : false),
      optionGroups: item.optionGroups !== undefined ? item.optionGroups : (itemIndex > -1 ? category.items[itemIndex].optionGroups : []),
      sortOrder: itemIndex > -1 ? category.items[itemIndex].sortOrder : category.items.length + 1
    };

    if (itemIndex > -1) {
      // 覆蓋
      category.items[itemIndex] = {
        ...category.items[itemIndex],
        ...newItemData
      };
    } else {
      // 新增
      category.items.push(newItemData);
    }
  });

  return newCategories;
};

/**
 * 執行匯入 (寫入 Firestore)
 * 保留供直接寫入需求使用
 */
export const executeImport = async (storeId, storeType, processedItems, currentStore) => {
  if (!storeId || !storeType) throw new Error('Store ID and Type are required');
  const newCategories = mergeImportDataToCategories(processedItems, currentStore.categories || []);
  const storeRef = doc(db, 'stores', storeType, 'list', storeId);
  await updateDoc(storeRef, {
    categories: newCategories,
    updatedAt: new Date()
  });
  return newCategories;
};
