// src/components/InitSuperAdmin.js
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { initializeSuperAdmin, getUsersByRole, ROLES } from '../services/roleService';

const InitSuperAdmin = () => {
  const { currentUser, reloadPermissions } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleInitialize = async () => {
    if (!currentUser) {
      setMessage('❌ 請先登入');
      return;
    }

    if (!window.confirm('確定要將您的帳號設定為超級管理員嗎？\n\n⚠️ 此操作僅在系統首次設定時使用！')) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // 檢查是否已有超級管理員
      const superAdmins = await getUsersByRole(ROLES.SUPER_ADMIN);
      
      if (superAdmins.length > 0) {
        setMessage('❌ 系統已存在超級管理員，無需重複初始化');
        setLoading(false);
        return;
      }

      // 初始化第一個超級管理員
      await initializeSuperAdmin(currentUser.uid);
      
      // 重新載入權限
      await reloadPermissions();
      
      setMessage('✅ 超級管理員初始化成功！\n\n請重新整理頁面以套用新權限。');
      
      // 3秒後自動重新整理
      setTimeout(() => {
        window.location.reload();
      }, 3000);

    } catch (error) {
      console.error('初始化失敗:', error);
      setMessage('❌ 初始化失敗：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl border-2 border-purple-200 p-4 w-80">
        <div className="flex items-center mb-3">
          <svg className="w-6 h-6 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          <h3 className="text-lg font-bold text-purple-900">超級管理員初始化</h3>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            ⚠️ 此工具僅用於系統首次設定
          </p>
          <p className="text-xs text-gray-500">
            將您的帳號設定為系統的第一個超級管理員
          </p>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm whitespace-pre-line ${
            message.startsWith('✅') 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        <button
          onClick={handleInitialize}
          disabled={loading || !currentUser}
          className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 font-medium"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              初始化中...
            </div>
          ) : (
            '初始化超級管理員'
          )}
        </button>

        {currentUser && (
          <div className="mt-3 text-xs text-gray-600 bg-gray-50 p-2 rounded">
            <p className="font-medium">目前登入使用者：</p>
            <p className="truncate">{currentUser.email}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InitSuperAdmin;