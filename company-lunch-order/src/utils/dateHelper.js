// src/utils/dateHelper.js

/**
 * 日期工具函數
 * 用於統計頁面的日期處理
 */

/**
 * 格式化日期為指定格式
 * @param {Date} date - 日期物件
 * @param {string} format - 格式 ('YYYY-MM-DD' | 'YYYY/MM/DD' | 'MM/DD')
 * @returns {string} 格式化後的日期字串
 */
export const formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date || !(date instanceof Date)) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'YYYY/MM/DD':
      return `${year}/${month}/${day}`;
    case 'MM/DD':
      return `${month}/${day}`;
    default:
      return `${year}-${month}-${day}`;
  }
};

/**
 * 格式化日期時間
 * @param {Date} date - 日期物件
 * @returns {string} 格式化後的日期時間字串
 */
export const formatDateTime = (date) => {
  if (!date || !(date instanceof Date)) return '';
  
  const dateStr = formatDate(date, 'YYYY-MM-DD');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${dateStr} ${hours}:${minutes}:${seconds}`;
};

/**
 * 獲取本週起始日（週日）
 * @param {Date} date - 參考日期
 * @returns {Date} 週日的日期
 */
export const getWeekStart = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 (週日) 到 6 (週六)
  const diff = day; // 往前推幾天到週日
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * 獲取本週結束日（週六）
 * @param {Date} date - 參考日期
 * @returns {Date} 週六的日期
 */
export const getWeekEnd = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = 6 - day; // 往後推幾天到週六
  d.setDate(d.getDate() + diff);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * 獲取月份起始日
 * @param {Date} date - 參考日期
 * @returns {Date} 月初第一天
 */
export const getMonthStart = (date = new Date()) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * 獲取月份結束日
 * @param {Date} date - 參考日期
 * @returns {Date} 月底最後一天
 */
export const getMonthEnd = (date = new Date()) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * 獲取今日起始時間
 * @returns {Date} 今日 00:00:00
 */
export const getTodayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * 獲取今日結束時間
 * @returns {Date} 今日 23:59:59
 */
export const getTodayEnd = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * 驗證日期範圍（最多30天）
 * @param {Date} startDate - 起始日期
 * @param {Date} endDate - 結束日期
 * @returns {Object} { valid: boolean, message: string, days: number }
 */
export const validateDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return { valid: false, message: '請選擇日期範圍', days: 0 };
  }
  
  if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
    return { valid: false, message: '日期格式錯誤', days: 0 };
  }
  
  if (startDate > endDate) {
    return { valid: false, message: '起始日期不能晚於結束日期', days: 0 };
  }
  
  const diffTime = Math.abs(endDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > 30) {
    return { valid: false, message: '日期範圍不能超過30天', days: diffDays };
  }
  
  return { valid: true, message: '日期範圍有效', days: diffDays };
};

/**
 * 生成日期範圍顯示文字
 * @param {Date} startDate - 起始日期
 * @param {Date} endDate - 結束日期
 * @returns {string} 日期範圍文字
 */
export const getDateRangeText = (startDate, endDate) => {
  if (!startDate || !endDate) return '';
  
  const start = formatDate(startDate, 'YYYY/MM/DD');
  const end = formatDate(endDate, 'YYYY/MM/DD');
  
  if (start === end) {
    return start;
  }
  
  return `${start} - ${end}`;
};

/**
 * 獲取預設日期範圍
 * @param {string} preset - 預設選項 ('today' | 'week' | 'month')
 * @returns {Object} { startDate: Date, endDate: Date, label: string }
 */
export const getPresetDateRange = (preset) => {
  const now = new Date();
  
  switch (preset) {
    case 'today':
      return {
        startDate: getTodayStart(),
        endDate: getTodayEnd(),
        label: '今日'
      };
    
    case 'week':
      return {
        startDate: getWeekStart(now),
        endDate: now, // 週日到今天
        label: '本週'
      };
    
    case 'month':
      return {
        startDate: getMonthStart(now),
        endDate: now, // 月初到今天
        label: '本月'
      };
    
    default:
      return {
        startDate: getTodayStart(),
        endDate: getTodayEnd(),
        label: '今日'
      };
  }
};

/**
 * 計算兩個日期之間的天數
 * @param {Date} startDate - 起始日期
 * @param {Date} endDate - 結束日期
 * @returns {number} 天數
 */
export const getDaysBetween = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const diffTime = Math.abs(endDate - startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * 檢查是否為今日
 * @param {Date} date - 要檢查的日期
 * @returns {boolean} 是否為今日
 */
export const isToday = (date) => {
  if (!date || !(date instanceof Date)) return false;
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

/**
 * 檢查是否在日期範圍內
 * @param {Date} date - 要檢查的日期
 * @param {Date} startDate - 起始日期
 * @param {Date} endDate - 結束日期
 * @returns {boolean} 是否在範圍內
 */
export const isDateInRange = (date, startDate, endDate) => {
  if (!date || !startDate || !endDate) return false;
  return date >= startDate && date <= endDate;
};