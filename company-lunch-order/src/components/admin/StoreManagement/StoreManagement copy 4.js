// src/components/admin/StoreManagement/StoreManagement.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import StoreList from './StoreList';
import StoreEditor from './StoreEditor';
import MenuEditor from './MenuEditor';
import { createStore, updateStore } from '../../../services/storeManagementService';

const StoreManagement = ({ onBack }) => {
  const { currentUser, hasPermission, isSuperAdmin } = useAuth();
  
  // 狀態管理
  const [filterType, setFilterType] = useState('all'); // 'all' | 'lunch' | 'drinks'
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isMenuEditorOpen, setIsMenuEditorOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  // 檢查權限
  useEffect(() => {
    if (currentUser && !hasPermission('canManageStores')) {
      alert('您沒有權限管理店家');
      onBack();
    }
  }, [currentUser, hasPermission, onBack]);

  // 處理新增店家
  const handleCreateStore = () => {
    setSelectedStore(null);
    setIsEdit(false);
    setIsEditorOpen(true);
  };

  // 處理編輯店家
  const handleEditStore = (store) => {
    console.log('📝 開啟編輯器，店家:', store.name);
    setSelectedStore(store);
    setIsEdit(true);
    setIsEditorOpen(true);
  };

  // 處理編輯菜單
  const handleEditMenu = (store) => {
    console.log('📋 開啟菜單編輯器，店家:', store.name);
    setSelectedStore(store);
    setIsMenuEditorOpen(true);
  };

  // 處理儲存（新增或編輯基本資訊）
  const handleSave = async (formData) => {
    setSaving(true);
    try {
      console.log('💾 儲存店家資料:', formData);

      if (isEdit) {
        // 編輯模式
        await updateStore(formData.id, formData.type, formData, currentUser);
        alert('店家資料更新成功！');
      } else {
        // 新增模式
        const newStoreId = await createStore(formData, currentUser);
        alert(`店家建立成功！ID: ${newStoreId}`);
      }

      // 關閉編輯器
      setIsEditorOpen(false);
      setSelectedStore(null);
    } catch (error) {
      console.error('❌ 儲存失敗:', error);
      alert(`儲存失敗：${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // 處理取消
  const handleCancel = () => {
    console.log('❌ 取消編輯');
    setIsEditorOpen(false);
    setSelectedStore(null);
  };

  // 處理菜單儲存完成
  const handleMenuSaveComplete = (updatedStore) => {
    console.log('✅ 菜單儲存完成:', updatedStore.name);
    setIsMenuEditorOpen(false);
    setSelectedStore(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* 標頭 */}
      <div className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  🏪 店家管理
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {isEditorOpen 
                    ? (isEdit ? `編輯：${selectedStore?.name}` : '新增店家')
                    : isMenuEditorOpen
                    ? `菜單管理：${selectedStore?.name}`
                    : '管理所有店家資料'
                  }
                </p>
              </div>
            </div>
            
            {/* 新增店家按鈕（只在列表頁顯示） */}
            {!isEditorOpen && !isMenuEditorOpen && (
              <button
                onClick={handleCreateStore}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新增店家
              </button>
            )}
          </div>

          {/* 篩選器（只在列表頁顯示） */}
          {!isEditorOpen && !isMenuEditorOpen && (
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              {/* 類型篩選 */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterType === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  全部
                </button>
                <button
                  onClick={() => setFilterType('lunch')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterType === 'lunch'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  🍱 午餐
                </button>
                <button
                  onClick={() => setFilterType('drinks')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterType === 'drinks'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  🧋 飲料
                </button>
              </div>

              {/* 搜尋框 */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜尋店家名稱..."
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <svg 
                  className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 主要內容 */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {!isEditorOpen && !isMenuEditorOpen ? (
          // 店家列表
          <StoreList
            filterType={filterType}
            searchQuery={searchQuery}
            onEditStore={handleEditStore}
            onEditMenu={handleEditMenu}
            isSuperAdmin={isSuperAdmin}
          />
        ) : isEditorOpen ? (
          // 店家基本資訊編輯器
          <StoreEditor
            isOpen={isEditorOpen}
            onClose={handleCancel}
            store={selectedStore}
            onSave={handleSave}
            isEdit={isEdit}
          />
        ) : (
          // 菜單編輯器
          <MenuEditor
            store={selectedStore}
            onClose={() => setIsMenuEditorOpen(false)}
            onSave={handleMenuSaveComplete}
          />
        )}
      </div>
    </div>
  );
};

export default StoreManagement;