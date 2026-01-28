// src/components/admin/StoreManagement/CategoryPanel.js
import React from 'react';
import { Plus, ChevronUp, ChevronDown, Edit2, Trash2 } from 'lucide-react';

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
            <p className="text-sm">尚無分類</p>
            <p className="text-xs mt-1">點擊上方按鈕新增</p>
          </div>
        ) : (
          <div className="space-y-1">
            {categories.map((category, index) => (
              <div
                key={category.id}
                className={`group p-3 rounded-lg border transition-all cursor-pointer ${
                  selectedCategoryId === category.id
                    ? 'bg-blue-100 border-blue-300 shadow-sm'
                    : 'bg-white border-gray-200 hover:border-blue-200 hover:shadow-sm'
                }`}
                onClick={() => onSelectCategory(category.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium truncate ${
                      selectedCategoryId === category.id ? 'text-blue-900' : 'text-gray-900'
                    }`}>
                      {category.name}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {category.items?.length || 0} 個商品
                    </p>
                  </div>
                </div>

                {/* 操作按鈕 */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* 上移 */}
                  {index > 0 && (
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

                  {/* 下移 */}
                  {index < categories.length - 1 && (
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

                  {/* 編輯 */}
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

                  {/* 刪除（只有超級管理員） */}
                  {isSuperAdmin && (
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryPanel;