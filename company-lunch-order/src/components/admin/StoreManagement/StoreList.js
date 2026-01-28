// src/components/admin/StoreManagement/StoreList.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  subscribeToStores,
  toggleStoreActive,
  deleteStore,
  duplicateStore
} from '../../../services/storeManagementService';
import { Copy } from 'lucide-react';

const StoreList = ({ filterType, searchQuery, onEditStore, onEditMenu, isSuperAdmin }) => {
  const { currentUser } = useAuth();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingStore, setDeletingStore] = useState(null);
  const [duplicatingStore, setDuplicatingStore] = useState(null);

  // 即時監聽店家列表
  useEffect(() => {
    console.log('訂閱店家列表:', filterType);
    setLoading(true);

    const unsubscribe = subscribeToStores(filterType, (updatedStores) => {
      console.log('店家列表更新:', updatedStores.length);
      setStores(updatedStores);
      setLoading(false);
    });

    return () => {
      console.log('取消訂閱店家列表');
      unsubscribe();
    };
  }, [filterType]);

  // 過濾店家（根據搜尋關鍵字）
  const filteredStores = stores.filter(store => {
    if (searchQuery.trim() === '') return true;
    return store.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // 處理啟用/停用
  const handleToggleActive = async (store, e) => {
    e.stopPropagation(); // 防止觸發編輯

    const action = store.active ? '停用' : '啟用';
    if (!window.confirm(`確定要${action}「${store.name}」嗎？`)) {
      return;
    }

    try {
      await toggleStoreActive(store.id, store.type, !store.active, currentUser);
      // 不需要手動更新，即時監聽會自動更新
    } catch (error) {
      console.error('切換店家狀態失敗:', error);
      alert(`${action}失敗：${error.message}`);
    }
  };

  // 處理刪除
  const handleDelete = async (store, e) => {
    e.stopPropagation(); // 防止觸發編輯

    if (!isSuperAdmin) {
      alert('只有超級管理員可以刪除店家');
      return;
    }

    if (!window.confirm(`確定要刪除「${store.name}」嗎？\n\n此操作為軟刪除，店家資料不會真正消失，但前台將不再顯示。`)) {
      return;
    }

    setDeletingStore(store.id);
    try {
      await deleteStore(store.id, store.type, currentUser);
      // 不需要手動更新，即時監聽會自動更新
      alert('店家已刪除');
    } catch (error) {
      console.error('刪除店家失敗:', error);
      alert(`刪除失敗：${error.message}`);
    } finally {
      setDeletingStore(null);
    }
  };

  // 處理複製
  const handleDuplicate = async (store, e) => {
    e.stopPropagation();

    // 預設新名稱
    const defaultName = `${store.name} (複製)`;
    const newName = window.prompt('請輸入新店家名稱:', defaultName);

    if (newName === null) return; // 取消
    if (!newName.trim()) {
      alert('店家名稱不能為空');
      return;
    }

    setDuplicatingStore(store.id);
    try {
      await duplicateStore(store.id, store.type, currentUser, newName.trim());
      alert('複製成功！新店家預設為停用狀態，請記得啟用。');
    } catch (error) {
      console.error('複製店家失敗:', error);
      alert(`複製失敗：${error.message}`);
    } finally {
      setDuplicatingStore(null);
    }
  };

  // 載入中
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">載入店家資料中...</p>
        </div>
      </div>
    );
  }

  // 無資料
  if (filteredStores.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
        <div className="text-6xl mb-4">🏪</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {searchQuery ? '找不到相關店家' : '目前沒有店家'}
        </h3>
        <p className="text-gray-600">
          {searchQuery ? '請嘗試其他關鍵字' : '點擊「新增店家」按鈕開始建立店家資料'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredStores.map((store) => (
        <div
          key={`${store.type}_${store.id}`}
          className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
        >
          {/* 店家圖片或預設圖示 */}
          <div className="relative h-48 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
            {store.imageUrl ? (
              <img
                src={store.imageUrl}
                alt={store.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-8xl">
                {store.type === 'lunch' ? '🍱' : '🧋'}
              </div>
            )}

            {/* 狀態標籤 */}
            <div className="absolute top-3 right-3 flex gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${store.active
                ? 'bg-green-500 text-white'
                : 'bg-gray-500 text-white'
                }`}>
                {store.active ? '營業中' : '已停用'}
              </span>

              {store.type && (
                <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                  {store.type === 'lunch' ? '午餐' : '飲料'}
                </span>
              )}
            </div>
          </div>

          {/* 店家資訊 */}
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {store.name}
            </h3>

            <div className="space-y-2 text-sm text-gray-600 mb-4">
              {store.city && store.district && (
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {store.city} {store.district}
                </div>
              )}

              {store.phone && (
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {store.phone}
                </div>
              )}

              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                菜單: {store.categories?.length || 0} 個分類
              </div>

              {store.rating > 0 && (
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {store.rating} 分
                </div>
              )}
            </div>

            {/* 操作按鈕 */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditStore(store);
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center justify-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                編輯資料
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onEditMenu) onEditMenu(store);
                }}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm flex items-center justify-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                編輯菜單
              </button>
            </div>

            {/* 第二排按鈕 */}
            <div className={`grid grid-cols-${isSuperAdmin ? '3' : '2'} gap-2`}>
              {/* 複製按鈕 */}
              <button
                onClick={(e) => handleDuplicate(store, e)}
                disabled={duplicatingStore === store.id}
                title="複製店家"
                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm flex items-center justify-center gap-1 disabled:bg-gray-400"
              >
                {duplicatingStore === store.id ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Copy size={16} />
                )}
                {/* 複製 */}
              </button>

              <button
                onClick={(e) => handleToggleActive(store, e)}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center ${store.active
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
              >
                {store.active ? '停用' : '啟用'}
              </button>

              {isSuperAdmin && (
                <button
                  onClick={(e) => handleDelete(store, e)}
                  disabled={deletingStore === store.id}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm disabled:bg-gray-400 flex items-center justify-center"
                >
                  {deletingStore === store.id ? '...' : '刪除'}
                </button>
              )}
            </div>
          </div>
        </div>

      ))
      }
    </div >
  );
};

export default StoreList;