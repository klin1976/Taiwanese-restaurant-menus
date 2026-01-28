// src/utils/roleManagement.js
import { doc, setDoc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

// 角色定義
export const ROLES = {
  USER: 'user',           // 一般使用者
  ADMIN: 'admin',         // 管理員
  SUPER_ADMIN: 'super_admin'  // 超級管理員
};

// 角色權限定義
export const PERMISSIONS = {
  [ROLES.USER]: [
    'view_menu',
    'create_order',
    'view_own_orders'
  ],
  [ROLES.ADMIN]: [
    'view_menu',
    'create_order', 
    'view_own_orders',
    'view_all_orders',
    'view_order_statistics',
    'manage_stores',
    'export_orders'
  ],
  [ROLES.SUPER_ADMIN]: [
    'view_menu',
    'create_order',
    'view_own_orders', 
    'view_all_orders',
    'view_order_statistics',
    'manage_stores',
    'manage_users',
    'manage_roles',
    'system_settings',
    'export_orders'
  ]
};

// 預設管理員帳號列表
const DEFAULT_ADMINS = [
  {
    email: 'admin@company.com',
    role: ROLES.SUPER_ADMIN,
    name: '系統管理員'
  },
  {
    email: 'manager@company.com', 
    role: ROLES.ADMIN,
    name: '營運經理'
  }
  // 在這裡可以加入更多預設管理員帳號
];

// 建立使用者角色資料
export const createUserRole = async (userId, email, displayName, role = ROLES.USER) => {
  try {
    const userRoleRef = doc(db, 'userRoles', userId);
    
    await setDoc(userRoleRef, {
      userId,
      email,
      displayName,
      role,
      permissions: PERMISSIONS[role] || PERMISSIONS[ROLES.USER],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    });

    console.log(`✓ 使用者角色建立成功: ${email} (${role})`);
    return { success: true };
  } catch (error) {
    console.error('建立使用者角色失敗:', error);
    return { success: false, error: error.message };
  }
};

// 取得使用者角色
export const getUserRole = async (userId) => {
  try {
    const userRoleRef = doc(db, 'userRoles', userId);
    const userRoleDoc = await getDoc(userRoleRef);
    
    if (userRoleDoc.exists()) {
      return userRoleDoc.data();
    } else {
      // 如果沒有角色資料，預設為一般使用者
      return {
        role: ROLES.USER,
        permissions: PERMISSIONS[ROLES.USER]
      };
    }
  } catch (error) {
    console.error('取得使用者角色失敗:', error);
    return {
      role: ROLES.USER,
      permissions: PERMISSIONS[ROLES.USER]
    };
  }
};

// 檢查使用者是否有特定權限
export const hasPermission = (userRole, permission) => {
  if (!userRole || !userRole.permissions) {
    return false;
  }
  return userRole.permissions.includes(permission);
};

// 檢查是否為管理員
export const isAdmin = (userRole) => {
  return userRole?.role === ROLES.ADMIN || userRole?.role === ROLES.SUPER_ADMIN;
};

// 檢查是否為超級管理員
export const isSuperAdmin = (userRole) => {
  return userRole?.role === ROLES.SUPER_ADMIN;
};

// 根據 email 檢查是否為預設管理員
export const checkDefaultAdmin = (email) => {
  const admin = DEFAULT_ADMINS.find(admin => admin.email.toLowerCase() === email.toLowerCase());
  return admin || null;
};

// 初始化預設管理員角色
export const initializeDefaultAdmins = async () => {
  try {
    console.log('初始化預設管理員角色...');
    
    for (const admin of DEFAULT_ADMINS) {
      // 檢查是否已經存在該 email 的角色設定
      const existingRoles = await getDocs(
        query(collection(db, 'userRoles'), where('email', '==', admin.email))
      );
      
      if (existingRoles.empty) {
        // 建立一個臨時 userId（實際上會在使用者登入時更新）
        const tempUserId = `temp_${admin.email.replace('@', '_').replace('.', '_')}`;
        await createUserRole(tempUserId, admin.email, admin.name, admin.role);
      } else {
        console.log(`✓ 管理員 ${admin.email} 角色已存在`);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('初始化預設管理員失敗:', error);
    return { success: false, error: error.message };
  }
};

// 更新使用者角色
export const updateUserRole = async (userId, newRole) => {
  try {
    const userRoleRef = doc(db, 'userRoles', userId);
    
    await setDoc(userRoleRef, {
      role: newRole,
      permissions: PERMISSIONS[newRole] || PERMISSIONS[ROLES.USER],
      updatedAt: new Date()
    }, { merge: true });

    return { success: true };
  } catch (error) {
    console.error('更新使用者角色失敗:', error);
    return { success: false, error: error.message };
  }
};

// 取得所有使用者角色（管理員功能）
export const getAllUserRoles = async () => {
  try {
    const userRolesRef = collection(db, 'userRoles');
    const snapshot = await getDocs(userRolesRef);
    
    const userRoles = [];
    snapshot.forEach(doc => {
      userRoles.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, data: userRoles };
  } catch (error) {
    console.error('取得所有使用者角色失敗:', error);
    return { success: false, error: error.message };
  }
};

// 登入時處理角色初始化
export const handleUserLoginRole = async (user) => {
  try {
    const userId = user.uid;
    const email = user.email;
    const displayName = user.displayName;
    
    // 檢查是否為預設管理員
    const defaultAdmin = checkDefaultAdmin(email);
    
    // 取得現有角色
    let currentRole = await getUserRole(userId);
    
    if (defaultAdmin) {
      // 如果是預設管理員，確保角色正確
      if (currentRole.role !== defaultAdmin.role) {
        await createUserRole(userId, email, displayName, defaultAdmin.role);
        currentRole = await getUserRole(userId);
      }
    } else {
      // 如果不是預設管理員，且沒有角色資料，建立一般使用者角色
      if (!currentRole.userId) {
        await createUserRole(userId, email, displayName, ROLES.USER);
        currentRole = await getUserRole(userId);
      }
    }
    
    return currentRole;
  } catch (error) {
    console.error('處理使用者登入角色失敗:', error);
    return {
      role: ROLES.USER,
      permissions: PERMISSIONS[ROLES.USER]
    };
  }
};