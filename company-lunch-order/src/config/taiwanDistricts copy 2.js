// src/config/taiwanDistricts.js

/**
 * 台灣縣市列表
 */
export const taiwanCities = [
  '台北市',
  '新北市',
  '桃園市',
  '台中市',
  '台南市',
  '高雄市',
  '基隆市',
  '新竹市',
  '新竹縣',
  '苗栗縣',
  '彰化縣',
  '南投縣',
  '雲林縣',
  '嘉義市',
  '嘉義縣',
  '屏東縣',
  '宜蘭縣',
  '花蓮縣',
  '台東縣',
  '澎湖縣',
  '金門縣',
  '連江縣'
];

/**
 * 台灣縣市區域對應表
 */
const cityDistrictsMap = {
  '台北市': [
    '中正區', '大同區', '中山區', '松山區', '大安區', '萬華區',
    '信義區', '士林區', '北投區', '內湖區', '南港區', '文山區'
  ],
  '新北市': [
    '板橋區', '三重區', '中和區', '永和區', '新莊區', '新店區',
    '樹林區', '鶯歌區', '三峽區', '淡水區', '汐止區', '瑞芳區',
    '土城區', '蘆洲區', '五股區', '泰山區', '林口區', '深坑區',
    '石碇區', '坪林區', '三芝區', '石門區', '八里區', '平溪區',
    '雙溪區', '貢寮區', '金山區', '萬里區', '烏來區'
  ],
  '台南市': [
    '中西區', '東區', '南區', '北區', '安平區', '安南區',
    '永康區', '歸仁區', '新化區', '左鎮區', '玉井區', '楠西區',
    '南化區', '仁德區', '關廟區', '龍崎區', '官田區', '麻豆區',
    '佳里區', '西港區', '七股區', '將軍區', '學甲區', '北門區',
    '新營區', '後壁區', '白河區', '東山區', '六甲區', '下營區',
    '柳營區', '鹽水區', '善化區', '大內區', '山上區', '新市區',
    '安定區'
  ]
  // 其他縣市可以暫時省略，先確保能編譯
};

/**
 * 根據縣市獲取區域列表
 * @param {string} city - 縣市名稱
 * @returns {Array} 區域陣列
 */
export const getDistrictsByCity = (city) => {
  return cityDistrictsMap[city] || [];
};

/**
 * 驗證縣市是否有效
 * @param {string} city - 縣市名稱
 * @returns {boolean} 是否有效
 */
export const isValidCity = (city) => {
  return taiwanCities.includes(city);
};

/**
 * 驗證區域是否屬於該縣市
 * @param {string} city - 縣市名稱
 * @param {string} district - 區域名稱
 * @returns {boolean} 是否有效
 */
export const isValidDistrict = (city, district) => {
  const districts = getDistrictsByCity(city);
  return districts.includes(district);
};