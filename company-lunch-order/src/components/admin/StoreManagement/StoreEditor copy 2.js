// src/components/admin/StoreManagement/StoreEditor.js
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Upload, MapPin } from 'lucide-react';
import { getDistrictsByCity, taiwanCities } from '../../../config/taiwanDistricts';

const StoreEditor = ({ isOpen, onClose, store, onSave, isEdit = false }) => {
  // ✅ 預設的營業時間結構
  const defaultHours = {
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
  };

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    type: 'lunch',
    city: '',
    district: '',
    address: '',
    phone: '',
    imageUrl: '',
    rating: 0,
    deliveryTime: '30分鐘',
    minOrder: 0,
    sortOrder: 999,
    active: true,
    hours: defaultHours
  });

  const [districts, setDistricts] = useState([]);
  const [errors, setErrors] = useState({});
  const [showSpecialHours, setShowSpecialHours] = useState(false);

  const daysOfWeek = [
    { key: 'monday', label: '週一' },
    { key: 'tuesday', label: '週二' },
    { key: 'wednesday', label: '週三' },
    { key: 'thursday', label: '週四' },
    { key: 'friday', label: '週五' },
    { key: 'saturday', label: '週六' },
    { key: 'sunday', label: '週日' }
  ];

  // ✅ 初始化表單（編輯模式）- 加入容錯處理
  useEffect(() => {
    if (isEdit && store) {
      // 確保舊資料有完整的 hours 結構
      const storeHours = store.hours || defaultHours;
      
      // 檢查並補充缺少的欄位
      if (!storeHours.regular) {
        storeHours.regular = defaultHours.regular;
      } else {
        // 確保每個星期幾都有資料
        daysOfWeek.forEach(day => {
          if (!storeHours.regular[day.key]) {
            storeHours.regular[day.key] = { open: '09:00', close: '21:00', closed: false };
          }
        });
      }

      if (!storeHours.special) {
        storeHours.special = [];
      }

      setFormData({
        id: store.id || '',
        name: store.name || '',
        type: store.type || 'lunch',
        city: store.city || '',
        district: store.district || '',
        address: store.address || '',
        phone: store.phone || '',
        imageUrl: store.imageUrl || '',
        rating: store.rating || 0,
        deliveryTime: store.deliveryTime || '30分鐘',
        minOrder: store.minOrder || 0,
        sortOrder: store.sortOrder || 999,
        active: store.active !== undefined ? store.active : true,
        hours: storeHours
      });

      // 載入區域選項
      if (store.city) {
        const cityDistricts = getDistrictsByCity(store.city);
        setDistricts(cityDistricts);
      }

      // 如果有特殊營業時間，顯示該區塊
      if (storeHours.special && storeHours.special.length > 0) {
        setShowSpecialHours(true);
      }
    }
  }, [isEdit, store]);

  // 城市變更時更新區域選項
  const handleCityChange = (city) => {
    const cityDistricts = getDistrictsByCity(city);
    setDistricts(cityDistricts);
    setFormData(prev => ({
      ...prev,
      city,
      district: '' // 重置區域
    }));
  };

  // 更新一般營業時間
  const handleRegularHoursChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      hours: {
        ...prev.hours,
        regular: {
          ...prev.hours.regular,
          [day]: {
            ...prev.hours.regular[day],
            [field]: value
          }
        }
      }
    }));
  };

  // 新增特殊營業時間
  const addSpecialHours = () => {
    setFormData(prev => ({
      ...prev,
      hours: {
        ...prev.hours,
        special: [
          ...prev.hours.special,
          {
            date: '',
            open: '09:00',
            close: '21:00',
            closed: false,
            reason: ''
          }
        ]
      }
    }));
  };

  // 更新特殊營業時間
  const updateSpecialHours = (index, field, value) => {
    const newSpecial = [...formData.hours.special];
    newSpecial[index] = {
      ...newSpecial[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      hours: {
        ...prev.hours,
        special: newSpecial
      }
    }));
  };

  // 刪除特殊營業時間
  const removeSpecialHours = (index) => {
    setFormData(prev => ({
      ...prev,
      hours: {
        ...prev.hours,
        special: prev.hours.special.filter((_, i) => i !== index)
      }
    }));
  };

  // 表單驗證
  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = '請輸入店家名稱';
    if (!formData.city) newErrors.city = '請選擇城市';
    if (!formData.district) newErrors.district = '請選擇區域';
    if (!formData.address.trim()) newErrors.address = '請輸入地址';
    if (!formData.phone.trim()) newErrors.phone = '請輸入電話';
    if (!formData.imageUrl.trim()) newErrors.imageUrl = '請輸入圖片網址';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表單
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* 標題列 */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold">
            {isEdit ? '編輯店家' : '新增店家'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* 表單內容 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 基本資訊 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">基本資訊</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  店家ID *
                </label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  disabled={isEdit}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="例如: mcd_taipei_xinyi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  店家名稱 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-500' : ''}`}
                  placeholder="例如: 麥當勞信義店"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  店家類型 *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="breakfast">早餐</option>
                  <option value="lunch">午餐</option>
                  <option value="dinner">晚餐</option>
                  <option value="drinks">飲料</option>
                  <option value="snacks">點心</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  電話 *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.phone ? 'border-red-500' : ''}`}
                  placeholder="例如: 02-2345-6789"
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>
            </div>
          </div>

          {/* 地址資訊 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
              <MapPin size={20} />
              地址資訊
            </h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  城市 *
                </label>
                <select
                  value={formData.city}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.city ? 'border-red-500' : ''}`}
                >
                  <option value="">選擇城市</option>
                  {taiwanCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  區域 *
                </label>
                <select
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.district ? 'border-red-500' : ''}`}
                  disabled={!formData.city}
                >
                  <option value="">選擇區域</option>
                  {districts.map(district => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
                {errors.district && <p className="text-red-500 text-sm mt-1">{errors.district}</p>}
              </div>

              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  詳細地址 *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.address ? 'border-red-500' : ''}`}
                  placeholder="例如: 信義路五段7號"
                />
                {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
              </div>
            </div>
          </div>

          {/* 營業時間 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">營業時間</h3>
            
            <div className="space-y-3">
              {daysOfWeek.map(day => (
                <div key={day.key} className="flex items-center gap-4">
                  <span className="w-16 font-medium">{day.label}</span>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.hours.regular[day.key].closed}
                      onChange={(e) => handleRegularHoursChange(day.key, 'closed', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">休息</span>
                  </label>

                  {!formData.hours.regular[day.key].closed && (
                    <>
                      <input
                        type="time"
                        value={formData.hours.regular[day.key].open}
                        onChange={(e) => handleRegularHoursChange(day.key, 'open', e.target.value)}
                        className="px-3 py-1 border rounded"
                      />
                      <span>-</span>
                      <input
                        type="time"
                        value={formData.hours.regular[day.key].close}
                        onChange={(e) => handleRegularHoursChange(day.key, 'close', e.target.value)}
                        className="px-3 py-1 border rounded"
                      />
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* 特殊營業時間 */}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowSpecialHours(!showSpecialHours)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                {showSpecialHours ? '隱藏' : '顯示'}特殊營業時間
              </button>

              {showSpecialHours && (
                <div className="mt-4 space-y-3">
                  {formData.hours.special.map((special, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <input
                        type="date"
                        value={special.date}
                        onChange={(e) => updateSpecialHours(index, 'date', e.target.value)}
                        className="px-3 py-1 border rounded"
                      />
                      
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={special.closed}
                          onChange={(e) => updateSpecialHours(index, 'closed', e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm">休息</span>
                      </label>

                      {!special.closed && (
                        <>
                          <input
                            type="time"
                            value={special.open}
                            onChange={(e) => updateSpecialHours(index, 'open', e.target.value)}
                            className="px-3 py-1 border rounded"
                          />
                          <span>-</span>
                          <input
                            type="time"
                            value={special.close}
                            onChange={(e) => updateSpecialHours(index, 'close', e.target.value)}
                            className="px-3 py-1 border rounded"
                          />
                        </>
                      )}

                      <input
                        type="text"
                        value={special.reason}
                        onChange={(e) => updateSpecialHours(index, 'reason', e.target.value)}
                        placeholder="原因（選填）"
                        className="flex-1 px-3 py-1 border rounded"
                      />

                      <button
                        type="button"
                        onClick={() => removeSpecialHours(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addSpecialHours}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                  >
                    <Plus size={16} />
                    新增特殊營業時間
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 其他資訊 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">其他資訊</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  圖片網址 *
                </label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.imageUrl ? 'border-red-500' : ''}`}
                  placeholder="https://example.com/image.jpg"
                />
                {errors.imageUrl && <p className="text-red-500 text-sm mt-1">{errors.imageUrl}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  評分 (0-5)
                </label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  外送時間
                </label>
                <input
                  type="text"
                  value={formData.deliveryTime}
                  onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="例如: 30-40分鐘"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  最低消費
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.minOrder}
                  onChange={(e) => setFormData({ ...formData, minOrder: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  排序順序
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">啟用店家</span>
                </label>
              </div>
            </div>
          </div>

          {/* 按鈕區 */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Save size={18} />
              儲存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StoreEditor;