// src/services/statisticsService.js
import { getAllOrders } from './orderService';
import { isDateInRange } from '../utils/dateHelper';

/**
 * 統計服務
 * 處理訂單統計相關的業務邏輯
 */

/**
 * 獲取日期範圍內的訂單統計
 * @param {Date} startDate - 起始日期
 * @param {Date} endDate - 結束日期
 * @param {Array} statusFilter - 訂單狀態篩選（空陣列表示全部）
 * @returns {Promise<Array>} 過濾後的訂單陣列
 */
export const getOrderStatisticsByDateRange = async (startDate, endDate, statusFilter = []) => {
  try {
    console.log('查詢訂單統計:', {
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      statusFilter
    });

    // 獲取所有訂單
    const allOrders = await getAllOrders();
    
    console.log(`總訂單數: ${allOrders.length}`);

    // 前端過濾
    const filtered = allOrders.filter(order => {
      // 檢查日期範圍
      if (!order.createdAt) return false;
      const orderDate = order.createdAt instanceof Date 
        ? order.createdAt 
        : new Date(order.createdAt);
      
      const dateMatch = isDateInRange(orderDate, startDate, endDate);
      
      // 檢查訂單狀態
      const statusMatch = statusFilter.length === 0 || statusFilter.includes(order.status);
      
      return dateMatch && statusMatch;
    });

    console.log(`過濾後訂單數: ${filtered.length}`);
    
    return filtered;
    
  } catch (error) {
    console.error('獲取訂單統計失敗:', error);
    throw error;
  }
};

/**
 * 計算店家統計
 * @param {Array} orders - 訂單陣列
 * @returns {Array} 店家統計資料陣列
 */
export const calculateStoreStatistics = (orders) => {
  if (!orders || orders.length === 0) {
    return [];
  }

  // 按店家分組
  const storeMap = new Map();

  orders.forEach(order => {
    const storeId = order.restaurantId;
    const storeName = order.restaurantName || '未知店家';

    if (!storeMap.has(storeId)) {
      storeMap.set(storeId, {
        storeId,
        storeName,
        orderCount: 0,
        totalRevenue: 0,
        items: [],
        lastOrderTime: null,
        statusDistribution: {
          '待確認': 0,
          '已確認': 0,
          '準備中': 0,
          '可取餐': 0,
          '已完成': 0,
          '已取消': 0
        },
        uniqueUsers: new Set()
      });
    }

    const store = storeMap.get(storeId);

    // 累計訂單數和營業額
    store.orderCount += 1;
    store.totalRevenue += order.totalAmount || 0;

    // 記錄商品（用於計算熱門商品）
    if (order.items) {
      order.items.forEach(item => {
        store.items.push({
          name: item.name,
          quantity: item.quantity,
          price: item.price
        });
      });
    }

    // 更新最後訂單時間
    if (order.createdAt) {
      const orderTime = order.createdAt instanceof Date 
        ? order.createdAt 
        : new Date(order.createdAt);
      
      if (!store.lastOrderTime || orderTime > store.lastOrderTime) {
        store.lastOrderTime = orderTime;
      }
    }

    // 訂單狀態分布
    if (store.statusDistribution.hasOwnProperty(order.status)) {
      store.statusDistribution[order.status] += 1;
    }

    // 記錄不重複使用者
    if (order.userId) {
      store.uniqueUsers.add(order.userId);
    }
  });

  // 轉換為陣列並計算衍生數據
  const statistics = Array.from(storeMap.values()).map(store => {
    // 計算平均單價
    const avgOrderAmount = store.orderCount > 0 
      ? Math.round(store.totalRevenue / store.orderCount)
      : 0;

    // 計算熱門商品 Top 3
    const itemMap = new Map();
    store.items.forEach(item => {
      const name = item.name;
      if (!itemMap.has(name)) {
        itemMap.set(name, { name, totalQuantity: 0 });
      }
      itemMap.get(name).totalQuantity += item.quantity;
    });

    const popularItems = Array.from(itemMap.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 3)
      .map(item => item.name);

    // 計算營業額佔比（需要總營業額）
    const totalRevenue = Array.from(storeMap.values())
      .reduce((sum, s) => sum + s.totalRevenue, 0);
    
    const revenuePercentage = totalRevenue > 0
      ? ((store.totalRevenue / totalRevenue) * 100).toFixed(1)
      : 0;

    return {
      storeId: store.storeId,
      storeName: store.storeName,
      orderCount: store.orderCount,
      totalRevenue: store.totalRevenue,
      avgOrderAmount,
      popularItems,
      lastOrderTime: store.lastOrderTime,
      statusDistribution: store.statusDistribution,
      uniqueUserCount: store.uniqueUsers.size,
      revenuePercentage: parseFloat(revenuePercentage)
    };
  });

  // 按訂單數量降序排列
  return statistics.sort((a, b) => b.orderCount - a.orderCount);
};

/**
 * 計算總覽統計數據
 * @param {Array} orders - 訂單陣列
 * @returns {Object} 總覽統計物件
 */
export const calculateOverviewStats = (orders) => {
  if (!orders || orders.length === 0) {
    return {
      totalOrders: 0,
      totalRevenue: 0,
      avgOrderAmount: 0,
      activeStores: 0,
      uniqueUsers: 0,
      statusDistribution: {
        '待確認': 0,
        '已確認': 0,
        '準備中': 0,
        '可取餐': 0,
        '已完成': 0,
        '已取消': 0
      }
    };
  }

  // 計算總訂單數
  const totalOrders = orders.length;

  // 計算總營業額
  const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

  // 計算平均訂單金額
  const avgOrderAmount = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  // 計算活躍店家數（不重複）
  const activeStores = new Set(orders.map(order => order.restaurantId)).size;

  // 計算訂購人數（不重複）
  const uniqueUsers = new Set(orders.map(order => order.userId).filter(Boolean)).size;

  // 訂單狀態分布
  const statusDistribution = {
    '待確認': 0,
    '已確認': 0,
    '準備中': 0,
    '可取餐': 0,
    '已完成': 0,
    '已取消': 0
  };

  orders.forEach(order => {
    if (statusDistribution.hasOwnProperty(order.status)) {
      statusDistribution[order.status] += 1;
    }
  });

  return {
    totalOrders,
    totalRevenue,
    avgOrderAmount,
    activeStores,
    uniqueUsers,
    statusDistribution
  };
};

/**
 * 獲取完整統計資料（包含總覽和店家統計）
 * @param {Date} startDate - 起始日期
 * @param {Date} endDate - 結束日期
 * @param {Array} statusFilter - 訂單狀態篩選
 * @returns {Promise<Object>} 完整統計資料
 */
export const getFullStatistics = async (startDate, endDate, statusFilter = []) => {
  try {
    // 獲取訂單
    const orders = await getOrderStatisticsByDateRange(startDate, endDate, statusFilter);

    // 計算總覽統計
    const overview = calculateOverviewStats(orders);

    // 計算店家統計
    const stores = calculateStoreStatistics(orders);

    return {
      orders,
      overview,
      stores,
      dateRange: {
        startDate,
        endDate
      },
      filter: {
        statusFilter
      }
    };
  } catch (error) {
    console.error('獲取完整統計失敗:', error);
    throw error;
  }
};