
// src/components/admin/StoreManagement/StoreManagement.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import StoreList from './StoreList';
import StoreEditor from './StoreEditor';
import MenuEditor from './MenuEditor';
import DataMigrationPanel from './DataMigrationPanel'; // ✅ 新增
import { createStore, updateStore } from '../../../services/storeManagementService';

const StoreManagement = ({ onBack }) => {
  const { currentUser, hasPermission, isSuperAdmin } = useAuth();

  // 狀態管理
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isMenuEditorOpen, setIsMenuEditorOpen] = useState(false);
  const [showMigrationPanel, setShowMigrationPanel] = useState(false); // ✅ 新增
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

  // ✅ 處理菜單儲存完成
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
    // 這裡可以考慮是否保留 selectedStore 如果想留在列表選中狀態，但目前邏輯是回到純列表
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
                      : showMigrationPanel // ✅ 新增
                        ? '資料遷移工具'
                        : '管理所有店家資料'
                  }
                </p>
              </div>
            </div>

            {/* 右側按鈕組 */}
            {!isEditorOpen && !isMenuEditorOpen && !showMigrationPanel && (
              <div className="flex gap-2">
                {/* ✅ 新增：遷移工具按鈕（僅超級管理員可見） */}
                {isSuperAdmin() && (
                  <button
                    onClick={() => setShowMigrationPanel(true)}
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    資料遷移
                  </button>
                )}

                {/* 新增店家按鈕 */}
                <button
                  onClick={handleCreateStore}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  新增店家
                </button>
              </div>
            )}
          </div>

          {/* 篩選器（只在列表頁顯示） */}
          {!isEditorOpen && !isMenuEditorOpen && !showMigrationPanel && (
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              {/* ... 保留原有篩選器 ... */}
            </div>
          )}
        </div>
      </div>

      {/* 主要內容 */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* ✅ 新增：遷移工具面板 */}
        {showMigrationPanel ? (
          <DataMigrationPanel
            onBack={() => setShowMigrationPanel(false)}
            isSuperAdmin={isSuperAdmin()}
          />
        ) : !isEditorOpen && !isMenuEditorOpen ? (
          // 店家列表
          <StoreList
            filterType={filterType}
            searchQuery={searchQuery}
            onEditStore={handleEditStore}
            onEditMenu={handleEditMenu}
            isSuperAdmin={isSuperAdmin()}
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
