// src/utils/csvExporter.js
import Papa from 'papaparse';
import { formatDateTime } from './dateHelper';

/**
 * CSV 匯出工具
 * 使用 papaparse 處理 CSV 格式
 */

/**
 * 將訂單資料轉換為 CSV 格式
 * @param {Array} orders - 訂單陣列
 * @param {Object} options - 匯出選項
 * @returns {string} CSV 字串
 */
export const convertOrdersToCSV = (orders, options = {}) => {
  if (!orders || orders.length === 0) {
    return '';
  }

  const {
    includeCustomization = true,
    includeUserInfo = true,
  } = options;

  // 展開訂單項目（一個訂單多個商品會展開成多行）
  const expandedData = [];

  orders.forEach(order => {
    if (!order.items || order.items.length === 0) {
      // 如果沒有商品，至少保留訂單基本資訊
      expandedData.push(createCSVRow(order, null, includeCustomization, includeUserInfo));
    } else {
      // 每個商品一行
      order.items.forEach(item => {
        expandedData.push(createCSVRow(order, item, includeCustomization, includeUserInfo));
      });
    }
  });

  // 使用 papaparse 轉換為 CSV
  const csv = Papa.unparse(expandedData, {
    header: true,
    encoding: 'utf-8',
    skipEmptyLines: true
  });

  // 加入 UTF-8 BOM（讓 Excel 正確識別編碼）
  const BOM = '\uFEFF';
  return BOM + csv;
};

/**
 * 建立 CSV 資料行
 * @param {Object} order - 訂單物件
 * @param {Object} item - 商品物件
 * @param {boolean} includeCustomization - 是否包含客製化資訊
 * @param {boolean} includeUserInfo - 是否包含使用者資訊
 * @returns {Object} CSV 資料行物件
 */
const createCSVRow = (order, item, includeCustomization, includeUserInfo) => {
  const row = {
    '訂單編號': order.orderNumber || order.id || '',
    '訂購日期': order.createdAt ? formatDateTime(order.createdAt).split(' ')[0] : '',
    '訂購時間': order.createdAt ? formatDateTime(order.createdAt).split(' ')[1] : '',
  };

  // 使用者資訊
  if (includeUserInfo) {
    row['使用者姓名'] = order.userName || '';
    row['使用者Email'] = order.userEmail || '';
  }

  // 餐廳資訊
  row['餐廳名稱'] = order.restaurantName || '';

  // 商品資訊
  if (item) {
    row['商品名稱'] = item.name || '';
    row['數量'] = item.quantity || 0;
    row['單價'] = item.price || 0;
    row['小計'] = (item.price || 0) * (item.quantity || 0);

    // 客製化資訊（飲料）
    if (includeCustomization && item.customization) {
      row['甜度'] = item.customization.sweetness || '';
      row['冰塊'] = item.customization.ice || '';

      // 加料
      if (item.customization.toppings && item.customization.toppings.length > 0) {
        const toppingNames = item.customization.toppings.map(t => t.name).join('、');
        const toppingPrices = item.customization.toppings.reduce((sum, t) => sum + (t.price || 0), 0);
        row['加料'] = toppingNames;
        row['加料金額'] = toppingPrices;
      } else {
        row['加料'] = '';
        row['加料金額'] = 0;
      }
    } else {
      row['甜度'] = '';
      row['冰塊'] = '';
      row['加料'] = '';
      row['加料金額'] = '';
    }
  } else {
    row['商品名稱'] = '';
    row['數量'] = 0;
    row['單價'] = 0;
    row['小計'] = 0;
    row['甜度'] = '';
    row['冰塊'] = '';
    row['加料'] = '';
    row['加料金額'] = '';
  }

  // 訂單總金額和狀態
  row['訂單總金額'] = order.totalAmount || 0;
  row['訂單狀態'] = getStatusText(order.status);

  return row;
};

/**
 * 獲取訂單狀態文字
 * @param {string} status - 訂單狀態
 * @returns {string} 狀態文字
 */
const getStatusText = (status) => {
  const statusMap = {
    '待確認': '待確認',
    '已確認': '已確認',
    '準備中': '準備中',
    '可取餐': '可取餐',
    '已完成': '已完成',
    '已取消': '已取消'
  };
  return statusMap[status] || status || '';
};

/**
 * 觸發 CSV 檔案下載
 * @param {string} csvContent - CSV 內容
 * @param {string} filename - 檔案名稱
 */
export const downloadCSV = (csvContent, filename) => {
  if (!csvContent) {
    console.error('CSV 內容為空');
    return;
  }

  // 建立 Blob
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  // 建立下載連結
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  // 觸發下載
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // 釋放 URL
  URL.revokeObjectURL(url);
};

/**
 * 生成檔案名稱
 * @param {string} prefix - 檔案名稱前綴
 * @param {Date} startDate - 起始日期（可選）
 * @param {Date} endDate - 結束日期（可選）
 * @returns {string} 完整檔案名稱
 */
export const generateFileName = (prefix = '訂單統計報表', startDate = null, endDate = null) => {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/[-:T]/g, '').slice(0, 14);

  let filename = prefix;

  // 如果有日期範圍，加入日期資訊
  if (startDate && endDate) {
    const startStr = startDate.toISOString().slice(0, 10).replace(/-/g, '');
    const endStr = endDate.toISOString().slice(0, 10).replace(/-/g, '');

    if (startStr === endStr) {
      filename += `_${startStr}`;
    } else {
      filename += `_${startStr}-${endStr}`;
    }
  }

  filename += `_${timestamp}.csv`;

  return filename;
};

/**
 * 匯出訂單統計（主要對外介面）
 * @param {Array} orders - 訂單陣列
 * @param {Date} startDate - 起始日期
 * @param {Date} endDate - 結束日期
 * @param {Object} options - 匯出選項
 */
export const exportOrderStatistics = (orders, startDate, endDate, options = {}) => {
  try {
    // 轉換為 CSV
    const csvContent = convertOrdersToCSV(orders, options);

    if (!csvContent) {
      alert('沒有資料可以匯出');
      return;
    }

    // 生成檔案名稱
    const filename = generateFileName('訂單統計報表', startDate, endDate);

    // 下載檔案
    downloadCSV(csvContent, filename);

    console.log(`成功匯出 ${orders.length} 筆訂單`);
  } catch (error) {
    console.error('匯出 CSV 失敗:', error);
    alert('匯出失敗，請稍後再試');
  }
};