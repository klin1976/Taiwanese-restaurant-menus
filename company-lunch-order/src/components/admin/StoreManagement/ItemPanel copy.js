// src/components/admin/StoreManagement/ItemPanel.js
import React from 'react';
import { Plus, ChevronUp, ChevronDown, Edit2, Trash2 } from 'lucide-react';
import { getActiveTags } from '../../../utils/productTags';

const ItemPanel = ({
  category,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onMoveItemUp,
  onMoveItemDown
}) => {
  // 獲取商品狀態顯示
  const getStatusBadge = (status) => {
    const statusConfig = {
      available: { label: '供應中', color: 'bg-green-100 text-green-800 border-green-300' },
      sold_out: { label: '已售完', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      discontinued: { label: '已停售', color: 'bg-gray-100 text-gray-800 border-gray-300' }
    };
    
    return statusConfig[status] || statusConfig.available;
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* 標題 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-gray-900">
              📦 {category ? category.name : '請選擇分類'}
            </h3>
            {category && (
              <p className="text-sm text-gray-500 mt-1">
                共 {category.items?.length || 0} 個商品
              </p>
            )}
          </div>
          
          {category && (
            <button
              onClick={onAddItem}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Plus size={16} />
              新增商品
            </button>
          )}
        </div>
      </div>

      {/* 商品列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        {!category ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-6xl mb-4">📂</div>
              <p className="text-lg font-medium">請從左側選擇分類</p>
              <p className="text-sm mt-1">選擇分類後即可管理商品</p>
            </div>
          </div>
        ) : !category.items || category.items.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-lg font-medium">此分類尚無商品</p>
              <p className="text-sm mt-1">點擊上方按鈕新增第一個商品</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {category.items.map((item, index) => {
              const statusBadge = getStatusBadge(item.status);
              const activeTags = getActiveTags(item.tags || {});

              return (
                <div
                  key={item.id}
                  className="group bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    {/* 商品圖片（暫時用預設圖示） */}
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center text-3xl flex-shrink-0">
                      🍽️
                    </div>

                    {/* 商品資訊 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 text-lg mb-1">
                            {item.name}
                          </h4>
                          
                          {/* 標籤 */}
                          {activeTags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {activeTags.map(tag => (
                                <span
                                  key={tag.key}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {tag.icon} {tag.label}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* 描述 */}
                          {item.description && (
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {item.description}
                            </p>
                          )}

                          {/* 價格和狀態 */}
                          <div className="flex items-center gap-3">
                            <span className="text-xl font-bold text-indigo-600">
                              NT$ {item.price}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusBadge.color}`}>
                              {statusBadge.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 操作按鈕 */}
                      <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* 上移 */}
                        {index > 0 && (
                          <button
                            onClick={() => onMoveItemUp(item.id)}
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs font-medium text-gray-700 flex items-center gap-1"
                            title="上移"
                          >
                            <ChevronUp size={14} />
                            上移
                          </button>
                        )}

                        {/* 下移 */}
                        {index < category.items.length - 1 && (
                          <button
                            onClick={() => onMoveItemDown(item.id)}
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs font-medium text-gray-700 flex items-center gap-1"
                            title="下移"
                          >
                            <ChevronDown size={14} />
                            下移
                          </button>
                        )}

                        {/* 編輯 */}
                        <button
                          onClick={() => onEditItem(item)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium flex items-center gap-1"
                        >
                          <Edit2 size={14} />
                          編輯
                        </button>

                        {/* 刪除 */}
                        <button
                          onClick={() => onDeleteItem(item.id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium flex items-center gap-1"
                        >
                          <Trash2 size={14} />
                          刪除
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemPanel;