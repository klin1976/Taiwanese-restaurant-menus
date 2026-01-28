// src/utils/productTags.js

/**
 * 商品標籤定義（完整版 - 36 個標籤）
 */

// ============================================
// 標籤分類定義
// ============================================

export const TAG_CATEGORIES = {
  DIETARY: 'dietary',       // 飲食限制
  FLAVOR: 'flavor',         // 口味特色
  COOKING: 'cooking',       // 烹調方式
  TEMPERATURE: 'temperature', // 溫度
  RECOMMENDATION: 'recommendation', // 推薦
  HEALTH: 'health',         // 健康
  SPECIAL: 'special'        // 特殊需求
};

export const TAG_CATEGORY_NAMES = {
  [TAG_CATEGORIES.DIETARY]: '飲食限制',
  [TAG_CATEGORIES.FLAVOR]: '口味特色',
  [TAG_CATEGORIES.COOKING]: '烹調方式',
  [TAG_CATEGORIES.TEMPERATURE]: '溫度',
  [TAG_CATEGORIES.RECOMMENDATION]: '推薦',
  [TAG_CATEGORIES.HEALTH]: '健康',
  [TAG_CATEGORIES.SPECIAL]: '特殊需求'
};

// ============================================
// 完整標籤定義（36 個）
// ============================================

export const PRODUCT_TAGS = {
  // ========== 飲食限制 (8 個) ==========
  vegetarian: {
    key: 'vegetarian',
    category: TAG_CATEGORIES.DIETARY,
    label: '素食',
    icon: '🥬',
    color: 'green',
    description: '素食可食用'
  },
  vegan: {
    key: 'vegan',
    category: TAG_CATEGORIES.DIETARY,
    label: '全素',
    icon: '🌿',
    color: 'green',
    description: '全素可食用'
  },
  lactoOvo: {
    key: 'lactoOvo',
    category: TAG_CATEGORIES.DIETARY,
    label: '蛋奶素',
    icon: '🥚',
    color: 'yellow',
    description: '蛋奶素可食用'
  },
  halal: {
    key: 'halal',
    category: TAG_CATEGORIES.DIETARY,
    label: '清真',
    icon: '☪️',
    color: 'blue',
    description: '清真認證'
  },
  glutenFree: {
    key: 'glutenFree',
    category: TAG_CATEGORIES.DIETARY,
    label: '無麩質',
    icon: '🚫',
    color: 'red',
    description: '不含麩質'
  },
  containsNuts: {
    key: 'containsNuts',
    category: TAG_CATEGORIES.DIETARY,
    label: '含堅果',
    icon: '🥜',
    color: 'orange',
    description: '含有堅果成分'
  },
  containsSeafood: {
    key: 'containsSeafood',
    category: TAG_CATEGORIES.DIETARY,
    label: '含海鮮',
    icon: '🦐',
    color: 'blue',
    description: '含有海鮮成分'
  },
  containsDairy: {
    key: 'containsDairy',
    category: TAG_CATEGORIES.DIETARY,
    label: '含乳製品',
    icon: '🥛',
    color: 'gray',
    description: '含有乳製品'
  },

  // ========== 口味特色 (7 個) ==========
  mildSpicy: {
    key: 'mildSpicy',
    category: TAG_CATEGORIES.FLAVOR,
    label: '小辣',
    icon: '🌶️',
    color: 'red',
    description: '輕微辣度'
  },
  mediumSpicy: {
    key: 'mediumSpicy',
    category: TAG_CATEGORIES.FLAVOR,
    label: '中辣',
    icon: '🌶️🌶️',
    color: 'red',
    description: '中等辣度'
  },
  verySpicy: {
    key: 'verySpicy',
    category: TAG_CATEGORIES.FLAVOR,
    label: '大辣',
    icon: '🌶️🌶️🌶️',
    color: 'red',
    description: '重辣'
  },
  salty: {
    key: 'salty',
    category: TAG_CATEGORIES.FLAVOR,
    label: '重口味',
    icon: '🧂',
    color: 'gray',
    description: '味道偏鹹'
  },
  sweet: {
    key: 'sweet',
    category: TAG_CATEGORIES.FLAVOR,
    label: '甜',
    icon: '🍯',
    color: 'yellow',
    description: '味道偏甜'
  },
  sour: {
    key: 'sour',
    category: TAG_CATEGORIES.FLAVOR,
    label: '酸',
    icon: '🍋',
    color: 'yellow',
    description: '味道偏酸'
  },
  light: {
    key: 'light',
    category: TAG_CATEGORIES.FLAVOR,
    label: '清淡',
    icon: '💧',
    color: 'blue',
    description: '清淡口味'
  },

  // ========== 烹調方式 (6 個) ==========
  fried: {
    key: 'fried',
    category: TAG_CATEGORIES.COOKING,
    label: '油炸',
    icon: '🔥',
    color: 'orange',
    description: '油炸烹調'
  },
  panFried: {
    key: 'panFried',
    category: TAG_CATEGORIES.COOKING,
    label: '煎',
    icon: '🍳',
    color: 'yellow',
    description: '煎製'
  },
  stewed: {
    key: 'stewed',
    category: TAG_CATEGORIES.COOKING,
    label: '燉煮',
    icon: '🥘',
    color: 'red',
    description: '燉煮料理'
  },
  grilled: {
    key: 'grilled',
    category: TAG_CATEGORIES.COOKING,
    label: '燒烤',
    icon: '🔥',
    color: 'red',
    description: '燒烤料理'
  },
  raw: {
    key: 'raw',
    category: TAG_CATEGORIES.COOKING,
    label: '生食',
    icon: '🥗',
    color: 'green',
    description: '生食料理'
  },
  soup: {
    key: 'soup',
    category: TAG_CATEGORIES.COOKING,
    label: '湯品',
    icon: '🍲',
    color: 'orange',
    description: '湯類料理'
  },

  // ========== 溫度 (3 個) ==========
  hot: {
    key: 'hot',
    category: TAG_CATEGORIES.TEMPERATURE,
    label: '熱食',
    icon: '🔥',
    color: 'red',
    description: '熱食'
  },
  cold: {
    key: 'cold',
    category: TAG_CATEGORIES.TEMPERATURE,
    label: '冷食',
    icon: '❄️',
    color: 'blue',
    description: '冷食'
  },
  frozen: {
    key: 'frozen',
    category: TAG_CATEGORIES.TEMPERATURE,
    label: '冰品',
    icon: '🧊',
    color: 'blue',
    description: '冰品'
  },

  // ========== 推薦 (5 個) ==========
  signature: {
    key: 'signature',
    category: TAG_CATEGORIES.RECOMMENDATION,
    label: '招牌',
    icon: '⭐',
    color: 'yellow',
    description: '店家招牌'
  },
  popular: {
    key: 'popular',
    category: TAG_CATEGORIES.RECOMMENDATION,
    label: '熱門',
    icon: '🔥',
    color: 'red',
    description: '熱門商品'
  },
  new: {
    key: 'new',
    category: TAG_CATEGORIES.RECOMMENDATION,
    label: '新品',
    icon: '🆕',
    color: 'blue',
    description: '新推出商品'
  },
  chefSpecial: {
    key: 'chefSpecial',
    category: TAG_CATEGORIES.RECOMMENDATION,
    label: '主廚推薦',
    icon: '💝',
    color: 'pink',
    description: '主廚特別推薦'
  },
  sharing: {
    key: 'sharing',
    category: TAG_CATEGORIES.RECOMMENDATION,
    label: '適合分享',
    icon: '👨‍👩‍👧‍👦',
    color: 'purple',
    description: '適合多人分享'
  },

  // ========== 健康 (4 個) ==========
  lowCal: {
    key: 'lowCal',
    category: TAG_CATEGORIES.HEALTH,
    label: '低卡',
    icon: '🥗',
    color: 'green',
    description: '低卡路里'
  },
  highProtein: {
    key: 'highProtein',
    category: TAG_CATEGORIES.HEALTH,
    label: '高蛋白',
    icon: '💪',
    color: 'blue',
    description: '高蛋白質'
  },
  organic: {
    key: 'organic',
    category: TAG_CATEGORIES.HEALTH,
    label: '有機',
    icon: '🌱',
    color: 'green',
    description: '有機認證'
  },
  wellness: {
    key: 'wellness',
    category: TAG_CATEGORIES.HEALTH,
    label: '養生',
    icon: '🧘',
    color: 'purple',
    description: '養生料理'
  },

  // ========== 特殊需求 (3 個) ==========
  kidFriendly: {
    key: 'kidFriendly',
    category: TAG_CATEGORIES.SPECIAL,
    label: '兒童友善',
    icon: '👶',
    color: 'pink',
    description: '適合兒童'
  },
  customizable: {
    key: 'customizable',
    category: TAG_CATEGORIES.SPECIAL,
    label: '可客製化',
    icon: '🎨',
    color: 'purple',
    description: '可自訂選項'
  },
  takeawayOnly: {
    key: 'takeawayOnly',
    category: TAG_CATEGORIES.SPECIAL,
    label: '外帶專用',
    icon: '📦',
    color: 'brown',
    description: '僅供外帶'
  }
};

// ============================================
// 工具函數
// ============================================

/**
 * 獲取所有標籤列表
 * @returns {Array} 標籤陣列
 */
export const getAllTags = () => {
  return Object.values(PRODUCT_TAGS);
};

/**
 * 根據分類獲取標籤
 * @param {string} category - 分類名稱
 * @returns {Array} 該分類的標籤陣列
 */
export const getTagsByCategory = (category) => {
  return Object.values(PRODUCT_TAGS).filter(tag => tag.category === category);
};

/**
 * 根據 key 獲取標籤資訊
 * @param {string} key - 標籤鍵值
 * @returns {Object} 標籤物件
 */
export const getTagByKey = (key) => {
  return PRODUCT_TAGS[key] || null;
};

/**
 * 獲取標籤顏色類別（Tailwind CSS）
 * @param {string} color - 顏色名稱
 * @returns {Object} Tailwind 類別
 */
export const getTagColorClass = (color) => {
  const colorMap = {
    red: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-300'
    },
    blue: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      border: 'border-blue-300'
    },
    yellow: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      border: 'border-yellow-300'
    },
    green: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-300'
    },
    purple: {
      bg: 'bg-purple-100',
      text: 'text-purple-800',
      border: 'border-purple-300'
    },
    pink: {
      bg: 'bg-pink-100',
      text: 'text-pink-800',
      border: 'border-pink-300'
    },
    orange: {
      bg: 'bg-orange-100',
      text: 'text-orange-800',
      border: 'border-orange-300'
    },
    gray: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      border: 'border-gray-300'
    },
    brown: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-900',
      border: 'border-yellow-300'
    }
  };
  
  return colorMap[color] || colorMap.gray;
};

/**
 * 初始化商品標籤（所有標籤預設為 false）
 * @returns {Object} 初始標籤物件
 */
export const initializeProductTags = () => {
  const tags = {};
  Object.keys(PRODUCT_TAGS).forEach(key => {
    tags[key] = false;
  });
  return tags;
};

/**
 * 獲取商品已啟用的標籤列表
 * @param {Object} productTags - 商品的標籤物件
 * @returns {Array} 已啟用的標籤陣列
 */
export const getActiveTags = (productTags) => {
  if (!productTags) return [];
  
  return Object.entries(productTags)
    .filter(([key, value]) => value === true)
    .map(([key]) => PRODUCT_TAGS[key])
    .filter(tag => tag !== undefined);
};

/**
 * 根據店家類型獲取預設標籤
 * @param {string} storeType - 店家類型 ('lunch' | 'drinks')
 * @returns {Object} 預設標籤物件
 */
export const getDefaultTagsByStoreType = (storeType) => {
  const defaultTags = initializeProductTags();
  
  if (storeType === 'lunch') {
    // 午餐類預設：熱食
    defaultTags.hot = true;
  } else if (storeType === 'drinks') {
    // 飲料類預設：冷食
    defaultTags.cold = true;
  }
  
  return defaultTags;
};

/**
 * 搜尋標籤
 * @param {string} keyword - 搜尋關鍵字
 * @returns {Array} 匹配的標籤陣列
 */
export const searchTags = (keyword) => {
  if (!keyword || keyword.trim() === '') {
    return getAllTags();
  }
  
  const searchTerm = keyword.toLowerCase().trim();
  
  return Object.values(PRODUCT_TAGS).filter(tag => {
    return (
      tag.label.toLowerCase().includes(searchTerm) ||
      tag.description.toLowerCase().includes(searchTerm) ||
      TAG_CATEGORY_NAMES[tag.category].toLowerCase().includes(searchTerm)
    );
  });
};