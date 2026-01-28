// src/utils/imageUtils.js

/**
 * 圖片處理工具函數
 * 用於裁切、壓縮、轉換等操作
 */

/**
 * 從裁切區域建立裁切後的圖片
 * @param {string} imageSrc - 圖片來源
 * @param {Object} pixelCrop - 裁切區域 {x, y, width, height}
 * @param {number} quality - 壓縮品質 (0-1)
 * @returns {Promise<Blob>} 裁切後的圖片 Blob
 */
export const getCroppedImg = async (imageSrc, pixelCrop, quality = 0.8) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('無法取得 canvas context');
  }

  // 設定 canvas 尺寸為裁切區域大小
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // 繪製裁切後的圖片
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // 轉換為 Blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas to Blob 轉換失敗'));
        }
      },
      'image/jpeg',
      quality
    );
  });
};

/**
 * 建立圖片物件
 * @param {string} url - 圖片 URL
 * @returns {Promise<HTMLImageElement>}
 */
const createImage = (url) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
};

/**
 * 計算裁切後的圖片尺寸（保持最大尺寸限制）
 * @param {number} width - 原始寬度
 * @param {number} height - 原始高度
 * @param {number} maxWidth - 最大寬度
 * @param {number} maxHeight - 最大高度
 * @returns {Object} {width, height}
 */
export const calculateCropSize = (width, height, maxWidth, maxHeight) => {
  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio)
  };
};

/**
 * 壓縮圖片（保持比例）
 * @param {File} file - 原始檔案
 * @param {number} maxWidth - 最大寬度
 * @param {number} maxHeight - 最大高度
 * @param {number} quality - 壓縮品質 (0-1)
 * @returns {Promise<File>} 壓縮後的檔案
 */
export const compressImage = async (file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

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

        canvas.toBlob(
          (blob) => {
            if (blob) {
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

      img.onerror = () => reject(new Error('圖片載入失敗'));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error('檔案讀取失敗'));
    reader.readAsDataURL(file);
  });
};

/**
 * 驗證圖片尺寸
 * @param {File} file - 圖片檔案
 * @returns {Promise<Object>} {width, height, valid, message}
 */
export const validateImageDimensions = async (file) => {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      const { width, height } = img;
      
      // 最小尺寸檢查（建議至少 400x400）
      if (width < 400 || height < 400) {
        resolve({
          width,
          height,
          valid: false,
          message: '圖片尺寸太小，建議至少 400x400 像素'
        });
      } else {
        resolve({
          width,
          height,
          valid: true,
          message: '圖片尺寸符合要求'
        });
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: 0,
        height: 0,
        valid: false,
        message: '無法讀取圖片尺寸'
      });
    };
    
    img.src = url;
  });
};

/**
 * 取得圖片的 Data URL
 * @param {File} file - 圖片檔案
 * @returns {Promise<string>} Data URL
 */
export const getImageDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

/**
 * 批次壓縮多張圖片
 * @param {File[]} files - 圖片檔案陣列
 * @param {number} maxWidth - 最大寬度
 * @param {number} maxHeight - 最大高度
 * @param {number} quality - 壓縮品質
 * @returns {Promise<File[]>} 壓縮後的檔案陣列
 */
export const compressMultipleImages = async (files, maxWidth = 1200, maxHeight = 1200, quality = 0.8) => {
  const promises = files.map(file => compressImage(file, maxWidth, maxHeight, quality));
  return Promise.all(promises);
};