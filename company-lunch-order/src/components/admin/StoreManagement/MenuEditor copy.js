// src/components/admin/StoreManagement/MenuEditor.js
import React, { useState, useEffect } from 'react';
import { Save, X, Plus } from 'lucide-react';
import CategoryPanel from './CategoryPanel';
import ItemPanel from './ItemPanel';
import CategoryForm from './CategoryForm';
import ItemForm from './ItemForm';
import { updateStore } from '../../../services/storeManagementService';
import { useAuth } from '../../../contexts/AuthContext';

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
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  
  // 初始化菜單資料
  useEffect(() => {
    if (store && store.categories) {
      setCategories(JSON.parse(JSON.stringify(store.categories))); // 深拷貝
      
      // 自動選擇第一個分類
      if (store.categories.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(store.categories[0].id);
      }
    }
  }, [store]);

  // 獲取當前選中的分類
  const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);

  // ============================================
  // 分類管理函數
  // ============================================

  // 新增分類
  const handleAddCategory = (categoryData) => {
    const newCategory = {
      id: `category_${Date.now()}`,
      name: categoryData.name,
      sortOrder: categories.length + 1,
      items: []
    };
    
    setCategories([...categories, newCategory]);
    setSelectedCategoryId(newCategory.id);
    setHasChanges(true);
    setShowCategoryForm(false);
  };

  // 編輯分類
  const handleEditCategory = (categoryId, updates) => {
    setCategories(categories.map(cat => 
      cat.id === categoryId ? { ...cat, ...updates } : cat
    ));
    setHasChanges(true);
    setShowCategoryForm(false);
    setEditingCategory(null);
  };

  // 刪除分類
  const handleDeleteCategory = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    
    if (!isSuperAdmin()) {
      alert('只有超級管理員可以刪除分類');
      return;
    }

    // 方案 C：移動到「未分類」
    if (category && category.items && category.items.length > 0) {
      // 找到或建立「未分類」
      let uncategorized = categories.find(cat => cat.name === '未分類');
      
      if (!uncategorized) {
        uncategorized = {
          id: 'uncategorized',
          name: '未分類',
          sortOrder: 0,
          items: []
        };
        setCategories([uncategorized, ...categories.filter(cat => cat.id !== categoryId)]);
      }
      
      // 移動商品到「未分類」
      const updatedCategories = categories.map(cat => {
        if (cat.id === 'uncategorized' || cat.name === '未分類') {
          return {
            ...cat,
            items: [...cat.items, ...category.items]
          };
        }
        return cat;
      }).filter(cat => cat.id !== categoryId);
      
      setCategories(updatedCategories);
      
      if (selectedCategoryId === categoryId) {
        setSelectedCategoryId(updatedCategories[0]?.id);
      }
      
      alert(`「${category.name}」下的 ${category.items.length} 個商品已移動到「未分類」`);
    } else {
      // 沒有商品，直接刪除
      setCategories(categories.filter(cat => cat.id !== categoryId));
      
      if (selectedCategoryId === categoryId) {
        setSelectedCategoryId(categories[0]?.id);
      }
    }
    
    setHasChanges(true);
  };

  // 分類上移
  const handleMoveCategoryUp = (categoryId) => {
    const index = categories.findIndex(cat => cat.id === categoryId);
    if (index > 0) {
      const newCategories = [...categories];
      [newCategories[index], newCategories[index - 1]] = [newCategories[index - 1], newCategories[index]];
      
      // 更新 sortOrder
      newCategories.forEach((cat, idx) => {
        cat.sortOrder = idx + 1;
      });
      
      setCategories(newCategories);
      setHasChanges(true);
    }
  };

  // 分類下移
  const handleMoveCategoryDown = (categoryId) => {
    const index = categories.findIndex(cat => cat.id === categoryId);
    if (index < categories.length - 1) {
      const newCategories = [...categories];
      [newCategories[index], newCategories[index + 1]] = [newCategories[index + 1], newCategories[index]];
      
      // 更新 sortOrder
      newCategories.forEach((cat, idx) => {
        cat.sortOrder = idx + 1;
      });
      
      setCategories(newCategories);
      setHasChanges(true);
    }
  };

  // ============================================
  // 商品管理函數
  // ============================================

  // 新增商品
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
      imageUrl: '', // 第三階段再做
      status: itemData.status || 'available',
      sortOrder: (selectedCategory?.items?.length || 0) + 1,
      tags: itemData.tags || {}
    };

    setCategories(categories.map(cat => {
      if (cat.id === selectedCategoryId) {
        return {
          ...cat,
          items: [...(cat.items || []), newItem]
        };
      }
      return cat;
    }));

    setHasChanges(true);
    setShowItemForm(false);
  };

  // 編輯商品
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

  // 刪除商品
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

  // 商品上移
  const handleMoveItemUp = (itemId) => {
    setCategories(categories.map(cat => {
      if (cat.id === selectedCategoryId) {
        const items = [...cat.items];
        const index = items.findIndex(item => item.id === itemId);
        
        if (index > 0) {
          [items[index], items[index - 1]] = [items[index - 1], items[index]];
          
          // 更新 sortOrder
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

  // 商品下移
  const handleMoveItemDown = (itemId) => {
    setCategories(categories.map(cat => {
      if (cat.id === selectedCategoryId) {
        const items = [...cat.items];
        const index = items.findIndex(item => item.id === itemId);
        
        if (index < items.length - 1) {
          [items[index], items[index + 1]] = [items[index + 1], items[index]];
          
          // 更新 sortOrder
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
  // 儲存和取消
  // ============================================

  // 批次儲存
  const handleSave = async () => {
    if (!hasChanges) {
      alert('沒有需要儲存的變更');
      return;
    }

    setSaving(true);
    try {
      console.log('💾 儲存菜單資料...');
      
      // 更新店家的 categories
      await updateStore(store.id, store.type, { categories }, currentUser);
      
      setHasChanges(false);
      alert('菜單儲存成功！');
      
      if (onSave) {
        onSave({ ...store, categories });
      }
    } catch (error) {
      console.error('❌ 儲存失敗:', error);
      alert(`儲存失敗：${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // 取消編輯
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* 標題列 */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
          <div>
            <h2 className="text-2xl font-bold">📋 {store.name} - 菜單管理</h2>
            {hasChanges && (
              <p className="text-sm text-orange-600 mt-1">⚠️ 有未儲存的變更</p>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                hasChanges && !saving
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
          </div>
        </div>

        {/* 主要內容區 */}
        <div className="flex-1 overflow-hidden flex">
          {isMobile ? (
            // 手機版：階層式
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-lg font-bold">分類與商品</h3>
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
                  <p>尚無分類，請新增第一個分類</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {categories.map((category, catIndex) => (
                    <div key={category.id} className="border rounded-lg overflow-hidden">
                      {/* 分類標頭 */}
                      <div className="bg-gray-50 p-4 flex items-center justify-between">
                        <h4 className="font-bold text-gray-900">
                          📂 {category.name} ({category.items?.length || 0})
                        </h4>
                        
                        <div className="flex gap-1">
                          {catIndex > 0 && (
                            <button
                              onClick={() => handleMoveCategoryUp(category.id)}
                              className="p-1 hover:bg-gray-200 rounded"
                              title="上移"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </button>
                          )}
                          
                          {catIndex < categories.length - 1 && (
                            <button
                              onClick={() => handleMoveCategoryDown(category.id)}
                              className="p-1 hover:bg-gray-200 rounded"
                              title="下移"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
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
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          
                          {isSuperAdmin() && (
                            <button
                              onClick={() => handleDeleteCategory(category.id)}
                              className="p-1 hover:bg-red-100 rounded text-red-600"
                              title="刪除"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 商品列表 */}
                      <div className="p-4 space-y-2">
                        {!category.items || category.items.length === 0 ? (
                          <p className="text-gray-500 text-sm text-center py-4">此分類尚無商品</p>
                        ) : (
                          category.items.map((item, itemIndex) => (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-white border rounded hover:bg-gray-50">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{item.name}</span>
                                  {item.tags?.popular && (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">🔥 熱門</span>
                                  )}
                                </div>
                                <p className="text-indigo-600 font-bold text-sm">NT$ {item.price}</p>
                              </div>
                              
                              <div className="flex gap-1">
                                {itemIndex > 0 && (
                                  <button
                                    onClick={() => {
                                      setSelectedCategoryId(category.id);
                                      handleMoveItemUp(item.id);
                                    }}
                                    className="p-1 hover:bg-gray-200 rounded"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                  </button>
                                )}
                                
                                {itemIndex < category.items.length - 1 && (
                                  <button
                                    onClick={() => {
                                      setSelectedCategoryId(category.id);
                                      handleMoveItemDown(item.id);
                                    }}
                                    className="p-1 hover:bg-gray-200 rounded"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                )}
                                
                                <button
                                  onClick={() => {
                                    setSelectedCategoryId(category.id);
                                    setEditingItem(item);
                                    setShowItemForm(true);
                                  }}
                                  className="p-1 hover:bg-blue-100 rounded text-blue-600"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                
                                <button
                                  onClick={() => {
                                    setSelectedCategoryId(category.id);
                                    handleDeleteItem(item.id);
                                  }}
                                  className="p-1 hover:bg-red-100 rounded text-red-600"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))
                        )}

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
                      </div>
                    </div>
                  ))}
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
              />
            </>
          )}
        </div>
      </div>

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
    </div>
  );
};

export default MenuEditor;