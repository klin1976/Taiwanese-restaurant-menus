// src/components/Header.js
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_NAMES } from '../services/roleService';

const Header = ({ onLogoClick, onNavigate }) => {
  const { currentUser, userRole, logout, isSuperAdmin } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    if (window.confirm('確定要登出嗎？')) {
      try {
        await logout();
        setShowMenu(false);
      } catch (error) {
        console.error('登出失敗:', error);
        alert('登出失敗，請稍後再試');
      }
    }
  };

  const getRoleBadgeColor = () => {
    const colors = {
      'user': 'bg-gray-100 text-gray-700',
      'admin': 'bg-blue-100 text-blue-800',
      'superadmin': 'bg-purple-100 text-purple-800'
    };
    return colors[userRole] || 'bg-gray-100 text-gray-700';
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo - 支援點擊事件（連點5次開啟診斷） */}
          <div 
            onClick={onLogoClick}
            className="flex items-center cursor-pointer select-none"
            title="連點 5 次開啟診斷工具"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h1 className="text-xl font-bold text-gray-900">午餐訂購系統</h1>
              <p className="text-xs text-gray-500 hidden sm:block">輕鬆訂餐，美味送達</p>
            </div>
          </div>

          {/* 使用者資訊與選單 */}
          {currentUser && (
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* 角色標籤（桌面版） */}
              <div className="hidden md:flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor()}">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                {ROLE_NAMES[userRole]}
              </div>

              {/* 角色管理按鈕（桌面版，僅超級管理員） */}
              {isSuperAdmin() && onNavigate && (
                <button
                  onClick={() => onNavigate('roleManagement')}
                  className="hidden lg:flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                  title="角色管理"
                >
                  <svg className="w-4 h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span className="hidden xl:inline">角色管理</span>
                </button>
              )}

              {/* 使用者選單按鈕 */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center space-x-2 focus:outline-none hover:bg-gray-50 rounded-lg p-1 transition-colors"
                >
                  {/* 桌面版 */}
                  <div className="hidden sm:flex items-center space-x-2">
                    <div className="text-right mr-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {currentUser.displayName || '使用者'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {currentUser.email}
                      </p>
                    </div>
                    {currentUser.photoURL ? (
                      <img 
                        src={currentUser.photoURL} 
                        alt={currentUser.displayName}
                        className="w-10 h-10 rounded-full border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-indigo-600 font-semibold text-sm">
                          {currentUser.displayName?.charAt(0) || currentUser.email?.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 手機版 */}
                  <div className="sm:hidden">
                    {currentUser.photoURL ? (
                      <img 
                        src={currentUser.photoURL} 
                        alt={currentUser.displayName}
                        className="w-9 h-9 rounded-full border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-indigo-600 font-semibold text-sm">
                          {currentUser.displayName?.charAt(0) || currentUser.email?.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>

                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* 下拉選單 */}
                {showMenu && (
                  <>
                    {/* 遮罩 */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMenu(false)}
                    ></div>

                    {/* 選單內容 */}
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl py-2 z-20 border border-gray-100">
                      {/* 使用者資訊 */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center space-x-3 mb-2">
                          {currentUser.photoURL ? (
                            <img 
                              src={currentUser.photoURL} 
                              alt={currentUser.displayName}
                              className="w-12 h-12 rounded-full border-2 border-gray-200"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                              <span className="text-indigo-600 font-semibold">
                                {currentUser.displayName?.charAt(0) || currentUser.email?.charAt(0)}
                              </span>
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {currentUser.displayName}
                            </p>
                            <p className="text-xs text-gray-600 truncate">
                              {currentUser.email}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${getRoleBadgeColor()}`}>
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            {ROLE_NAMES[userRole]}
                          </span>
                        </div>
                      </div>

                      {/* 選單項目 */}
                      <div className="py-2">
                        {/* 角色管理（手機版，僅超級管理員） */}
                        {isSuperAdmin() && onNavigate && (
                          <button
                            onClick={() => {
                              onNavigate('roleManagement');
                              setShowMenu(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-purple-700 hover:bg-purple-50 flex items-center transition-colors"
                          >
                            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            角色管理
                          </button>
                        )}

                        {/* 登出 */}
                        <button
                          onClick={handleLogout}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                        >
                          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          登出
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;