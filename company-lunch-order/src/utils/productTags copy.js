// src/utils/productTags.js

/**
 * 商品標籤定義（簡化版 - 第一階段）
 * 只包含最常用的標籤
 */

export const PRODUCT_TAGS = {
  popular: {
    key: 'popular',
    label: '熱門',
    icon: '🔥',
    color: 'red',
    description: '熱門商品'
  },
  new: {
    key: 'new',
    label: '新品',
    icon: '🆕',
    color: 'blue',
    description: '新推出的商品'
  },
  signature: {
    key: 'signature',
    label: '招牌',
    icon: '⭐',
    color: 'yellow',
    description: '店家招牌商品'
  },
  vegetarian: {
    key: 'vegetarian',
    label: '素食',
    icon: '🥬',
    color: 'green',
    description: '素食可食用'
  },
  vegan: {
    key: 'vegan',
    label: '全素',
    icon: '🌿',
    color: 'green',
    description: '全素可食用'
  },
  spicy: {
    key: 'spicy',
    label: '辣',
    icon: '🌶️',
    color: 'red',
    description: '辣味商品'
  },
  hot: {
    key: 'hot',
    label: '熱食',
    icon: '🔥',
    color: 'orange',
    description: '熱食'
  },
  cold: {
    key: 'cold',
    label: '冷食',
    icon: '❄️',
    color: 'blue',
    description: '冷食'
  },
  customizable: {
    key: 'customizable',
    label: '可客製化',
    icon: '🎨',
    color: 'purple',
    description: '可客製化選項'
  },
  kidFriendly: {
    key: 'kidFriendly',
    label: '兒童友善',
    icon: '👶',
    color: 'pink',
    description: '適合兒童'
  }
};

/**
 * 獲取所有標籤列表
 * @returns {Array} 標籤陣列
 */
export const getAllTags = () => {
  return Object.values(PRODUCT_TAGS);
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