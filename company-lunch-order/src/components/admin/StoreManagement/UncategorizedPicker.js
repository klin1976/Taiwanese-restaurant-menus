// src/components/admin/StoreManagement/UncategorizedPicker.js
import React, { useState, useEffect } from 'react';
import { X, Check, Package, AlertCircle } from 'lucide-react';
import { getActiveTags } from '../../../utils/productTags';

const UncategorizedPicker = ({ 
  isOpen, 
  onClose, 
  uncategorizedItems = [], 
  targetCategory,
  onConfirm 
}) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // ✅ 新增：檢查目標分類是否有效
  useEffect(() => {
    if (isOpen && !targetCategory) {
      console.error('UncategorizedPicker: targetCategory 是 undefined');
      alert('請先選擇目標分類');
      onClose();
    }
  }, [isOpen, targetCategory, onClose]);

  // 重置選擇狀態
  useEffect(() => {
    if (isOpen) {
      setSelectedItems([]);
      setSelectAll(false);
    }
  }, [isOpen]);

  // ✅ 修改：加強防護
  const handleSelectAll = () => {
    if (!Array.isArray(uncategorizedItems)) {
      console.error('uncategorizedItems 不是陣列:', uncategorizedItems);
      return;
    }

    if (selectAll) {
      setSelectedItems([]);
    } else {
      setSelectedItems(uncategorizedItems.map(item => item.id));
    }
    setSelectAll(!selectAll);
  };

  // 處理單個選擇
  const handleToggleItem = (itemId) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        const newSelection = prev.filter(id => id !== itemId);
        setSelectAll(false);
        return newSelection;
      } else {
        const newSelection = [...prev, itemId];
        if (newSelection.length === uncategorizedItems.length) {
          setSelectAll(true);
        }
        return newSelection;
      }
    });
  };

  // 處理確認移動
  const handleConfirm = () => {
    if (selectedItems.length === 0) {
      alert('請至少選擇一個商品');
      return;
    }

    // ✅ 再次檢查目標分類
    if (!targetCategory) {
      alert('目標分類無效，請重新操作');
      onClose();
      return;
    }

    onConfirm(selectedItems);
  };

  // 獲取商品狀態標籤
  const getStatusBadge = (status) => {
    const statusMap = {
      'available': { text: '供應中', class: 'bg-green-100 text-green-800' },
      'sold_out': { text: '已售完', class: 'bg-yellow-100 text-yellow-800' },
      'discontinued': { text: '已停售', class: 'bg-gray-100 text-gray-600' }
    };
    return statusMap[status] || statusMap['available'];
  };

  // ✅ 新增：提前返回，避免渲染錯誤
  if (!isOpen) return null;

  // ✅ 新增：如果沒有目標分類，顯示錯誤
  if (!targetCategory) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">無法開啟</h3>
          <p className="text-gray-600 mb-6">請先選擇目標分類</p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            關閉
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* 標題 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Package size={24} className="text-blue-600" />
              從「未分類」挑選商品
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              將選中的商品移動到「<span className="font-bold text-blue-700">{targetCategory.name}</span>」
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
          >
            <X size={24} />
          </button>
        </div>

        {/* 商品列表 */}
        <div className="flex-1 overflow-y-auto p-6">
          {uncategorizedItems.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 font-medium">目前沒有未分類的商品</p>
              <p className="text-gray-500 text-sm mt-1">所有商品都已歸類到分類中</p>
            </div>
          ) : (
            <>
              {/* 全選控制 */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="font-medium text-gray-900">
                    全選 ({uncategorizedItems.length} 個商品)
                  </span>
                </label>
              </div>

              {/* 商品列表 */}
              <div className="space-y-2">
                {uncategorizedItems.map(item => {
                  const isSelected = selectedItems.includes(item.id);
                  const statusBadge = getStatusBadge(item.status);
                  const activeTags = getActiveTags(item.tags);

                  return (
                    <label
                      key={item.id}
                      className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleItem(item.id)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-4"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-medium truncate ${
                            isSelected ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {item.name}
                          </span>
                          
                          {/* 標籤 */}
                          {activeTags.slice(0, 2).map(tag => (
                            <span
                              key={tag.key}
                              className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                            >
                              {tag.icon} {tag.label}
                            </span>
                          ))}
                          {activeTags.length > 2 && (
                            <span className="text-xs text-gray-500">
                              +{activeTags.length - 2}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`font-bold ${
                            isSelected ? 'text-blue-700' : 'text-indigo-600'
                          }`}>
                            NT$ {item.price}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${statusBadge.class}`}>
                            {statusBadge.text}
                          </span>
                        </div>

                        {/* 顯示移動歷史（如果有） */}
                        {item.moveHistory && item.moveHistory.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            原分類：{item.moveHistory[item.moveHistory.length - 1]?.from?.name || '未知'}
                          </p>
                        )}
                      </div>

                      {/* 選中指示 */}
                      {isSelected && (
                        <div className="ml-4 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                          <Check size={16} className="text-white" />
                        </div>
                      )}
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* 底部按鈕區 */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedItems.length > 0 ? (
                <span className="font-medium text-blue-600">
                  已選擇 {selectedItems.length} 個商品
                </span>
              ) : (
                <span>請選擇要移動的商品</span>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                disabled={selectedItems.length === 0}
                className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  selectedItems.length > 0
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Check size={18} />
                確認移動到「{targetCategory.name}」({selectedItems.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UncategorizedPicker;