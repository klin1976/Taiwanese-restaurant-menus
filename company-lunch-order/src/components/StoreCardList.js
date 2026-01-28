// src/components/StoreCardList.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { isStoreOpen, getStores } from '../utils/initializeStores';
import { useAuth } from '../contexts/AuthContext';
import { toggleFavorite, getFavorites } from '../services/userService';
import { Heart } from 'lucide-react';

const StoreCardList = ({ type, onStoreSelect }) => {
  const { currentUser } = useAuth();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [togglingMap, setTogglingMap] = useState({}); // 記錄正在切換收藏狀態的店家 ID

  useEffect(() => {
    fetchStores();
  }, [type]);

  useEffect(() => {
    if (currentUser) {
      loadFavorites();
    } else {
      setFavorites([]);
    }
  }, [currentUser]);

  const loadFavorites = async () => {
    if (!currentUser) return;
    const favs = await getFavorites(currentUser.uid);
    setFavorites(favs);
  };

  const handleToggleFavorite = async (e, storeId) => {
    e.stopPropagation();
    if (!currentUser) {
      alert('請先登入才能收藏店家');
      return;
    }

    // 防止重複點擊
    if (togglingMap[storeId]) return;

    // 樂觀更新 (Optimistic UI Update)
    const isCurrentlyFavorite = favorites.includes(storeId);
    setFavorites(prev => isCurrentlyFavorite
      ? prev.filter(id => id !== storeId)
      : [...prev, storeId]
    );

    setTogglingMap(prev => ({ ...prev, [storeId]: true }));

    try {
      await toggleFavorite(currentUser.uid, storeId);
      // 成功後不需要再次 fetch，因為已經樂觀更新了
    } catch (error) {
      console.error('更新收藏失敗:', error);
      alert('收藏操作失敗');
      // 失敗則回滾
      setFavorites(prev => isCurrentlyFavorite
        ? [...prev, storeId]
        : prev.filter(id => id !== storeId)
      );
    } finally {
      setTogglingMap(prev => ({ ...prev, [storeId]: false }));
    }
  };

  const fetchStores = async () => {
    try {
      setLoading(true);
      console.log('正在載入店家資料，類型:', type);

      // 方法1: 從 Firestore 讀取
      try {
        const storesCollection = collection(db, 'stores', type, 'list');
        const storesSnapshot = await getDocs(storesCollection);

        if (!storesSnapshot.empty) {
          const storesList = storesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            type: type
          }));
          console.log(`從 Firestore 載入 ${storesList.length} 家店家`);
          setStores(storesList);
          setLoading(false);
          return;
        }
      } catch (firestoreError) {
        console.warn('從 Firestore 讀取失敗，使用本地資料:', firestoreError);
      }

      // 方法2: 使用本地資料
      const localStores = await getStores(type);
      console.log(`使用本地資料，載入 ${localStores.length} 家店家`);
      setStores(localStores);

    } catch (error) {
      console.error('獲取店家資料失敗:', error);
      alert('載入店家資料失敗，請重新整理頁面');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入店家中...</p>
        </div>
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🏪</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">目前沒有店家</h3>
        <p className="text-gray-600">請稍後再試</p>
      </div>
    );
  }

  return (
    <div>
      {/* 篩選工具列 */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`flex items-center px-4 py-2 rounded-full transition-colors border ${showFavoritesOnly
            ? 'bg-pink-100 text-pink-700 border-pink-200'
            : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-200 border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600'
            }`}
        >
          <Heart
            size={18}
            className={`mr-2 ${showFavoritesOnly ? 'fill-current' : ''}`}
          />
          <span className="font-medium">只顯示收藏</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stores
          .filter(store => !showFavoritesOnly || favorites.includes(store.id))
          .map((store) => {
            const storeOpen = isStoreOpen(store.hours);
            const isFavorite = favorites.includes(store.id);
            const isToggling = togglingMap[store.id];

            return (
              <div
                key={store.id}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-slate-700 cursor-pointer group"
                onClick={() => onStoreSelect(store)}
              >
                {/* 店家標頭 */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-8 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-12 -mb-12"></div>

                  {/* 愛心按鈕 (右上角) */}
                  <button
                    onClick={(e) => handleToggleFavorite(e, store.id)}
                    disabled={isToggling}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-10 backdrop-blur-sm"
                  >
                    <Heart
                      size={24}
                      className={`transition-colors ${isFavorite ? 'fill-pink-500 text-pink-500' : 'text-white'
                        }`}
                    />
                  </button>

                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-3xl font-bold group-hover:scale-105 transition-transform">
                        {store.name}
                      </h3>
                      <div className={`px-3 py-1 rounded-full text-sm font-bold flex items-center ${storeOpen
                        ? 'bg-green-400 text-green-900'
                        : 'bg-red-400 text-red-900'
                        }`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${storeOpen ? 'bg-green-900' : 'bg-red-900'
                          }`}></div>
                        {storeOpen ? '營業中' : '休息中'}
                      </div>
                    </div>

                    <div className="space-y-2 text-indigo-100">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" />
                        </svg>
                        <span>⏱ {store.deliveryTime || '30分鐘'}</span>
                      </div>

                      {store.rating && (
                        <div className="flex items-center">
                          <svg className="w-5 h-5 mr-2 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="font-bold text-yellow-300">{store.rating}</span>
                          <span className="ml-1">★</span>
                        </div>
                      )}

                      {store.minOrder > 0 && (
                        <div className="flex items-center">
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                          </svg>
                          <span>最低消費 NT$ {store.minOrder}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 商品類別預覽 */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">商品分類</h4>
                    <span className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                      {store.categories?.length || 0} 個分類
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {store.categories?.slice(0, 4).map((category) => (
                      <span
                        key={category.id}
                        className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium border border-indigo-200 dark:border-indigo-800"
                      >
                        {category.name}
                      </span>
                    ))}
                    {store.categories?.length > 4 && (
                      <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-sm">
                        +{store.categories.length - 4} 更多
                      </span>
                    )}
                  </div>

                  {/* 進入按鈕 */}
                  <button
                    disabled={!storeOpen}
                    className={`w-full py-3 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center group-hover:shadow-lg ${storeOpen
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 group-hover:scale-105'
                      : 'bg-gray-300 dark:bg-slate-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      }`}
                  >
                    <span>{storeOpen ? '進入店家' : '店家休息中'}</span>
                    {storeOpen && (
                      <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            );
          })}

      </div>
    </div>
  );
};

export default StoreCardList;