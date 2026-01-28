// src/components/LoadingScreen.js
import React from 'react';

const LoadingScreen = ({ message = '載入中...', subtitle = '請稍候片刻' }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="text-center">
        {/* 旋轉動畫 */}
        <div className="relative inline-block">
          {/* 外圈 */}
          <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-indigo-600"></div>
          {/* 內圈 */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-purple-500" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
          </div>
        </div>

        {/* 主要訊息 */}
        <div className="mt-8">
          <p className="text-gray-800 font-semibold text-xl mb-2 animate-pulse">
            {message}
          </p>
          
          {/* 副標題 */}
          {subtitle && (
            <p className="text-gray-600 text-sm">
              {subtitle}
            </p>
          )}
        </div>

        {/* 裝飾性圖標 */}
        <div className="mt-6 flex justify-center space-x-3">
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>

        {/* 提示文字（可選） */}
        <div className="mt-8 text-xs text-gray-500">
          初次登入可能需要較長時間
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;