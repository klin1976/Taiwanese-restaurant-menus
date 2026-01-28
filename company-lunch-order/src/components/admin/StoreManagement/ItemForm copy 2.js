// src/components/admin/StoreManagement/ItemForm.js
import React, { useState, useEffect } from 'react';
import { X, Save, Loader, AlertCircle, Image as ImageIcon } from 'lucide-react';
import TagSelector from './TagSelector';
import MultiImageUploader from './MultiImageUploader';
import VariantEditor from './VariantEditor';
import OptionEditor from './OptionEditor';
import TemplateSelector from './TemplateSelector';
import { initializeProductTags, getDefaultTagsByStoreType } from '../../../utils/productTags';
import { uploadItemMainImage, uploadItemGalleryImages, deleteMultipleImages } from '../../../services/imageUploadService';

const ItemForm = ({ 
  isOpen, 
  item, 
  storeId,
  storeType, 
  onClose, 
  onSave 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    basePrice: '',
    description: '',
    status: 'available',
    tags: initializeProductTags(),
    
    // ===== 圖片（新增） =====
    images: {
      main: '',
      gallery: []
    },
    
    // ===== 變體/選項系統（新增） =====
    hasVariants: false,
    variants: [],
    hasOptions: false,
    optionGroups: [],
    currentTemplate: 'none'
  });

  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  // 初始化表單（編輯模式）
  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        basePrice: item.basePrice || item.price || '',
        description: item.description || '',
        status: item.status || 'available',
        tags: item.tags || initializeProductTags(),
        
        // 圖片
        images: {
          main: item.images?.main || item.imageUrl || '',
          gallery: item.images?.gallery || []
        },
        
        // 變體/選項
        hasVariants: item.hasVariants || false,
        variants: item.variants || [],
        hasOptions: item.hasOptions || false,
        optionGroups: item.optionGroups || [],
        currentTemplate: item.currentTemplate || 'none'
      });
    } else {
      // 新增商品時，根據店家類型預設標籤
      setFormData({
        name: '',
        basePrice: '',
        description: '',
        status: 'available',
        tags: getDefaultTagsByStoreType(storeType),
        images: { main: '', gallery: [] },
        hasVariants: false,
        variants: [],
        hasOptions: false,
        optionGroups: [],
        currentTemplate: 'none'
      });
    }
    setErrors({});
  }, [item, storeType, isOpen]);

  // ============================================
  // 圖片上傳處理
  // ============================================

  const handleMainImageUpload = async (file) => {
    if (!storeId) {
      alert('請先儲存店家基本資訊');
      return;
    }

    setUploading(true);
    try {
      const itemId = item?.id || `temp_${Date.now()}`;
      const url = await uploadItemMainImage(file, storeId, storeType, itemId);
      
      setFormData(prev => ({
        ...prev,
        images: {
          ...prev.images,
          main: url
        }
      }));

      console.log('✅ 主圖上傳成功:', url);
    } catch (error) {
      console.error('❌ 主圖上傳失敗:', error);
      alert('主圖上傳失敗，請稍後再試');
    } finally {
      setUploading(false);
    }
  };

  const handleGalleryImagesUpload = async (files) => {
    if (!storeId) {
      alert('請先儲存店家基本資訊');
      return;
    }

    setUploading(true);
    try {
      const itemId = item?.id || `temp_${Date.now()}`;
      const urls = await uploadItemGalleryImages(
        files, 
        storeId, 
        storeType, 
        itemId,
        (progress) => setUploadProgress(progress)
      );
      
      setFormData(prev => ({
        ...prev,
        images: {
          ...prev.images,
          gallery: [...prev.images.gallery, ...urls]
        }
      }));

      console.log('✅ 相簿上傳成功:', urls);
    } catch (error) {
      console.error('❌ 相簿上傳失敗:', error);
      alert('部分圖片上傳失敗，請稍後再試');
    } finally {
      setUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  const handleMainImageRemove = async () => {
    if (formData.images.main) {
      try {
        // ✅ 異步刪除（不等待完成）
        deleteMultipleImages([formData.images.main]).catch(console.error);
      } catch (error) {
        console.error('刪除主圖失敗:', error);
      }
    }

    setFormData(prev => ({
      ...prev,
      images: {
        ...prev.images,
        main: ''
      }
    }));
  };

  const handleGalleryImageRemove = async (index) => {
    const imageToRemove = formData.images.gallery[index];
    
    if (imageToRemove) {
      try {
        // ✅ 異步刪除（不等待完成）
        deleteMultipleImages([imageToRemove]).catch(console.error);
      } catch (error) {
        console.error('刪除相簿圖片失敗:', error);
      }
    }

    setFormData(prev => ({
      ...prev,
      images: {
        ...prev.images,
        gallery: prev.images.gallery.filter((_, i) => i !== index)
      }
    }));
  };

  const handleGalleryReorder = (newGallery) => {
    setFormData(prev => ({
      ...prev,
      images: {
        ...prev.images,
        gallery: newGallery
      }
    }));
  };

  // ============================================
  // 變體/選項處理
  // ============================================

  const handleVariantsChange = (newVariants) => {
    setFormData(prev => ({
      ...prev,
      variants: newVariants,
      hasVariants: newVariants.length > 0
    }));
  };

  const handleOptionsChange = (newOptions) => {
    setFormData(prev => ({
      ...prev,
      optionGroups: newOptions,
      hasOptions: newOptions.length > 0
    }));
  };

  const handleTemplateApply = ({ variants, options }) => {
    setFormData(prev => ({
      ...prev,
      variants: variants,
      hasVariants: variants.length > 0,
      optionGroups: options,
      hasOptions: options.length > 0,
      currentTemplate: variants.length > 0 || options.length > 0 ? 'custom' : 'none'
    }));
  };

  // ============================================
  // 表單驗證與提交
  // ============================================

  const validateForm = () => {
    const newErrors = {};
    
    // 商品名稱
    if (!formData.name.trim()) {
      newErrors.name = '請輸入商品名稱';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = '商品名稱至少需要 2 個字元';
    } else if (formData.name.trim().length > 30) {
      newErrors.name = '商品名稱不能超過 30 個字元';
    }
    
    // 基礎價格
    if (!formData.basePrice) {
      newErrors.basePrice = '請輸入基礎價格';
    } else {
      const price = parseFloat(formData.basePrice);
      if (isNaN(price) || price < 0) {
        newErrors.basePrice = '請輸入有效的價格';
      } else if (price > 99999) {
        newErrors.basePrice = '價格不能超過 99999';
      }
    }
    
    // 商品描述
    if (formData.description && formData.description.length > 100) {
      newErrors.description = '商品描述不能超過 100 個字元';
    }

    // ✅ 圖片驗證（主圖為選填）
    // 目前圖片為選填，所以不強制驗證
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSave({
        name: formData.name.trim(),
        basePrice: parseFloat(formData.basePrice),
        description: formData.description.trim(),
        status: formData.status,
        tags: formData.tags,
        
        // 圖片
        images: {
          main: formData.images.main,
          gallery: formData.images.gallery
        },
        
        // 變體/選項
        hasVariants: formData.hasVariants,
        variants: formData.variants,
        hasOptions: formData.hasOptions,
        optionGroups: formData.optionGroups,
        currentTemplate: formData.currentTemplate
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* 標題 */}
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b z-10">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {item ? '編輯商品' : '新增商品'}
            </h3>
            {uploading && (
              <p className="text-sm text-blue-600 mt-1 flex items-center gap-2">
                <Loader size={14} className="animate-spin" />
                上傳中... {uploadProgress.total > 0 && `(${uploadProgress.current}/${uploadProgress.total})`}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* 表單 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* ===== 圖片管理 ===== */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
              <ImageIcon size={20} className="text-blue-600" />
              商品圖片
            </h4>
            
            <MultiImageUploader
              mainImage={formData.images.main}
              galleryImages={formData.images.gallery}
              onMainImageUpload={handleMainImageUpload}
              onGalleryImagesUpload={handleGalleryImagesUpload}
              onMainImageRemove={handleMainImageRemove}
              onGalleryImageRemove={handleGalleryImageRemove}
              onGalleryReorder={handleGalleryReorder}
              disabled={uploading}
              maxGalleryImages={5}
            />
          </div>

          {/* ===== 基本資訊 ===== */}
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
                placeholder="例如: 珍珠奶茶"
                maxLength={30}
                autoFocus={!item}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
              <p className="text-gray-500 text-xs mt-1">
                {formData.name.length}/30 字元
              </p>
            </div>

            {/* 基礎價格 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                基礎價格 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  NT$
                </span>
                <input
                  type="number"
                  value={formData.basePrice}
                  onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                  className={`w-full pl-12 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.basePrice ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0"
                  min="0"
                  max="99999"
                  step="1"
                />
              </div>
              {errors.basePrice && (
                <p className="text-red-500 text-sm mt-1">{errors.basePrice}</p>
              )}
              <p className="text-gray-500 text-xs mt-1">
                若有變體，變體價格 = 基礎價格 + 變體調整價
              </p>
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

          {/* ===== 商品標籤 ===== */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 border-b pb-2">商品標籤</h4>
            <TagSelector
              tags={formData.tags}
              onChange={handleTagsChange}
              maxTags={10}
            />
          </div>

          {/* ===== 快速範本 ===== */}
          <div className="space-y-4">
            <TemplateSelector
              currentTemplate={formData.currentTemplate}
              currentVariants={formData.variants}
              currentOptions={formData.optionGroups}
              onApply={handleTemplateApply}
              storeType={storeType}
              disabled={uploading}
            />
          </div>

          {/* ===== 商品變體 ===== */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 border-b pb-2 flex-1">商品變體</h4>
              <label className="flex items-center gap-2 cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={formData.hasVariants}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    hasVariants: e.target.checked,
                    variants: e.target.checked ? formData.variants : []
                  })}
                  className="w-4 h-4 text-green-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  啟用變體系統
                </span>
              </label>
            </div>

            {formData.hasVariants ? (
              <VariantEditor
                variants={formData.variants}
                onChange={handleVariantsChange}
                disabled={uploading}
              />
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <AlertCircle size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">
                  變體系統已停用。如需不同規格（如：大中小杯），請啟用變體系統。
                </p>
              </div>
            )}
          </div>

          {/* ===== 客製化選項 ===== */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 border-b pb-2 flex-1">客製化選項</h4>
              <label className="flex items-center gap-2 cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={formData.hasOptions}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    hasOptions: e.target.checked,
                    optionGroups: e.target.checked ? formData.optionGroups : []
                  })}
                  className="w-4 h-4 text-purple-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  啟用客製化選項
                </span>
              </label>
            </div>

            {formData.hasOptions ? (
              <OptionEditor
                optionGroups={formData.optionGroups}
                onChange={handleOptionsChange}
                disabled={uploading}
              />
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <AlertCircle size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">
                  客製化選項已停用。如需甜度、冰塊、加料等選項，請啟用客製化系統。
                </p>
              </div>
            )}
          </div>

          {/* ===== 按鈕 ===== */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  上傳中...
                </>
              ) : (
                <>
                  <Save size={18} />
                  儲存
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ItemForm;