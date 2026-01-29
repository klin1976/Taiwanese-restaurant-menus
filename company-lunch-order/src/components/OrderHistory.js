// src/components/OrderHistory.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserOrders, ORDER_STATUS_TEXT } from '../services/orderService';

const OrderHistory = ({ onBack, onOrderSelect }) => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, completed

  useEffect(() => {
    if (currentUser) {
      fetchOrders();
    }
  }, [currentUser]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const userOrders = await getUserOrders(currentUser.uid);
      setOrders(userOrders);
    } catch (error) {
      console.error('獲取訂單失敗:', error);
      alert('獲取訂單失敗，請重試');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
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

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    if (filter === 'pending') return ['待確認', '已確認', '準備中', '可取餐'].includes(order.status);
    if (filter === 'completed') return ['已完成', '已取消'].includes(order.status);
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">載入訂單中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50">
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
              <h1 className="text-2xl font-bold text-gray-900">我的訂單</h1>
            </div>

            <button
              onClick={fetchOrders}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              重新整理
            </button>
          </div>

          {/* 篩選按鈕 */}
          <div className="flex space-x-2 mt-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              全部訂單
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'pending'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              進行中
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'completed'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              已完成
            </button>
          </div>
        </div>
      </div>

      {/* 訂單列表 */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">目前沒有訂單</h3>
            <p className="text-gray-600">您還沒有任何訂單記錄</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
              >
                {/* 訂單標頭 */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4">
                  <div className="flex items-center justify-between text-white">
                    <div>
                      <h3 className="text-xl font-bold">{order.restaurantName}</h3>
                      <p className="text-sm text-indigo-100 mt-1">
                        {order.createdAt?.toLocaleString('zh-TW', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold border-2 ${getStatusColor(order.status)}`}>
                        {ORDER_STATUS_TEXT[order.status] || order.status}
                      </div>
                      <p className="text-xl font-bold mt-2">NT$ {order.totalAmount}</p>
                    </div>
                  </div>
                </div>

                {/* 訂單項目 */}
                <div className="p-6">
                  <h4 className="font-bold text-gray-900 mb-3">訂購項目</h4>
                  <div className="space-y-3">
                    {order.items?.map((item, index) => (
                      <div key={index} className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <span className="font-medium text-gray-900">{item.name}</span>
                            <span className="ml-3 text-gray-600">x {item.quantity}</span>
                          </div>

                          {/* 顯示客製化資訊 */}
                          {item.customization && (
                            <div className="mt-2 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                <div className="flex items-center text-gray-700">
                                  <span className="mr-1">🍬</span>
                                  <span className="font-medium">甜度:</span>
                                  <span className="ml-1 text-indigo-700 font-semibold">
                                    {item.customization.sweetness}
                                  </span>
                                </div>
                                <div className="flex items-center text-gray-700">
                                  <span className="mr-1">🧊</span>
                                  <span className="font-medium">冰塊:</span>
                                  <span className="ml-1 text-indigo-700 font-semibold">
                                    {item.customization.ice}
                                  </span>
                                </div>
                              </div>

                              {item.customization.toppings && item.customization.toppings.length > 0 && (
                                <div className="mt-2 flex items-start text-sm text-gray-700">
                                  <span className="mr-1">➕</span>
                                  <div>
                                    <span className="font-medium">加料:</span>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {item.customization.toppings.map((topping, tIndex) => (
                                        <span
                                          key={tIndex}
                                          className="inline-block bg-white px-2 py-1 rounded border border-indigo-200 text-indigo-700 font-medium"
                                        >
                                          {topping.name} (+${topping.price})
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="ml-4 text-right">
                          <p className="font-bold text-indigo-600">NT$ {item.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 訂單資訊 */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">訂單編號:</span>
                        <p className="font-mono text-gray-900 mt-1">
                          {order.orderNumber || order.id}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">訂購人:</span>
                        <p className="text-gray-900 mt-1">{order.userName}</p>
                      </div>
                    </div>
                  </div>

                  {/* 操作按鈕 */}
                  {onOrderSelect && ['待確認', '已確認', '準備中', '可取餐'].includes(order.status) && (
                    <div className="mt-4">
                      <button
                        onClick={() => onOrderSelect(order)}
                        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                      >
                        查看詳情
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderHistory;