// src/utils/initializeStores.js
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// 營業時間與截止時間檢查函數
export const isStoreOpen = (store) => {
  if (!store) return false;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  // 1. 檢查訂餐截止時間
  if (store.cutoffTime) {
    const [cutoffHour, cutoffMin] = store.cutoffTime.split(':').map(Number);
    const cutoffTimeValue = cutoffHour * 60 + cutoffMin;
    if (currentTime > cutoffTimeValue) {
      return false; // 已超過截單時間
    }
  }

  // 2. 檢查營業時間
  const hours = store.hours;
  if (!hours) return true;

  // 處理新版營業時間結構 (regular, special)
  if (hours.regular) {
    // 檢查是否有特殊時間 (優先)
    if (hours.special && hours.special.length > 0) {
      // 如果需要更複雜的特殊假期處理，這裡可以擴展
      // 目前簡單跳過或未來擴展
    }

    // 取得今天是星期幾
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[now.getDay()];

    const todaySchedule = hours.regular[today];
    if (!todaySchedule || todaySchedule.closed) return false;

    const [openHour, openMinute] = todaySchedule.open.split(':').map(Number);
    const [closeHour, closeMinute] = todaySchedule.close.split(':').map(Number);

    const openTime = openHour * 60 + openMinute;
    const closeTime = closeHour * 60 + closeMinute;

    return currentTime >= openTime && currentTime <= closeTime;
  }

  // 處理舊版營業時間結構
  if (hours.open && hours.close) {
    const [openHour, openMinute] = hours.open.split(':').map(Number);
    const [closeHour, closeMinute] = hours.close.split(':').map(Number);

    const openTime = openHour * 60 + openMinute;
    const closeTime = closeHour * 60 + closeMinute;

    return currentTime >= openTime && currentTime <= closeTime;
  }

  return true;
};

// 午餐店家資料
const lunchStores = [
  {
    id: 'fu_jia',
    name: '富家小鋪',
    type: 'lunch',
    rating: 4.5,
    deliveryTime: '30分鐘',
    minOrder: 0,
    hours: {
      open: '10:00',
      close: '20:00'
    },
    categories: [
      {
        id: 'rice',
        name: '蓋飯類',
        items: [
          { id: 'beef_rice', name: '香爆牛肉蓋飯', price: 90, popular: true },
          { id: 'pork_rice', name: '梅干扣肉蓋飯', price: 85, popular: true },
          { id: 'chicken_rice', name: '三杯雞蓋飯', price: 85 },
          { id: 'fish_rice', name: '紅燒魚蓋飯', price: 90 }
        ]
      },
      {
        id: 'noodles',
        name: '麵食類',
        items: [
          { id: 'beef_noodle', name: '紅燒牛肉麵', price: 95, popular: true },
          { id: 'wonton_noodle', name: '餛飩麵', price: 70 },
          { id: 'dry_noodle', name: '乾拌麵', price: 60 }
        ]
      },
      {
        id: 'bento',
        name: '便當類',
        items: [
          { id: 'ribs_bento', name: '排骨便當', price: 90, popular: true },
          { id: 'chicken_bento', name: '雞腿便當', price: 95 },
          { id: 'fish_bento', name: '魚排便當', price: 85 }
        ]
      }
    ]
  },
  {
    id: 'breakfast_shop',
    name: '早餐工坊',
    type: 'lunch',
    rating: 4.3,
    deliveryTime: '20分鐘',
    minOrder: 0,
    hours: {
      open: '06:00',
      close: '14:00'
    },
    categories: [
      {
        id: 'sandwich',
        name: '三明治',
        items: [
          { id: 'ham_sandwich', name: '火腿蛋三明治', price: 45 },
          { id: 'tuna_sandwich', name: '鮪魚三明治', price: 50 },
          { id: 'club_sandwich', name: '總匯三明治', price: 65, popular: true }
        ]
      },
      {
        id: 'toast',
        name: '吐司',
        items: [
          { id: 'peanut_toast', name: '花生厚片', price: 35 },
          { id: 'butter_toast', name: '奶酥厚片', price: 40 }
        ]
      }
    ]
  }
];

// 飲料店家資料
const drinkStores = [
  {
    id: 'macu_tea',
    name: 'MACU 果粒茶',
    type: 'drinks',
    rating: 4.7,
    deliveryTime: '15分鐘',
    minOrder: 0,
    hours: {
      open: '10:00',
      close: '22:00'
    },
    categories: [
      {
        id: 'fruit_tea',
        name: '果粒茶系列',
        items: [
          { id: 'orange_tea', name: '香橙果粒茶', price: 75, popular: true },
          { id: 'lemon_tea', name: '柳橙果粒茶', price: 70 },
          { id: 'grapefruit_tea', name: '葡萄柚果粒茶', price: 65, popular: true },
          { id: 'passion_tea', name: '百香果粒茶', price: 70 }
        ]
      },
      {
        id: 'milk_tea',
        name: '鮮奶系列',
        items: [
          { id: 'black_milk_tea', name: '紅茶拿鐵', price: 65 },
          { id: 'oolong_milk_tea', name: '鐵觀音拿鐵', price: 65 },
          { id: 'boba_milk_tea', name: '波霸紅茶拿鐵', price: 70, popular: true }
        ]
      },
      {
        id: 'special',
        name: '飲中甜品',
        items: [
          { id: 'mango_sago', name: '楊枝甘露2.0', price: 85, popular: true },
          { id: 'strawberry_cheese', name: '芝芝草莓果粒', price: 90, popular: true }
        ]
      }
    ]
  },
  {
    id: 'teas_original',
    name: "TEA'S 原味",
    type: 'drinks',
    rating: 4.5,
    deliveryTime: '15分鐘',
    minOrder: 0,
    hours: {
      open: '09:00',
      close: '21:30'
    },
    categories: [
      {
        id: 'classic_tea',
        name: '經典茶飲',
        items: [
          { id: 'black_tea', name: '古早味紅茶', price: 30, popular: true },
          { id: 'green_tea', name: '茉香綠茶', price: 30 },
          { id: 'oolong_tea', name: '高山烏龍茶', price: 35 },
          { id: 'jasmine_tea', name: '茉莉花茶', price: 35 }
        ]
      },
      {
        id: 'fruit_drinks',
        name: '鮮果茶飲',
        items: [
          { id: 'lemon_juice', name: '蜜翠檸檬', price: 60, popular: true },
          { id: 'passion_qq', name: '百香果Q果', price: 60 },
          { id: 'grapefruit_green', name: '葡萄柚綠茶', price: 55 }
        ]
      },
      {
        id: 'milk_series',
        name: '奶茶系列',
        items: [
          { id: 'pearl_milk_tea', name: '珍珠奶茶', price: 50, popular: true },
          { id: 'coconut_milk_tea', name: '椰果奶茶', price: 50 },
          { id: 'pudding_milk_tea', name: '布丁奶茶', price: 55 }
        ]
      }
    ]
  },
  {
    id: 'cool_tea',
    name: '清心福全',
    type: 'drinks',
    rating: 4.4,
    deliveryTime: '15分鐘',
    minOrder: 0,
    hours: {
      open: '08:00',
      close: '22:00'
    },
    categories: [
      {
        id: 'signature',
        name: '招牌系列',
        items: [
          { id: 'qingxin_tea', name: '清心翡翠', price: 35, popular: true },
          { id: 'winter_melon', name: '冬瓜檸檬', price: 45 },
          { id: 'plum_green', name: '梅子綠茶', price: 40 }
        ]
      },
      {
        id: 'fresh_milk',
        name: '鮮奶茶',
        items: [
          { id: 'fresh_milk_tea', name: '鮮奶茶', price: 55, popular: true },
          { id: 'fresh_milk_green', name: '鮮奶綠', price: 55 },
          { id: 'cocoa_fresh_milk', name: '可可鮮奶', price: 60 }
        ]
      }
    ]
  }
];

// 初始化店家資料到 Firestore
export const initializeStores = async () => {
  try {
    console.log('開始初始化店家資料...');

    // 檢查是否已初始化
    const initDoc = await getDoc(doc(db, 'system', 'initialized'));
    if (initDoc.exists() && initDoc.data().stores) {
      console.log('店家資料已存在，跳過初始化');
      return;
    }

    // 初始化午餐店家
    for (const store of lunchStores) {
      const storeRef = doc(db, 'stores', 'lunch', 'list', store.id);
      await setDoc(storeRef, store);
      console.log(`午餐店家 ${store.name} 初始化完成`);
    }

    // 初始化飲料店家
    for (const store of drinkStores) {
      const storeRef = doc(db, 'stores', 'drinks', 'list', store.id);
      await setDoc(storeRef, store);
      console.log(`飲料店家 ${store.name} 初始化完成`);
    }

    // 標記為已初始化
    await setDoc(doc(db, 'system', 'initialized'), {
      stores: true,
      timestamp: new Date()
    });

    console.log('所有店家資料初始化完成！');
    return true;

  } catch (error) {
    console.error('初始化店家資料失敗:', error);
    throw error;
  }
};

// 獲取店家資料
export const getStores = async (type) => {
  try {
    const stores = type === 'lunch' ? lunchStores : drinkStores;
    return stores;
  } catch (error) {
    console.error('獲取店家資料失敗:', error);
    return [];
  }
};