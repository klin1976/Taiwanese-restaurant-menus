// src/components/Login.js
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const { loginWithGoogle } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleGoogleLogin = async () => {
    if (isLoggingIn) {
      console.log('登入進行中，請勿重複點擊');
      return;
    }

    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
      // 注意：如果使用 redirect，這行不會執行
      // 因為頁面會重新導向
    } catch (error) {
      console.error('登入錯誤:', error);
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* 主要卡片 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Logo 區域 */}
          <div className="mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>

          {/* 標題 */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            午餐訂購系統
          </h1>
          <p className="text-gray-600 mb-8">
            輕鬆訂餐，美味送達
          </p>

          {/* Google 登入按鈕 */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
            className={`w-full bg-white border-2 border-gray-300 rounded-xl py-4 px-6 flex items-center justify-center space-x-3 transition-all duration-200 ${
              isLoggingIn
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:border-indigo-500 hover:shadow-md active:scale-95'
            }`}
          >
            {isLoggingIn ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                <span className="text-gray-700 font-medium">登入中...</span>
              </>
            ) : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="text-gray-700 font-medium">使用 Google 帳號登入</span>
              </>
            )}
          </button>

          {/* 說明文字 */}
          <p className="mt-6 text-sm text-gray-500">
            點擊登入即表示您同意我們的服務條款和隱私政策
          </p>
        </div>

        {/* 功能特色 */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-2xl mb-2">🍱</div>
              <p className="text-xs text-gray-600">多樣餐點</p>
            </div>
          </div>
          <div className="text-center">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-2xl mb-2">⚡</div>
              <p className="text-xs text-gray-600">快速訂購</p>
            </div>
          </div>
          <div className="text-center">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-2xl mb-2">📱</div>
              <p className="text-xs text-gray-600">手機友善</p>
            </div>
          </div>
        </div>

        {/* 行動裝置提示 */}
        {/Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent) && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-sm text-blue-800 text-center">
              📱 行動裝置登入時會跳轉到 Google 登入頁面
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;