// src/services/storeService.js
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// 取得所有午餐店家
export const getLunchStores = async () => {
  try {
    const storesRef = collection(db, 'stores', 'lunch', 'storeList');
    const snapshot = await getDocs(storesRef);
    
    const stores = [];
    snapshot.forEach((doc) => {
      stores.push({ id: doc.id, ...doc.data() });
    });
    
    return stores;
  } catch (error) {
    console.error('取得午餐店家資料錯誤:', error);
    throw error;
  }
};

// 取得所有飲料店家
export const getDrinkStores = async () => {
  try {
    const storesRef = collection(db, 'stores', 'drinks', 'storeList');
    const snapshot = await getDocs(storesRef);
    
    const stores = [];
    snapshot.forEach((doc) => {
      stores.push({ id: doc.id, ...doc.data() });
    });
    
    return stores;
  } catch (error) {
    console.error('取得飲料店家資料錯誤:', error);
    throw error;
  }
};

// 取得特定店家資訊
export const getStoreById = async (type, storeId) => {
  try {
    const storeRef = doc(db, 'stores', type, 'storeList', storeId);
    const storeSnap = await getDoc(storeRef);
    
    if (storeSnap.exists()) {
      return { id: storeSnap.id, ...storeSnap.data() };
    } else {
      throw new Error('店家不存在');
    }
  } catch (error) {
    console.error('取得店家資料錯誤:', error);
    throw error;
  }
};

// 搜尋店家
export const searchStores = async (type, searchTerm) => {
  try {
    const stores = type === 'lunch' ? await getLunchStores() : await getDrinkStores();
    
    if (!searchTerm) return stores;
    
    return stores.filter(store => 
      store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.categories.some(category =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.items.some(item =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    );
  } catch (error) {
    console.error('搜尋店家錯誤:', error);
    throw error;
  }
};