// src/services/storeManagementService.js
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,

  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { generateUniqueStoreId } from './pinyinService';

/**
 * 店家管理服務
 * 處理店家的 CRUD 操作
 */

/**
 * 獲取所有店家（指定類型）
 * @param {string} type - 店家類型 ('lunch' | 'drinks' | 'all')
 * @returns {Promise<Array>} 店家陣列
 */
export const getAllStores = async (type = 'all') => {
  try {
    const stores = [];

    const types = type === 'all' ? ['lunch', 'drinks'] : [type];

    for (const storeType of types) {
      const storesRef = collection(db, 'stores', storeType, 'list');

      // ✅ 直接查詢所有文件，不使用 orderBy（避免索引問題）
      const snapshot = await getDocs(storesRef);

      console.log(`📦 ${storeType} 查詢結果:`, snapshot.size, '筆文件');

      snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`📄 文件 ${doc.id}:`, data);

        // 前端過濾：只顯示未刪除的店家
        if (data.deleted !== true) {
          stores.push({
            id: doc.id,
            ...data,
            type: storeType
          });
        } else {
          console.log(`⏭️ 跳過已刪除的店家: ${doc.id}`);
        }
      });
    }

    // ✅ 前端排序
    stores.sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));

    console.log(`✅ 成功載入 ${stores.length} 家店家`);
    return stores;

  } catch (error) {
    console.error('❌ 獲取店家列表失敗:', error);
    throw error;
  }
};

/**
 * 根據 ID 獲取單一店家
 * @param {string} storeId - 店家 ID
 * @param {string} type - 店家類型
 * @returns {Promise<Object|null>} 店家物件
 */
export const getStoreById = async (storeId, type) => {
  try {
    const storeRef = doc(db, 'stores', type, 'list', storeId);
    const storeSnap = await getDoc(storeRef);

    if (storeSnap.exists()) {
      return {
        id: storeSnap.id,
        ...storeSnap.data(),
        type
      };
    }

    return null;

  } catch (error) {
    console.error('❌ 獲取店家資料失敗:', error);
    throw error;
  }
};

/**
 * 建立新店家
 * @param {Object} storeData - 店家資料
 * @param {Object} currentUser - 當前使用者
 * @returns {Promise<string>} 店家 ID
 */
export const createStore = async (storeData, currentUser) => {
  try {
    console.log('🔧 開始建立店家:', storeData.name);

    // 驗證必要欄位
    if (!storeData.name || !storeData.type) {
      throw new Error('店家名稱和類型為必填');
    }

    // 生成店家 ID（如果沒有提供）
    let storeId = storeData.id;
    if (!storeId) {
      console.log('📝 自動生成店家 ID...');
      storeId = await generateUniqueStoreId(storeData.name, storeData.type);
      console.log('✅ 店家 ID:', storeId);
    }

    // 準備完整的店家資料
    const newStore = {
      id: storeId,
      name: storeData.name,
      type: storeData.type,

      // 聯絡資訊
      city: storeData.city || '',
      district: storeData.district || '',
      address: storeData.address || '',
      phone: storeData.phone || '',
      imageUrl: storeData.imageUrl || '',

      // 營業資訊
      hours: storeData.hours || {
        regular: {
          monday: { open: '09:00', close: '21:00', closed: false },
          tuesday: { open: '09:00', close: '21:00', closed: false },
          wednesday: { open: '09:00', close: '21:00', closed: false },
          thursday: { open: '09:00', close: '21:00', closed: false },
          friday: { open: '09:00', close: '21:00', closed: false },
          saturday: { open: '09:00', close: '21:00', closed: false },
          sunday: { open: '09:00', close: '21:00', closed: false }
        },
        special: []
      },

      // 其他設定
      rating: storeData.rating || 0,
      deliveryTime: storeData.deliveryTime || '30分鐘',
      minOrder: storeData.minOrder || 0,
      sortOrder: storeData.sortOrder || 999,
      active: storeData.active !== undefined ? storeData.active : true,
      cutoffTime: storeData.cutoffTime || '',
      deleted: false,

      // 菜單（初始為空）
      categories: storeData.categories || [],

      // 操作記錄
      createdAt: Timestamp.now(),
      createdBy: currentUser.uid,
      createdByName: currentUser.displayName || currentUser.email,
      updatedAt: Timestamp.now(),
      updatedBy: currentUser.uid,
      updatedByName: currentUser.displayName || currentUser.email,

      history: [
        {
          at: Timestamp.now(),
          by: currentUser.uid,
          byName: currentUser.displayName || currentUser.email,
          action: 'create_store',
          actionText: '建立店家',
          details: {
            name: storeData.name,
            type: storeData.type
          }
        }
      ]
    };

    console.log('💾 準備寫入 Firestore...');

    // 寫入 Firestore
    const storeRef = doc(db, 'stores', storeData.type, 'list', storeId);
    await setDoc(storeRef, newStore);

    console.log('✅ 店家建立成功:', storeId);
    return storeId;

  } catch (error) {
    console.error('❌ 建立店家失敗:', error);
    throw error;
  }
};

/**
 * 更新店家資料
 * @param {string} storeId - 店家 ID
 * @param {string} type - 店家類型
 * @param {Object} updates - 要更新的資料
 * @param {Object} currentUser - 當前使用者
 * @returns {Promise<void>}
 */
export const updateStore = async (storeId, type, updates, currentUser) => {
  try {
    console.log('🔧 開始更新店家:', storeId);

    const storeRef = doc(db, 'stores', type, 'list', storeId);

    // 準備歷史記錄
    const historyEntry = {
      at: Timestamp.now(),
      by: currentUser.uid,
      byName: currentUser.displayName || currentUser.email,
      action: 'update_store',
      actionText: '更新店家資訊',
      details: updates
    };

    // 讀取現有的歷史記錄
    const storeSnap = await getDoc(storeRef);
    const existingHistory = storeSnap.exists() ? (storeSnap.data().history || []) : [];

    // 更新資料
    await updateDoc(storeRef, {
      ...updates,
      updatedAt: Timestamp.now(),
      updatedBy: currentUser.uid,
      updatedByName: currentUser.displayName || currentUser.email,
      history: [...existingHistory, historyEntry]
    });

    console.log('✅ 店家資料更新成功:', storeId);

  } catch (error) {
    console.error('❌ 更新店家失敗:', error);
    throw error;
  }
};

/**
 * 軟刪除店家
 * @param {string} storeId - 店家 ID
 * @param {string} type - 店家類型
 * @param {Object} currentUser - 當前使用者
 * @returns {Promise<void>}
 */
export const deleteStore = async (storeId, type, currentUser) => {
  try {
    console.log('🗑️ 開始刪除店家:', storeId);

    const storeRef = doc(db, 'stores', type, 'list', storeId);

    // 讀取現有的歷史記錄
    const storeSnap = await getDoc(storeRef);
    const existingHistory = storeSnap.exists() ? (storeSnap.data().history || []) : [];

    // 軟刪除（標記為已刪除）
    await updateDoc(storeRef, {
      deleted: true,
      deletedAt: Timestamp.now(),
      deletedBy: currentUser.uid,
      deletedByName: currentUser.displayName || currentUser.email,
      updatedAt: Timestamp.now(),
      updatedBy: currentUser.uid,
      updatedByName: currentUser.displayName || currentUser.email,
      history: [
        ...existingHistory,
        {
          at: Timestamp.now(),
          by: currentUser.uid,
          byName: currentUser.displayName || currentUser.email,
          action: 'delete_store',
          actionText: '刪除店家',
          details: {}
        }
      ]
    });

    console.log('✅ 店家已刪除:', storeId);

  } catch (error) {
    console.error('❌ 刪除店家失敗:', error);
    throw error;
  }
};

/**
 * 切換店家啟用狀態
 * @param {string} storeId - 店家 ID
 * @param {string} type - 店家類型
 * @param {boolean} active - 啟用狀態
 * @param {Object} currentUser - 當前使用者
 * @returns {Promise<void>}
 */
export const toggleStoreActive = async (storeId, type, active, currentUser) => {
  try {
    console.log(`🔧 切換店家狀態: ${storeId} -> ${active ? '啟用' : '停用'}`);

    const storeRef = doc(db, 'stores', type, 'list', storeId);

    // 讀取現有的歷史記錄
    const storeSnap = await getDoc(storeRef);
    const existingHistory = storeSnap.exists() ? (storeSnap.data().history || []) : [];

    await updateDoc(storeRef, {
      active,
      updatedAt: Timestamp.now(),
      updatedBy: currentUser.uid,
      updatedByName: currentUser.displayName || currentUser.email,
      history: [
        ...existingHistory,
        {
          at: Timestamp.now(),
          by: currentUser.uid,
          byName: currentUser.displayName || currentUser.email,
          action: active ? 'enable_store' : 'disable_store',
          actionText: active ? '啟用店家' : '停用店家',
          details: { active }
        }
      ]
    });

    console.log(`✅ 店家 ${storeId} 已${active ? '啟用' : '停用'}`);

  } catch (error) {
    console.error('❌ 切換店家狀態失敗:', error);
    throw error;
  }
};

/**
 * 監聽店家列表變化（即時更新）
 * @param {string} type - 店家類型 ('lunch' | 'drinks' | 'all')
 * @param {Function} callback - 回調函數
 * @returns {Function} 取消監聽函數
 */
export const subscribeToStores = (type, callback) => {
  try {
    console.log('👂 開始監聽店家列表:', type);

    const types = type === 'all' ? ['lunch', 'drinks'] : [type];
    const unsubscribes = [];

    let allStores = [];

    types.forEach(storeType => {
      const storesRef = collection(db, 'stores', storeType, 'list');

      // ✅ 直接監聽整個 collection，不使用 orderBy
      const unsubscribe = onSnapshot(storesRef, (snapshot) => {
        console.log(`📦 收到 ${storeType} 店家更新:`, snapshot.size, '筆');

        // 移除舊的該類型資料
        allStores = allStores.filter(s => s.type !== storeType);

        // 加入新的資料
        snapshot.forEach(doc => {
          const data = doc.data();
          console.log(`📄 ${storeType} 文件 ${doc.id}:`, data.name, 'deleted:', data.deleted);

          // 前端過濾：只顯示未刪除的店家
          if (data.deleted !== true) {
            allStores.push({
              id: doc.id,
              ...data,
              type: storeType
            });
          }
        });

        // ✅ 前端排序
        allStores.sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));

        console.log(`✅ 店家列表更新完成，共 ${allStores.length} 家`);

        // 回調更新後的列表
        callback([...allStores]);
      }, (error) => {
        console.error(`❌ 監聽 ${storeType} 店家失敗:`, error);
      });

      unsubscribes.push(unsubscribe);
    });

    // 返回取消所有監聽的函數
    return () => {
      console.log('🔇 取消監聽店家列表');
      unsubscribes.forEach(unsub => unsub());
    };

  } catch (error) {
    console.error('❌ 監聽店家列表失敗:', error);
    return () => { };
  }
};

/**
 * 複製店家
 * @param {string} sourceStoreId - 來源店家 ID
 * @param {string} type - 店家類型
 * @param {Object} currentUser - 當前使用者
 * @param {string} newName - 新店家名稱（可選）
 * @returns {Promise<string>} 新店家 ID
 */
export const duplicateStore = async (sourceStoreId, type, currentUser, newName = null) => {
  try {
    console.log(`©️ 開始複製店家: ${sourceStoreId}`);

    // 1. 獲取來源店家資料
    const sourceStore = await getStoreById(sourceStoreId, type);
    if (!sourceStore) {
      throw new Error('來源店家不存在');
    }

    // 2. 準備新店家資料
    // 生成新 ID
    const targetName = newName || `${sourceStore.name} (複製)`;
    const newStoreId = await generateUniqueStoreId(targetName, type);

    // 深拷貝並清理資料
    const storeData = {
      ...sourceStore,
      id: newStoreId,
      name: targetName,
      active: false, // 複製後預設為停用，讓管理員先檢查

      // 重置審計欄位
      createdAt: Timestamp.now(),
      createdBy: currentUser.uid,
      createdByName: currentUser.displayName || currentUser.email,
      updatedAt: Timestamp.now(),
      updatedBy: currentUser.uid,
      updatedByName: currentUser.displayName || currentUser.email,

      // 初始化歷史記錄
      history: [
        {
          at: Timestamp.now(),
          by: currentUser.uid,
          byName: currentUser.displayName || currentUser.email,
          action: 'duplicate_store',
          actionText: '複製店家',
          details: {
            sourceStoreId: sourceStoreId,
            sourceStoreName: sourceStore.name
          }
        }
      ]
    };

    // 3. 處理菜單 ID 重置
    // 確保所有複製過來的分類與商品都有新的唯一 ID，避免 ID 衝突
    if (storeData.categories && storeData.categories.length > 0) {
      storeData.categories = storeData.categories.map(category => ({
        ...category,
        id: category.id === 'uncategorized' ? 'uncategorized' : `cat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        items: (category.items || []).map(item => ({
          ...item,
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          moveHistory: [] // 清空移動歷史
        }))
      }));
    }

    // 移除不應複製的系統欄位
    delete storeData.deleted;
    delete storeData.deletedAt;
    delete storeData.deletedBy;
    delete storeData.deletedByName;

    console.log('💾 準備寫入新店家資料...', newStoreId);

    // 4. 寫入 Firestore
    const storeRef = doc(db, 'stores', type, 'list', newStoreId);
    await setDoc(storeRef, storeData);

    console.log('✅ 店家複製成功:', newStoreId);
    return newStoreId;

  } catch (error) {
    console.error('❌ 複製店家失敗:', error);
    throw error;
  }
};