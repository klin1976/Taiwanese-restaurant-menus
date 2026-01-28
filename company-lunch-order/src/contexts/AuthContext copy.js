// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { devLog, devWarn, devError } from '../utils/devLog';
import { getUserRole, getUserPermissions, setUserRole, ROLES } from '../services/roleService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRoleState] = useState(ROLES.USER);
  const [userPermissions, setUserPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [loginStatusMessage, setLoginStatusMessage] = useState('');

  // 檢測是否為行動裝置
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768);
  };

  // 載入使用者角色和權限
  const loadUserRoleAndPermissions = async (userId) => {
    try {
      devLog('🔐 載入使用者角色和權限...');
      const role = await getUserRole(userId);
      const permissions = await getUserPermissions(userId);
      
      setUserRoleState(role);
      setUserPermissions(permissions);
      
      devLog('✅ 使用者角色:', role);
      devLog('✅ 使用者權限:', permissions);
      
    } catch (error) {
      devError('❌ 載入使用者角色和權限失敗:', error);
      setUserRoleState(ROLES.USER);
      setUserPermissions({});
    }
  };

  // 儲存使用者資料到 Firestore
  const saveUserToFirestore = async (user) => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email,
        photoURL: user.photoURL || '',
        lastLoginAt: serverTimestamp()
      };

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          ...userData,
          createdAt: serverTimestamp()
        });
        devLog('✅ 新使用者資料已建立');
        
        // 為新使用者設定預設角色
        await setUserRole(user.uid, ROLES.USER, 'system');
        devLog('✅ 新使用者預設角色已設定為一般使用者');
      } else {
        await setDoc(userRef, userData, { merge: true });
        devLog('✅ 使用者登入時間已更新');
      }

      // 載入使用者角色和權限
      await loadUserRoleAndPermissions(user.uid);
      
    } catch (error) {
      devError('❌ 儲存使用者資料失敗:', error);
    }
  };

  // 處理 Google 登入
  const loginWithGoogle = async () => {
    try {
      devLog('🔐 開始 Google 登入流程...');
      
      const isMobile = isMobileDevice();
      devLog('📱 裝置類型:', isMobile ? '行動裝置' : '桌面裝置');

      // 設定登入標記
      localStorage.setItem('pendingAuth', 'true');
      localStorage.setItem('authAttemptTime', Date.now().toString());

      if (isMobile) {
        devLog('🔄 使用 signInWithRedirect 方式');
        // 行動裝置：先登出清除舊狀態，再 redirect
        await signOut(auth).catch(() => {}); // 忽略登出錯誤
        await signInWithRedirect(auth, googleProvider);
      } else {
        // 桌面裝置：優先使用 Popup
        try {
          devLog('🪟 嘗試使用 signInWithPopup 方式');
          const result = await signInWithPopup(auth, googleProvider);
          devLog('✅ Popup 登入成功:', result.user.email);
          localStorage.removeItem('pendingAuth');
          localStorage.removeItem('authAttemptTime');
          await saveUserToFirestore(result.user);
          return result.user;
        } catch (popupError) {
          if (popupError.code === 'auth/popup-blocked' || 
              popupError.code === 'auth/popup-closed-by-user' ||
              popupError.code === 'auth/cancelled-popup-request') {
            devWarn('⚠️ Popup 失敗，改用 Redirect 方式');
            await signOut(auth).catch(() => {});
            await signInWithRedirect(auth, googleProvider);
          } else {
            throw popupError;
          }
        }
      }
    } catch (error) {
      devError('❌ Google 登入失敗:', error);
      localStorage.removeItem('pendingAuth');
      localStorage.removeItem('authAttemptTime');
      
      let errorMessage = '登入失敗，請稍後再試';
      if (error.code === 'auth/unauthorized-domain') {
        errorMessage = '此網域未獲授權。請聯繫系統管理員。';
        devError('❌ 未授權的網域:', window.location.hostname);
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = '彈出視窗被阻擋，請允許彈出視窗';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = '網路連線失敗，請檢查網路狀態';
      }
      
      alert(errorMessage);
      throw error;
    }
  };

  // 登出
  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserRoleState(ROLES.USER);
      setUserPermissions({});
      localStorage.removeItem('pendingAuth');
      localStorage.removeItem('authAttemptTime');
      devLog('✅ 登出成功');
    } catch (error) {
      devError('❌ 登出失敗:', error);
      throw error;
    }
  };

  // 檢查是否有特定權限
  const hasPermission = (permission) => {
    return userPermissions[permission] === true;
  };

  // 檢查是否為管理員
  const isAdmin = () => {
    return userRole === ROLES.ADMIN || userRole === ROLES.SUPER_ADMIN;
  };

  // 檢查是否為超級管理員
  const isSuperAdmin = () => {
    return userRole === ROLES.SUPER_ADMIN;
  };

  // 重新載入使用者權限
  const reloadPermissions = async () => {
    if (currentUser) {
      await loadUserRoleAndPermissions(currentUser.uid);
    }
  };

  // 初始化認證 - 使用 IIFE 模式
  useEffect(() => {
    devLog('🚀 AuthContext 初始化...');
    devLog('🌐 當前網域:', window.location.hostname);
    devLog('🔗 當前 URL:', window.location.href);
    
    let mounted = true;
    let unsubscribe;

    // 立即執行的異步函數
    (async () => {
      try {
        // 檢查是否有待處理的登入
        const pendingAuth = localStorage.getItem('pendingAuth');
        const authAttemptTime = localStorage.getItem('authAttemptTime');

        if (pendingAuth === 'true') {
          devLog('🔍 偵測到待處理的登入');
          
          // 檢查是否逾時（2分鐘）
          if (authAttemptTime) {
            const elapsed = Date.now() - parseInt(authAttemptTime);
            if (elapsed > 120000) {
              devWarn('⚠️ 登入請求已逾時，清除標記');
              localStorage.removeItem('pendingAuth');
              localStorage.removeItem('authAttemptTime');
            }
          }
        }

        // 步驟 1: 嘗試獲取 redirect 結果（帶超時保護）
        if (pendingAuth === 'true' && mounted) {
          setLoginStatusMessage('正在完成登入...');
          
          try {
            devLog('🔍 檢查 redirect 結果...');
            
            // 5 秒超時保護
            const result = await Promise.race([
              getRedirectResult(auth),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('timeout')), 5000)
              )
            ]);
            
            if (result?.user && mounted) {
              devLog('✅ Redirect 登入成功:', result.user.email);
              setLoginStatusMessage('正在同步使用者資料...');
              setCurrentUser(result.user);
              localStorage.removeItem('pendingAuth');
              localStorage.removeItem('authAttemptTime');
              await saveUserToFirestore(result.user);
            } else {
              devLog('ℹ️ getRedirectResult 返回 null（正常情況）');
            }
          } catch (error) {
            if (error.message === 'timeout') {
              devWarn('⚠️ getRedirectResult 超時，交由 onAuthStateChanged 處理');
            } else {
              devError('⚠️ getRedirectResult 失敗:', error.code);
            }
            // 不中斷流程，繼續依賴 onAuthStateChanged
          }
        }

        // 步驟 2: 設置持續監聽
        if (mounted) {
          unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!mounted) return;

            devLog('👤 認證狀態變化:', user ? `已登入 (${user.email})` : '未登入');
            
            if (user) {
              setCurrentUser(user);
              localStorage.removeItem('pendingAuth');
              localStorage.removeItem('authAttemptTime');
              
              // 儲存到 Firestore 並載入角色權限
              await saveUserToFirestore(user);
            } else {
              setCurrentUser(null);
              setUserRoleState(ROLES.USER);
              setUserPermissions({});
            }
          });
        }

      } catch (error) {
        devError('❌ 初始化失敗:', error);
      } finally {
        // 步驟 3: 最後才結束載入
        if (mounted) {
          setLoading(false);
          setLoginStatusMessage('');
        }
      }
    })();

    // 清理函數
    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const value = {
    currentUser,
    userRole,
    userPermissions,
    loading,
    loginStatusMessage,
    loginWithGoogle,
    logout,
    hasPermission,
    isAdmin,
    isSuperAdmin,
    reloadPermissions
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};