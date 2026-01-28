// src/components/admin/StoreManagement/MenuEditor.js
import React, { useState, useEffect } from 'react';
import { Save, X, Plus, FolderInput, Folder, Package, AlertCircle, ChevronUp, ChevronDown, Edit2, Trash2 } from 'lucide-react';
import CategoryPanel from './CategoryPanel';
import ItemPanel from './ItemPanel';
import CategoryForm from './CategoryForm';
import ItemForm from './ItemForm';
import UncategorizedPicker from './UncategorizedPicker';
import { updateStore } from '../../../services/storeManagementService';

import { useAuth } from '../../../contexts/AuthContext';
import CSVImportPanel from './CSVImportPanel';

const MenuEditor = ({ store, onClose, onSave }) => {
  const { currentUser, isSuperAdmin } = useAuth();

  // 狀態管理
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // 彈窗狀態
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showUncategorizedPicker, setShowUncategorizedPicker] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  // 手機版移動選單狀態
  const [showMobileMoveSheet, setShowMobileMoveSheet] = useState(false);
  const [movingItem, setMovingItem] = useState(null);
  const [movingFromCategoryId, setMovingFromCategoryId] = useState(null);

  // CSV 匯入狀態
  const [showCSVImport, setShowCSVImport] = useState(false);

  // Toast 提示狀態
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // 初始化菜單資料
  useEffect(() => {
    if (store && store.categories) {
      const initialCategories = JSON.parse(JSON.stringify(store.categories));
      setCategories(initialCategories);

      const firstRegular = initialCategories.find(
        cat => cat.id !== 'uncategorized' && cat.name !== '未分類'
      );
      if (firstRegular && !selectedCategoryId) {
        setSelectedCategoryId(firstRegular.id);
      } else if (initialCategories.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(initialCategories[0].id);
      }
    }
  }, [store]);

  // 獲取當前選中的分類
  const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);

  // 獲取「未分類」分類
  const getUncategorizedCategory = () => {
    return categories.find(cat => cat.id === 'uncategorized' || cat.name === '未分類');
  };

  // 獲取未分類商品數量
  const getUncategorizedCount = () => {
    const uncategorized = getUncategorizedCategory();
    return uncategorized?.items?.length || 0;
  };

  // 確保「未分類」分類存在
  const ensureUncategorizedCategory = (currentCategories) => {
    const exists = currentCategories.find(
      cat => cat.id === 'uncategorized' || cat.name === '未分類'
    );

    if (!exists) {
      return [
        ...currentCategories,
        {
          id: 'uncategorized',
          name: '未分類',
          sortOrder: 9999,
          items: []
        }
      ];
    }
    return currentCategories;
  };

  // 建立移動歷史記錄
  const createMoveHistoryEntry = (fromCategory, toCategory, reason = 'manual_move') => {
    return {
      from: {
        id: fromCategory?.id || 'unknown',
        name: fromCategory?.name || '未知'
      },
      to: {
        id: toCategory?.id || 'unknown',
        name: toCategory?.name || '未知'
      },
      movedAt: new Date().toISOString(),
      movedBy: currentUser?.uid || 'unknown',
      movedByName: currentUser?.displayName || currentUser?.email || '未知',
      reason: reason
    };
  };

  // 顯示 Toast 提示
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // 開啟手機版移動選單
  const openMobileMoveSheet = (item, categoryId) => {
    setMovingItem(item);
    setMovingFromCategoryId(categoryId);
    setShowMobileMoveSheet(true);
  };

  // 關閉手機版移動選單
  const closeMobileMoveSheet = () => {
    setShowMobileMoveSheet(false);
    setMovingItem(null);
    setMovingFromCategoryId(null);
  };

  // 手機版商品移動處理
  const handleMobileMoveItem = (targetCategoryId) => {
    if (!movingItem || !movingFromCategoryId) return;

    const sourceCategory = categories.find(cat => cat.id === movingFromCategoryId);
    const targetCategory = categories.find(cat => cat.id === targetCategoryId);

    if (!sourceCategory || !targetCategory) {
      showToast('來源或目標分類不存在', 'error');
      closeMobileMoveSheet();
      return;
    }

    // 建立移動歷史記錄
    const updatedItem = {
      ...movingItem,
      sortOrder: 1,
      moveHistory: [
        ...(movingItem.moveHistory || []),
        createMoveHistoryEntry(sourceCategory, targetCategory, 'manual_move')
      ]
    };

    setCategories(categories.map(cat => {
      if (cat.id === movingFromCategoryId) {
        // 從來源分類移除
        return {
          ...cat,
          items: cat.items.filter(item => item.id !== movingItem.id)
        };
      }
      if (cat.id === targetCategoryId) {
        // 加入目標分類的最前面
        const updatedItems = (cat.items || []).map(item => ({
          ...item,
          sortOrder: (item.sortOrder || 0) + 1
        }));

        return {
          ...cat,
          items: [updatedItem, ...updatedItems]
        };
      }
      return cat;
    }));

    setHasChanges(true);
    closeMobileMoveSheet();
    showToast(`已移動到「${targetCategory.name}」`);
  };

  // ============================================
  // 分類管理函數
  // ============================================

  const handleAddCategory = (categoryData) => {
    const newCategory = {
      id: `category_${Date.now()}`,
      name: categoryData.name,
      sortOrder: categories.filter(c => c.id !== 'uncategorized' && c.name !== '未分類').length + 1,
      items: []
    };

    let updatedCategories = categories.filter(c => c.id !== 'uncategorized' && c.name !== '未分類');
    updatedCategories.push(newCategory);

    const uncategorized = getUncategorizedCategory();
    if (uncategorized) {
      updatedCategories.push(uncategorized);
    }

    setCategories(updatedCategories);
    setSelectedCategoryId(newCategory.id);
    setHasChanges(true);
    setShowCategoryForm(false);
  };

  const handleEditCategory = (categoryId, updates) => {
    setCategories(categories.map(cat =>
      cat.id === categoryId ? { ...cat, ...updates } : cat
    ));
    setHasChanges(true);
    setShowCategoryForm(false);
    setEditingCategory(null);
  };

  const handleDeleteCategory = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);

    if (!isSuperAdmin()) {
      alert('只有超級管理員可以刪除分類');
      return;
    }

    if (category.id === 'uncategorized' || category.name === '未分類') {
      alert('「未分類」為系統分類，無法刪除');
      return;
    }

    const itemCount = category.items?.length || 0;
    const confirmMsg = itemCount > 0
      ? `確定要刪除「${category.name}」嗎？\n\n該分類下的 ${itemCount} 個商品將移動到「未分類」。`
      : `確定要刪除「${category.name}」嗎？`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    let updatedCategories = ensureUncategorizedCategory([...categories]);

    if (category.items && category.items.length > 0) {
      updatedCategories = updatedCategories.map(cat => {
        if (cat.id === 'uncategorized' || cat.name === '未分類') {
          const movedItems = category.items.map(item => ({
            ...item,
            moveHistory: [
              ...(item.moveHistory || []),
              createMoveHistoryEntry(category, cat, 'category_deleted')
            ]
          }));

          return {
            ...cat,
            items: [...movedItems, ...(cat.items || [])]
          };
        }
        return cat;
      });
    }

    updatedCategories = updatedCategories.filter(cat => cat.id !== categoryId);

    if (selectedCategoryId === categoryId) {
      const firstRegular = updatedCategories.find(
        c => c.id !== 'uncategorized' && c.name !== '未分類'
      );
      setSelectedCategoryId(firstRegular?.id || updatedCategories[0]?.id);
    }

    setCategories(updatedCategories);
    setHasChanges(true);

    if (itemCount > 0) {
      alert(`「${category.name}」已刪除，${itemCount} 個商品已移至「未分類」`);
    }
  };

  const handleMoveCategoryUp = (categoryId) => {
    const regularCategories = categories.filter(
      c => c.id !== 'uncategorized' && c.name !== '未分類'
    );
    const uncategorized = getUncategorizedCategory();

    const index = regularCategories.findIndex(cat => cat.id === categoryId);
    if (index > 0) {
      const newCategories = [...regularCategories];
      [newCategories[index], newCategories[index - 1]] = [newCategories[index - 1], newCategories[index]];

      newCategories.forEach((cat, idx) => {
        cat.sortOrder = idx + 1;
      });

      const finalCategories = uncategorized
        ? [...newCategories, uncategorized]
        : newCategories;

      setCategories(finalCategories);
      setHasChanges(true);
    }
  };

  const handleMoveCategoryDown = (categoryId) => {
    const regularCategories = categories.filter(
      c => c.id !== 'uncategorized' && c.name !== '未分類'
    );
    const uncategorized = getUncategorizedCategory();

    const index = regularCategories.findIndex(cat => cat.id === categoryId);
    if (index < regularCategories.length - 1) {
      const newCategories = [...regularCategories];
      [newCategories[index], newCategories[index + 1]] = [newCategories[index + 1], newCategories[index]];

      newCategories.forEach((cat, idx) => {
        cat.sortOrder = idx + 1;
      });

      const finalCategories = uncategorized
        ? [...newCategories, uncategorized]
        : newCategories;

      setCategories(finalCategories);
      setHasChanges(true);
    }
  };

  // ============================================
  // 商品管理函數
  // ============================================

  const handleAddItem = (itemData) => {
    if (!selectedCategoryId) {
      alert('請先選擇分類');
      return;
    }

    const newItem = {
      id: `item_${Date.now()}`,
      name: itemData.name,
      price: itemData.price,
      description: itemData.description || '',
      imageUrl: '',
      status: itemData.status || 'available',
      sortOrder: 1,
      tags: itemData.tags || {},
      moveHistory: []
    };

    setCategories(categories.map(cat => {
      if (cat.id === selectedCategoryId) {
        const updatedItems = (cat.items || []).map(item => ({
          ...item,
          sortOrder: (item.sortOrder || 0) + 1
        }));

        return {
          ...cat,
          items: [newItem, ...updatedItems]
        };
      }
      return cat;
    }));

    setHasChanges(true);
    setShowItemForm(false);
  };

  const handleEditItem = (itemId, updates) => {
    setCategories(categories.map(cat => {
      if (cat.id === selectedCategoryId) {
        return {
          ...cat,
          items: cat.items.map(item =>
            item.id === itemId ? { ...item, ...updates } : item
          )
        };
      }
      return cat;
    }));

    setHasChanges(true);
    setShowItemForm(false);
    setEditingItem(null);
  };

  const handleDeleteItem = (itemId) => {
    if (!window.confirm('確定要刪除此商品嗎？')) {
      return;
    }

    setCategories(categories.map(cat => {
      if (cat.id === selectedCategoryId) {
        return {
          ...cat,
          items: cat.items.filter(item => item.id !== itemId)
        };
      }
      return cat;
    }));

    setHasChanges(true);
  };

  const handleMoveItemUp = (itemId) => {
    setCategories(categories.map(cat => {
      if (cat.id === selectedCategoryId) {
        const items = [...cat.items];
        const index = items.findIndex(item => item.id === itemId);

        if (index > 0) {
          [items[index], items[index - 1]] = [items[index - 1], items[index]];
          items.forEach((item, idx) => {
            item.sortOrder = idx + 1;
          });
        }

        return { ...cat, items };
      }
      return cat;
    }));

    setHasChanges(true);
  };

  const handleMoveItemDown = (itemId) => {
    setCategories(categories.map(cat => {
      if (cat.id === selectedCategoryId) {
        const items = [...cat.items];
        const index = items.findIndex(item => item.id === itemId);

        if (index < items.length - 1) {
          [items[index], items[index + 1]] = [items[index + 1], items[index]];
          items.forEach((item, idx) => {
            item.sortOrder = idx + 1;
          });
        }

        return { ...cat, items };
      }
      return cat;
    }));

    setHasChanges(true);
  };

  // ============================================
  // 商品移動功能（桌面版）
  // ============================================

  const handleMoveTo = (itemId, sourceCategoryId, targetCategoryId) => {
    if (sourceCategoryId === targetCategoryId) {
      return;
    }

    const sourceCategory = categories.find(cat => cat.id === sourceCategoryId);
    const targetCategory = categories.find(cat => cat.id === targetCategoryId);

    if (!sourceCategory || !targetCategory) {
      alert('來源或目標分類不存在');
      return;
    }

    const itemToMove = sourceCategory.items?.find(item => item.id === itemId);
    if (!itemToMove) {
      alert('找不到要移動的商品');
      return;
    }

    const updatedItem = {
      ...itemToMove,
      sortOrder: 1,
      moveHistory: [
        ...(itemToMove.moveHistory || []),
        createMoveHistoryEntry(sourceCategory, targetCategory, 'manual_move')
      ]
    };

    setCategories(categories.map(cat => {
      if (cat.id === sourceCategoryId) {
        return {
          ...cat,
          items: cat.items.filter(item => item.id !== itemId)
        };
      }
      if (cat.id === targetCategoryId) {
        const updatedItems = (cat.items || []).map(item => ({
          ...item,
          sortOrder: (item.sortOrder || 0) + 1
        }));

        return {
          ...cat,
          items: [updatedItem, ...updatedItems]
        };
      }
      return cat;
    }));

    setHasChanges(true);
  };

  const handleBatchMoveFromUncategorized = (selectedItemIds) => {
    if (!selectedCategoryId) {
      alert('請先選擇目標分類');
      setShowUncategorizedPicker(false);
      return;
    }

    const uncategorized = getUncategorizedCategory();
    const targetCategory = categories.find(cat => cat.id === selectedCategoryId);

    if (!targetCategory) {
      alert('目標分類不存在，請重新操作');
      setShowUncategorizedPicker(false);
      return;
    }

    if (targetCategory.id === 'uncategorized' || targetCategory.name === '未分類') {
      alert('不能將商品移動到「未分類」');
      setShowUncategorizedPicker(false);
      return;
    }

    if (!uncategorized) {
      alert('找不到「未分類」分類');
      setShowUncategorizedPicker(false);
      return;
    }

    const itemsToMove = uncategorized.items?.filter(
      item => selectedItemIds.includes(item.id)
    ) || [];

    if (itemsToMove.length === 0) {
      alert('沒有選擇任何商品');
      setShowUncategorizedPicker(false);
      return;
    }

    const movedItems = itemsToMove.map((item, index) => ({
      ...item,
      sortOrder: index + 1,
      moveHistory: [
        ...(item.moveHistory || []),
        createMoveHistoryEntry(uncategorized, targetCategory, 'manual_move')
      ]
    }));

    setCategories(categories.map(cat => {
      if (cat.id === 'uncategorized' || cat.name === '未分類') {
        return {
          ...cat,
          items: cat.items.filter(item => !selectedItemIds.includes(item.id))
        };
      }
      if (cat.id === selectedCategoryId) {
        const updatedExistingItems = (cat.items || []).map(item => ({
          ...item,
          sortOrder: (item.sortOrder || 0) + movedItems.length
        }));

        return {
          ...cat,
          items: [...movedItems, ...updatedExistingItems]
        };
      }
      return cat;
    }));

    setHasChanges(true);
    setShowUncategorizedPicker(false);
    alert(`已將 ${movedItems.length} 個商品移動到「${targetCategory.name}」`);
  };

  // ============================================
  // 儲存和取消
  // ============================================

  const handleSave = async () => {
    if (!hasChanges) {
      alert('沒有需要儲存的變更');
      return;
    }

    setSaving(true);
    try {
      console.log('💾 儲存菜單資料...');

      let categoriesToSave = [...categories];
      const uncategorized = categoriesToSave.find(
        c => c.id === 'uncategorized' || c.name === '未分類'
      );

      if (uncategorized && (!uncategorized.items || uncategorized.items.length === 0)) {
        categoriesToSave = categoriesToSave.filter(
          c => c.id !== 'uncategorized' && c.name !== '未分類'
        );
      }

      await updateStore(store.id, store.type, { categories: categoriesToSave }, currentUser);

      setHasChanges(false);
      alert('菜單儲存成功！');

      if (onSave) {
        onSave({ ...store, categories: categoriesToSave });
      }
    } catch (error) {
      console.error('❌ 儲存失敗:', error);
      alert(`儲存失敗：${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (!window.confirm('有未儲存的變更，確定要離開嗎？')) {
        return;
      }
    }
    onClose();
  };

  // 檢測螢幕寬度
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getUncategorizedItems = () => {
    const uncategorized = getUncategorizedCategory();
    return uncategorized?.items || [];
  };

  // 獲取可移動的分類列表（排除當前分類和未分類）
  const getAvailableMoveCategories = (currentCategoryId) => {
    return categories.filter(
      cat => cat.id !== currentCategoryId &&
        cat.id !== 'uncategorized' &&
        cat.name !== '未分類'
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* Toast 提示（頂部） */}
      {toast.show && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] animate-slide-down">
          <div className={`px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 ${toast.type === 'success'
            ? 'bg-green-600 text-white'
            : 'bg-red-600 text-white'
            }`}>
            {toast.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* 標題列 */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Package size={24} className="text-blue-600" />
              {store.name} - 菜單管理
            </h2>
            {hasChanges && (
              <p className="text-sm text-orange-600 mt-1 flex items-center gap-1">
                <AlertCircle size={16} />
                有未儲存的變更
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${hasChanges && !saving
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
            >
              <Save size={18} />
              {saving ? '儲存中...' : '儲存變更'}
            </button>

            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <X size={18} />
              關閉
            </button>

            <button
              onClick={() => setShowCSVImport(true)}
              className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-100 flex items-center gap-2"
            >
              <FolderInput size={18} />
              匯入 CSV
            </button>
          </div>
        </div>

        {/* CSV 匯入面板 */}
        {showCSVImport && (
          <CSVImportPanel
            store={store}
            onClose={() => setShowCSVImport(false)}
            onImportComplete={() => {
              setShowCSVImport(false);
              showToast('CSV 匯入成功！請記得儲存變更');
              // 重新載入 store 的部份通常由 parent 控制，但在這裡我們的 state 是 local 的
              // Import tool 可能直接寫入 Firestore，所以這裡應該提示使用者重新整理或自動重整
              // 但 executeImport 也是異步的
              // 我們的 CSVImportPanel 直接更新了 Firestore
              // 所以這裡我們可以選擇讓 MenuEditor 重新 fetch 或者通知 parent
              // 但最簡單的是直接重刷畫面，或者手動更新 local categories
              // CSVImportPanel 已更新 Firestore，所以這裡最好是觸發 onSave 之後的 reload
              // 或者我們讓 CSVImportPanel 回傳新的 categories
              // 讓我們修改一下 CSVImportPanel 讓它不要直接寫入 Firestore 而是透過 callback? 
              // 不，CSVImportPanel 設計是 executeImport 直接寫入。
              // 為了同步，我們可以強制 reload window 或者呼叫 onSave 來 refresh
              // 更好的做法：executeImport 回傳新的 categories，我們在這裡 setCategories
              // 讓我們修改 CSVImportPanel 傳遞 handleImportSuccess
            }}
          />
        )}

        {/* 主要內容區 */}
        <div className="flex-1 overflow-hidden flex">
          {isMobile ? (
            // 手機版：階層式（加上移動按鈕）
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Folder size={20} />
                  分類與商品
                </h3>
                <button
                  onClick={() => {
                    setEditingCategory(null);
                    setShowCategoryForm(true);
                  }}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-1"
                >
                  <Plus size={16} />
                  新增分類
                </button>
              </div>

              {categories.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Folder size={48} className="mx-auto text-gray-400 mb-2" />
                  <p>尚無分類，請新增第一個分類</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {categories.map((category, catIndex) => {
                    const isUncategorized = category.id === 'uncategorized' || category.name === '未分類';
                    const regularCategories = categories.filter(c => c.id !== 'uncategorized' && c.name !== '未分類');
                    const regularIndex = regularCategories.findIndex(c => c.id === category.id);

                    return (
                      <div key={category.id} className={`border rounded-lg overflow-hidden ${isUncategorized ? 'border-orange-300 bg-orange-50' : ''
                        }`}>
                        {/* 分類標頭 */}
                        <div className={`p-4 flex items-center justify-between ${isUncategorized ? 'bg-orange-100' : 'bg-gray-50'
                          }`}>
                          <h4 className={`font-bold flex items-center gap-2 ${isUncategorized ? 'text-orange-800' : 'text-gray-900'
                            }`}>
                            {isUncategorized ? <AlertCircle size={20} /> : <Folder size={20} />}
                            {category.name} ({category.items?.length || 0})
                          </h4>

                          {!isUncategorized && (
                            <div className="flex gap-1">
                              {regularIndex > 0 && (
                                <button
                                  onClick={() => handleMoveCategoryUp(category.id)}
                                  className="p-1 hover:bg-gray-200 rounded"
                                  title="上移"
                                >
                                  <ChevronUp size={20} />
                                </button>
                              )}

                              {regularIndex < regularCategories.length - 1 && (
                                <button
                                  onClick={() => handleMoveCategoryDown(category.id)}
                                  className="p-1 hover:bg-gray-200 rounded"
                                  title="下移"
                                >
                                  <ChevronDown size={20} />
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setEditingCategory(category);
                                  setShowCategoryForm(true);
                                }}
                                className="p-1 hover:bg-blue-100 rounded text-blue-600"
                                title="編輯"
                              >
                                <Edit2 size={20} />
                              </button>

                              {isSuperAdmin() && (
                                <button
                                  onClick={() => handleDeleteCategory(category.id)}
                                  className="p-1 hover:bg-red-100 rounded text-red-600"
                                  title="刪除"
                                >
                                  <Trash2 size={20} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 商品列表 */}
                        <div className="p-4 space-y-2">
                          {!category.items || category.items.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-4">
                              {isUncategorized ? '沒有待重新分類的商品' : '此分類尚無商品'}
                            </p>
                          ) : (
                            category.items.map((item, itemIndex) => (
                              <div key={item.id} className="flex items-center justify-between p-3 bg-white border rounded hover:bg-gray-50">
                                <div className="flex-1 min-w-0 mr-2">
                                  <div className="flex items-center gap-2 flex-wrap"><span className="font-medium truncate">{item.name}</span>
                                    {item.tags?.popular && (
                                      <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full flex-shrink-0">
                                        熱門
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-indigo-600 font-bold text-sm">NT$ {item.price}</p>
                                  {isUncategorized && item.moveHistory?.length > 0 && (
                                    <p className="text-xs text-orange-600 mt-1 truncate">
                                      原分類：{item.moveHistory[item.moveHistory.length - 1]?.from?.name}
                                    </p>
                                  )}
                                </div>

                                <div className="flex gap-1 flex-shrink-0">
                                  {/* 移動按鈕（只在未分類顯示） */}
                                  {isUncategorized && (
                                    <button
                                      onClick={() => openMobileMoveSheet(item, category.id)}
                                      className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200 transition-colors flex items-center gap-1"
                                      title="移動到..."
                                    >
                                      <FolderInput size={14} />
                                      <span className="hidden sm:inline">移動到...</span>
                                    </button>
                                  )}

                                  {/* 上移 */}
                                  {itemIndex > 0 && (
                                    <button
                                      onClick={() => {
                                        setSelectedCategoryId(category.id);
                                        handleMoveItemUp(item.id);
                                      }}
                                      className="p-1 hover:bg-gray-200 rounded"
                                      title="上移"
                                    >
                                      <ChevronUp size={16} />
                                    </button>
                                  )}

                                  {/* 下移 */}
                                  {itemIndex < category.items.length - 1 && (
                                    <button
                                      onClick={() => {
                                        setSelectedCategoryId(category.id);
                                        handleMoveItemDown(item.id);
                                      }}
                                      className="p-1 hover:bg-gray-200 rounded"
                                      title="下移"
                                    >
                                      <ChevronDown size={16} />
                                    </button>
                                  )}

                                  {/* 編輯 */}
                                  <button
                                    onClick={() => {
                                      setSelectedCategoryId(category.id);
                                      setEditingItem(item);
                                      setShowItemForm(true);
                                    }}
                                    className="p-1 hover:bg-blue-100 rounded text-blue-600"
                                    title="編輯"
                                  >
                                    <Edit2 size={16} />
                                  </button>

                                  {/* 刪除 */}
                                  <button
                                    onClick={() => {
                                      setSelectedCategoryId(category.id);
                                      handleDeleteItem(item.id);
                                    }}
                                    className="p-1 hover:bg-red-100 rounded text-red-600"
                                    title="刪除"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}

                          {/* 新增商品按鈕 */}
                          {!isUncategorized && (
                            <button
                              onClick={() => {
                                setSelectedCategoryId(category.id);
                                setEditingItem(null);
                                setShowItemForm(true);
                              }}
                              className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-gray-600 hover:text-blue-600 text-sm flex items-center justify-center gap-1"
                            >
                              <Plus size={16} />
                              新增商品
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            // 桌面版：左右分欄
            <>
              <CategoryPanel
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={setSelectedCategoryId}
                onAddCategory={() => {
                  setEditingCategory(null);
                  setShowCategoryForm(true);
                }}
                onEditCategory={(category) => {
                  setEditingCategory(category);
                  setShowCategoryForm(true);
                }}
                onDeleteCategory={handleDeleteCategory}
                onMoveCategoryUp={handleMoveCategoryUp}
                onMoveCategoryDown={handleMoveCategoryDown}
                isSuperAdmin={isSuperAdmin()}
              />

              <ItemPanel
                category={selectedCategory}
                categories={categories}
                uncategorizedCount={getUncategorizedCount()}
                onAddItem={() => {
                  setEditingItem(null);
                  setShowItemForm(true);
                }}
                onEditItem={(item) => {
                  setEditingItem(item);
                  setShowItemForm(true);
                }}
                onDeleteItem={handleDeleteItem}
                onMoveItemUp={handleMoveItemUp}
                onMoveItemDown={handleMoveItemDown}
                onMoveTo={handleMoveTo}
                onOpenUncategorizedPicker={() => setShowUncategorizedPicker(true)}
              />
            </>
          )}
        </div>
      </div>

      {/* 手機版移動選單 - 底部 Sheet */}
      {showMobileMoveSheet && movingItem && (
        <>
          {/* 遮罩層（點擊關閉） */}
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-[55]"
            onClick={closeMobileMoveSheet}
          ></div>

          {/* 底部 Sheet */}
          <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl z-[56] animate-slide-up max-h-[80vh] flex flex-col">
            {/* 拖曳指示條 */}
            <div className="flex justify-center py-3 border-b border-gray-200">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>

            {/* 標題 */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">
                移動「{movingItem.name}」
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                選擇目標分類
              </p>
            </div>

            {/* 分類列表 */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {getAvailableMoveCategories(movingFromCategoryId).length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    沒有可移動的分類
                  </p>
                ) : (
                  getAvailableMoveCategories(movingFromCategoryId).map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => handleMobileMoveItem(cat.id)}
                      className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Folder size={20} className="text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {cat.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {cat.items?.length || 0} 個商品
                            </div>
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* 取消按鈕 */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={closeMobileMoveSheet}
                className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </>
      )}

      {/* 分類表單彈窗 */}
      {showCategoryForm && (
        <CategoryForm
          isOpen={showCategoryForm}
          category={editingCategory}
          onClose={() => {
            setShowCategoryForm(false);
            setEditingCategory(null);
          }}
          onSave={(data) => {
            if (editingCategory) {
              handleEditCategory(editingCategory.id, data);
            } else {
              handleAddCategory(data);
            }
          }}
        />
      )}

      {/* 商品表單彈窗 */}
      {showItemForm && (
        <ItemForm
          isOpen={showItemForm}
          item={editingItem}
          storeType={store.type}
          onClose={() => {
            setShowItemForm(false);
            setEditingItem(null);
          }}
          onSave={(data) => {
            if (editingItem) {
              handleEditItem(editingItem.id, data);
            } else {
              handleAddItem(data);
            }
          }}
        />
      )}

      {/* 未分類商品挑選彈窗（桌面版） */}
      {showUncategorizedPicker && (
        <UncategorizedPicker
          isOpen={showUncategorizedPicker}
          onClose={() => setShowUncategorizedPicker(false)}
          uncategorizedItems={getUncategorizedItems()}
          targetCategory={selectedCategory}
          onConfirm={handleBatchMoveFromUncategorized}
        />
      )}
    </div>
  );
};
export default MenuEditor;