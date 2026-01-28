// src/services/roleService.js
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

// 角色常數定義
export const ROLES = {
  USER: 'user',           // 一般使用者
  ADMIN: 'admin',         // 管理員
  SUPER_ADMIN: 'superadmin'  // 超級管理員
};

// 角色顯示名稱
export const ROLE_NAMES = {
  [ROLES.USER]: '一般使用者',
  [ROLES.ADMIN]: '管理員',
  [ROLES.SUPER_ADMIN]: '超級管理員'
};

// 角色權限定義
export const PERMISSIONS = {
  // 一般使用者權限
  [ROLES.USER]: {
    canOrder: true,              // 可以下訂單
    canViewOwnOrders: true,      // 可以查看自己的訂單
    canCancelOwnOrders: true,    // 可以取消自己的訂單
    canViewStores: true,         // 可以查看店家
    canViewMenu: true            // 可以查看菜單
  },
  
  // 管理員權限
  [ROLES.ADMIN]: {
    canOrder: true,
    canViewOwnOrders: true,
    canCancelOwnOrders: true,
    canViewStores: true,
    canViewMenu: true,
    canViewAllOrders: true,      // 可以查看所有訂單
    canUpdateOrderStatus: true,  // 可以更新訂單狀態
    canViewStatistics: true,     // 可以查看統計數據
    canExportReports: true,      // 可以匯出報表
    canManageStores: true,       // ✅ 新增：可以管理店家
    canManageMenu: true          // ✅ 新增：可以管理菜單
  },
  
  // 超級管理員權限
  [ROLES.SUPER_ADMIN]: {
    canOrder: true,
    canViewOwnOrders: true,
    canCancelOwnOrders: true,
    canViewStores: true,
    canViewMenu: true,
    canViewAllOrders: true,
    canUpdateOrderStatus: true,
    canViewStatistics: true,
    canExportReports: true,
    canManageUsers: true,        // 可以管理使用者
    canAssignRoles: true,        // 可以分配角色
    canManageStores: true,       // 可以管理店家
    canManageMenu: true,         // 可以管理菜單
    canAccessSystemSettings: true // 可以存取系統設定
  }
};

/**
 * 獲取使用者角色
 * @param {string} userId - 使用者ID
 * @returns {Promise<string>} - 角色名稱
 */
export const getUserRole = async (userId) => {
  try {
    if (!userId) {
      return ROLES.USER;
    }

    const roleDoc = await getDoc(doc(db, 'userRoles', userId));
    
    if (roleDoc.exists()) {
      return roleDoc.data().role || ROLES.USER;
    }
    
    // 如果沒有角色資料，預設為一般使用者
    return ROLES.USER;
    
  } catch (error) {
    console.error('獲取使用者角色失敗:', error);
    return ROLES.USER;
  }
};

/**
 * 設定使用者角色
 * @param {string} userId - 使用者ID
 * @param {string} role - 角色名稱
 * @param {string} assignedBy - 分配者ID
 * @returns {Promise<boolean>} - 是否成功
 */
export const setUserRole = async (userId, role, assignedBy) => {
  try {
    if (!userId || !role) {
      throw new Error('使用者ID和角色不能為空');
    }

    if (!Object.values(ROLES).includes(role)) {
      throw new Error('無效的角色');
    }

    const roleRef = doc(db, 'userRoles', userId);
    
    await setDoc(roleRef, {
      userId,
      role,
      assignedBy,
      assignedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }, { merge: true });

    console.log(`使用者 ${userId} 的角色已設定為 ${role}`);
    return true;
    
  } catch (error) {
    console.error('設定使用者角色失敗:', error);
    throw error;
  }
};

/**
 * 更新使用者角色
 * @param {string} userId - 使用者ID
 * @param {string} newRole - 新角色名稱
 * @param {string} updatedBy - 更新者ID
 * @returns {Promise<boolean>} - 是否成功
 */
export const updateUserRole = async (userId, newRole, updatedBy) => {
  try {
    if (!userId || !newRole) {
      throw new Error('使用者ID和角色不能為空');
    }

    if (!Object.values(ROLES).includes(newRole)) {
      throw new Error('無效的角色');
    }

    const roleRef = doc(db, 'userRoles', userId);
    
    await updateDoc(roleRef, {
      role: newRole,
      updatedBy,
      updatedAt: Timestamp.now()
    });

    console.log(`使用者 ${userId} 的角色已更新為 ${newRole}`);
    return true;
    
  } catch (error) {
    console.error('更新使用者角色失敗:', error);
    throw error;
  }
};

/**
 * 檢查使用者是否有特定權限
 * @param {string} userId - 使用者ID
 * @param {string} permission - 權限名稱
 * @returns {Promise<boolean>} - 是否有權限
 */
export const checkPermission = async (userId, permission) => {
  try {
    const role = await getUserRole(userId);
    const rolePermissions = PERMISSIONS[role] || PERMISSIONS[ROLES.USER];
    
    return rolePermissions[permission] === true;
    
  } catch (error) {
    console.error('檢查權限失敗:', error);
    return false;
  }
};

/**
 * 獲取使用者的所有權限
 * @param {string} userId - 使用者ID
 * @returns {Promise<Object>} - 權限物件
 */
export const getUserPermissions = async (userId) => {
  try {
    const role = await getUserRole(userId);
    return PERMISSIONS[role] || PERMISSIONS[ROLES.USER];
    
  } catch (error) {
    console.error('獲取使用者權限失敗:', error);
    return PERMISSIONS[ROLES.USER];
  }
};

/**
 * 檢查使用者是否為管理員
 * @param {string} userId - 使用者ID
 * @returns {Promise<boolean>} - 是否為管理員
 */
export const isAdmin = async (userId) => {
  try {
    const role = await getUserRole(userId);
    return role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
    
  } catch (error) {
    console.error('檢查管理員身份失敗:', error);
    return false;
  }
};

/**
 * 檢查使用者是否為超級管理員
 * @param {string} userId - 使用者ID
 * @returns {Promise<boolean>} - 是否為超級管理員
 */
export const isSuperAdmin = async (userId) => {
  try {
    const role = await getUserRole(userId);
    return role === ROLES.SUPER_ADMIN;
    
  } catch (error) {
    console.error('檢查超級管理員身份失敗:', error);
    return false;
  }
};

/**
 * ✨ 新版：獲取所有使用者及其角色（從 users collection 讀取）
 * @returns {Promise<Array>} - 使用者角色列表
 */
export const getAllUsersWithRoles = async () => {
  try {
    console.log('🔍 開始載入所有使用者及其角色...');
    
    // ✅ 步驟 1：讀取所有使用者
    const usersCollection = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollection);
    
    console.log(`📊 找到 ${usersSnapshot.size} 個使用者`);
    
    const usersWithRoles = [];
    
    // ✅ 步驟 2：對每個使用者，讀取對應的角色
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      // 讀取使用者角色
      const roleDoc = await getDoc(doc(db, 'userRoles', userId));
      
      let role = ROLES.USER; // 預設角色
      let assignedBy = null;
      let assignedAt = null;
      let updatedAt = null;
      
      if (roleDoc.exists()) {
        const roleData = roleDoc.data();
        role = roleData.role || ROLES.USER;
        assignedBy = roleData.assignedBy;
        assignedAt = roleData.assignedAt?.toDate();
        updatedAt = roleData.updatedAt?.toDate();
      } else {
        // ⚠️ 如果沒有角色記錄，自動建立預設角色
        console.warn(`⚠️ 使用者 ${userId} 沒有角色記錄，自動建立預設角色`);
        try {
          await setUserRole(userId, ROLES.USER, 'system');
          assignedBy = 'system';
          assignedAt = new Date();
          updatedAt = new Date();
        } catch (error) {
          console.error(`❌ 為使用者 ${userId} 建立預設角色失敗:`, error);
        }
      }
      
      usersWithRoles.push({
        userId,
        role,
        roleName: ROLE_NAMES[role] || '未知',
        userName: userData.displayName || userData.name || userData.email || '未知使用者',
        userEmail: userData.email || '',
        assignedBy,
        assignedAt,
        updatedAt
      });
    }
    
    console.log(`✅ 成功載入 ${usersWithRoles.length} 個使用者的角色資料`);
    return usersWithRoles;
    
  } catch (error) {
    console.error('❌ 獲取使用者角色列表失敗:', error);
    return [];
  }
};

/**
 * 獲取特定角色的所有使用者
 * @param {string} role - 角色名稱
 * @returns {Promise<Array>} - 使用者列表
 */
export const getUsersByRole = async (role) => {
  try {
    if (!Object.values(ROLES).includes(role)) {
      throw new Error('無效的角色');
    }

    const rolesCollection = collection(db, 'userRoles');
    const q = query(rolesCollection, where('role', '==', role));
    const rolesSnapshot = await getDocs(q);
    
    const users = [];
    
    for (const roleDoc of rolesSnapshot.docs) {
      const userDoc = await getDoc(doc(db, 'users', roleDoc.id));
      const userData = userDoc.exists() ? userDoc.data() : {};
      
      users.push({
        userId: roleDoc.id,
        userName: userData.displayName || userData.name || userData.email || '未知使用者',
        userEmail: userData.email || '',
        role: role,
        roleName: ROLE_NAMES[role]
      });
    }
    
    return users;
    
  } catch (error) {
    console.error('獲取特定角色使用者失敗:', error);
    return [];
  }
};

/**
 * 初始化第一個超級管理員
 * @param {string} userId - 使用者ID
 * @returns {Promise<boolean>} - 是否成功
 */
export const initializeSuperAdmin = async (userId) => {
  try {
    // 檢查是否已有超級管理員
    const superAdmins = await getUsersByRole(ROLES.SUPER_ADMIN);
    
    if (superAdmins.length > 0) {
      console.log('已存在超級管理員，無需初始化');
      return false;
    }

    // 設定第一個超級管理員
    await setUserRole(userId, ROLES.SUPER_ADMIN, 'system');
    console.log('超級管理員初始化成功');
    
    return true;
    
  } catch (error) {
    console.error('初始化超級管理員失敗:', error);
    throw error;
  }
};

/**
 * ✨ 新增：批次修復缺少角色的使用者
 * @returns {Promise<Object>} - 修復結果 { fixed: number, errors: Array }
 */
export const fixMissingUserRoles = async () => {
  try {
    console.log('🔧 開始批次修復缺少角色的使用者...');
    
    // 讀取所有使用者
    const usersCollection = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollection);
    
    let fixedCount = 0;
    const errors = [];
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      // 檢查是否有角色記錄
      const roleDoc = await getDoc(doc(db, 'userRoles', userId));
      
      if (!roleDoc.exists()) {
        // 沒有角色記錄，建立預設角色
        try {
          await setUserRole(userId, ROLES.USER, 'system');
          fixedCount++;
          console.log(`✅ 已為使用者 ${userData.email || userId} 建立預設角色`);
        } catch (error) {
          console.error(`❌ 為使用者 ${userId} 建立角色失敗:`, error);
          errors.push({
            userId,
            email: userData.email,
            error: error.message
          });
        }
      }
    }
    
    console.log(`🎉 批次修復完成！共修復 ${fixedCount} 個使用者`);
    
    return {
      fixed: fixedCount,
      errors
    };
    
  } catch (error) {
    console.error('❌ 批次修復失敗:', error);
    throw error;
  }
};