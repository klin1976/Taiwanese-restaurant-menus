// src/components/MobileOptimizedMenu.js
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createOrder } from '../services/orderService';
import { isStoreOpen } from '../utils/initializeStores';

const MobileOptimizedMenu = ({ store, onBack, onOrderComplete }) => {
  const { currentUser } = useAuth();
  const [cart, setCart] = useState({});
  const [activeCategory, setActiveCategory] = useState(store.categories[0]?.id);
  const [isOrdering, setIsOrdering] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [customization, setCustomization] = useState({
    sweetness: '正常',
    ice: '正常冰',
    toppings: []
  });

  const storeIsOpen = isStoreOpen(store);

  // 判斷是否為飲料店
  const isDrinkStore = store.type === 'drinks';

  // 加料選項
  const toppingOptions = [
    { id: 'boba', name: '波霸', price: 10 },
    { id: 'qq', name: '雙Q果', price: 10 },
    { id: 'jelly', name: '檸檬凍', price: 10 },
    { id: 'pudding', name: '布丁', price: 10 },
    { id: 'cheese', name: '芝芝', price: 20 }
  ];

  // 甜度選項
  const sweetnessOptions = ['正常', '少糖', '半糖', '微糖', '無糖'];

  // 冰塊選項
  const iceOptions = ['正常冰', '少冰', '微冰', '去冰', '溫', '熱'];

  // 開啟客製化選單
  const openCustomization = (item) => {
    if (!storeIsOpen) {
      alert('店家目前休息中，無法下訂');
      return;
    }

    setSelectedItem(item);
    setCustomization({
      sweetness: '正常',
      ice: '正常冰',
      toppings: []
    });
    setShowCustomization(true);
  };

  // 關閉客製化選單
  const closeCustomization = () => {
    setShowCustomization(false);
    setSelectedItem(null);
  };

  // 切換加料選項
  const toggleTopping = (topping) => {
    setCustomization(prev => {
      const exists = prev.toppings.find(t => t.id === topping.id);
      if (exists) {
        return {
          ...prev,
          toppings: prev.toppings.filter(t => t.id !== topping.id)
        };
      } else {
        return {
          ...prev,
          toppings: [...prev.toppings, topping]
        };
      }
    });
  };

  // 計算加料總價
  const getToppingPrice = () => {
    return customization.toppings.reduce((sum, t) => sum + t.price, 0);
  };

  // 加入購物車（含客製化）
  const addToCartWithCustomization = () => {
    if (!selectedItem) return;

    const itemId = `${selectedItem.id}_${Date.now()}`;
    const finalPrice = selectedItem.price + getToppingPrice();

    setCart(prev => ({
      ...prev,
      [itemId]: {
        ...selectedItem,
        id: itemId,
        originalId: selectedItem.id,
        quantity: 1,
        finalPrice: finalPrice,
        customization: { ...customization }
      }
    }));

    closeCustomization();
    alert('已加入購物車！');
  };

  // 直接加入購物車（午餐類）
  const addToCart = (item) => {
    if (!storeIsOpen) {
      alert('店家目前休息中，無法下訂');
      return;
    }

    // 如果是飲料店，開啟客製化選單
    if (isDrinkStore) {
      openCustomization(item);
      return;
    }

    // 午餐類直接加入
    setCart(prev => ({
      ...prev,
      [item.id]: {
        ...item,
        quantity: (prev[item.id]?.quantity || 0) + 1
      }
    }));
  };

  const removeFromCart = (itemId) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[itemId]?.quantity > 1) {
        newCart[itemId].quantity -= 1;
      } else {
        delete newCart[itemId];
      }
      return newCart;
    });
  };

  const getTotalPrice = () => {
    return Object.values(cart).reduce((total, item) => {
      const itemPrice = item.finalPrice || item.price;
      return total + (itemPrice * item.quantity);
    }, 0);
  };

  const getCartItemCount = () => {
    return Object.values(cart).reduce((total, item) => total + item.quantity, 0);
  };

  const checkMinOrder = () => {
    const total = getTotalPrice();
    const minOrder = store.minOrder || 0;
    return minOrder === 0 || total >= minOrder;
  };

  // 提交訂單
  const submitOrder = async () => {
    console.log('=== 訂單建立除錯 ===');
    console.log('1. 使用者資訊:', {
      uid: currentUser?.uid,
      displayName: currentUser?.displayName,
      email: currentUser?.email
    });
    console.log('2. 餐廳資訊:', {
      id: store?.id,
      name: store?.name,
      type: store?.type
    });
    console.log('3. 購物車內容:', cart);

    if (Object.keys(cart).length === 0) {
      alert('請選擇要訂購的商品');
      return;
    }

    if (!checkMinOrder()) {
      alert(`最低消費金額為 NT$${store.minOrder || 0}`);
      return;
    }

    if (!currentUser) {
      alert('請先登入');
      return;
    }

    if (!store || !store.id) {
      alert('餐廳資料錯誤');
      console.error('餐廳資料異常:', store);
      return;
    }

    setIsOrdering(true);
    try {
      const orderData = {
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email,
        userEmail: currentUser.email,
        restaurantId: store.id,
        restaurantName: store.name,
        storeType: store.type, // 用於定位店家庫存文件
        items: Object.values(cart).map(item => ({
          id: item.originalId || item.id,
          name: item.name,
          price: item.finalPrice || item.price,
          quantity: item.quantity,
          customization: item.customization || null
        })),
        totalAmount: getTotalPrice(),
        status: 'pending'
      };

      console.log('準備送出的訂單資料:', orderData);

      const { id: orderId, orderNumber } = await createOrder(orderData);

      console.log('訂單建立成功，ID:', orderId, 'No:', orderNumber);
      alert(`訂單送出成功！ (單號: ${orderNumber})`);

      setCart({});
      setShowCart(false);

      if (onOrderComplete) {
        onOrderComplete(orderData);
      }

    } catch (error) {
      console.error('送出訂單錯誤:', error);
      alert(`送出訂單失敗：${error.message}`);
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-20 transition-colors duration-200" >
      {/* 固定標頭 */}
      < div className="sticky top-0 bg-white dark:bg-slate-800 shadow-sm z-40 border-b border-gray-200 dark:border-slate-700 transition-colors duration-200" >
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="p-2 -ml-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex-1 mx-3">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">{store.name}</h1>
              <div className="flex items-center mt-1">
                <div className={`w-2 h-2 rounded-full mr-2 ${storeIsOpen ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {storeIsOpen ? '營業中' : '休息中'} • {store.deliveryTime || '30分鐘'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowCart(true)}
              className="relative p-2 -mr-2"
            >
              <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5H17M13 13v6a2 2 0 11-4 0v-6m4 0V9a2 2 0 10-4 0v4.01" />
              </svg>
              {getCartItemCount() > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {getCartItemCount()}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 分類選單 - 水平滾動 */}
        <div className="px-4 pb-3 overflow-x-auto" >
          <div className="flex space-x-2">
            {store.categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeCategory === category.id
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
                  }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div >
      </div >

      {/* 店家警告（如果休息中） */}
      {
        !storeIsOpen && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm font-medium">店家目前休息中，無法下訂</p>
          </div>
        )
      }

      {/* 商品列表 */}
      <div className="px-4 py-4">
        {store.categories
          .filter(category => category.id === activeCategory)
          .map((category) => (
            <div key={category.id} className="space-y-3">
              {category.items.map((item) => (
                <div key={item.id} className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-slate-700 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 pr-4">
                      <div className="flex items-center mb-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">{item.name}</h4>
                        {item.popular && (
                          <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full font-medium">
                            熱門
                          </span>
                        )}
                      </div>
                      <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">NT$ {item.price}</p>
                    </div>

                    <div className="flex-shrink-0">
                      <button
                        onClick={() => addToCart(item)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${storeIsOpen
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                          : 'bg-gray-300 dark:bg-slate-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                          }`}
                        disabled={!storeIsOpen}
                      >
                        {isDrinkStore ? '選購' : '加入'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
      </div>

      {/* 客製化選單彈窗（飲料專用） */}
      {
        showCustomization && selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
            <div className="bg-white dark:bg-slate-800 w-full max-h-[90vh] rounded-t-2xl overflow-y-auto transition-colors">
              <div className="sticky top-0 bg-white dark:bg-slate-800 p-4 border-b border-gray-200 dark:border-slate-700 z-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedItem.name}</h3>
                  <button
                    onClick={closeCustomization}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 dark:text-gray-400 rounded-full"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-4">
                {/* 甜度選擇 */}
                <div className="mb-6">
                  <h4 className="font-medium mb-3 text-gray-900">甜度</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {sweetnessOptions.map(level => (
                      <label
                        key={level}
                        className={`flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${customization.sweetness === level
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <input
                          type="radio"
                          name="sweetness"
                          value={level}
                          checked={customization.sweetness === level}
                          onChange={(e) => setCustomization({ ...customization, sweetness: e.target.value })}
                          className="hidden"
                        />
                        <span className={`text-sm font-medium ${customization.sweetness === level ? 'text-indigo-700' : 'text-gray-700'
                          }`}>{level}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 冰塊選擇 */}
                <div className="mb-6">
                  <h4 className="font-medium mb-3 text-gray-900">冰塊</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {iceOptions.map(level => (
                      <label
                        key={level}
                        className={`flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${customization.ice === level
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <input
                          type="radio"
                          name="ice"
                          value={level}
                          checked={customization.ice === level}
                          onChange={(e) => setCustomization({ ...customization, ice: e.target.value })}
                          className="hidden"
                        />
                        <span className={`text-sm font-medium ${customization.ice === level ? 'text-indigo-700' : 'text-gray-700'
                          }`}>{level}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 加料選擇 */}
                <div className="mb-6">
                  <h4 className="font-medium mb-3 text-gray-900">加料 (+$10-20)</h4>
                  <div className="space-y-2">
                    {toppingOptions.map(topping => {
                      const isSelected = customization.toppings.find(t => t.id === topping.id);
                      return (
                        <label
                          key={topping.id}
                          className={`flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer transition-colors ${isSelected
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={!!isSelected}
                              onChange={() => toggleTopping(topping)}
                              className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <span className={`ml-3 font-medium ${isSelected ? 'text-indigo-700' : 'text-gray-700'
                              }`}>{topping.name}</span>
                          </div>
                          <span className="font-bold text-indigo-600">+${topping.price}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 確認按鈕 */}
                <button
                  onClick={addToCartWithCustomization}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-medium text-lg transition-colors"
                >
                  加入購物車 - NT$ {selectedItem.price + getToppingPrice()}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* 底部購物車按鈕 */}
      {
        getCartItemCount() > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 p-4 z-50 transition-colors">
            <button
              onClick={() => setShowCart(true)}
              className="w-full bg-indigo-600 text-white py-4 rounded-xl font-medium text-lg hover:bg-indigo-700 transition-colors flex items-center justify-between"
              disabled={isOrdering}
            >
              <span>查看購物車 ({getCartItemCount()})</span>
              <span>NT$ {getTotalPrice()}</span>
            </button>
          </div>
        )
      }

      {/* 購物車彈窗 */}
      {
        showCart && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
            <div className="bg-white dark:bg-slate-800 w-full max-h-[80vh] rounded-t-2xl transition-colors">
              <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">購物車</h3>
                  <button
                    onClick={() => setShowCart(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 dark:text-gray-400 rounded-full"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-4 max-h-96 overflow-y-auto">
                {Object.values(cart).map((item) => (
                  <div key={item.id} className="py-3 border-b border-gray-100 dark:border-slate-700 last:border-b-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">{item.name}</h4>
                        <p className="text-indigo-600 dark:text-indigo-400 font-bold">NT$ {item.finalPrice || item.price}</p>
                        {item.customization && (
                          <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                            <p>甜度: {item.customization.sweetness} | 冰塊: {item.customization.ice}</p>
                            {item.customization.toppings.length > 0 && (
                              <p>加料: {item.customization.toppings.map(t => t.name).join('、')}</p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-3 ml-4">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="font-medium">{item.quantity}</span>
                        <button
                          onClick={() => {
                            const updatedCart = { ...cart };
                            updatedCart[item.id].quantity += 1;
                            setCart(updatedCart);
                          }}
                          className="w-8 h-8 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">總計</span>
                  <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">NT$ {getTotalPrice()}</span>
                </div>

                <button
                  onClick={submitOrder}
                  disabled={isOrdering || !checkMinOrder() || !storeIsOpen}
                  className={`w-full py-3 rounded-xl font-medium text-lg transition-colors ${isOrdering || !checkMinOrder() || !storeIsOpen
                    ? 'bg-gray-300 text-gray-500'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                >
                  {isOrdering ? '處理中...' : '確認訂單'}
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default MobileOptimizedMenu;