// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
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
  
  // ✅ 新增：用於追蹤認證狀態
  const authStateResolved = useRef(false);
  const redirectResultProcessed = useRef(false);

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

  // ✨ 強化版：儲存使用者資料到 Firestore
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
        // ✅ 新使用者：建立 users 文件
        await setDoc(userRef, {
          ...userData,
          createdAt: serverTimestamp()
        });
        devLog('✅ 新使用者資料已建立');
        
        // ✅ 為新使用者設定預設角色
        await setUserRole(user.uid, ROLES.USER, 'system');
        devLog('✅ 新使用者預設角色已設定為一般使用者');
      } else {
        // ✅ 舊使用者：更新登入時間
        await setDoc(userRef, userData, { merge: true });
        devLog('✅ 使用者登入時間已更新');
        
        // ✨ 檢查舊使用者是否有角色記錄
        const roleDoc = await getDoc(doc(db, 'userRoles', user.uid));
        
        if (!roleDoc.exists()) {
          devWarn('⚠️ 偵測到舊使用者缺少角色記錄，自動建立預設角色');
          try {
            await setUserRole(user.uid, ROLES.USER, 'system');
            devLog('✅ 已為舊使用者建立預設角色');
          } catch (roleError) {
            devError('❌ 為舊使用者建立角色失敗:', roleError);
          }
        }
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
        await signOut(auth).catch(() => {});
        await signInWithRedirect(auth, googleProvider);
      } else {
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

  // ✅ 初始化認證（重構版）
  useEffect(() => {
    devLog('🚀 AuthContext 初始化...');
    devLog('🌐 當前網域:', window.location.hostname);
    devLog('🔗 當前 URL:', window.location.href);
    
    let mounted = true;
    let unsubscribe;
    
    // ✅ 處理 redirect 結果
    const handleRedirectResult = async () => {
      const pendingAuth = localStorage.getItem('pendingAuth');
      const authAttemptTime = localStorage.getItem('authAttemptTime');

      if (pendingAuth !== 'true') {
        devLog('ℹ️ 沒有待處理的登入');
        return null;
      }

      // 檢查是否逾時
      if (authAttemptTime) {
        const elapsed = Date.now() - parseInt(authAttemptTime);
        if (elapsed > 120000) {
          devWarn('⚠️ 登入請求已逾時，清除標記');
          localStorage.removeItem('pendingAuth');
          localStorage.removeItem('authAttemptTime');
          return null;
        }
      }

      if (mounted) {
        setLoginStatusMessage('正在完成登入...');
      }

      try {
        devLog('🔍 檢查 redirect 結果...');
        
        // ✅ 增加超時時間到 15 秒
        const result = await Promise.race([
          getRedirectResult(auth),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('timeout')), 15000)
          )
        ]);
        
        if (result?.user) {
          devLog('✅ Redirect 登入成功:', result.user.email);
          
          if (mounted) {
            setLoginStatusMessage('正在同步使用者資料...');
            setCurrentUser(result.user);
            authStateResolved.current = true; // ✅ 標記認證已完成
          }
          
          localStorage.removeItem('pendingAuth');
          localStorage.removeItem('authAttemptTime');
          
          await saveUserToFirestore(result.user);
          
          if (mounted) {
            setLoginStatusMessage('');
          }
          
          return result.user;
        } else {
          devLog('ℹ️ getRedirectResult 返回 null');
          return null;
        }
      } catch (error) {
        if (error.message === 'timeout') {
          devWarn('⚠️ getRedirectResult 超時，等待 onAuthStateChanged 處理');
        } else if (error.code === 'auth/invalid-api-key') {
          devError('❌ Firebase API Key 無效');
        } else if (error.code === 'auth/network-request-failed') {
          devError('❌ 網路請求失敗');
        } else {
          devError('⚠️ getRedirectResult 錯誤:', error.code, error.message);
        }
        return null;
      }
    };

    // ✅ 設定 auth 狀態監聽
    const setupAuthListener = () => {
      devLog('👂 設定 onAuthStateChanged 監聽器');
      
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!mounted) {
          devLog('⚠️ Component unmounted，忽略 auth 狀態變化');
          return;
        }

        devLog('👤 onAuthStateChanged 觸發:', {
          user: user ? `已登入 (${user.email})` : '未登入',
          authStateResolved: authStateResolved.current,
          redirectResultProcessed: redirectResultProcessed.current
        });
        
        if (user) {
          // ✅ 使用者已登入
          devLog('✅ 偵測到已登入使用者:', user.email);
          setCurrentUser(user);
          authStateResolved.current = true;
          
          // 清除登入標記
          localStorage.removeItem('pendingAuth');
          localStorage.removeItem('authAttemptTime');
          
          // 如果還沒處理過 Firestore 儲存，則執行
          if (!redirectResultProcessed.current) {
            await saveUserToFirestore(user);
            redirectResultProcessed.current = true;
          }
        } else {
          // ✅ 使用者未登入
          devLog('ℹ️ 偵測到未登入狀態');
          
          // ⚠️ 只有在沒有 pendingAuth 的情況下才設為 null
          const pendingAuth = localStorage.getItem('pendingAuth');
          if (pendingAuth !== 'true') {
            setCurrentUser(null);
            setUserRoleState(ROLES.USER);
            setUserPermissions({});
            authStateResolved.current = true;
          } else {
            devLog('⏳ 有 pendingAuth，暫不設定為未登入');
          }
        }
      });
    };

    // ✅ 主初始化流程
    const initialize = async () => {
      try {
        // 步驟 1：處理 redirect 結果
        const redirectUser = await handleRedirectResult();
        
        if (redirectUser) {
          devLog('✅ Redirect 登入完成，已處理使用者資料');
          redirectResultProcessed.current = true;
        }

        // 步驟 2：設定 auth 監聽器
        if (mounted) {
          setupAuthListener();
        }

        // ✅ 步驟 3：等待認證狀態確定後才設定 loading = false
        const maxWaitTime = 3000; // 最多等待 3 秒
        const startTime = Date.now();
        
        while (!authStateResolved.current && mounted) {
          if (Date.now() - startTime > maxWaitTime) {
            devWarn('⚠️ 等待認證狀態超時，強制繼續');
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        devError('❌ 初始化失敗:', error);
      } finally {
        if (mounted) {
          devLog('✅ 認證初始化完成，設定 loading = false');
          setLoading(false);
          setLoginStatusMessage('');
        }
      }
    };

    // 執行初始化
    initialize();

    // Cleanup
    return () => {
      devLog('🧹 AuthContext cleanup');
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []); // 空依賴陣列

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