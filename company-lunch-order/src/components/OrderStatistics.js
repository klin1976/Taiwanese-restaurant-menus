// src/components/OrderStatistics.js
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { getUserRole, hasPermission, isAdmin } from '../utils/roleManagement';

const OrderStatistics = () => {
  const { currentUser } = useAuth();
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    storeType: 'all', // all, lunch, drinks
    storeId: 'all'
  });

  // 載入使用者角色
  useEffect(() => {
    const loadUserRole = async () => {
      if (currentUser) {
        const role = await getUserRole(currentUser.uid);
        setUserRole(role);
      }
      setLoading(false);
    };
    loadUserRole();
  }, [currentUser]);

  // 載入訂單資料
  useEffect(() => {
    if (userRole && hasPermission(userRole, 'view_all_orders')) {
      loadOrders();
    }
  }, [userRole, filters]);

  // 載入訂單資料
  const loadOrders = async () => {
    try {
      setLoading(true);
      const ordersRef = collection(db, 'orders');
      let q = query(ordersRef, orderBy('createdAt', 'desc'));

      // 套用日期篩選
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        startDate.setHours(0, 0, 0, 0);
        q = query(q, where('createdAt', '>=', startDate));
      }

      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        q = query(q, where('createdAt', '<=', endDate));
      }

      // 套用店家類型篩選
      if (filters.storeType !== 'all') {
        q = query(q, where('storeType', '==', filters.storeType));
      }

      // 套用特定店家篩選
      if (filters.storeId !== 'all') {
        q = query(q, where('storeId', '==', filters.storeId));
      }

      const snapshot = await getDocs(q);
      const ordersList = [];
      
      snapshot.forEach(doc => {
        ordersList.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        });
      });

      setOrders(ordersList);
      calculateStatistics(ordersList);
    } catch (error) {
      console.error('載入訂單失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  // 計算統計資料
  const calculateStatistics = (ordersList) => {
    const stats = {
      totalOrders: ordersList.length,
      totalAmount: 0,
      byStore: {},
      byUser: {},
      byDate: {},
      byStoreType: {
        lunch: { count: 0, amount: 0 },
        drinks: { count: 0, amount: 0 }
      },
      topItems: {}
    };

    ordersList.forEach(order => {
      // 總金額
      const orderTotal = order.totalAmount || 0;
      stats.totalAmount += orderTotal;

      // 依店家統計
      const storeName = order.storeName || '未知店家';
      if (!stats.byStore[storeName]) {
        stats.byStore[storeName] = { count: 0, amount: 0, storeId: order.storeId };
      }
      stats.byStore[storeName].count++;
      stats.byStore[storeName].amount += orderTotal;

      // 依使用者統計
      const userName = order.userName || '未知使用者';
      if (!stats.byUser[userName]) {
        stats.byUser[userName] = { count: 0, amount: 0, userId: order.userId };
      }
      stats.byUser[userName].count++;
      stats.byUser[userName].amount += orderTotal;

      // 依日期統計
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (!stats.byDate[dateKey]) {
        stats.byDate[dateKey] = { count: 0, amount: 0 };
      }
      stats.byDate[dateKey].count++;
      stats.byDate[dateKey].amount += orderTotal;

      // 依店家類型統計
      const storeType = order.storeType || 'lunch';
      stats.byStoreType[storeType].count++;
      stats.byStoreType[storeType].amount += orderTotal;

      // 熱門商品統計
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const itemName = item.name || '未知商品';
          if (!stats.topItems[itemName]) {
            stats.topItems[itemName] = { count: 0, totalQuantity: 0, price: item.price || 0 };
          }
          stats.topItems[itemName].count++;
          stats.topItems[itemName].totalQuantity += item.quantity || 1;
        });
      }
    });

    setStatistics(stats);
  };

  // 處理篩選器變更
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 重設篩選器
  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      storeType: 'all',
      storeId: 'all'
    });
  };

  // 匯出訂單資料
  const exportOrders = () => {
    if (!hasPermission(userRole, 'export_orders')) {
      alert('您沒有匯出權限');
      return;
    }

    const csvContent = generateCSV(orders);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 產生 CSV 內容
  const generateCSV = (data) => {
    const headers = ['訂單ID', '日期時間', '使用者', '店家', '店家類型', '商品', '數量', '單價', '小計', '訂單總額'];
    let csvContent = headers.join(',') + '\n';

    data.forEach(order => {
      const baseInfo = [
        order.id,
        order.createdAt.toLocaleString('zh-TW'),
        order.userName || '',
        order.storeName || '',
        order.storeType === 'lunch' ? '午餐' : '飲料',
      ];

      if (order.items && order.items.length > 0) {
        order.items.forEach((item, index) => {
          const row = [
            ...baseInfo,
            item.name || '',
            item.quantity || 1,
            item.price || 0,
            (item.price || 0) * (item.quantity || 1),
            index === 0 ? (order.totalAmount || 0) : ''
          ];
          csvContent += row.join(',') + '\n';
        });
      } else {
        const row = [...baseInfo, '', '', '', '', order.totalAmount || 0];
        csvContent += row.join(',') + '\n';
      }
    });

    return csvContent;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">載入中...</span>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">請先登入才能查看訂單統計</p>
      </div>
    );
  }

  if (!isAdmin(userRole)) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="font-semibold text-red-800 mb-2">❌ 權限不足</h3>
        <p className="text-red-700">您需要管理員權限才能查看訂單統計</p>
        <p className="text-sm text-red-600 mt-2">
          目前身份: {userRole?.role || '一般使用者'} ({currentUser.email})
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">📊 訂單統計分析</h2>
            <p className="text-gray-600 mt-1">
              管理員: {currentUser.displayName} ({userRole?.role})
            </p>
          </div>
          <button
            onClick={exportOrders}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition duration-200"
          >
            📄 匯出 CSV
          </button>
        </div>
      </div>

      {/* 篩選器 */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">🔍 資料篩選</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">開始日期</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">結束日期</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">店家類型</label>
            <select
              value={filters.storeType}
              onChange={(e) => handleFilterChange('storeType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部</option>
              <option value="lunch">午餐</option>
              <option value="drinks">飲料</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition duration-200"
            >
              🔄 重設篩選
            </button>
          </div>
        </div>
      </div>

      {/* 總覽統計 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 rounded-full p-3">
              <span className="text-2xl">📦</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">總訂單數</p>
              <p className="text-2xl font-bold text-gray-800">{statistics.totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex items-center">
            <div className="bg-green-100 rounded-full p-3">
              <span className="text-2xl">💰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">總金額</p>
              <p className="text-2xl font-bold text-gray-800">
                NT${statistics.totalAmount?.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex items-center">
            <div className="bg-orange-100 rounded-full p-3">
              <span className="text-2xl">🍱</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">午餐訂單</p>
              <p className="text-2xl font-bold text-gray-800">
                {statistics.byStoreType?.lunch?.count || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex items-center">
            <div className="bg-purple-100 rounded-full p-3">
              <span className="text-2xl">🧋</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">飲料訂單</p>
              <p className="text-2xl font-bold text-gray-800">
                {statistics.byStoreType?.drinks?.count || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 店家統計 */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">🏪 店家統計</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">店家名稱</th>
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">訂單數量</th>
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">總金額</th>
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">平均訂單金額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Object.entries(statistics.byStore || {})
                .sort(([,a], [,b]) => b.amount - a.amount)
                .map(([storeName, data]) => (
                <tr key={storeName} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-800">{storeName}</td>
                  <td className="px-4 py-2 text-center text-gray-600">{data.count}</td>
                  <td className="px-4 py-2 text-center text-gray-600">
                    NT${data.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-center text-gray-600">
                    NT${Math.round(data.amount / data.count).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 使用者統計 */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">👥 使用者統計</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">使用者</th>
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">訂單數量</th>
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">總消費金額</th>
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">平均消費</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Object.entries(statistics.byUser || {})
                .sort(([,a], [,b]) => b.amount - a.amount)
                .slice(0, 10) // 只顯示前10名
                .map(([userName, data]) => (
                <tr key={userName} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-800">{userName}</td>
                  <td className="px-4 py-2 text-center text-gray-600">{data.count}</td>
                  <td className="px-4 py-2 text-center text-gray-600">
                    NT${data.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-center text-gray-600">
                    NT${Math.round(data.amount / data.count).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 最近訂單 */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 最近訂單 (前20筆)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">訂單ID</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">日期時間</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">使用者</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">店家</th>
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">類型</th>
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">金額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.slice(0, 20).map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm text-gray-600 font-mono">
                    {order.id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {order.createdAt.toLocaleString('zh-TW')}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-800">
                    {order.userName || '未知使用者'}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-800">
                    {order.storeName || '未知店家'}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      order.storeType === 'lunch' 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {order.storeType === 'lunch' ? '🍱 午餐' : '🧋 飲料'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center font-medium text-gray-800">
                    NT${(order.totalAmount || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrderStatistics;