// src/components/StoreDebugger.js
import React, { useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { initializeStores, getStores } from '../utils/initializeStores';

const StoreDebugger = () => {
  const [debugInfo, setDebugInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const checkFirestoreData = async () => {
    setLoading(true);
    let info = '=== Firestore 資料檢查 ===\n\n';

    try {
      // 檢查午餐店家
      info += '【午餐店家】\n';
      const lunchCollection = collection(db, 'stores', 'lunch', 'list');
      const lunchSnapshot = await getDocs(lunchCollection);
      info += `找到 ${lunchSnapshot.size} 家午餐店家\n`;
      lunchSnapshot.forEach(doc => {
        info += `- ${doc.id}: ${doc.data().name}\n`;
      });

      info += '\n【飲料店家】\n';
      const drinksCollection = collection(db, 'stores', 'drinks', 'list');
      const drinksSnapshot = await getDocs(drinksCollection);
      info += `找到 ${drinksSnapshot.size} 家飲料店家\n`;
      drinksSnapshot.forEach(doc => {
        info += `- ${doc.id}: ${doc.data().name}\n`;
      });

    } catch (error) {
      info += `\n❌ 錯誤: ${error.message}\n`;
    }

    setDebugInfo(info);
    setLoading(false);
  };

  const checkLocalData = async () => {
    setLoading(true);
    let info = '=== 本地資料檢查 ===\n\n';

    try {
      const lunchStores = await getStores('lunch');
      info += `【午餐店家】找到 ${lunchStores.length} 家\n`;
      lunchStores.forEach(store => {
        info += `- ${store.id}: ${store.name}\n`;
      });

      const drinkStores = await getStores('drinks');
      info += `\n【飲料店家】找到 ${drinkStores.length} 家\n`;
      drinkStores.forEach(store => {
        info += `- ${store.id}: ${store.name}\n`;
      });

    } catch (error) {
      info += `\n❌ 錯誤: ${error.message}\n`;
    }

    setDebugInfo(info);
    setLoading(false);
  };

  const forceInitialize = async () => {
    if (!window.confirm('確定要重新初始化所有店家資料嗎？')) {
      return;
    }

    setLoading(true);
    let info = '=== 強制初始化 ===\n\n';

    try {
      info += '開始初始化...\n';
      await initializeStores();
      info += '✅ 初始化完成！\n\n';
      
      // 重新檢查
      const lunchCollection = collection(db, 'stores', 'lunch', 'list');
      const lunchSnapshot = await getDocs(lunchCollection);
      info += `午餐店家: ${lunchSnapshot.size} 家\n`;

      const drinksCollection = collection(db, 'stores', 'drinks', 'list');
      const drinksSnapshot = await getDocs(drinksCollection);
      info += `飲料店家: ${drinksSnapshot.size} 家\n`;

    } catch (error) {
      info += `\n❌ 錯誤: ${error.message}\n`;
      info += `詳細: ${error.stack}\n`;
    }

    setDebugInfo(info);
    setLoading(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl border-2 border-indigo-200 p-4 w-96">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">🔧</span>
          店家資料偵錯工具
        </h3>

        <div className="space-y-2 mb-4">
          <button
            onClick={checkFirestoreData}
            disabled={loading}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 text-sm font-medium"
          >
            檢查 Firestore 資料
          </button>

          <button
            onClick={checkLocalData}
            disabled={loading}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 text-sm font-medium"
          >
            檢查本地資料
          </button>

          <button
            onClick={forceInitialize}
            disabled={loading}
            className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 text-sm font-medium"
          >
            強制重新初始化
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {debugInfo && (
          <div className="bg-gray-100 rounded p-3 max-h-64 overflow-y-auto">
            <pre className="text-xs whitespace-pre-wrap font-mono text-gray-800">
              {debugInfo}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreDebugger;