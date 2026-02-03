// src/firebase.js
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions'; // ✅ 新增
import { devLog, devError, forceError } from './utils/devLog';

// Firebase 配置
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// 檢查配置是否完整
devLog('🔧 Firebase 配置檢查:');
devLog('✓ API Key:', firebaseConfig.apiKey ? '已設置' : '❌ 未設置');
devLog('✓ Auth Domain:', firebaseConfig.authDomain || '❌ 未設置');
devLog('✓ Project ID:', firebaseConfig.projectId || '❌ 未設置');
devLog('✓ Storage Bucket:', firebaseConfig.storageBucket || '❌ 未設置'); // ✅ 新增

// 驗證必要配置
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  forceError('❌ Firebase 配置不完整！請檢查 .env 檔案');
  throw new Error('Firebase 配置不完整');
}

// 防止重複初始化
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  devLog('✅ Firebase 已初始化');
} else {
  app = getApps()[0];
  devLog('ℹ️ 使用現有的 Firebase 實例');
}

// 初始化服務
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'asia-east1'); // ✅ 新增 (指定區域)

// 配置 Google Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Persistence 設定
let persistenceInitialized = false;

export const initializePersistence = async () => {
  if (persistenceInitialized) {
    devLog('ℹ️ Persistence 已初始化，跳過');
    return;
  }

  try {
    await setPersistence(auth, browserLocalPersistence);
    persistenceInitialized = true;
    devLog('✅ Auth persistence 已設置為 browserLocalPersistence');
  } catch (error) {
    devError('❌ 設置 persistence 失敗:', error);
    throw error;
  }
};

// 立即初始化 persistence
initializePersistence().catch(error => {
  devError('❌ Persistence 初始化失敗:', error);
});

devLog('✅ Auth 服務已初始化');
devLog('✅ Firestore 已初始化');
devLog('✅ Storage 已初始化'); // ✅ 新增
devLog('✅ Google Provider 已配置');