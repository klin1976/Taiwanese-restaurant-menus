// src/components/admin/StoreManagement/ImageCropper.js
import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, ZoomIn, ZoomOut, RotateCw, Check } from 'lucide-react';
import { getCroppedImg } from '../../../utils/imageUtils';

const ImageCropper = ({ 
  isOpen, 
  imageSrc, 
  aspect = 1, 
  onClose, 
  onComplete,
  quality = 0.85,
  title = '裁切圖片'
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [cropping, setCropping] = useState(false);

  // 裁切完成回調
  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // 確認裁切
  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;

    setCropping(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, quality);
      
      // 轉換為 File 物件
      const croppedFile = new File(
        [croppedBlob], 
        `cropped_${Date.now()}.jpg`, 
        { type: 'image/jpeg' }
      );

      onComplete(croppedFile);
      onClose();
    } catch (error) {
      console.error('❌ 裁切失敗:', error);
      alert('裁切失敗，請重試');
    } finally {
      setCropping(false);
    }
  };

  // 重置
  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex flex-col">
      {/* 頂部工具列 */}
      <div className="bg-black bg-opacity-80 backdrop-blur-sm p-4 flex items-center justify-between border-b border-gray-700">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          ✂️ {title}
        </h3>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm flex items-center gap-1"
          >
            <RotateCw size={16} />
            重置
          </button>
          
          <button
            onClick={onClose}
            className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* 裁切區域 */}
      <div className="flex-1 relative">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={onCropComplete}
          style={{
            containerStyle: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)'
            }
          }}
        />
      </div>

      {/* 底部控制列 */}
      <div className="bg-black bg-opacity-80 backdrop-blur-sm p-6 border-t border-gray-700">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* 縮放控制 */}
          <div className="flex items-center gap-4">
            <ZoomOut size={20} className="text-white" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <ZoomIn size={20} className="text-white" />
            <span className="text-white text-sm min-w-[60px] text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* 旋轉控制 */}
          <div className="flex items-center gap-4">
            <RotateCw size={20} className="text-white" />
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={rotation}
              onChange={(e) => setRotation(parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-white text-sm min-w-[60px] text-right">
              {rotation}°
            </span>
          </div>

          {/* 比例提示 */}
          <div className="text-center text-gray-400 text-sm">
            裁切比例：{aspect === 1 ? '1:1 (正方形)' : aspect === 16/9 ? '16:9 (橫幅)' : `${aspect}:1`}
          </div>

          {/* 按鈕 */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={cropping}
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                cropping
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {cropping ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  處理中...
                </>
              ) : (
                <>
                  <Check size={20} />
                  確認裁切
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;