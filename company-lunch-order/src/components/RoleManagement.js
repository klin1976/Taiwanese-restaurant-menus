// src/components/RoleManagement.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getAllUsersWithRoles,
  updateUserRole,
  isSuperAdmin,
  ROLES,
  ROLE_NAMES,
  PERMISSIONS
} from '../services/roleService';

const RoleManagement = ({ onBack }) => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [filter, setFilter] = useState('all');
  const [showPermissions, setShowPermissions] = useState(null);

  useEffect(() => {
    checkPermissions();
    fetchUsers();
  }, [currentUser]);

  const checkPermissions = async () => {
    if (currentUser) {
      const isSuperAdminUser = await isSuperAdmin(currentUser.uid);
      setCanManage(isSuperAdminUser);
      
      if (!isSuperAdminUser) {
        alert('您沒有權限存取此頁面');
      }
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersWithRoles = await getAllUsersWithRoles();
      setUsers(usersWithRoles);
    } catch (error) {
      console.error('獲取使用者列表失敗:', error);
      alert('獲取使用者列表失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingUser || !selectedRole) {
      alert('請選擇角色');
      return;
    }

    if (!window.confirm(`確定要將 ${editingUser.userName} 的角色變更為 ${ROLE_NAMES[selectedRole]} 嗎？`)) {
      return;
    }

    try {
      await updateUserRole(editingUser.userId, selectedRole, currentUser.uid);
      alert('角色更新成功！');
      setEditingUser(null);
      setSelectedRole('');
      fetchUsers();
    } catch (error) {
      console.error('更新角色失敗:', error);
      alert('更新角色失敗：' + error.message);
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      [ROLES.USER]: 'bg-gray-100 text-gray-800 border-gray-300',
      [ROLES.ADMIN]: 'bg-blue-100 text-blue-800 border-blue-300',
      [ROLES.SUPER_ADMIN]: 'bg-purple-100 text-purple-800 border-purple-300'
    };
    return colors[role] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const filteredUsers = users.filter(user => {
    if (filter === 'all') return true;
    return user.role === filter;
  });

  const getRoleStats = () => {
    return {
      total: users.length,
      users: users.filter(u => u.role === ROLES.USER).length,
      admins: users.filter(u => u.role === ROLES.ADMIN).length,
      superAdmins: users.filter(u => u.role === ROLES.SUPER_ADMIN).length
    };
  };

  const stats = getRoleStats();

  if (!canManage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">存取被拒</h2>
          <p className="text-gray-600 mb-6">您沒有權限存取角色管理功能</p>
          <button
            onClick={onBack}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">載入使用者資料中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50">
      {/* 標頭 */}
      <div className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">角色權限管理</h1>
                <p className="text-sm text-gray-600 mt-1">管理使用者角色與權限</p>
              </div>
            </div>
            
            <button
              onClick={fetchUsers}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              重新整理
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">總使用者</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">一般使用者</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.users}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">管理員</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">{stats.admins}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">超級管理員</p>
                <p className="text-3xl font-bold text-purple-900 mt-1">{stats.superAdmins}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 篩選按鈕 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              全部 ({stats.total})
            </button>
            <button
              onClick={() => setFilter(ROLES.USER)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === ROLES.USER
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              一般使用者 ({stats.users})
            </button>
            <button
              onClick={() => setFilter(ROLES.ADMIN)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === ROLES.ADMIN
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              管理員 ({stats.admins})
            </button>
            <button
              onClick={() => setFilter(ROLES.SUPER_ADMIN)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === ROLES.SUPER_ADMIN
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              超級管理員 ({stats.superAdmins})
            </button>
          </div>
        </div>

        {/* 使用者列表 */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    使用者
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    角色
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    更新時間
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.userId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-indigo-700 font-bold text-sm">
                            {user.userName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{user.userName}</div>
                          {user.userId === currentUser.uid && (
                            <span className="text-xs text-indigo-600 font-medium">(您)</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.userEmail}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border-2 ${getRoleBadgeColor(user.role)}`}>
                        {user.roleName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.updatedAt?.toLocaleDateString('zh-TW')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setShowPermissions(user.role)}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                        >
                          查看權限
                        </button>
                        {user.userId !== currentUser.uid && (
                          <button
                            onClick={() => {
                              setEditingUser(user);
                              setSelectedRole(user.role);
                            }}
                            className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                          >
                            編輯角色
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <p className="text-gray-600">沒有符合條件的使用者</p>
            </div>
          )}
        </div>
      </div>

      {/* 編輯角色彈窗 */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">編輯使用者角色</h3>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setSelectedRole('');
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-indigo-700 font-bold">
                    {editingUser.userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{editingUser.userName}</p>
                  <p className="text-sm text-gray-600">{editingUser.userEmail}</p>
                </div>
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                選擇角色
              </label>
              <div className="space-y-2">
                {Object.entries(ROLES).map(([key, value]) => (
                  <label
                    key={value}
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedRole === value
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={value}
                      checked={selectedRole === value}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="ml-3">
                      <span className={`font-medium ${
                        selectedRole === value ? 'text-indigo-900' : 'text-gray-900'
                      }`}>
                        {ROLE_NAMES[value]}
                      </span>
                      <p className="text-xs text-gray-600 mt-1">
                        {value === ROLES.USER && '基本使用者權限，可以下訂單和查看自己的訂單'}
                        {value === ROLES.ADMIN && '管理員權限，可以查看所有訂單和統計數據'}
                        {value === ROLES.SUPER_ADMIN && '超級管理員權限，可以管理使用者角色和系統設定'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setEditingUser(null);
                  setSelectedRole('');
                }}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={handleUpdateRole}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                確認更新
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 權限查看彈窗 */}
      {showPermissions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {ROLE_NAMES[showPermissions]} 權限列表
              </h3>
              <button
                onClick={() => setShowPermissions(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              {Object.entries(PERMISSIONS[showPermissions] || {}).map(([permission, hasPermission]) => (
                <div
                  key={permission}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                    hasPermission
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center">
                    {hasPermission ? (
                      <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <span className={`font-medium ${
                      hasPermission ? 'text-green-900' : 'text-gray-600'
                    }`}>
                      {getPermissionName(permission)}
                    </span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    hasPermission
                      ? 'bg-green-200 text-green-800'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {hasPermission ? '允許' : '禁止'}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <button
                onClick={() => setShowPermissions(null)}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 權限名稱對應
const getPermissionName = (permission) => {
  const names = {
    canOrder: '下訂單',
    canViewOwnOrders: '查看自己的訂單',
    canCancelOwnOrders: '取消自己的訂單',
    canViewStores: '查看店家',
    canViewMenu: '查看菜單',
    canViewAllOrders: '查看所有訂單',
    canUpdateOrderStatus: '更新訂單狀態',
    canViewStatistics: '查看統計數據',
    canExportReports: '匯出報表',
    canManageUsers: '管理使用者',
    canAssignRoles: '分配角色',
    canManageStores: '管理店家',
    canManageMenu: '管理菜單',
    canAccessSystemSettings: '存取系統設定'
  };
  return names[permission] || permission;
};

export default RoleManagement;