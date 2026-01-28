// src/components/StoreList.js
import React, { useState, useEffect } from 'react';
import { getLunchStores, getDrinkStores } from '../services/storeService';

const StoreList = ({ type, onStoreSelect }) => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const storeData = type === 'lunch' ? await getLunchStores() : await getDrinkStores();
        setStores(storeData);
        
      } catch (error) {
        console.error('載入店家資料錯誤:', error);
        setError('載入店家資料失敗，請稍後再試。');
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, [type]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">載入店家中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>目前沒有{type === 'lunch' ? '午餐' : '飲料'}店家資料</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {stores.map((store) => (
        <div
          key={store.id}
          className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer border border-gray-200"
          onClick={() => onStoreSelect(store)}
        >
          <div className="p-6">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {store.name}
              </h3>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {type === 'lunch' ? '午餐' : '飲料'}
              </span>
            </div>
            
            {store.phone && (
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">電話:</span> {store.phone}
              </p>
            )}
            
            {store.address && (
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">地址:</span> {store.address}
              </p>
            )}
            
            {store.hours && (
              <p className="text-sm text-gray-600 mb-3">
                <span className="font-medium">營業時間:</span> {store.hours}
              </p>
            )}
            
            <div className="flex flex-wrap gap-1 mb-3">
              {store.categories.slice(0, 3).map((category) => (
                <span
                  key={category.id}
                  className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                >
                  {category.name}
                </span>
              ))}
              {store.categories.length > 3 && (
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                  +{store.categories.length - 3} 更多
                </span>
              )}
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">
                {store.categories.reduce((total, category) => total + category.items.length, 0)} 項商品
              </span>
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                查看菜單 →
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StoreList;