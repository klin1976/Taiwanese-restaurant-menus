// src/components/admin/OrderStatistics.js
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getFullStatistics } from '../../services/statisticsService';
import { exportOrderStatistics } from '../../utils/csvExporter';
import OrderStatusManager from '../OrderStatusManager';
import { 
  getPresetDateRange, 
  validateDateRange, 
  getDateRangeText,
  formatDate,
  formatDateTime 
} from '../../utils/dateHelper';

const OrderStatistics = ({ onBack }) => {
  const { currentUser, hasPermission } = useAuth();
  
  // 狀態管理
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);
  const [datePreset, setDatePreset] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState(['已完成']); // 預設只統計已完成
  const [sortBy, setSortBy] = useState('orderCount'); // 排序欄位
  const [sortOrder, setSortOrder] = useState('desc'); // 排序方向
  const [exporting, setExporting] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showStatusManager, setShowStatusManager] = useState(false);

  // 檢查權限
  useEffect(() => {
    if (currentUser && !hasPermission('canViewStatistics')) {
      alert('您沒有權限查看統計資料');
      onBack();
    }
  }, [currentUser, hasPermission, onBack]);

  // 載入統計資料
  useEffect(() => {
    fetchStatistics();
  }, [datePreset, customStartDate, customEndDate, statusFilter]);

  // 獲取日期範圍
  const getDateRange = () => {
    if (datePreset === 'custom') {
      if (!customStartDate || !customEndDate) {
        return null;
      }
      const startDate = new Date(customStartDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(customEndDate);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    } else {
      return getPresetDateRange(datePreset);
    }
  };

  // 載入統計資料
  const fetchStatistics = async () => {
    try {
      setLoading(true);

      const dateRange = getDateRange();
      if (!dateRange) {
        setStatistics(null);
        setLoading(false);
        return;
      }

      const { startDate, endDate } = dateRange;

      // 驗證日期範圍
      const validation = validateDateRange(startDate, endDate);
      if (!validation.valid) {
        alert(validation.message);
        setLoading(false);
        return;
      }

      console.log('載入統計資料:', { startDate, endDate, statusFilter });

      const stats = await getFullStatistics(startDate, endDate, statusFilter);
      setStatistics(stats);

    } catch (error) {
      console.error('載入統計失敗:', error);
      alert('載入統計資料失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  // 排序後的店家統計
  const sortedStores = useMemo(() => {
    if (!statistics?.stores) return [];

    const sorted = [...statistics.stores].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // 特殊處理：最後訂單時間
      if (sortBy === 'lastOrderTime') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return sorted;
  }, [statistics, sortBy, sortOrder]);

  // 切換排序
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // 切換訂單狀態篩選
  const toggleStatusFilter = (status) => {
    setStatusFilter(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status);
      } else {
        return [...prev, status];
      }
    });
  };

  // 匯出 CSV
  const handleExport = async () => {
    if (!statistics || !statistics.orders || statistics.orders.length === 0) {
      alert('沒有資料可以匯出');
      return;
    }

    if (!hasPermission('canExportReports')) {
      alert('您沒有權限匯出報表');
      return;
    }

    setExporting(true);
    try {
      const dateRange = getDateRange();
      exportOrderStatistics(
        statistics.orders,
        dateRange.startDate,
        dateRange.endDate,
        {
          includeCustomization: true,
          includeUserInfo: true
        }
      );
      alert('報表匯出成功！');
    } catch (error) {
      console.error('匯出失敗:', error);
      alert('匯出失敗，請稍後再試');
    } finally {
      setExporting(false);
    }
  };

  // 處理訂單狀態更新並刷新統計
  const handleOrderStatusUpdate = (updatedOrder) => {
    fetchStatistics();
  };

  // 訂單狀態選項
  const statusOptions = [
    { value: '待確認', label: '待確認', color: 'yellow' },
    { value: '已確認', label: '已確認', color: 'blue' },
    { value: '準備中', label: '準備中', color: 'purple' },
    { value: '可取餐', label: '可取餐', color: 'green' },
    { value: '已完成', label: '已完成', color: 'gray' },
    { value: '已取消', label: '已取消', color: 'red' }
  ];

  // 獲取狀態顏色樣式
  const getStatusBadgeStyle = (status) => {
    const colors = {
      '待確認': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      '已確認': 'bg-blue-100 text-blue-800 border-blue-300',
      '準備中': 'bg-purple-100 text-purple-800 border-purple-300',
      '可取餐': 'bg-green-100 text-green-800 border-green-300',
      '已完成': 'bg-gray-100 text-gray-800 border-gray-300',
      '已取消': 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  // 載入中狀態
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">載入統計資料中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50 relative">
      {/* 狀態管理彈窗 */}
      {showStatusManager && selectedOrder && (
        <OrderStatusManager
          order={selectedOrder}
          onStatusUpdate={handleOrderStatusUpdate}
          onClose={() => setShowStatusManager(false)}
        />
      )}

      {/* 標頭 */}
      <div className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">📊 訂單統計</h1>
                <p className="text-sm text-gray-600 mt-1">
                  {statistics && getDateRangeText(statistics.dateRange.startDate, statistics.dateRange.endDate)}
                </p>
              </div>
            </div>
            
            {/* 重新整理按鈕 */}
            <button
              onClick={fetchStatistics}
              disabled={loading}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center disabled:bg-gray-400"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              重新整理
            </button>
          </div>

          {/* 時間篩選器 */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setDatePreset('today')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                datePreset === 'today'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              今日
            </button>
            <button
              onClick={() => setDatePreset('week')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                datePreset === 'week'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              本週
            </button>
            <button
              onClick={() => setDatePreset('month')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                datePreset === 'month'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              本月
            </button>
            <button
              onClick={() => setDatePreset('custom')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                datePreset === 'custom'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              自訂範圍
            </button>

            {/* 自訂日期輸入 */}
            {datePreset === 'custom' && (
              <>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <span className="text-gray-600">至</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </>
            )}
          </div>

          {/* 訂單狀態篩選 */}
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">訂單狀態篩選：</p>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map(option => (
                <label
                  key={option.value}
                  className={`flex items-center px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    statusFilter.includes(option.value)
                      ? `bg-${option.color}-100 border-2 border-${option.color}-500`
                      : 'bg-gray-100 border-2 border-transparent hover:bg-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={statusFilter.includes(option.value)}
                    onChange={() => toggleStatusFilter(option.value)}
                    className="mr-2"
                  />
                  <span className={`text-sm font-medium ${
                    statusFilter.includes(option.value) ? `text-${option.color}-800` : 'text-gray-700'
                  }`}>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 檢查是否有資料 */}
        {!statistics || statistics.orders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">目前沒有訂單資料</h3>
            <p className="text-gray-600">請選擇其他日期範圍或調整篩選條件</p>
          </div>
        ) : (
          <>
            {/* 總覽卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* 總訂單數 */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">總訂單數</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {statistics.overview.totalOrders}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* 總營業額 */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">總營業額</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">
                      ${statistics.overview.totalRevenue.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* 平均訂單金額 */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">平均訂單金額</p>
                    <p className="text-3xl font-bold text-purple-600 mt-1">
                      ${statistics.overview.avgOrderAmount}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* 營業店家數 */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">營業店家數</p>
                    <p className="text-3xl font-bold text-orange-600 mt-1">
                      {statistics.overview.activeStores}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* 店家統計表格 */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">店家統計</h2>
                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {exporting ? '匯出中...' : '匯出 CSV'}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th 
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('storeName')}
                      >
                        <div className="flex items-center">
                          店家名稱
                          {sortBy === 'storeName' && (
                            <svg className={`w-4 h-4 ml-1 ${sortOrder === 'desc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('orderCount')}
                      >
                        <div className="flex items-center">
                          訂單數量
                          {sortBy === 'orderCount' && (
                            <svg className={`w-4 h-4 ml-1 ${sortOrder === 'desc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('totalRevenue')}
                      >
                        <div className="flex items-center">
                          總營業額
                          {sortBy === 'totalRevenue' && (
                            <svg className={`w-4 h-4 ml-1 ${sortOrder === 'desc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('avgOrderAmount')}
                      >
                        <div className="flex items-center">
                          平均單價
                          {sortBy === 'avgOrderAmount' && (
                            <svg className={`w-4 h-4 ml-1 ${sortOrder === 'desc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('uniqueUserCount')}
                      >
                        <div className="flex items-center">
                          訂購人數
                          {sortBy === 'uniqueUserCount' && (
                            <svg className={`w-4 h-4 ml-1 ${sortOrder === 'desc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        熱門商品
                      </th>
                      <th 
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('lastOrderTime')}
                      >
                        <div className="flex items-center">
                          最後訂單
                          {sortBy === 'lastOrderTime' && (
                            <svg className={`w-4 h-4 ml-1 ${sortOrder === 'desc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('revenuePercentage')}
                      >
                        <div className="flex items-center">
                          營業額佔比
                          {sortBy === 'revenuePercentage' && (
                            <svg className={`w-4 h-4 ml-1 ${sortOrder === 'desc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedStores.map((store, index) => (
                      <tr key={store.storeId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-orange-700 font-bold text-sm">
                                #{index + 1}
                              </span>
                            </div>
                            <div className="font-medium text-gray-900">{store.storeName}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-900 font-semibold">{store.orderCount}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-green-600 font-bold">
                            ${store.totalRevenue.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-900">${store.avgOrderAmount}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-900">{store.uniqueUserCount} 人</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">
                            {store.popularItems.length > 0 ? (
                              store.popularItems.map((item, idx) => (
                                <div key={idx} className="flex items-center">
                                  <span className="text-orange-500 mr-1">•</span>
                                  {item}
                                </div>
                              ))
                            ) : (
                              <span className="text-gray-400">無資料</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {store.lastOrderTime ? formatDateTime(store.lastOrderTime) : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className="bg-orange-500 h-2 rounded-full" 
                                style={{ width: `${store.revenuePercentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {store.revenuePercentage}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

             {sortedStores.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🏪</div>
                  <p className="text-gray-600">目前沒有店家統計資料</p>
                </div>
              )}
            </div>

            {/* 訂單狀態分布 */}
            <div className="mt-6 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">訂單狀態分布</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries(statistics.overview.statusDistribution).map(([status, count]) => {
                  const statusColors = {
                    '待確認': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
                    '已確認': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
                    '準備中': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
                    '可取餐': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
                    '已完成': { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
                    '已取消': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' }
                  };
                  const colors = statusColors[status] || statusColors['已完成'];

                  return (
                    <div 
                      key={status}
                      className={`${colors.bg} ${colors.border} border-2 rounded-lg p-4 text-center`}
                    >
                      <p className={`text-2xl font-bold ${colors.text}`}>{count}</p>
                      <p className={`text-sm ${colors.text} mt-1`}>{status}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 所有訂單明細列表 (管理員視角) */}
            <div className="mt-6 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">總覽清單與狀態管理</h2>
                <p className="text-sm text-gray-500 mt-1">您可在此全域更新各員工的訂單狀態</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">下單時間</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">訂購人</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">店家</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">餐點內容</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">金額</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">狀態</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {statistics.orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatDateTime(order.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{order.userName}</div>
                          <div className="text-xs text-gray-500">{order.userEmail}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {order.restaurantName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={order.items?.map(i => i.name).join(', ')}>
                          {order.items?.map(i => i.name).join(', ')}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">
                          ${order.totalAmount}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusBadgeStyle(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowStatusManager(true);
                            }}
                            className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                          >
                            更新狀態
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OrderStatistics;