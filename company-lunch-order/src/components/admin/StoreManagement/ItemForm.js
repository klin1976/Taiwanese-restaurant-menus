// src/components/admin/StoreManagement/ItemForm.js
import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import TagSelector from './TagSelector';
import { initializeProductTags, getDefaultTagsByStoreType } from '../../../utils/productTags';

const ItemForm = ({ isOpen, item, storeType, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    status: 'available',
    tags: initializeProductTags()
  });
  const [errors, setErrors] = useState({});

  // 初始化表單（編輯模式）
  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        price: item.price || '',
        description: item.description || '',
        status: item.status || 'available',
        tags: item.tags || initializeProductTags()
      });
    } else {
      // ✅ 新增商品時，根據店家類型預設標籤
      setFormData({
        name: '',
        price: '',
        description: '',
        status: 'available',
        tags: getDefaultTagsByStoreType(storeType) // 根據店家類型預設
      });
    }
    setErrors({});
  }, [item, storeType, isOpen]);

  // 驗證表單
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = '請輸入商品名稱';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = '商品名稱至少需要 2 個字元';
    } else if (formData.name.trim().length > 30) {
      newErrors.name = '商品名稱不能超過 30 個字元';
    }
    
    if (!formData.price) {
      newErrors.price = '請輸入價格';
    } else {
      const price = parseFloat(formData.price);
      if (isNaN(price) || price < 0) {
        newErrors.price = '請輸入有效的價格';
      } else if (price > 99999) {
        newErrors.price = '價格不能超過 99999';
      }
    }
    
    if (formData.description && formData.description.length > 100) {
      newErrors.description = '商品描述不能超過 100 個字元';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表單
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSave({
        name: formData.name.trim(),
        price: parseFloat(formData.price),
        description: formData.description.trim(),
        status: formData.status,
        tags: formData.tags
      });
    }
  };

  // 更新標籤
  const handleTagsChange = (newTags) => {
    setFormData({ ...formData, tags: newTags });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 標題 */}
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b z-10">
          <h3 className="text-xl font-bold text-gray-900">
            {item ? '編輯商品' : '新增商品'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* 表單 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 基本資訊 */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 border-b pb-2">基本資訊</h4>
            
            {/* 商品名稱 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                商品名稱 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="例如: 香爆牛肉蓋飯"
                maxLength={30}
                autoFocus
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
              <p className="text-gray-500 text-xs mt-1">
                {formData.name.length}/30 字元
              </p>
            </div>

            {/* 價格 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                價格 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  NT$
                </span>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className={`w-full pl-12 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.price ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0"
                  min="0"
                  max="99999"
                  step="1"
                />
              </div>
              {errors.price && (
                <p className="text-red-500 text-sm mt-1">{errors.price}</p>
              )}
            </div>

            {/* 商品描述 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                商品描述 <span className="text-gray-500 text-xs">(選填)</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="例如: 經典台式風味，香嫩多汁"
                rows={3}
                maxLength={100}
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description}</p>
              )}
              <p className="text-gray-500 text-xs mt-1">
                {formData.description.length}/100 字元
              </p>
            </div>

            {/* 商品狀態 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                商品狀態 <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="status"
                    value="available"
                    checked={formData.status === 'available'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">供應中</span>
                    <p className="text-xs text-gray-500">商品正常供應，可以訂購</p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    ✓ 可訂購
                  </span>
                </label>

                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="status"
                    value="sold_out"
                    checked={formData.status === 'sold_out'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">已售完</span>
                    <p className="text-xs text-gray-500">暫時缺貨，前台顯示但無法訂購</p>
                  </div>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                    ⚠ 缺貨中
                  </span>
                </label>

                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="status"
                    value="discontinued"
                    checked={formData.status === 'discontinued'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">已停售</span>
                    <p className="text-xs text-gray-500">不再供應，前台不顯示</p>
                  </div>
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                    ✕ 已下架
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* 商品標籤 */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 border-b pb-2">商品標籤</h4>
            <TagSelector
              tags={formData.tags}
              onChange={handleTagsChange}
              maxTags={10}
            />
          </div>

          {/* 按鈕 */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
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

export default ItemForm;