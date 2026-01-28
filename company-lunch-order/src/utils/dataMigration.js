// src/utils/dataMigration.js
import { collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { initializeProductTags, getDefaultTagsByStoreType } from './productTags';

/**
 * 舊資料遷移工具
 * 自動將舊商品資料結構轉換為新結構
 */

/**
 * 檢查商品是否為舊資料格式
 * @param {Object} item - 商品物件
 * @returns {boolean}
 */
const isOldFormat = (item) => {
  // 檢查特徵：
  // 1. 有 price 但沒有 basePrice
  // 2. 有 imageUrl 但沒有 images 物件
  // 3. 沒有 hasVariants 和 hasOptions 欄位
  
  const hasOldPrice = item.price !== undefined && item.basePrice === undefined;
  const hasOldImage = item.imageUrl !== undefined && !item.images;
  const missingNewFields = !item.hasOwnProperty('hasVariants') && !item.hasOwnProperty('hasOptions');
  
  return hasOldPrice || hasOldImage || missingNewFields;
};

/**
 * 轉換單一商品為新格式
 * @param {Object} item - 舊商品物件
 * @param {string} storeType - 店家類型
 * @param {Object} options - 轉換選項
 * @returns {Object} 新商品物件
 */
export const migrateItem = (item, storeType = 'lunch', options = {}) => {
  const {
    applyTemplate = true,    // 是否套用範本
    preserveOldData = true    // 是否保留舊資料
  } = options;

  console.log('🔄 遷移商品:', item.name);

  const newItem = {
    // ===== 保留原有欄位 =====
    id: item.id,
    name: item.name,
    description: item.description || '',
    status: item.status || 'available',
    sortOrder: item.sortOrder || 999,
    
    // ===== 標籤（保留或初始化） =====
    tags: item.tags || initializeProductTags(),
    
    // ===== 價格轉換 =====
    basePrice: item.basePrice || item.price || 0,
    
    // ===== 圖片轉換 =====
    images: {
      main: item.imageUrl || '',
      gallery: []
    },
    
    // ===== 新增變體系統（預設關閉） =====
    hasVariants: false,
    variants: [],
    
    // ===== 新增選項系統 =====
    hasOptions: false,
    optionGroups: []
  };

  // 如果要套用範本（飲料店自動套用標準選項）
  if (applyTemplate && storeType === 'drinks') {
    newItem.hasOptions = true;
    newItem.optionGroups = getDrinkStandardOptions();
    console.log('  ✅ 已套用飲料店標準範本');
  }

  // 保留舊資料（用於回滾）
  if (preserveOldData) {
    newItem._oldData = {
      price: item.price,
      imageUrl: item.imageUrl,
      migratedAt: new Date().toISOString()
    };
  }

  return newItem;
};

/**
 * 取得飲料店標準選項組（範本）
 * @returns {Array} 選項組陣列
 */
const getDrinkStandardOptions = () => {
  return [
    {
      id: 'group_sweetness',
      name: '甜度',
      type: 'single',
      required: false,
      maxSelections: 1,
      choices: [
        { id: 'sweet_normal', name: '正常', priceAdjustment: 0, stock: null, available: true, isDefault: true },
        { id: 'sweet_less', name: '少糖', priceAdjustment: 0, stock: null, available: true, isDefault: false },
        { id: 'sweet_half', name: '半糖', priceAdjustment: 0, stock: null, available: true, isDefault: false },
        { id: 'sweet_little', name: '微糖', priceAdjustment: 0, stock: null, available: true, isDefault: false },
        { id: 'sweet_none', name: '無糖', priceAdjustment: 0, stock: null, available: true, isDefault: false }
      ]
    },
    {
      id: 'group_ice',
      name: '冰塊',
      type: 'single',
      required: false,
      maxSelections: 1,
      choices: [
        { id: 'ice_normal', name: '正常冰', priceAdjustment: 0, stock: null, available: true, isDefault: true },
        { id: 'ice_less', name: '少冰', priceAdjustment: 0, stock: null, available: true, isDefault: false },
        { id: 'ice_little', name: '微冰', priceAdjustment: 0, stock: null, available: true, isDefault: false },
        { id: 'ice_none', name: '去冰', priceAdjustment: 0, stock: null, available: true, isDefault: false },
        { id: 'ice_warm', name: '溫', priceAdjustment: 0, stock: null, available: true, isDefault: false },
        { id: 'ice_hot', name: '熱', priceAdjustment: 0, stock: null, available: true, isDefault: false }
      ]
    },
    {
      id: 'group_toppings',
      name: '加料',
      type: 'multiple',
      required: false,
      maxSelections: 3,
      choices: [
        { id: 'topping_boba', name: '珍珠', priceAdjustment: 10, stock: null, available: true, isDefault: false },
        { id: 'topping_qq', name: '雙Q果', priceAdjustment: 10, stock: null, available: true, isDefault: false },
        { id: 'topping_jelly', name: '檸檬凍', priceAdjustment: 10, stock: null, available: true, isDefault: false },
        { id: 'topping_pudding', name: '布丁', priceAdjustment: 10, stock: null, available: true, isDefault: false },
        { id: 'topping_cheese', name: '芝芝', priceAdjustment: 20, stock: null, available: true, isDefault: false }
      ]
    }
  ];
};

/**
 * 掃描並統計需要遷移的商品
 * @param {string} storeId - 店家 ID
 * @param {string} storeType - 店家類型
 * @returns {Promise<Object>} 統計結果
 */
export const scanItemsForMigration = async (storeId, storeType) => {
  try {
    console.log('🔍 掃描店家商品:', storeId);

    // 讀取店家資料
    const storeRef = doc(db, 'stores', storeType, 'list', storeId);
    const storeDoc = await storeRef.get();

    if (!storeDoc.exists()) {
      throw new Error('店家不存在');
    }

    const storeData = storeDoc.data();
    const categories = storeData.categories || [];

    let totalItems = 0;
    let oldFormatItems = 0;
    const itemsToMigrate = [];

    // 遍歷所有分類和商品
    categories.forEach(category => {
      if (category.items && category.items.length > 0) {
        category.items.forEach(item => {
          totalItems++;
          
          if (isOldFormat(item)) {
            oldFormatItems++;
            itemsToMigrate.push({
              categoryId: category.id,
              categoryName: category.name,
              item: item
            });
          }
        });
      }
    });

    console.log(`✅ 掃描完成：共 ${totalItems} 個商品，${oldFormatItems} 個需要遷移`);

    return {
      totalItems,
      oldFormatItems,
      newFormatItems: totalItems - oldFormatItems,
      itemsToMigrate,
      storeData
    };

  } catch (error) {
    console.error('❌ 掃描失敗:', error);
    throw error;
  }
};

/**
 * 執行批次遷移
 * @param {string} storeId - 店家 ID
 * @param {string} storeType - 店家類型
 * @param {Object} options - 遷移選項
 * @returns {Promise<Object>} 遷移結果
 */
export const executeMigration = async (storeId, storeType, options = {}) => {
  try {
    console.log('🚀 開始執行遷移...');

    const {
      applyTemplate = true,
      preserveOldData = true,
      dryRun = false
    } = options;

    // 掃描商品
    const scanResult = await scanItemsForMigration(storeId, storeType);
    const { itemsToMigrate, storeData } = scanResult;

    if (itemsToMigrate.length === 0) {
      console.log('ℹ️ 沒有需要遷移的商品');
      return {
        success: true,
        migratedCount: 0,
        errors: []
      };
    }

    // 複製分類資料
    const newCategories = JSON.parse(JSON.stringify(storeData.categories));

    let migratedCount = 0;
    const errors = [];

    // 遍歷需要遷移的商品
    itemsToMigrate.forEach(({ categoryId, item }) => {
      try {
        const category = newCategories.find(cat => cat.id === categoryId);
        if (!category) {
          throw new Error(`找不到分類: ${categoryId}`);
        }

        const itemIndex = category.items.findIndex(i => i.id === item.id);
        if (itemIndex === -1) {
          throw new Error(`找不到商品: ${item.id}`);
        }

        // 轉換商品
        const migratedItem = migrateItem(item, storeType, {
          applyTemplate,
          preserveOldData
        });

        // 替換商品
        category.items[itemIndex] = migratedItem;
        migratedCount++;

        console.log(`  ✅ 遷移成功: ${item.name}`);

      } catch (error) {
        console.error(`  ❌ 遷移失敗: ${item.name}`, error);
        errors.push({
          itemId: item.id,
          itemName: item.name,
          error: error.message
        });
      }
    });

    // 如果是 Dry Run，不實際寫入
    if (dryRun) {
      console.log('🧪 Dry Run 模式，不實際寫入資料');
      return {
        success: true,
        migratedCount,
        errors,
        dryRun: true,
        previewData: newCategories
      };
    }

    // 寫入 Firestore
    console.log('💾 寫入 Firestore...');
    const storeRef = doc(db, 'stores', storeType, 'list', storeId);
    await updateDoc(storeRef, {
      categories: newCategories,
      migratedAt: new Date().toISOString()
    });

    console.log('🎉 遷移完成！');

    return {
      success: true,
      migratedCount,
      errors
    };

  } catch (error) {
    console.error('❌ 遷移失敗:', error);
    throw error;
  }
};

/**
 * 批次遷移所有店家
 * @param {string} storeType - 店家類型（'lunch' | 'drinks' | 'all'）
 * @param {Object} options - 遷移選項
 * @returns {Promise<Object>} 遷移結果
 */
export const migrateAllStores = async (storeType = 'all', options = {}) => {
  try {
    console.log('🌍 開始批次遷移所有店家...');

    const types = storeType === 'all' ? ['lunch', 'drinks'] : [storeType];
    const results = {
      totalStores: 0,
      successStores: 0,
      failedStores: 0,
      totalMigratedItems: 0,
      errors: []
    };

    for (const type of types) {
      const storesRef = collection(db, 'stores', type, 'list');
      const snapshot = await getDocs(storesRef);

      console.log(`📂 處理 ${type} 類型，共 ${snapshot.size} 家店`);

      for (const storeDoc of snapshot.docs) {
        results.totalStores++;

        try {
          const storeId = storeDoc.id;
          const storeName = storeDoc.data().name;

          console.log(`\n🏪 處理店家: ${storeName} (${storeId})`);

          const migrationResult = await executeMigration(storeId, type, options);

          if (migrationResult.success) {
            results.successStores++;
            results.totalMigratedItems += migrationResult.migratedCount;

            if (migrationResult.errors.length > 0) {
              results.errors.push({
                storeId,
                storeName,
                errors: migrationResult.errors
              });
            }
          } else {
            results.failedStores++;
          }

        } catch (error) {
          console.error('❌ 店家遷移失敗:', error);
          results.failedStores++;
          results.errors.push({
            storeId: storeDoc.id,
            storeName: storeDoc.data().name,
            error: error.message
          });
        }
      }
    }

    console.log('\n🎉 批次遷移完成！');
    console.log(`✅ 成功: ${results.successStores} 家`);
    console.log(`❌ 失敗: ${results.failedStores} 家`);
    console.log(`📦 總遷移商品數: ${results.totalMigratedItems}`);

    return results;

  } catch (error) {
    console.error('❌ 批次遷移失敗:', error);
    throw error;
  }
};

/**
 * 回滾遷移（恢復舊資料）
 * @param {string} storeId - 店家 ID
 * @param {string} storeType - 店家類型
 * @returns {Promise<boolean>}
 */
export const rollbackMigration = async (storeId, storeType) => {
  try {
    console.log('♻️ 開始回滾遷移...');

    const storeRef = doc(db, 'stores', storeType, 'list', storeId);
    const storeDoc = await storeRef.get();

    if (!storeDoc.exists()) {
      throw new Error('店家不存在');
    }

    const storeData = storeDoc.data();
    const categories = storeData.categories || [];

    let rolledBackCount = 0;

    // 遍歷商品，恢復舊資料
    categories.forEach(category => {
      if (category.items) {
        category.items.forEach(item => {
          if (item._oldData) {
            // 恢復舊欄位
            item.price = item._oldData.price;
            item.imageUrl = item._oldData.imageUrl;

            // 移除新欄位
            delete item.basePrice;
            delete item.images;
            delete item.hasVariants;
            delete item.variants;
            delete item.hasOptions;
            delete item.optionGroups;
            delete item._oldData;

            rolledBackCount++;
            console.log(`  ✅ 回滾成功: ${item.name}`);
          }
        });
      }
    });

    // 寫入 Firestore
    await updateDoc(storeRef, {
      categories: categories,
      migratedAt: null,
      rolledBackAt: new Date().toISOString()
    });

    console.log(`🎉 回滾完成！共回滾 ${rolledBackCount} 個商品`);

    return true;

  } catch (error) {
    console.error('❌ 回滾失敗:', error);
    throw error;
  }
};