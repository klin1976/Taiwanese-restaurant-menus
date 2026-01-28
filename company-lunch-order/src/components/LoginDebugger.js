import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const LoginDebugger = () => {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
        title="登入診斷工具"
        aria-label="開啟診斷工具"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    );
  }

  const copyToClipboard = (text) => {
    try {
      navigator.clipboard.writeText(text);
      alert('已複製到剪貼簿');
    } catch (error) {
      console.error('複製失敗:', error);
      alert('複製失敗，請手動複製');
    }
  };

  const getEnvironmentInfo = () => {
    try {
      return {
        網域: window.location.hostname || 'N/A',
        協議: window.location.protocol || 'N/A',
        完整網址: window.location.href || 'N/A',
        後端環境: process.env.NODE_ENV || '未設定'
      };
    } catch (error) {
      return {
        網域: 'N/A',
        協議: 'N/A',
        完整網址: 'N/A',
        後端環境: 'N/A'
      };
    }
  };

  const getAuthInfo = () => {
    try {
      if (!currentUser) {
        return {
          待處理變數: 'null',
          登入狀態: '未登入',
          時間戳記: 'null'
        };
      }

      return {
        待處理變數: currentUser.uid || 'null',
        登入狀態: currentUser.email ? '已登入' : '未完成',
        時間戳記: currentUser.metadata?.lastSignInTime || '不適用'
      };
    } catch (error) {
      return {
        待處理變數: 'error',
        登入狀態: 'error',
        時間戳記: 'error'
      };
    }
  };

  const getBrowserInfo = () => {
    try {
      const ua = navigator.userAgent || 'N/A';
      let storageStatus = '✗ 停用';
      
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        storageStatus = '✓ 可用';
      } catch {
        storageStatus = '✗ 停用';
      }

      return {
        Cookie: navigator.cookieEnabled ? '✓ 啟用' : '✗ 停用',
        儲存: storageStatus,
        用戶代理: ua
      };
    } catch (error) {
      return {
        Cookie: 'N/A',
        儲存: 'N/A',
        用戶代理: 'N/A'
      };
    }
  };

  const envInfo = getEnvironmentInfo();
  const authInfo = getAuthInfo();
  const browserInfo = getBrowserInfo();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* 標題列 */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
            <h2 className="text-lg font-bold">登入診斷工具</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-white/20 rounded-full p-1 transition-colors"
            aria-label="關閉"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 內容區域 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
          
          {/* 使用者狀態 */}
          <section className="mb-6">
            <div className="flex items-center mb-3">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">使用者狀態</h3>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 space-y-2">
              {currentUser ? (
                <>
                  <InfoRow label="信箱" value={currentUser.email || 'N/A'} />
                  <InfoRow label="UID" value={currentUser.uid || 'N/A'} />
                  <InfoRow 
                    label="登入狀態" 
                    value="✓ 已登入" 
                    valueClass="text-green-600 font-semibold"
                  />
                </>
              ) : (
                <InfoRow 
                  label="登入狀態" 
                  value="✗ 未登入" 
                  valueClass="text-red-600 font-semibold"
                />
              )}
            </div>
          </section>

          {/* 環境資訊 */}
          <section className="mb-6">
            <div className="flex items-center mb-3">
              <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">環境資訊</h3>
            </div>
            <div className="bg-green-50 rounded-lg p-4 space-y-2">
              <InfoRow label="網域" value={envInfo.網域} />
              <InfoRow label="協議" value={envInfo.協議} />
              <InfoRow label="完整網址" value={envInfo.完整網址} />
              <InfoRow label="後端環境" value={envInfo.後端環境} />
            </div>
          </section>

          {/* 認證狀態 */}
          <section className="mb-6">
            <div className="flex items-center mb-3">
              <svg className="w-5 h-5 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">認證狀態</h3>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 space-y-2">
              <InfoRow label="待處理變數" value={authInfo.待處理變數} />
              <InfoRow label="登入狀態碼" value={authInfo.登入狀態} />
              <InfoRow label="時間戳記" value={authInfo.時間戳記} />
            </div>
          </section>

          {/* 瀏覽器功能 */}
          <section className="mb-6">
            <div className="flex items-center mb-3">
              <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">瀏覽器功能</h3>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 space-y-2">
              <InfoRow label="Cookie" value={browserInfo.Cookie} />
              <InfoRow label="儲存" value={browserInfo.儲存} />
            </div>
          </section>

          {/* 用戶代理 */}
          <section>
            <div className="flex items-center mb-3">
              <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">用戶代理</h3>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 break-all font-mono">
                {browserInfo.用戶代理}
              </p>
            </div>
          </section>

        </div>

        {/* 底部按鈕 */}
        <div className="bg-gray-50 p-4 border-t flex gap-3">
          <button
            onClick={() => {
              const debugInfo = {
                使用者: currentUser ? { 
                  email: currentUser.email, 
                  uid: currentUser.uid 
                } : '未登入',
                環境: envInfo,
                認證: authInfo,
                瀏覽器: browserInfo
              };
              copyToClipboard(JSON.stringify(debugInfo, null, 2));
            }}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            📋 複製診斷資料
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            🔄 重新載入頁面
          </button>
        </div>
      </div>
    </div>
  );
};

// 資訊列元件
const InfoRow = ({ label, value, valueClass = "text-gray-900" }) => (
  <div className="flex justify-between items-start gap-2">
    <span className="text-gray-600 text-sm font-medium flex-shrink-0">{label}：</span>
    <span className={`text-sm font-mono text-right break-all ${valueClass}`}>
      {value || 'N/A'}
    </span>
  </div>
);

export default LoginDebugger;