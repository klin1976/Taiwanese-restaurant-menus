// src/utils/devLog.js
// 環境變數控制的日誌工具

const isDev = process.env.NODE_ENV === 'development';

/**
 * 開發環境日誌
 * 只在開發模式下輸出 console.log
 */
export const devLog = (...args) => {
  if (isDev) {
    console.log(...args);
  }
};

/**
 * 開發環境警告
 * 只在開發模式下輸出 console.warn
 */
export const devWarn = (...args) => {
  if (isDev) {
    console.warn(...args);
  }
};

/**
 * 開發環境錯誤
 * 只在開發模式下輸出 console.error
 */
export const devError = (...args) => {
  if (isDev) {
    console.error(...args);
  }
};

/**
 * 強制日誌（生產環境也會輸出）
 * 用於關鍵錯誤或重要訊息
 */
export const forceLog = (...args) => {
  console.log(...args);
};

/**
 * 強制警告（生產環境也會輸出）
 */
export const forceWarn = (...args) => {
  console.warn(...args);
};

/**
 * 強制錯誤（生產環境也會輸出）
 */
export const forceError = (...args) => {
  console.error(...args);
};

/**
 * 檢查是否為開發環境
 */
export const isDevEnvironment = () => isDev;