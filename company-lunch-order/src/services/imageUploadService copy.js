// src/services/imageUploadService.js
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * 圖片上傳服務
 * 處理圖片上傳到 Firebase Storage
 */

/**
 * 驗證圖片檔案
 * @param {File} file - 檔案物件
 * @returns {Object} { valid: boolean, error: string }
 */
export const validateImageFile = (file) => {
  // 檢查檔案是否存在
  if (!file) {
    return { valid: false, error: '請選擇圖片檔案' };
  }

  // 檢查檔案大小（5MB）
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { valid: false, error: '圖片大小不能超過 5MB' };
  }

  // 檢查檔案類型
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: '只支援 JPG、PNG、WebP 格式' };
  }

  return { valid: true, error: null };
};

/**
 * 上傳圖片到 Firebase Storage
 * @param {File} file - 圖片檔案
 * @param {string} path - 儲存路徑（例如：'stores/store_id'）
 * @param {Function} onProgress - 上傳進度回調（可選）
 * @returns {Promise<string>} 圖片 URL
 */
export const uploadImage = async (file, path, onProgress = null) => {
  try {
    // 驗證檔案
    const validation = validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    console.log('📤 開始上傳圖片:', file.name);
    console.log('📂 上傳路徑:', path);

    // 生成檔案名稱（時間戳 + 原始檔名）
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const fullPath = `${path}/${fileName}`;

    // 建立 Storage 參考
    const storageRef = ref(storage, fullPath);

    // 上傳檔案
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type
    });

    console.log('✅ 圖片上傳成功');

    // 取得下載 URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('🔗 圖片 URL:', downloadURL);

    return downloadURL;

  } catch (error) {
    console.error('❌ 圖片上傳失敗:', error);
    throw error;
  }
};

/**
 * 刪除圖片
 * @param {string} imageUrl - 圖片 URL
 * @returns {Promise<boolean>} 是否成功
 */
export const deleteImage = async (imageUrl) => {
  try {
    if (!imageUrl) {
      console.warn('⚠️ 圖片 URL 為空，跳過刪除');
      return false;
    }

    // 從 URL 提取路徑
    const url = new URL(imageUrl);
    const path = decodeURIComponent(url.pathname.split('/o/')[1]?.split('?')[0]);

    if (!path) {
      console.warn('⚠️ 無法從 URL 提取路徑');
      return false;
    }

    console.log('🗑️ 刪除圖片:', path);

    const storageRef = ref(storage, path);
    await deleteObject(storageRef);

    console.log('✅ 圖片已刪除');
    return true;

  } catch (error) {
    // 如果檔案不存在，不視為錯誤
    if (error.code === 'storage/object-not-found') {
      console.warn('⚠️ 圖片不存在，可能已被刪除');
      return true;
    }

    console.error('❌ 刪除圖片失敗:', error);
    return false;
  }
};

/**
 * 壓縮圖片（前端壓縮，減少上傳時間）
 * @param {File} file - 原始檔案
 * @param {number} maxWidth - 最大寬度
 * @param {number} maxHeight - 最大高度
 * @param {number} quality - 壓縮品質 (0-1)
 * @returns {Promise<File>} 壓縮後的檔案
 */
export const compressImage = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // 計算新尺寸（保持比例）
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // 轉換為 Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // 建立新的 File 物件
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });

              console.log('📦 圖片壓縮完成');
              console.log('原始大小:', (file.size / 1024).toFixed(2), 'KB');
              console.log('壓縮後:', (compressedFile.size / 1024).toFixed(2), 'KB');

              resolve(compressedFile);
            } else {
              reject(new Error('圖片壓縮失敗'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('圖片載入失敗'));
      };

      img.src = e.target.result;
    };

    reader.onerror = () => {
      reject(new Error('檔案讀取失敗'));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * 上傳店家圖片
 * @param {File} file - 圖片檔案
 * @param {string} storeId - 店家 ID
 * @param {string} type - 店家類型
 * @returns {Promise<string>} 圖片 URL
 */
export const uploadStoreImage = async (file, storeId, type) => {
  try {
    // 壓縮圖片
    const compressedFile = await compressImage(file, 800, 600, 0.8);
    
    // 上傳
    const path = `stores/${type}/${storeId}`;
    const url = await uploadImage(compressedFile, path);
    
    return url;

  } catch (error) {
    console.error('❌ 上傳店家圖片失敗:', error);
    throw error;
  }
};

/**
 * 上傳商品圖片
 * @param {File} file - 圖片檔案
 * @param {string} storeId - 店家 ID
 * @param {string} type - 店家類型
 * @param {string} itemId - 商品 ID
 * @returns {Promise<string>} 圖片 URL
 */
export const uploadItemImage = async (file, storeId, type, itemId) => {
  try {
    // 壓縮圖片（商品圖小一點）
    const compressedFile = await compressImage(file, 600, 600, 0.8);
    
    // 上傳
    const path = `stores/${type}/${storeId}/items/${itemId}`;
    const url = await uploadImage(compressedFile, path);
    
    return url;

  } catch (error) {
    console.error('❌ 上傳商品圖片失敗:', error);
    throw error;
  }
};