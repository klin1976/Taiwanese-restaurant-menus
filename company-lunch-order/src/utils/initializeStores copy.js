// src/utils/initializeStores.js
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

// 營業時間檢查函式
export const isStoreOpen = (storeHours) => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;
  
  if (!storeHours || !storeHours.open || !storeHours.close) return true;
  
  const [openHour, openMinute] = storeHours.open.split(':').map(Number);
  const [closeHour, closeMinute] = storeHours.close.split(':').map(Number);
  
  const openTime = openHour * 60 + openMinute;
  const closeTime = closeHour * 60 + closeMinute;
  
  return currentTime >= openTime && currentTime <= closeTime;
};

// 初始化店家資料到 Firestore
export const initializeStores = async () => {
  try {
    console.log('開始初始化店家資料...');
    
    const lunchStoresRef = collection(db, 'stores', 'lunch', 'storeList');
    const lunchSnapshot = await getDocs(lunchStoresRef);
    
    if (lunchSnapshot.size > 0) {
      console.log('店家資料已存在，跳過初始化');
      return;
    }

    // 午餐店家資料
    const lunchStores = {
      // 富家小鋪
      'fujiaxiaopu': {
        id: 'fujiaxiaopu',
        name: '富家小鋪',
        type: 'lunch',
        phone: '6328322',
        address: '新營區三民路6-1號',
        hours: { open: '10:00', close: '20:30', closedDays: [0] }, // 周日休息
        hoursText: '上午10:00-晚上8:30 (星期日公休)',
        rating: 4.5,
        deliveryTime: '25-35分鐘',
        minOrder: 0,
        categories: [
          {
            id: 'rice-box',
            name: '蓋飯類',
            items: [
              { id: 'beef-rice', name: '香爆牛肉蓋飯', price: 90, popular: true },
              { id: 'lamb-rice', name: '香爆羊肉蓋飯', price: 90 },
              { id: 'pork-rice', name: '香爆豬肉蓋飯', price: 80 },
              { id: 'chicken-rice', name: '宮保雞丁蓋飯', price: 85 }
            ]
          },
          {
            id: 'fried-rice',
            name: '炒飯類',
            items: [
              { id: 'egg-rice', name: '蛋炒飯', price: 55 },
              { id: 'ham-egg-rice', name: '火腿蛋炒飯', price: 65 },
              { id: 'shrimp-egg-rice', name: '蝦仁蛋炒飯', price: 70, popular: true },
              { id: 'pork-silk-rice', name: '肉絲蛋炒飯', price: 65 },
              { id: 'pepper-pork-rice', name: '黑胡椒豬肉炒飯', price: 70 },
              { id: 'pepper-beef-rice', name: '黑胡椒牛肉炒飯', price: 85 }
            ]
          },
          {
            id: 'noodles',
            name: '炒麵類',
            items: [
              { id: 'mixed-noodles', name: '什錦炒麵', price: 65 },
              { id: 'yi-noodles', name: '炒意麵', price: 75 },
              { id: 'beef-noodles', name: '牛肉炒麵', price: 85, popular: true },
              { id: 'seafood-noodles', name: '海鮮炒麵', price: 90 }
            ]
          }
        ]
      },

      // 早餐工坊
      'breakfast-workshop': {
        id: 'breakfast-workshop',
        name: '早餐工坊',
        type: 'lunch',
        phone: '06-6376898',
        address: '新營區中興路30號',
        hours: '平日最有效率時間11:00',
        categories: [
          {
            id: 'toast',
            name: '吐司',
            items: [
              { id: 'tuna-toast', name: '鮪魚吐司', price: 25 },
              { id: 'french-toast', name: '法國吐司', price: 30 },
              { id: 'ham-egg-toast', name: '火腿蛋吐司', price: 30 },
              { id: 'bacon-egg-toast', name: '培根蛋吐司', price: 30 }
            ]
          },
          {
            id: 'burger',
            name: '漢堡',
            items: [
              { id: 'pork-burger', name: '豬肉漢堡', price: 35 },
              { id: 'chicken-burger', name: '雞肉漢堡', price: 35 },
              { id: 'beef-burger', name: '牛肉漢堡', price: 50 },
              { id: 'fish-burger', name: '魚排漢堡', price: 50 }
            ]
          },
          {
            id: 'pancake',
            name: '蛋餅',
            items: [
              { id: 'original-pancake', name: '原味蛋餅', price: 20 },
              { id: 'ham-pancake', name: '火腿蛋餅', price: 30 },
              { id: 'bacon-pancake', name: '培根蛋餅', price: 30 },
              { id: 'cheese-pancake', name: '起司蛋餅', price: 35 }
            ]
          }
        ]
      }
    };

    // 飲料店家資料
    const drinkStores = {
      // MACU 果粒茶創始品牌
      'macu': {
        id: 'macu',
        name: 'MACU 果粒茶創始品牌',
        type: 'drinks',
        phone: '06-6989229',
        address: '台南市大甲區水林里中山路230號1樓',
        hours: { open: '09:00', close: '22:00', closedDays: [] },
        hoursText: '上午9:00-晚上10:00',
        rating: 4.4,
        deliveryTime: '15-20分鐘',
        minOrder: 0,
        categories: [
          {
            id: 'fruit-tea',
            name: '果粒茶系列',
            items: [
              { id: 'passion-fruit-tea', name: '香橙果粒茶', price: 75, popular: true },
              { id: 'lemon-fruit-tea', name: '檸檬果粒茶', price: 70 },
              { id: 'grapefruit-tea', name: '葡萄柚果粒茶', price: 65 },
              { id: 'orange-tea', name: '柳橙果粒茶', price: 65 },
              { id: 'mango-tea', name: '芒果果粒茶', price: 80 }
            ]
          },
          {
            id: 'fresh-juice',
            name: '鮮果茶飲',
            items: [
              { id: 'passion-fruit-juice', name: '百香果Q果', price: 60 },
              { id: 'passion-fruit-green', name: '百香綠茶', price: 55, popular: true },
              { id: 'winter-melon-juice', name: '翡翠冬瓜', price: 60 },
              { id: 'green-tea', name: '綠茶', price: 30 }
            ]
          },
          {
            id: 'milk-tea',
            name: '濃厚系列',
            items: [
              { id: 'assam-milk-tea', name: '阿薩姆奶茶', price: 60 },
              { id: 'earl-grey', name: '伯爵奶茶', price: 50 },
              { id: 'oolong-milk-tea', name: '烏龍奶茶', price: 50, popular: true },
              { id: 'taro-milk-tea', name: '芋頭奶茶', price: 60 }
            ]
          }
        ]
      },

// TEA'S 原味
      'teas-original': {
        id: 'teas-original',
        name: "TEA'S 原味",
        type: 'drinks',
        categories: [
          {
            id: 'tea-series',
            name: '茶香系列',
            items: [
              { id: 'ancient-black-tea', name: '古早味紅茶', price: 30 },
              { id: 'oolong-tea', name: '烏龍茶', price: 30 },
              { id: 'alishan-green-tea', name: '阿里山綠茶', price: 30 },
              { id: 'jasmine-tea', name: '茉莉綠茶', price: 30 }
            ]
          },
          {
            id: 'milk-series',
            name: '奶香系列',
            items: [
              { id: 'milk-tea', name: '奶茶', price: 40 },
              { id: 'milk-green', name: '奶綠', price: 40 },
              { id: 'ancient-milk-tea', name: '古早味奶茶', price: 40 },
              { id: 'taro-milk', name: '芋香奶茶', price: 45 }
            ]
          },
          {
            id: 'fresh-milk',
            name: '鮮奶系列',
            items: [
              { id: 'fresh-milk-tea', name: '鮮奶茶', price: 50 },
              { id: 'fresh-milk-green', name: '鮮奶綠', price: 50 },
              { id: 'cocoa-fresh-milk', name: '可可鮮奶', price: 65 }
            ]
          }
        ]
      }
    };

    // 寫入午餐店家資料
    for (const storeId in lunchStores) {
      const storeData = lunchStores[storeId];
      const storeRef = doc(db, 'stores', 'lunch', 'storeList', storeId);
      await setDoc(storeRef, storeData);
      console.log(`已新增午餐店家: ${storeData.name}`);
    }

    // 寫入飲料店家資料
    for (const storeId in drinkStores) {
      const storeData = drinkStores[storeId];
      const storeRef = doc(db, 'stores', 'drinks', 'storeList', storeId);
      await setDoc(storeRef, storeData);
      console.log(`已新增飲料店家: ${storeData.name}`);
    }

    console.log('所有店家資料初始化完成！');
    
  } catch (error) {
    console.error('初始化店家資料時發生錯誤:', error);
    throw error;
  }
};