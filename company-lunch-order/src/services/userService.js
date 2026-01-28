import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * 切換店家收藏狀態
 * @param {string} userId - 使用者 ID
 * @param {string} storeId - 店家 ID
 * @returns {Promise<boolean>} - 回傳新的收藏狀態 (true: 已收藏, false: 未收藏)
 */
export const toggleFavorite = async (userId, storeId) => {
    if (!userId || !storeId) return false;

    const userRef = doc(db, 'users', userId);

    try {
        const userDoc = await getDoc(userRef);

        // 如果使用者文件不存在，建立一個
        if (!userDoc.exists()) {
            await setDoc(userRef, {
                favoriteStoreIds: [storeId]
            }, { merge: true });
            return true;
        }

        const userData = userDoc.data();
        const favorites = userData.favoriteStoreIds || [];
        const isFavorite = favorites.includes(storeId);

        if (isFavorite) {
            // 移除收藏
            await updateDoc(userRef, {
                favoriteStoreIds: arrayRemove(storeId)
            });
            return false;
        } else {
            // 加入收藏
            await updateDoc(userRef, {
                favoriteStoreIds: arrayUnion(storeId)
            });
            return true;
        }
    } catch (error) {
        console.error('切換收藏狀態失敗:', error);
        throw error;
    }
};

/**
 * 獲取使用者的收藏列表
 * @param {string} userId - 使用者 ID
 * @returns {Promise<string[]>} - 回傳收藏的店家 ID 陣列
 */
export const getFavorites = async (userId) => {
    if (!userId) return [];

    try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            return userDoc.data().favoriteStoreIds || [];
        }
        return [];
    } catch (error) {
        console.error('獲取收藏列表失敗:', error);
        return [];
    }
};
