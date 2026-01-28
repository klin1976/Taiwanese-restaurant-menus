// src/utils/devLog.js
// 環境變數控制的日誌工具

/**
 * 開發環境日誌工具
 * 只在開發模式下輸出，生產環境自動靜音
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * 一般日誌
 */
export const devLog = (...args) => {
  if (isDevelopment) {
    console.log(...args);
  }
};

/**
 * 警告日誌
 */
export const devWarn = (...args) => {
  if (isDevelopment) {
    console.warn(...args);
  }
};

/**
 * 錯誤日誌
 */
export const devError = (...args) => {
  if (isDevelopment) {
    console.error(...args);
  }
};

/**
 * 強制錯誤（生產環境也會顯示）
 */
export const forceError = (...args) => {
  console.error(...args);
};

/**
 * 分組日誌開始
 */
export const devGroup = (label) => {
  if (isDevelopment) {
    console.group(label);
  }
};

/**
 * 分組日誌結束
 */
export const devGroupEnd = () => {
  if (isDevelopment) {
    console.groupEnd();
  }
};

/**
 * 表格日誌
 */
export const devTable = (data) => {
  if (isDevelopment) {
    console.table(data);
  }
};
