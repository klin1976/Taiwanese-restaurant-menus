// src/components/admin/StoreManagement/ImageUploader.js
import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader } from 'lucide-react';
import { validateImageFile } from '../../../services/imageUploadService';

const ImageUploader = ({ 
  currentImage, 
  onUpload, 
  onRemove,
  disabled = false,
  label = '上傳圖片',
  description = '支援 JPG、PNG、WebP，最大 5MB'
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentImage || '');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // 處理檔案選擇
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    // 驗證檔案
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    try {
      setUploading(true);

      // 建立預覽 URL
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // 執行上傳回調
      await onUpload(file);

      // 清理
      URL.revokeObjectURL(objectUrl);
      
    } catch (error) {
      console.error('圖片上傳失敗:', error);
      setError(error.message || '上傳失敗，請稍後再試');
      setPreviewUrl(currentImage || '');
    } finally {
      setUploading(false);
      // 重置 input，允許重新選擇同一檔案
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 處理移除圖片
  const handleRemove = () => {
    if (!window.confirm('確定要移除此圖片嗎？')) {
      return;
    }

    setPreviewUrl('');
    onRemove();
  };

  // 觸發檔案選擇
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      {/* 標籤 */}
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>

      {/* 預覽區 / 上傳區 */}
      <div className="flex items-start gap-4">
        {/* 預覽圖片 */}
        {previewUrl || currentImage ? (
          <div className="relative group">
            <img
              src={previewUrl || currentImage}
              alt="預覽"
              className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300"
            />
            
            {/* 遮罩層和移除按鈕 */}
            {!disabled && !uploading && (
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button
                  onClick={handleRemove}
                  className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  title="移除圖片"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {/* 上傳中遮罩 */}
            {uploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                <Loader size={24} className="text-white animate-spin" />
              </div>
            )}
          </div>
        ) : (
          // 上傳區域（無圖片時）
          <div
            onClick={!disabled && !uploading ? triggerFileInput : undefined}
            className={`w-32 h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center ${
              disabled || uploading
                ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                : 'border-gray-400 hover:border-blue-500 hover:bg-blue-50 cursor-pointer'
            } transition-all`}
          >
            {uploading ? (
              <Loader size={32} className="text-gray-400 animate-spin" />
            ) : (
              <>
                <ImageIcon size={32} className="text-gray-400 mb-2" />
                <span className="text-xs text-gray-500 text-center px-2">
                  點擊上傳
                </span>
              </>
            )}
          </div>
        )}

        {/* 上傳按鈕和說明 */}
        <div className="flex-1">
          <button
            type="button"
            onClick={triggerFileInput}
            disabled={disabled || uploading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              disabled || uploading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Upload size={18} />
            {previewUrl || currentImage ? '更換圖片' : '選擇圖片'}
          </button>

          <p className="text-sm text-gray-500 mt-2">
            {description}
          </p>

          {/* 錯誤訊息 */}
          {error && (
            <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
              <X size={16} />
              {error}
            </p>
          )}

          {/* 上傳中提示 */}
          {uploading && (
            <p className="text-sm text-blue-600 mt-2 flex items-center gap-2">
              <Loader size={16} className="animate-spin" />
              上傳中...
            </p>
          )}
        </div>
      </div>

      {/* 隱藏的檔案 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        className="hidden"
      />
    </div>
  );
};

export default ImageUploader;