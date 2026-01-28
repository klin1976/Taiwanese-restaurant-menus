// src/services/pinyinService.js
import pinyin from 'pinyin';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * 拼音轉換服務
 * 用於生成店家 ID
 */

/**
 * 將中文店名轉換為拼音 ID
 * @param {string} storeName - 店家名稱
 * @param {string} type - 店家類型 ('lunch' | 'drinks')
 * @returns {string} 拼音 ID
 */
export const generateStoreId = (storeName, type = 'lunch') => {
  try {
    // 將中文轉為拼音
    const pinyinArray = pinyin(storeName, {
      style: pinyin.STYLE_NORMAL, // 不帶聲調
      heteronym: false // 不顯示多音字
    });
    
    // 將二維陣列扁平化並用底線連接
    let id = pinyinArray
      .flat()
      .join('_')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, ''); // 移除非字母數字底線的字元
    
    // 如果轉換後為空（例如全是特殊符號），使用類型加時間戳
    if (!id || id.length === 0) {
      id = `${type}_${Date.now()}`;
    }
    
    // 移除開頭和結尾的底線
    id = id.replace(/^_+|_+$/g, '');
    
    // 將多個連續底線替換為單一底線
    id = id.replace(/_+/g, '_');
    
    return id;
    
  } catch (error) {
    console.error('拼音轉換失敗:', error);
    // 如果轉換失敗，使用類型加時間戳
    return `${type}_${Date.now()}`;
  }
};

/**
 * 檢查店家 ID 是否已存在
 * @param {string} storeId - 店家 ID
 * @param {string} type - 店家類型 ('lunch' | 'drinks')
 * @returns {Promise<boolean>} 是否存在
 */
export const checkStoreIdExists = async (storeId, type) => {
  try {
    const storesRef = collection(db, 'stores', type, 'list');
    const q = query(storesRef, where('id', '==', storeId));
    const snapshot = await getDocs(q);
    
    return !snapshot.empty;
    
  } catch (error) {
    console.error('檢查 ID 是否存在失敗:', error);
    return false;
  }
};

/**
 * 生成唯一的店家 ID
 * @param {string} storeName - 店家名稱
 * @param {string} type - 店家類型 ('lunch' | 'drinks')
 * @returns {Promise<string>} 唯一的店家 ID
 */
export const generateUniqueStoreId = async (storeName, type) => {
  let baseId = generateStoreId(storeName, type);
  let finalId = baseId;
  let counter = 1;
  
  // 檢查 ID 是否重複，如果重複則加上數字後綴
  while (await checkStoreIdExists(finalId, type)) {
    finalId = `${baseId}_${counter}`;
    counter++;
    
    // 防止無限迴圈
    if (counter > 100) {
      finalId = `${type}_${Date.now()}`;
      break;
    }
  }
  
  return finalId;
};

/**
 * 驗證店家 ID 格式
 * @param {string} storeId - 店家 ID
 * @returns {Object} { valid: boolean, message: string }
 */
export const validateStoreId = (storeId) => {
  if (!storeId || storeId.trim() === '') {
    return { valid: false, message: '店家代碼不能為空' };
  }
  
  // 只允許小寫字母、數字和底線
  const validPattern = /^[a-z0-9_]+$/;
  if (!validPattern.test(storeId)) {
    return { valid: false, message: '店家代碼只能包含小寫字母、數字和底線' };
  }
  
  // 不能以底線開頭或結尾
  if (storeId.startsWith('_') || storeId.endsWith('_')) {
    return { valid: false, message: '店家代碼不能以底線開頭或結尾' };
  }
  
  // 不能包含連續的底線
  if (storeId.includes('__')) {
    return { valid: false, message: '店家代碼不能包含連續的底線' };
  }
  
  // 長度限制
  if (storeId.length < 2) {
    return { valid: false, message: '店家代碼至少需要 2 個字元' };
  }
  
  if (storeId.length > 50) {
    return { valid: false, message: '店家代碼不能超過 50 個字元' };
  }
  
  return { valid: true, message: '店家代碼格式正確' };
};