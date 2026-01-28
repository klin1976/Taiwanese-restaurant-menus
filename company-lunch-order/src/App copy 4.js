// src/App.js
import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Header from './components/Header';
import StoreCardList from './components/StoreCardList';
import MobileOptimizedMenu from './components/MobileOptimizedMenu';
import OrderHistory from './components/OrderHistory';
import OrderStatusManager from './components/OrderStatusManager';
import RoleManagement from './components/RoleManagement';
import OrderStatistics from './components/admin/OrderStatistics';
import FixUserRoles from './components/admin/FixUserRoles';
import InitSuperAdmin from './components/InitSuperAdmin';
import { initializeStores } from './utils/initializeStores';
import { createOrder } from './services/orderService';

// 檢測是否為手機設備
const isMobile = () => {
  return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// 主要應用程式內容
const AppContent = () => {
  const { currentUser, loading, loginStatusMessage, isAdmin, isSuperAdmin } = useAuth();
  const [currentView, setCurrentView] = useState('home');
  const [selectedStore, setSelectedStore] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [dataInitialized, setDataInitialized] = useState(false);
  const [showStatusManager, setShowStatusManager] = useState(false);
  const [initializingData, setInitializingData] = useState(false);

  // 初始化店家資料
  useEffect(() => {
    const initData = async () => {
      if (currentUser && !dataInitialized && !initializingData) {
        try {
          setInitializingData(true);
          console.log('開始初始化店家資料...');
          await initializeStores();
          setDataInitialized(true);
          console.log('店家資料初始化完成');
        } catch (error) {
          console.error('初始化資料失敗:', error);
          setDataInitialized(true);
        } finally {
          setInitializingData(false);
        }
      }
    };

    initData();
  }, [currentUser, dataInitialized, initializingData]);

  // ✅ 改進載入中畫面，顯示登入狀態訊息
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-6 text-gray-600 font-medium text-lg">
            {loginStatusMessage || '載入中...'}
          </p>
          {loginStatusMessage && (
            <p className="mt-2 text-gray-500 text-sm">
              請稍候，這可能需要幾秒鐘
            </p>
          )}
        </div>
      </div>
    );
  }

  // 未登入顯示登入頁面
  if (!currentUser) {
    return <Login />;
  }

  // 處理店家選擇
  const handleStoreSelect = (store) => {
    setSelectedStore(store);
    setCurrentView('menu');
  };

  // 處理訂單完成
  const handleOrderComplete = async (orderData) => {
    try {
      await createOrder(orderData);
      alert('訂單送出成功！');
      setCurrentView('orders');
    } catch (error) {
      console.error('建立訂單失敗:', error);
      alert('訂單送出失敗，請稍後再試');
    }
  };

  // 處理訂單狀態更新
  const handleOrderStatusUpdate = (updatedOrder) => {
    setSelectedOrder(updatedOrder);
  };

  // 返回首頁
  const goHome = () => {
    setCurrentView('home');
    setSelectedStore(null);
    setSelectedOrder(null);
  };

  // 顯示菜單頁面
  if (currentView === 'menu' && selectedStore) {
    const MenuComponent = isMobile() ? MobileOptimizedMenu : MobileOptimizedMenu;
    return (
      <MenuComponent
        store={selectedStore}
        onBack={() => setCurrentView(selectedStore.type === 'lunch' ? 'lunch' : 'drinks')}
        onOrderComplete={handleOrderComplete}
      />
    );
  }

  // 顯示訂單歷史頁面
  if (currentView === 'orders') {
    return (
      <>
        <OrderHistory 
          onBack={goHome}
          onOrderSelect={(order) => {
            setSelectedOrder(order);
            setShowStatusManager(true);
          }}
        />
        {showStatusManager && selectedOrder && (
          <OrderStatusManager
            order={selectedOrder}
            onStatusUpdate={handleOrderStatusUpdate}
            onClose={() => setShowStatusManager(false)}
          />
        )}
      </>
    );
  }

  // 顯示角色管理頁面
  if (currentView === 'roleManagement') {
    return <RoleManagement onBack={goHome} />;
  }

  // 顯示訂單統計頁面
  if (currentView === 'orderStatistics') {
    return <OrderStatistics onBack={goHome} />;
  }

  // 顯示批次修復工具頁面
  if (currentView === 'fixUserRoles') {
    return <FixUserRoles onBack={goHome} />;
  }

  // 主要內容
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50">
      <Header onNavigate={setCurrentView} />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        
        {/* 導航麵包屑 */}
        {currentView !== 'home' && (
          <nav className="mb-6">
            <button
              onClick={goHome}
              className="flex items-center text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              回到首頁
            </button>
            <span className="text-gray-400 mx-2">/</span>
            <span className="text-gray-700 font-medium">
              {currentView === 'lunch' ? '午餐訂購' : '飲料訂購'}
            </span>
          </nav>
        )}

        {currentView === 'home' && (
          <>
            {/* 歡迎區塊 */}
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="mb-4 md:mb-0">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    歡迎，{currentUser.displayName}！
                  </h2>
                  <p className="text-gray-600 text-lg">
                    準備好訂購今天的午餐了嗎？選擇你喜歡的店家和餐點吧！
                  </p>
                </div>
                
                {/* 資料初始化狀態 */}
                {initializingData && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mr-3"></div>
                      <span className="text-indigo-800 text-sm font-medium">正在初始化店家資料...</span>
                    </div>
                  </div>
                )}
                
                {dataInitialized && !initializingData && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-green-800 text-sm font-medium">系統準備完成</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 功能卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {/* 午餐訂購卡片 */}
              <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
                  <div className="text-4xl mb-3">🍱</div>
                  <h3 className="text-xl font-bold mb-2">午餐訂購</h3>
                  <p className="text-blue-100">選擇你喜歡的便當店和餐點</p>
                </div>
                <div className="p-6">
                  <button 
                    onClick={() => setCurrentView('lunch')}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
                  >
                    開始訂購
                  </button>
                </div>
              </div>

              {/* 飲料訂購卡片 */}
              <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
                  <div className="text-4xl mb-3">🧋</div>
                  <h3 className="text-xl font-bold mb-2">飲料訂購</h3>
                  <p className="text-green-100">選擇你喜歡的飲料店和飲品</p>
                </div>
                <div className="p-6">
                  <button 
                    onClick={() => setCurrentView('drinks')}
                    className="w-full bg-green-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-green-700 transition-colors"
                  >
                    開始訂購
                  </button>
                </div>
              </div>

              {/* 訂單記錄卡片 */}
              <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden md:col-span-2 lg:col-span-1">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 text-white">
                  <div className="text-4xl mb-3">📋</div>
                  <h3 className="text-xl font-bold mb-2">訂單記錄</h3>
                  <p className="text-purple-100">查看你的訂單歷史和狀態</p>
                </div>
                <div className="p-6">
                  <button 
                    onClick={() => setCurrentView('orders')}
                    className="w-full bg-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors"
                  >
                    查看記錄
                  </button>
                </div>
              </div>

              {/* 訂單統計卡片（僅管理員可見） */}
              {(isAdmin() || isSuperAdmin()) && (
                <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-white">
                    <div className="text-4xl mb-3">📊</div>
                    <h3 className="text-xl font-bold mb-2">訂單統計</h3>
                    <p className="text-orange-100">查看店家營業統計和報表</p>
                  </div>
                  <div className="p-6">
                    <button 
                      onClick={() => setCurrentView('orderStatistics')}
                      className="w-full bg-orange-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-orange-700 transition-colors"
                    >
                      查看統計
                    </button>
                  </div>
                </div>
              )}

              {/* 批次修復工具卡片（僅超級管理員可見） */}
              {isSuperAdmin() && (
                <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-red-100 overflow-hidden">
<div className="bg-gradient-to-r from-red-500 to-pink-600 p-6 text-white">
<div className="text-4xl mb-3">🔧</div>
<h3 className="text-xl font-bold mb-2">批次修復工具</h3>
<p className="text-red-100">修復缺少角色記錄的使用者</p>
</div>
<div className="p-6">
<button
onClick={() => setCurrentView('fixUserRoles')}
className="w-full bg-red-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-red-700 transition-colors"
>
開啟工具
</button>
</div>
</div>
)}
</div>
{/* 今日推薦 */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border border-gray-100">
          <div className="flex items-center mb-6">
            <div className="text-3xl mr-3">⭐</div>
            <h3 className="text-2xl font-bold text-gray-900">今日推薦</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-100 p-6 rounded-xl border border-blue-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-bold text-blue-900">富家小鋪</h4>
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">熱門</span>
              </div>
              <p className="text-blue-700 font-semibold mb-2">香爆牛肉蓋飯 - NT$90</p>
              <p className="text-blue-600 text-sm">經典台式風味，香嫩多汁</p>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-emerald-100 p-6 rounded-xl border border-green-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-bold text-green-900">MACU 果粒茶</h4>
                <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">推薦</span>
              </div>
              <p className="text-green-700 font-semibold mb-2">香橙果粒茶 - NT$75</p>
              <p className="text-green-600 text-sm">新鮮果粒，清香回甘</p>
            </div>
          </div>
        </div>

        {/* 系統統計 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
            <div className="text-2xl font-bold text-indigo-600">7+</div>
            <div className="text-sm text-gray-600">合作店家</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
            <div className="text-2xl font-bold text-green-600">50+</div>
            <div className="text-sm text-gray-600">精選商品</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
            <div className="text-2xl font-bold text-purple-600">15-30</div>
            <div className="text-sm text-gray-600">分鐘送達</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
            <div className="text-2xl font-bold text-orange-600">4.5★</div>
            <div className="text-sm text-gray-600">平均評分</div>
          </div>
        </div>
      </>
    )}

    {/* 店家列表頁面 */}
    {(currentView === 'lunch' || currentView === 'drinks') && (
      <div>
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            {currentView === 'lunch' ? '午餐店家' : '飲料店家'}
          </h2>
          <p className="text-gray-600 text-lg">
            選擇你想訂購的{currentView === 'lunch' ? '午餐' : '飲料'}店家
          </p>
        </div>
        <StoreCardList type={currentView} onStoreSelect={handleStoreSelect} />
      </div>
    )}

  </main>

  {/* 超級管理員初始化工具（僅開發模式） */}
  {process.env.NODE_ENV === 'development' && currentUser && <InitSuperAdmin />}
</div>
);
};
// 主要 App 元件
const App = () => {
return (
<AuthProvider>
<AppContent />
</AuthProvider>
);
};
export default App;