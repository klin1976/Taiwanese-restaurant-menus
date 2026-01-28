// src/firebase.js
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
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

// 配置 Google Provider
export const googleProvider = new GoogleAuthProvider();

// 關鍵設置：強制選擇帳號（避免自動登入導致混亂）
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// 🔑 關鍵：在初始化階段就設定 persistence
// 確保認證狀態在重新導向後保留
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    devLog('✅ Auth persistence 已設置為 browserLocalPersistence');
  })
  .catch((error) => {
    devError('❌ 設置 persistence 失敗:', error);
  });

devLog('✅ Auth 服務已初始化');
devLog('✅ Firestore 已初始化');
devLog('✅ Google Provider 已配置');

// 偵錯訊息：顯示關鍵資訊
devLog('🔗 Auth Domain:', firebaseConfig.authDomain);
devLog('🌐 當前網域:', window.location.hostname);
devLog('📍 當前 URL:', window.location.href);