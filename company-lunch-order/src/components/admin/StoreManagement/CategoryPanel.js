// src/components/admin/StoreManagement/CategoryPanel.js
import React from 'react';
import { Plus, ChevronUp, ChevronDown, Edit2, Trash2, FolderOpen, AlertCircle } from 'lucide-react';

const CategoryPanel = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onMoveCategoryUp,
  onMoveCategoryDown,
  isSuperAdmin
}) => {
  // 分離一般分類和「未分類」
  const regularCategories = categories.filter(
    cat => cat.id !== 'uncategorized' && cat.name !== '未分類'
  );
  const uncategorizedCategory = categories.find(
    cat => cat.id === 'uncategorized' || cat.name === '未分類'
  );

  // 檢查分類是否為「未分類」
  const isUncategorized = (category) => {
    return category.id === 'uncategorized' || category.name === '未分類';
  };

  // 渲染分類項目
  const renderCategoryItem = (category, index, totalCount, canReorder = true) => {
    const isSelected = selectedCategoryId === category.id;
    const isUncategorizedCat = isUncategorized(category);
    const itemCount = category.items?.length || 0;

    return (
      <div
        key={category.id}
        className={`group p-3 rounded-lg border transition-all cursor-pointer ${
          isSelected
            ? 'bg-blue-100 border-blue-300 shadow-sm'
            : isUncategorizedCat
            ? 'bg-orange-50 border-orange-200 hover:border-orange-300'
            : 'bg-white border-gray-200 hover:border-blue-200 hover:shadow-sm'
        }`}
        onClick={() => onSelectCategory(category.id)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isUncategorizedCat ? (
                <AlertCircle size={16} className="text-orange-500 flex-shrink-0" />
              ) : (
                <FolderOpen size={16} className={`flex-shrink-0 ${
                  isSelected ? 'text-blue-600' : 'text-gray-500'
                }`} />
              )}
              <h4 className={`font-medium truncate ${
                isSelected 
                  ? 'text-blue-900' 
                  : isUncategorizedCat 
                  ? 'text-orange-800'
                  : 'text-gray-900'
              }`}>
                {category.name}
              </h4>
            </div>
            <p className={`text-xs mt-1 ${
              isUncategorizedCat ? 'text-orange-600' : 'text-gray-500'
            }`}>
              {itemCount} 個商品
              {isUncategorizedCat && itemCount > 0 && ' (待重新分類)'}
            </p>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className={`flex items-center gap-1 ${
          isUncategorizedCat ? 'opacity-50' : 'opacity-0 group-hover:opacity-100'
        } transition-opacity`}>
          {/* 上移（未分類不可移動） */}
          {canReorder && index > 0 && !isUncategorizedCat && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveCategoryUp(category.id);
              }}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="上移"
            >
              <ChevronUp size={16} className="text-gray-600" />
            </button>
          )}

          {/* 下移（未分類不可移動） */}
          {canReorder && index < totalCount - 1 && !isUncategorizedCat && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveCategoryDown(category.id);
              }}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="下移"
            >
              <ChevronDown size={16} className="text-gray-600" />
            </button>
          )}

          {/* 編輯（未分類不可編輯） */}
          {!isUncategorizedCat && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditCategory(category);
              }}
              className="p-1 hover:bg-blue-200 rounded transition-colors"
              title="編輯"
            >
              <Edit2 size={16} className="text-blue-600" />
            </button>
          )}

          {/* 刪除（只有超級管理員可刪除，未分類不可刪除） */}
          {isSuperAdmin && !isUncategorizedCat && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteCategory(category.id);
              }}
              className="p-1 hover:bg-red-200 rounded transition-colors"
              title="刪除"
            >
              <Trash2 size={16} className="text-red-600" />
            </button>
          )}

          {/* 未分類的提示 */}
          {isUncategorizedCat && (
            <span className="text-xs text-orange-500 italic">
              系統分類
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col">
      {/* 標題 */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900">📂 分類列表</h3>
          <span className="text-sm text-gray-500">共 {categories.length} 個</span>
        </div>
        
        <button
          onClick={onAddCategory}
          className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Plus size={16} />
          新增分類
        </button>
      </div>

      {/* 分類列表 */}
      <div className="flex-1 overflow-y-auto p-2">
        {categories.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FolderOpen size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-sm">尚無分類</p>
            <p className="text-xs mt-1">點擊上方按鈕新增</p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* 一般分類 */}
            {regularCategories.map((category, index) => 
              renderCategoryItem(category, index, regularCategories.length, true)
            )}

            {/* 未分類（固定在最後） */}
            {uncategorizedCategory && (
              <>
                {regularCategories.length > 0 && (
                  <div className="my-3 border-t border-gray-300"></div>
                )}
                {renderCategoryItem(uncategorizedCategory, 0, 1, false)}
              </>
            )}
          </div>
        )}
      </div>

      {/* 底部提示 */}
      {uncategorizedCategory && uncategorizedCategory.items?.length > 0 && (
        <div className="p-3 bg-orange-50 border-t border-orange-200">
          <p className="text-xs text-orange-700">
            💡 提示：有 {uncategorizedCategory.items.length} 個商品待重新分類
          </p>
        </div>
      )}
    </div>
  );
};

export default CategoryPanel;