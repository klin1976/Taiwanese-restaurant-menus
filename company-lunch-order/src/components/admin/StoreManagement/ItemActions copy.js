// src/components/admin/StoreManagement/ItemActions.js
import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit2, Trash2, FolderInput } from 'lucide-react';

const ItemActions = ({ 
  item, 
  categories, 
  currentCategoryId,
  onEdit, 
  onDelete, 
  onMoveTo,
  disabled = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showMoveSubmenu, setShowMoveSubmenu] = useState(false);
  const menuRef = useRef(null);

  // 點擊外部關閉選單
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowMoveSubmenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 過濾可移動的分類（排除當前分類）
  const availableCategories = categories.filter(
    cat => cat.id !== currentCategoryId && cat.id !== 'uncategorized'
  );

  // 處理移動到指定分類
  const handleMoveTo = (targetCategoryId) => {
    if (onMoveTo) {
      onMoveTo(item.id, currentCategoryId, targetCategoryId);
    }
    setIsOpen(false);
    setShowMoveSubmenu(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* 觸發按鈕 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`p-2 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium ${
          disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="更多操作"
      >
        <Edit2 size={16} />
        <span className="hidden sm:inline">編輯</span>
        <MoreVertical size={14} />
      </button>

      {/* 下拉選單 */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1">
          {/* 編輯資訊 */}
          <button
            onClick={() => {
              onEdit(item);
              setIsOpen(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <Edit2 size={16} className="text-blue-600" />
            編輯資訊
          </button>

          {/* 移動到... */}
          <div
            className="relative"
            onMouseEnter={() => setShowMoveSubmenu(true)}
            onMouseLeave={() => setShowMoveSubmenu(false)}
          >
            <button
              className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between ${
                availableCategories.length === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              disabled={availableCategories.length === 0}
            >
              <span className="flex items-center gap-2">
                <FolderInput size={16} className="text-green-600" />
                移動到...
              </span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* 子選單：分類列表 */}
            {showMoveSubmenu && availableCategories.length > 0 && (
              <div className="absolute left-full top-0 ml-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1 max-h-64 overflow-y-auto">
                {availableCategories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => handleMoveTo(category.id)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    {category.name}
                    <span className="text-gray-400 text-xs ml-auto">
                      ({category.items?.length || 0})
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 分隔線 */}
          <div className="border-t border-gray-200 my-1"></div>

          {/* 刪除 */}
          <button
            onClick={() => {
              onDelete(item.id);
              setIsOpen(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <Trash2 size={16} />
            刪除商品
          </button>
        </div>
      )}
    </div>
  );
};

export default ItemActions;