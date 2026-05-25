// src/services/orderService.js
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  Timestamp,
  runTransaction,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { notifyStoreNewOrder, notifyStoreOrderCancelled, notifyUserOrderStatusChanged, notifyStoreOrderMerged } from './notificationService';

export const ORDER_STATUS = {
  PENDING: '待確認',
  CONFIRMED: '已確認',
  PREPARING: '準備中',
  READY: '可取餐',
  COMPLETED: '已完成',
  CANCELLED: '已取消'
};

export const ORDER_STATUS_TEXT = {
  [ORDER_STATUS.PENDING]: '待確認',
  [ORDER_STATUS.CONFIRMED]: '已確認',
  [ORDER_STATUS.PREPARING]: '準備中',
  [ORDER_STATUS.READY]: '可取餐',
  [ORDER_STATUS.COMPLETED]: '已完成',
  [ORDER_STATUS.CANCELLED]: '已取消'
};

export const createOrder = async (orderData) => {
  try {
    if (!orderData.userId) {
      throw new Error('userId 不能為空');
    }
    if (!orderData.restaurantId) {
      throw new Error('restaurantId 不能為空');
    }
    if (!orderData.items || orderData.items.length === 0) {
      throw new Error('訂單項目不能為空');
    }

    console.log('準備建立訂單:', orderData);

    // 處理訂單項目，確保客製化資料被正確儲存
    const processedItems = orderData.items.map(item => {
      const processedItem = {
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      };

      // 只有當 customization 存在且不為 null 時才加入
      if (item.customization) {
        processedItem.customization = {
          sweetness: item.customization.sweetness || '正常',
          ice: item.customization.ice || '正常冰',
          toppings: item.customization.toppings || []
        };
      }

      return processedItem;
    });

    // 建立新訂單物件
    const newOrder = {
      userId: orderData.userId,
      userName: orderData.userName || '',
      userEmail: orderData.userEmail || '',
      restaurantId: orderData.restaurantId,
      restaurantName: orderData.restaurantName || '',
      items: processedItems,
      totalAmount: orderData.totalAmount || 0,
      status: ORDER_STATUS.PENDING,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    // 使用 Transaction 確保庫存扣減原子性
    const result = await runTransaction(db, async (transaction) => {
      const storeType = orderData.storeType || 'lunch';
      const storeRef = doc(db, 'stores', storeType, 'list', orderData.restaurantId);
      const storeDoc = await transaction.get(storeRef);

      if (!storeDoc.exists()) {
        throw new Error('找不到店家資料，無法成立訂單');
      }

      const storeData = storeDoc.data();
      let categoriesChanged = false;
      const newCategories = [...storeData.categories];

      for (const orderItem of processedItems) {
        let itemFound = false;
        for (const cat of newCategories) {
          const productIndex = cat.items.findIndex(p => p.id === orderItem.id);
          if (productIndex !== -1) {
            const product = cat.items[productIndex];
            itemFound = true;
            if (product.stock !== undefined && product.stock !== null) {
              if (product.stock < orderItem.quantity) {
                throw new Error(`商品「${product.name}」庫存不足`);
              }
              product.stock -= orderItem.quantity;
              categoriesChanged = true;
            }
            break;
          }
        }
      }

      if (categoriesChanged) {
        transaction.update(storeRef, { categories: newCategories, updatedAt: Timestamp.now() });
      }

      // 處理序號 (改採無鎖短 ID 方案，消除 counters/dailyOrderCounter 單點併發瓶頸)
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
      const orderNumber = `${todayStr}-${randomStr}`;
      newOrder.orderNumber = orderNumber;

      const newOrderRef = doc(collection(db, 'orders'));
      transaction.set(newOrderRef, newOrder);

      return { id: newOrderRef.id, orderNumber };
    });

    // 🔔 通知
    try {
      notifyStoreNewOrder({ ...orderData, orderNumber: result.orderNumber, id: result.id });
    } catch (e) { console.warn('通知失敗:', e); }

    return result;
  } catch (error) {
    console.error('建立訂單失敗:', error);
    throw error;
  }
};

export const getUserOrders = async (userId) => {
  try {
    const q = query(collection(db, 'orders'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate() }));
  } catch (error) { throw error; }
};

export const updateOrderStatus = async (orderId, newStatus) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, { status: newStatus, updatedAt: Timestamp.now() });
    notifyUserOrderStatusChanged(orderId, newStatus);
  } catch (error) { throw error; }
};

export const cancelOrder = async (orderId) => {
  try {
    await updateOrderStatus(orderId, ORDER_STATUS.CANCELLED);
    notifyStoreOrderCancelled({ id: orderId, orderNumber: orderId, userName: '使用者' });
  } catch (error) { throw error; }
};

export const getAllOrders = async () => {
  try {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate() }));
  } catch (error) { throw error; }
};

export const checkDuplicateOrder = async (userId, restaurantId) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('[Debug] 檢查重複訂單:', { userId, restaurantId, today });

    // 簡化查詢：僅依 userId 查詢，避免需要複雜的複合索引
    // getUserOrders 本身就有使用 userId + createdAt (desc) 的查詢，索引應該已經存在
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    console.log(`[Debug] 找到該用戶的總訂單數: ${snapshot.size}`);

    const duplicates = snapshot.docs.filter(doc => {
      const data = doc.data();
      const orderDate = data.createdAt?.toDate();
      
      // 在客戶端進行精確過濾
      return (
        data.restaurantId === restaurantId &&
        data.status === ORDER_STATUS.PENDING &&
        orderDate &&
        orderDate >= today &&
        orderDate < tomorrow
      );
    });

    if (duplicates.length > 0) {
      console.log('[Debug] 偵測到重複訂單:', duplicates[0].id);
      return { id: duplicates[0].id, ...duplicates[0].data() };
    }

    return null;
  } catch (error) {
    console.error('[Debug] 檢查重複訂單發生錯誤:', error);
    // 即使發生錯誤，我們也回傳 null 讓流程繼續（即不合併），但至少會看到錯誤訊息
    return null;
  }
};

export const mergeOrder = async (existingOrderId, orderData) => {
  try {
    const result = await runTransaction(db, async (transaction) => {
      const orderRef = doc(db, 'orders', existingOrderId);
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists()) throw new Error('找不到現有訂單');

      const existingOrder = orderDoc.data();
      const storeRef = doc(db, 'stores', orderData.storeType || 'lunch', 'list', orderData.restaurantId);
      const storeDoc = await transaction.get(storeRef);
      if (!storeDoc.exists()) throw new Error('找不到店家');

      const storeData = storeDoc.data();
      const newCategories = [...storeData.categories];
      let changed = false;
      const mergedItems = [...existingOrder.items];
      let addAmount = 0;

      for (const newItem of orderData.items) {
        // 庫存
        for (const cat of newCategories) {
          const pIdx = cat.items.findIndex(p => p.id === newItem.id);
          if (pIdx !== -1) {
            const p = cat.items[pIdx];
            if (p.stock != null) {
              if (p.stock < newItem.quantity) throw new Error(`「${p.name}」庫存不足`);
              p.stock -= newItem.quantity;
              changed = true;
            }
            break;
          }
        }

        // 合併項目
        const eIdx = mergedItems.findIndex(item => 
          item.id === newItem.id && JSON.stringify(item.customization) === JSON.stringify(newItem.customization)
        );
        if (eIdx !== -1) mergedItems[eIdx].quantity += newItem.quantity;
        else mergedItems.push(newItem);
        addAmount += (newItem.price * newItem.quantity);
      }

      if (changed) transaction.update(storeRef, { categories: newCategories, updatedAt: Timestamp.now() });
      transaction.update(orderRef, {
        items: mergedItems,
        totalAmount: existingOrder.totalAmount + addAmount,
        updatedAt: Timestamp.now()
      });
      return { 
        id: existingOrderId, 
        orderNumber: existingOrder.orderNumber,
        newTotal: existingOrder.totalAmount + addAmount,
        originalItems: existingOrder.items,
        addAmount: addAmount
      };
    });

    try {
      notifyStoreOrderMerged(orderData, result.orderNumber, {
        originalItems: result.originalItems,
        newTotal: result.newTotal,
        addAmount: result.addAmount
      });
    } catch (e) {
      console.warn('通知發送失敗:', e);
    }

    return result;
  } catch (error) { throw error; }
};