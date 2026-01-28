// src/components/admin/StoreManagement/ItemPanel.js
import React from 'react';
import { Plus, ChevronUp, ChevronDown, Package } from 'lucide-react';
import ItemActions from './ItemActions';
import { getActiveTags } from '../../../utils/productTags';

const ItemPanel = ({
  category,
  categories,
  uncategorizedCount = 0,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onMoveItemUp,
  onMoveItemDown,
  onMoveTo,
  onOpenUncategorizedPicker
}) => {
  // 獲取商品狀態樣式
  const getStatusStyle = (status) => {
    const styles = {
      'available': { text: '供應中', class: 'bg-green-100 text-green-800' },
      'sold_out': { text: '已售完', class: 'bg-yellow-100 text-yellow-800' },
      'discontinued': { text: '已停售', class: 'bg-gray-100 text-gray-600' }
    };
    return styles[status] || styles['available'];
  };

  // 檢查是否為未分類
  const isUncategorized = category?.id === 'uncategorized' || category?.name === '未分類';

  if (!category) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-8">
        <div className="text-center">
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 font-medium">請選擇一個分類</p>
          <p className="text-gray-500 text-sm mt-1">點擊左側分類來查看和管理商品</p>
        </div>
      </div>
    );
  }

  const items = category.items || [];

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* 標題區 */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              📦 {category.name}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              共 {items.length} 個商品
            </p>
          </div>
        </div>

        {/* 操作按鈕區 */}
        <div className="flex flex-wrap gap-2">
          {/* 未分類商品按鈕（永遠顯示，無商品時禁用） */}
          {!isUncategorized && (
            <button
              onClick={onOpenUncategorizedPicker}
              disabled={uncategorizedCount === 0}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                uncategorizedCount > 0
                  ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
              }`}
              title={uncategorizedCount > 0 ? `從未分類挑選商品 (${uncategorizedCount})` : '沒有未分類商品'}
            >
              <Package size={16} />
              未分類商品
              {uncategorizedCount > 0 && (
                <span className="bg-orange-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {uncategorizedCount}
                </span>
              )}
            </button>
          )}

          {/* 新增商品按鈕 */}
          <button
            onClick={onAddItem}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Plus size={16} />
            新增商品
          </button>
        </div>
      </div>

      {/* 商品列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 font-medium">此分類尚無商品</p>
            <p className="text-gray-500 text-sm mt-1">
              {isUncategorized 
                ? '當分類被刪除時，商品會移動到這裡'
                : '點擊「新增商品」按鈕開始建立'
              }
            </p>
            {!isUncategorized && uncategorizedCount > 0 && (
              <button
                onClick={onOpenUncategorizedPicker}
                className="mt-4 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm font-medium"
              >
                從「未分類」挑選商品 ({uncategorizedCount})
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => {
              const statusStyle = getStatusStyle(item.status);
              const activeTags = getActiveTags(item.tags);

              return (
                <div
                  key={item.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    {/* 商品資訊 */}
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h4 className="font-medium text-gray-900 truncate">
                          {item.name}
                        </h4>
                        
                        {/* 標籤 */}
                        {activeTags.map(tag => (
                          <span
                            key={tag.key}
                            className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium"
                          >
                            {tag.icon} {tag.label}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-indigo-600">
                          NT$ {item.price}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${statusStyle.class}`}>
                          {statusStyle.text}
                        </span>
                      </div>

                      {/* 商品描述 */}
                      {item.description && (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      {/* 移動歷史提示（僅在未分類中顯示） */}
                      {isUncategorized && item.moveHistory && item.moveHistory.length > 0 && (
                        <p className="text-xs text-orange-600 mt-2 bg-orange-50 px-2 py-1 rounded">
                          📁 原分類：{item.moveHistory[item.moveHistory.length - 1]?.from?.name || '未知'}
                        </p>
                      )}
                    </div>

                    {/* 操作按鈕 */}
                    <div className="flex items-center gap-1">
                      {/* 排序按鈕 */}
                      {index > 0 && (
                        <button
                          onClick={() => onMoveItemUp(item.id)}
                          className="p-2 hover:bg-gray-100 rounded transition-colors"
                          title="上移"
                        >
                          <ChevronUp size={18} className="text-gray-600" />
                        </button>
                      )}

                      {index < items.length - 1 && (
                        <button
                          onClick={() => onMoveItemDown(item.id)}
                          className="p-2 hover:bg-gray-100 rounded transition-colors"
                          title="下移"
                        >
                          <ChevronDown size={18} className="text-gray-600" />
                        </button>
                      )}

                      {/* 編輯/移動/刪除選單 */}
                      <ItemActions
                        item={item}
                        categories={categories}
                        currentCategoryId={category.id}
                        onEdit={onEditItem}
                        onDelete={onDeleteItem}
                        onMoveTo={onMoveTo}
                      />
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