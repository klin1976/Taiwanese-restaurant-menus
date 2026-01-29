// src/components/OrderStatusManager.js
import React, { useState } from 'react';
import { updateOrderStatus, ORDER_STATUS, ORDER_STATUS_TEXT } from '../services/orderService';

const OrderStatusManager = ({ order, onStatusUpdate, onClose }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [notes, setNotes] = useState(order.notes || '');

  const handleStatusUpdate = async (newStatus) => {
    if (newStatus === order.status) return;

    setIsUpdating(true);
    try {
      await updateOrderStatus(order.id, newStatus, notes);
      if (onStatusUpdate) {
        onStatusUpdate({ ...order, status: newStatus, notes });
      }
      onClose();
    } catch (error) {
      console.error('更新訂單狀態失敗:', error);
      alert('更新訂單狀態失敗，請稍後再試');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500 hover:bg-yellow-600',
      confirmed: 'bg-blue-500 hover:bg-blue-600',
      preparing: 'bg-orange-500 hover:bg-orange-600',
      ready: 'bg-green-500 hover:bg-green-600',
      completed: 'bg-gray-500 hover:bg-gray-600',
      cancelled: 'bg-red-500 hover:bg-red-600'
    };
    return colors[status] || 'bg-gray-500 hover:bg-gray-600';
  };

  const isStatusAvailable = (status) => {
    const statusOrder = ['pending', 'confirmed', 'preparing', 'ready', 'completed'];
    const currentIndex = statusOrder.indexOf(order.status);
    const targetIndex = statusOrder.indexOf(status);

    // 允許取消（除非已完成）
    if (status === 'cancelled') {
      return order.status !== 'completed';
    }

    // 不能往回退狀態（除了取消）
    return targetIndex >= currentIndex;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-screen overflow-y-auto">

        {/* 標頭 */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            更新訂單狀態
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            disabled={isUpdating}
          >
            ×
          </button>
        </div>

        {/* 訂單資訊 */}
        <div className="p-6 border-b bg-gray-50">
          <div className="text-sm text-gray-600 mb-1">
            訂單編號: {order.orderNumber || '#' + order.id.slice(-8)}
          </div>
          <div className="font-medium text-gray-900 mb-1">
            {order.storeName}
          </div>
          <div className="text-sm text-gray-600">
            {order.userName} • NT$ {order.totalPrice}
          </div>
          <div className="mt-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(order.status).split(' ')[0]}`}>
              目前狀態: {ORDER_STATUS_TEXT[order.status]}
            </span>
          </div>
        </div>

        {/* 狀態選項 */}
        <div className="p-6">
          <h4 className="text-sm font-medium text-gray-900 mb-4">選擇新狀態</h4>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(ORDER_STATUS).map(([key, status]) => {
              const isAvailable = isStatusAvailable(status);
              const isCurrent = status === order.status;

              return (
                <button
                  key={status}
                  onClick={() => handleStatusUpdate(status)}
                  disabled={!isAvailable || isCurrent || isUpdating}
                  className={`
                    p-3 rounded-lg text-sm font-medium text-white transition-colors
                    ${isCurrent ? 'opacity-50 cursor-not-allowed' : ''}
                    ${!isAvailable && !isCurrent ? 'opacity-30 cursor-not-allowed' : ''}
                    ${isAvailable && !isCurrent ? getStatusColor(status) : 'bg-gray-300'}
                  `}
                >
                  {ORDER_STATUS_TEXT[status]}
                  {isCurrent && <span className="block text-xs mt-1">(目前狀態)</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* 備註 */}
        <div className="p-6 border-t">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            備註 (可選)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="新增備註..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows="3"
            disabled={isUpdating}
          />
        </div>

        {/* 載入指示 */}
        {isUpdating && (
          <div className="px-6 pb-6">
            <div className="flex items-center justify-center py-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-gray-600">更新中...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderStatusManager;