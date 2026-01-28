// src/components/admin/StoreManagement/ItemActions.js
import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit2, Trash2, FolderInput, ChevronRight } from 'lucide-react';

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
  const submenuRef = useRef(null);

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
    cat => cat.id !== currentCategoryId
  );

  // 處理移動到指定分類
  const handleMoveTo = (targetCategoryId) => {
    if (onMoveTo) {
      onMoveTo(item.id, currentCategoryId, targetCategoryId);
    }
    setIsOpen(false);
    setShowMoveSubmenu(false);
  };

  // 處理編輯
  const handleEdit = () => {
    if (onEdit) {
      onEdit(item);
    }
    setIsOpen(false);
  };

  // 處理刪除
  const handleDelete = () => {
    if (onDelete) {
      onDelete(item.id);
    }
    setIsOpen(false);
  };

  // 計算子選單位置（避免超出畫面）
  const getSubmenuPosition = () => {
    if (!menuRef.current) return 'left-full';
    
    const rect = menuRef.current.getBoundingClientRect();
    const spaceOnRight = window.innerWidth - rect.right;
    
    // 如果右側空間不足 200px，則顯示在左側
    if (spaceOnRight < 200) {
      return 'right-full mr-1';
    }
    return 'left-full ml-1';
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
            onClick={handleEdit}
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
            ref={submenuRef}
          >
            <button
              className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between ${
                availableCategories.length === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              disabled={availableCategories.length === 0}
              onClick={() => setShowMoveSubmenu(!showMoveSubmenu)}
            >
              <span className="flex items-center gap-2">
                <FolderInput size={16} className="text-green-600" />
                移動到...
              </span>
              <ChevronRight size={16} className="text-gray-400" />
            </button>

            {/* 子選單：分類列表 */}
            {showMoveSubmenu && availableCategories.length > 0 && (
              <div 
                className={`absolute ${getSubmenuPosition()} top-0 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1 max-h-64 overflow-y-auto`}
              >
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100">
                  選擇目標分類
                </div>
                {availableCategories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => handleMoveTo(category.id)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      category.id === 'uncategorized' || category.name === '未分類'
                        ? 'bg-gray-400'
                        : 'bg-blue-500'
                    }`}></span>
                    <span className="flex-1 truncate">{category.name}</span>
                    <span className="text-gray-400 text-xs">
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
            onClick={handleDelete}
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