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
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase';

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

    // 只查詢 userId（使用現有索引）
    const duplicateQuery = query(
      collection(db, 'orders'),
      where('userId', '==', orderData.userId),
      orderBy('createdAt', 'desc')
    );

    const duplicateSnapshot = await getDocs(duplicateQuery);

    // 在客戶端過濾重複訂單
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayDuplicates = duplicateSnapshot.docs.filter(doc => {
      const data = doc.data();
      const orderDate = data.createdAt?.toDate();
      return (
        data.restaurantId === orderData.restaurantId &&
        data.status === ORDER_STATUS.PENDING &&
        orderDate &&
        orderDate >= today &&
        orderDate < tomorrow
      );
    });

    if (todayDuplicates.length > 0) {
      console.warn('檢測到今日重複訂單');
      alert('您今天已經在這家餐廳訂購過了');
      return todayDuplicates[0].id;
    }

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

    console.log('即將寫入 Firestore 的訂單資料:', JSON.stringify(newOrder, null, 2));

    // 使用 Transaction 確保庫存扣減原子性
    const orderId = await runTransaction(db, async (transaction) => {
      // 1. 讀取店家資料以檢查並扣減庫存
      // 必須從 orderData 傳入 storeType，否則無法定位店家文件
      const storeType = orderData.storeType || 'lunch'; // 暫時預設 lunch，或是必須強制傳入
      const storeRef = doc(db, 'stores', storeType, 'list', orderData.restaurantId);
      const storeDoc = await transaction.get(storeRef);

      if (!storeDoc.exists()) {
        throw new Error('找不到店家資料，無法成立訂單');
      }

      const storeData = storeDoc.data();
      let categoriesChanged = false;

      // 2. 檢查並更新庫存
      // 為了方便查找，將 categories 轉換為 map 或直接遍歷
      const newCategories = [...storeData.categories];

      for (const orderItem of processedItems) {
        // 尋找對應的分類和商品
        let itemFound = false;

        for (const cat of newCategories) {
          const productIndex = cat.items.findIndex(p => p.id === orderItem.id);
          if (productIndex !== -1) {
            const product = cat.items[productIndex];
            itemFound = true;

            // 檢查主商品庫存
            if (product.stock !== undefined && product.stock !== null) {
              if (product.stock < orderItem.quantity) {
                throw new Error(`商品「${product.name}」庫存不足 (剩餘: ${product.stock})`);
              }
              // 扣除庫存
              product.stock -= orderItem.quantity;
              categoriesChanged = true;
            }

            // 檢查變體/選項庫存 (如果有實作變體庫存邏輯)
            // 這裡假設變體庫存結構為 product.variants[].stock
            // orderItem.customization 包含選擇的變體
            // 此處暫時僅實作主商品庫存，若需支援變體庫存需與前端資料結構配合

            break; // 找到商品後跳出分類迴圈
          }
        }

        if (!itemFound) {
          // 商品找不到可能是被刪除，這裡可以選擇報錯或忽略
          console.warn(`訂單中的商品 ID ${orderItem.id} 在店家菜單中找不到 (可能已下架)`);
        }
      }

      // 3. 執行寫入

      // 3.1 寫入庫存更新 (如果有變動)
      if (categoriesChanged) {
        transaction.update(storeRef, {
          categories: newCategories,
          updatedAt: Timestamp.now()
        });
      }

      // 3.2 寫入新訂單
      const newOrderRef = doc(collection(db, 'orders'));
      transaction.set(newOrderRef, newOrder);

      return newOrderRef.id;
    });

    console.log('訂單建立成功 (Transaction):', orderId);
    return orderId;

  } catch (error) {
    console.error('建立訂單失敗:', error);
    throw error;
  }
};

export const getUserOrders = async (userId) => {
  try {
    if (!userId) {
      throw new Error('userId 不能為空');
    }

    const ordersQuery = query(
      collection(db, 'orders'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(ordersQuery);
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));

    return orders;
  } catch (error) {
    console.error('取得訂單失敗:', error);
    throw error;
  }
};

export const updateOrderStatus = async (orderId, newStatus) => {
  try {
    if (!orderId) {
      throw new Error('orderId 不能為空');
    }

    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      status: newStatus,
      updatedAt: Timestamp.now()
    });

    console.log('訂單狀態已更新:', orderId, newStatus);
  } catch (error) {
    console.error('更新訂單狀態失敗:', error);
    throw error;
  }
};

export const cancelOrder = async (orderId) => {
  try {
    await updateOrderStatus(orderId, ORDER_STATUS.CANCELLED);
    console.log('訂單已取消:', orderId);
  } catch (error) {
    console.error('取消訂單失敗:', error);
    throw error;
  }
};

export const getAllOrders = async () => {
  try {
    const ordersQuery = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(ordersQuery);
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));

    return orders;
  } catch (error) {
    console.error('取得所有訂單失敗:', error);
    throw error;
  }
};