// src/components/AuthDebugger.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const AuthDebugger = () => {
  const { currentUser } = useAuth();
  const [debugInfo, setDebugInfo] = useState({});
  const [showDebugger, setShowDebugger] = useState(false);

  // 檢查是否應該顯示（開發環境或已啟用 debug 模式）
  useEffect(() => {
    const debugMode = localStorage.getItem('debugMode');
    if (process.env.NODE_ENV === 'development' || debugMode === 'true') {
      setShowDebugger(true);
    }
  }, []);

  useEffect(() => {
    const updateDebugInfo = () => {
      setDebugInfo({
        // 使用者狀態
        isLoggedIn: !!currentUser,
        userEmail: currentUser?.email || 'N/A',
        userId: currentUser?.uid || 'N/A',
        userName: currentUser?.displayName || 'N/A',
        
        // 環境資訊
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        fullUrl: window.location.href,
        userAgent: navigator.userAgent,
        isMobile: /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent),
        
        // localStorage 狀態
        pendingAuth: localStorage.getItem('pendingAuth') || 'null',
        authAttemptTime: localStorage.getItem('authAttemptTime') || 'null',
        timestampAge: localStorage.getItem('authAttemptTime') 
          ? `${Math.floor((Date.now() - parseInt(localStorage.getItem('authAttemptTime'))) / 1000)}秒前`
          : 'N/A',
        debugMode: localStorage.getItem('debugMode') || 'null',
        
        // 瀏覽器功能
        cookiesEnabled: navigator.cookieEnabled,
        storageAvailable: typeof(Storage) !== 'undefined',
        
        // URL 參數
        urlParams: window.location.search,
        urlHash: window.location.hash,
        
        // 環境
        nodeEnv: process.env.NODE_ENV,
      });
    };

    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 1000);
    
    return () => clearInterval(interval);
  }, [currentUser]);

  const clearAuthData = () => {
    localStorage.removeItem('pendingAuth');
    localStorage.removeItem('authAttemptTime');
    alert('已清除認證相關的 localStorage 資料');
  };

  const toggleDebugMode = () => {
    const current = localStorage.getItem('debugMode');
    if (current === 'true') {
      localStorage.removeItem('debugMode');
      setShowDebugger(false);
      alert('診斷模式已關閉');
    } else {
      localStorage.setItem('debugMode', 'true');
      setShowDebugger(true);
      alert('診斷模式已開啟');
    }
  };

  // 如果不應該顯示，返回 null
  if (!showDebugger) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* 浮動按鈕 */}
      <button
        onClick={() => setShowDebugger(prev => !prev)}
        className="bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg text-sm hover:bg-gray-700 transition-colors"
      >
        🔧 Debug
      </button>

      {/* 診斷面板 */}
      {showDebugger && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">🔧 登入診斷工具</h2>
              <button
                onClick={() => setShowDebugger(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 使用者狀態 */}
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center">
                  👤 使用者狀態
                  <span className={`ml-3 px-3 py-1 rounded-full text-sm ${
                    debugInfo.isLoggedIn 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {debugInfo.isLoggedIn ? '已登入' : '未登入'}
                  </span>
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm font-mono">
                  <div><strong>名稱:</strong> {debugInfo.userName}</div>
                  <div><strong>Email:</strong> {debugInfo.userEmail}</div>
                  <div><strong>UID:</strong> <span className="break-all">{debugInfo.userId}</span></div>
                </div>
              </div>

              {/* 環境資訊 */}
              <div>
                <h3 className="font-semibold text-lg mb-3">🌐 環境資訊</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm font-mono">
                  <div><strong>環境:</strong> {debugInfo.nodeEnv}</div>
                  <div><strong>網域:</strong> {debugInfo.hostname}</div>
                  <div><strong>協定:</strong> {debugInfo.protocol}</div>
                  <div><strong>完整 URL:</strong> <span className="break-all">{debugInfo.fullUrl}</span></div>
                  <div><strong>裝置類型:</strong> {debugInfo.isMobile ? '📱 行動裝置' : '💻 桌面裝置'}</div>
                </div>
              </div>

              {/* 認證狀態 */}
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center">
                  🔐 認證狀態
                  {debugInfo.pendingAuth === 'true' && (
                    <span className="ml-3 px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                      有待處理登入
                    </span>
                  )}
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm font-mono">
                  <div><strong>待處理登入:</strong> {debugInfo.pendingAuth}</div>
                  <div><strong>登入時間戳:</strong> {debugInfo.authAttemptTime}</div>
                  <div><strong>時間差:</strong> {debugInfo.timestampAge}</div>
                  <div><strong>診斷模式:</strong> {debugInfo.debugMode}</div>
                </div>
              </div>

              {/* 瀏覽器功能 */}
              <div>
                <h3 className="font-semibold text-lg mb-3">🔧 瀏覽器功能</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm font-mono">
                  <div>
                    <strong>Cookies:</strong> 
                    <span className={debugInfo.cookiesEnabled ? 'text-green-600' : 'text-red-600'}>
                      {debugInfo.cookiesEnabled ? ' ✓ 啟用' : ' ✗ 停用'}
                    </span>
                  </div>
                  <div>
                    <strong>Storage:</strong> 
                    <span className={debugInfo.storageAvailable ? 'text-green-600' : 'text-red-600'}>
                      {debugInfo.storageAvailable ? ' ✓ 可用' : ' ✗ 不可用'}
                    </span>
                  </div>
                </div>
              </div>

              {/* URL 參數 */}
              {(debugInfo.urlParams || debugInfo.urlHash) && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">🔗 URL 資訊</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm font-mono">
                    {debugInfo.urlParams && <div><strong>參數:</strong> {debugInfo.urlParams}</div>}
                    {debugInfo.urlHash && <div><strong>Hash:</strong> {debugInfo.urlHash}</div>}
                  </div>
                </div>
              )}

              {/* User Agent */}
              <div>
                <h3 className="font-semibold text-lg mb-3">📱 User Agent</h3>
                <div className="bg-gray-50 rounded-lg p-4 text-sm font-mono break-all">
                  {debugInfo.userAgent}
                </div>
              </div>

              {/* 操作按鈕 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={clearAuthData}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  🗑️ 清除認證資料
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  🔄 重新載入
                </button>
                <button
                  onClick={toggleDebugMode}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                >
                  {debugInfo.debugMode === 'true' ? '🔒 關閉診斷' : '🔓 開啟診斷'}
                </button>
              </div>

              {/* 診斷建議 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">💡 診斷建議</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  {!debugInfo.cookiesEnabled && (
                    <li>⚠️ Cookies 已停用，可能導致登入失敗</li>
                  )}
                  {!debugInfo.storageAvailable && (
                    <li>⚠️ Storage 不可用，無法儲存登入狀態</li>
                  )}
                  {debugInfo.protocol === 'http:' && debugInfo.hostname !== 'localhost' && (
                    <li>⚠️ 使用 HTTP 而非 HTTPS，可能導致安全性問題</li>
                  )}
                  {debugInfo.pendingAuth === 'true' && debugInfo.timestampAge && 
                   parseInt(debugInfo.timestampAge) > 300 && (
                    <li>⚠️ 登入請求已超過 5 分鐘，建議清除認證資料後重試</li>
                  )}
                  {!debugInfo.isLoggedIn && debugInfo.pendingAuth === 'null' && (
                    <li>ℹ️ 未偵測到登入狀態，請嘗試登入</li>
                  )}
                  {debugInfo.isLoggedIn && (
                    <li>✅ 登入狀態正常</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthDebugger;