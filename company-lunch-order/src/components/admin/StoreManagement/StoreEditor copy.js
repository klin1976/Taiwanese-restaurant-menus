// src/components/admin/StoreManagement/StoreEditor.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { createStore, updateStore } from '../../../services/storeManagementService';
import { generateUniqueStoreId, validateStoreId } from '../../../services/pinyinService';
import { TAIWAN_CITIES, getDistrictsByCity } from '../../../utils/taiwanCities';

const StoreEditor = ({ store, isEdit, onSaveSuccess, onCancel }) => {
  const { currentUser } = useAuth();
  
  // 表單狀態
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
    hours: {
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
    }
  });

  const [districts, setDistricts] = useState([]);
  const [autoGenerateId, setAutoGenerateId] = useState(!isEdit);
  const [idValidation, setIdValidation] = useState({ valid: true, message: '' });
  const [saving, setSaving] = useState(false);

  // 初始化表單（編輯模式）
  useEffect(() => {
    if (isEdit && store) {
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
        hours: store.hours || formData.hours
      });

      // 載入區域選項
      if (store.city) {
        const cityDistricts = getDistrictsByCity(store.city);
        setDistricts(cityDistricts);
      }
    }
  }, [isEdit, store]);

  // 處理縣市變更
  const handleCityChange = (cityValue) => {
    setFormData({
      ...formData,
      city: cityValue,
      district: '' // 清空區域
    });

    // 載入對應的區域選項
    const cityDistricts = getDistrictsByCity(cityValue);
    setDistricts(cityDistricts);
  };

  // 處理店名變更（自動生成 ID）
  const handleNameChange = async (name) => {
    setFormData({ ...formData, name });

    if (autoGenerateId && name.trim()) {
      try {
        const generatedId = await generateUniqueStoreId(name, formData.type);
        setFormData(prev => ({ ...prev, id: generatedId }));
        setIdValidation({ valid: true, message: '店家代碼已自動生成' });
      } catch (error) {
        console.error('生成 ID 失敗:', error);
      }
    }
  };

  // 處理手動修改 ID
  const handleIdChange = (id) => {
    setFormData({ ...formData, id });
    setAutoGenerateId(false);

    // 驗證 ID 格式
    const validation = validateStoreId(id);
    setIdValidation(validation);
  };

  // 處理類型變更
  const handleTypeChange = async (type) => {
    setFormData({ ...formData, type });

    // 如果啟用自動生成 ID，重新生成
    if (autoGenerateId && formData.name.trim()) {
      try {
        const generatedId = await generateUniqueStoreId(formData.name, type);
        setFormData(prev => ({ ...prev, id: generatedId }));
      } catch (error) {
        console.error('重新生成 ID 失敗:', error);
      }
    }
  };

  // 處理營業時間變更
  const handleDayHoursChange = (day, field, value) => {
    setFormData({
      ...formData,
      hours: {
        ...formData.hours,
        regular: {
          ...formData.hours.regular,
          [day]: {
            ...formData.hours.regular[day],
            [field]: value
          }
        }
      }
    });
  };

  // 驗證表單
  const validateForm = () => {
    if (!formData.name.trim()) {
      alert('請輸入店家名稱');
      return false;
    }

    if (!formData.id.trim()) {
      alert('請輸入店家代碼');
      return false;
    }

    if (!idValidation.valid) {
      alert('店家代碼格式不正確：' + idValidation.message);
      return false;
    }

    return true;
  };

  // 處理儲存
  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      if (isEdit) {
        // 更新店家
        await updateStore(formData.id, formData.type, formData, currentUser);
        alert('店家資料更新成功！');
      } else {
        // 建立新店家
        await createStore(formData, currentUser);
        alert('店家建立成功！');
      }

      onSaveSuccess();
    } catch (error) {
      console.error('儲存失敗:', error);
      alert(`儲存失敗：${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const weekDays = [
    { key: 'monday', label: '週一' },
    { key: 'tuesday', label: '週二' },
    { key: 'wednesday', label: '週三' },
    { key: 'thursday', label: '週四' },
    { key: 'friday', label: '週五' },
    { key: 'saturday', label: '週六' },
    { key: 'sunday', label: '週日' }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? '編輯店家' : '新增店家'}
      </h2>

      <div className="space-y-6">
        {/* 基本資訊 */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">基本資訊</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 店家名稱 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                店家名稱 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如：富家小鋪"
                disabled={saving}
              />
            </div>

            {/* 店家類型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                店家類型 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isEdit || saving}
              >
                <option value="lunch">🍱 午餐</option>
                <option value="drinks">🧋 飲料</option>
              </select>
              {isEdit && (
                <p className="text-xs text-gray-500 mt-1">
                  編輯模式下無法修改店家類型
                </p>
              )}
            </div>

            {/* 店家代碼 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                店家代碼 <span className="text-red-500">*</span>
              </label>
              <div className="flex items-start gap-3">
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => handleIdChange(e.target.value)}
                  className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    idValidation.valid 
                      ? 'border-gray-300 focus:ring-blue-500' 
                      : 'border-red-300 focus:ring-red-500'
                  }`}
                  placeholder="例如：fu_jia_xiao_pu"
                  disabled={isEdit || saving}
                />
                {!isEdit && (
                  <label className="flex items-center text-sm text-gray-600 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={autoGenerateId}
                      onChange={(e) => setAutoGenerateId(e.target.checked)}
                      className="mr-2"
                      disabled={saving}
                    />
                    自動生成
                  </label>
                )}
              </div>
              <p className={`text-xs mt-1 ${
                idValidation.valid ? 'text-gray-500' : 'text-red-500'
              }`}>
                {idValidation.message || '只能包含小寫字母、數字和底線'}
              </p>
              {isEdit && (
                <p className="text-xs text-gray-500 mt-1">
                  編輯模式下無法修改店家代碼
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 聯絡資訊 */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">聯絡資訊</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 縣市 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                縣市
              </label>
              <select
                value={formData.city}
                onChange={(e) => handleCityChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={saving}
              >
                <option value="">請選擇縣市</option>
                {TAIWAN_CITIES.map(city => (
                  <option key={city.value} value={city.value}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 區域 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                區域
              </label>
              <select
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!formData.city || saving}
              >
                <option value="">請選擇區域</option>
                {districts.map(district => (
                  <option key={district.value} value={district.value}>
                    {district.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 地址 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                詳細地址
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如：復興南路一段123號"
                disabled={saving}
              />
            </div>

            {/* 電話 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                電話
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如：02-2345-6789"
                disabled={saving}
              />
            </div>

            {/* 圖片 URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                店家圖片 URL
              </label>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://..."
                disabled={saving}
              />
              <p className="text-xs text-gray-500 mt-1">
                未來版本將支援圖片上傳功能
              </p>
            </div>
          </div>
        </div>

        {/* 營業設定 */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">營業設定</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* 評分 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                評分
              </label>
              <input
                type="number"
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max="5"
                step="0.1"
                disabled={saving}
              />
            </div>

            {/* 配送時間 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                配送時間
              </label>
              <input
                type="text"
                value={formData.deliveryTime}
                onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如：30分鐘"
                disabled={saving}
              />
            </div>

            {/* 最低消費 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                最低消費（元）
              </label>
              <input
                type="number"
                value={formData.minOrder}
                onChange={(e) => setFormData({ ...formData, minOrder: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                disabled={saving}
              />
            </div>

            {/* 排序權重 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                排序權重
              </label>
              <input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 999 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                disabled={saving}
              />
              <p className="text-xs text-gray-500 mt-1">
                數字越小越靠前
              </p>
            </div>

            {/* 啟用狀態 */}
            <div className="md:col-span-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"
                  disabled={saving}
                />
                啟用店家（取消勾選則前台不顯示）
              </label>
            </div>
          </div>

          {/* 營業時間 */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              每週營業時間
            </label>
            <div className="space-y-2">
              {weekDays.map(day => (
                <div key={day.key} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                  <div className="w-16 text-sm font-medium text-gray-700">
                    {day.label}
                  </div>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={!formData.hours.regular[day.key]?.closed}
                      onChange={(e) => handleDayHoursChange(day.key, 'closed', !e.target.checked)}
                      className="mr-2"
                      disabled={saving}
                    />
                    <span className="text-sm text-gray-600">營業</span>
                  </label>
                  
                  {!formData.hours.regular[day.key]?.closed && (
                    <>
                      <input
                        type="time"
                        value={formData.hours.regular[day.key]?.open || '09:00'}
                        onChange={(e) => handleDayHoursChange(day.key, 'open', e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded text-sm"
                        disabled={saving}
                      />
                      <span className="text-gray-500">-</span>
                      <input
                        type="time"
                        value={formData.hours.regular[day.key]?.close || '21:00'}
                        onChange={(e) => handleDayHoursChange(day.key, 'close', e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded text-sm"
                        disabled={saving}
                      />
                    </>
                  )}
                  
                  {formData.hours.regular[day.key]?.closed && (
                    <span className="text-sm text-gray-500">公休</span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              特殊日期設定將在未來版本提供
            </p>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:bg-gray-100"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !idValidation.valid}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 flex items-center justify-center"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                儲存中...
              </>
            ) : (
              isEdit ? '更新店家' : '建立店家'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoreEditor;