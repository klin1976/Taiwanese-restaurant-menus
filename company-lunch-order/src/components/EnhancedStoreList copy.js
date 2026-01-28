// src/components/EnhancedStoreList.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { isStoreOpen } from '../utils/initializeStores';
import { useAuth } from '../contexts/AuthContext';
import { createOrder } from '../services/orderService';

const EnhancedStoreList = ({ type, onStoreSelect }) => {
  const { currentUser } = useAuth();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState(null);
  const [cart, setCart] = useState({});
  const [showCart, setShowCart] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [customization, setCustomization] = useState({
    sweetness: '正常',
    ice: '正常冰',
    toppings: []
  });

  // 判斷是否為飲料店
  const isDrinkStore = type === 'drinks';

  // 加料選項
  const toppingOptions = [
    { id: 'boba', name: '波霸', price: 10 },
    { id: 'qq', name: '雙Q果', price: 10 },
    { id: 'jelly', name: '檸檬凍', price: 10 },
    { id: 'pudding', name: '布丁', price: 10 },
    { id: 'cheese', name: '芝芝', price: 20 }
  ];

  const sweetnessOptions = ['正常', '少糖', '半糖', '微糖', '無糖'];
  const iceOptions = ['正常冰', '少冰', '微冰', '去冰', '溫', '熱'];

  useEffect(() => {
    fetchStores();
  }, [type]);

  const fetchStores = async () => {
    try {
      setLoading(true);
      console.log('正在載入店家資料，類型:', type);
      
      // 方法1: 從 Firestore 讀取（如果資料已初始化）
      try {
        const storesCollection = collection(db, 'stores', type, 'list');
        const storesSnapshot = await getDocs(storesCollection);
        
        if (!storesSnapshot.empty) {
          const storesList = storesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            type: type
          }));
          console.log(`從 Firestore 載入 ${storesList.length} 家店家`);
          setStores(storesList);
          setLoading(false);
          return;
        }
      } catch (firestoreError) {
        console.warn('從 Firestore 讀取失敗，使用本地資料:', firestoreError);
      }

      // 方法2: 使用本地資料（備用方案）
      const { getStores } = await import('../utils/initializeStores');
      const localStores = await getStores(type);
      console.log(`使用本地資料，載入 ${localStores.length} 家店家`);
      setStores(localStores);
      
    } catch (error) {
      console.error('獲取店家資料失敗:', error);
      alert('載入店家資料失敗，請重新整理頁面');
    } finally {
      setLoading(false);
    }
  };

  // 開啟客製化選單
  const openCustomization = (item, store) => {
    if (!isStoreOpen(store.hours)) {
      alert('店家目前休息中，無法下訂');
      return;
    }

    setSelectedStore(store);
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
    if (!selectedItem || !selectedStore) return;

    const itemId = `${selectedStore.id}_${selectedItem.id}_${Date.now()}`;
    const finalPrice = selectedItem.price + getToppingPrice();
    
    setCart(prev => ({
      ...prev,
      [itemId]: {
        ...selectedItem,
        id: itemId,
        originalId: selectedItem.id,
        storeId: selectedStore.id,
        storeName: selectedStore.name,
        quantity: 1,
        finalPrice: finalPrice,
        customization: { ...customization }
      }
    }));

    closeCustomization();
    alert('已加入購物車！');
  };

  // 直接加入購物車（午餐類）
  const addToCart = (item, store) => {
    if (!isStoreOpen(store.hours)) {
      alert('店家目前休息中，無法下訂');
      return;
    }

    // 如果是飲料店，開啟客製化選單
    if (isDrinkStore) {
      openCustomization(item, store);
      return;
    }

    // 午餐類直接加入
    const itemKey = `${store.id}_${item.id}`;
    setCart(prev => {
      const existingItem = prev[itemKey];
      if (existingItem) {
        return {
          ...prev,
          [itemKey]: {
            ...existingItem,
            quantity: existingItem.quantity + 1
          }
        };
      } else {
        return {
          ...prev,
          [itemKey]: {
            ...item,
            id: itemKey,
            originalId: item.id,
            storeId: store.id,
            storeName: store.name,
            quantity: 1
          }
        };
      }
    });
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

  // 按店家分組購物車項目
  const groupCartByStore = () => {
    const grouped = {};
    Object.values(cart).forEach(item => {
      if (!grouped[item.storeId]) {
        grouped[item.storeId] = {
          storeName: item.storeName,
          items: []
        };
      }
      grouped[item.storeId].items.push(item);
    });
    return grouped;
  };

  // 提交訂單
  const submitOrder = async () => {
    if (Object.keys(cart).length === 0) {
      alert('購物車是空的');
      return;
    }

    if (!currentUser) {
      alert('請先登入');
      return;
    }

    setIsOrdering(true);

    try {
      const groupedCart = groupCartByStore();
      const orderPromises = [];

      // 為每個店家建立一個訂單
      for (const [storeId, storeData] of Object.entries(groupedCart)) {
        const store = stores.find(s => s.id === storeId);
        if (!store) continue;

        const orderData = {
          userId: currentUser.uid,
          userName: currentUser.displayName || currentUser.email,
          userEmail: currentUser.email,
          restaurantId: storeId,
          restaurantName: storeData.storeName,
          items: storeData.items.map(item => ({
            id: item.originalId || item.id,
            name: item.name,
            price: item.finalPrice || item.price,
            quantity: item.quantity,
            customization: item.customization || null
          })),
          totalAmount: storeData.items.reduce((sum, item) => {
            const itemPrice = item.finalPrice || item.price;
            return sum + (itemPrice * item.quantity);
          }, 0),
          status: 'pending'
        };

        orderPromises.push(createOrder(orderData));
      }

      await Promise.all(orderPromises);
      
      alert(`成功建立 ${orderPromises.length} 筆訂單！`);
      setCart({});
      setShowCart(false);

    } catch (error) {
      console.error('建立訂單失敗:', error);
      alert(`建立訂單失敗：${error.message}`);
    } finally {
      setIsOrdering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* 購物車浮動按鈕 */}
      {getCartItemCount() > 0 && (
        <div className="fixed bottom-8 right-8 z-40">
          <button
            onClick={() => setShowCart(true)}
            className="bg-indigo-600 text-white px-6 py-4 rounded-full shadow-2xl hover:bg-indigo-700 transition-all flex items-center space-x-3 group"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5H17M13 13v6a2 2 0 11-4 0v-6m4 0V9a2 2 0 10-4 0v4.01" />
            </svg>
            <div>
              <div className="font-bold">{getCartItemCount()} 項商品</div>
              <div className="text-sm">NT$ {getTotalPrice()}</div>
            </div>
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
              {getCartItemCount()}
            </span>
          </button>
        </div>
      )}

      {/* 店家列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stores.map((store) => {
          const storeOpen = isStoreOpen(store.hours);
          
          return (
            <div key={store.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
              {/* 店家標頭 */}
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-6 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2">{store.name}</h3>
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${storeOpen ? 'bg-green-300' : 'bg-red-300'}`}></div>
                        <span>{storeOpen ? '營業中' : '休息中'}</span>
                      </div>
                      <span>⏱ {store.deliveryTime || '30分鐘'}</span>
                    </div>
                    {store.rating && (
                      <div className="mt-2 flex items-center">
                        <span className="text-yellow-300 mr-1">★</span>
                        <span className="font-medium">{store.rating}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 商品列表 */}
              <div className="p-6">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {store.categories?.map((category) => (
                    <div key={category.id}>
                      <h4 className="font-bold text-gray-800 mb-2 sticky top-0 bg-white py-1">
                        {category.name}
                      </h4>
                      {category.items?.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <span className="font-medium text-gray-800">{item.name}</span>
                              {item.popular && (
                                <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full font-medium">
                                  熱門
                                </span>
                              )}
                            </div>
                            <p className="text-indigo-600 font-bold">NT$ {item.price}</p>
                          </div>
                          
                          <button
                            onClick={() => addToCart(item, store)}
                            disabled={!storeOpen}
                            className={`ml-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              storeOpen
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            {isDrinkStore ? '選購' : '加入'}
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 客製化選單彈窗 */}
      {showCustomization && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-6 border-b border-gray-200 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedItem.name}</h3>
                  <p className="text-indigo-600 font-bold mt-1">NT$ {selectedItem.price}</p>
                </div>
                <button
                  onClick={closeCustomization}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* 甜度選擇 */}
              <div className="mb-8">
                <h4 className="text-lg font-bold mb-4 text-gray-900">甜度</h4>
                <div className="grid grid-cols-5 gap-3">
                  {sweetnessOptions.map(level => (
                    <label 
                      key={level} 
                      className={`flex items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        customization.sweetness === level 
                          ? 'border-indigo-600 bg-indigo-50 shadow-md' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="sweetness" 
                        value={level}
                        checked={customization.sweetness === level}
                        onChange={(e) => setCustomization({...customization, sweetness: e.target.value})}
                        className="hidden"
                      />
                      <span className={`font-medium ${
                        customization.sweetness === level ? 'text-indigo-700' : 'text-gray-700'
                      }`}>{level}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 冰塊選擇 */}
              <div className="mb-8">
                <h4 className="text-lg font-bold mb-4 text-gray-900">冰塊</h4>
                <div className="grid grid-cols-6 gap-3">
                  {iceOptions.map(level => (
                    <label 
                      key={level} 
                      className={`flex items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        customization.ice === level 
                          ? 'border-indigo-600 bg-indigo-50 shadow-md' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="ice" 
                        value={level}
                        checked={customization.ice === level}
                        onChange={(e) => setCustomization({...customization, ice: e.target.value})}
                        className="hidden"
                      />
                      <span className={`font-medium ${
                        customization.ice === level ? 'text-indigo-700' : 'text-gray-700'
                      }`}>{level}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 加料選擇 */}
              <div className="mb-8">
                <h4 className="text-lg font-bold mb-4 text-gray-900">加料 (+$10-20)</h4>
                <div className="grid grid-cols-2 gap-3">
                  {toppingOptions.map(topping => {
                    const isSelected = customization.toppings.find(t => t.id === topping.id);
                    return (
                      <label 
                        key={topping.id} 
                        className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-indigo-600 bg-indigo-50 shadow-md' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center">
                          <input 
                            type="checkbox" 
                            checked={!!isSelected}
                            onChange={() => toggleTopping(topping)}
                            className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          <span className={`ml-3 font-medium ${
                            isSelected ? 'text-indigo-700' : 'text-gray-700'
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
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold text-lg transition-colors shadow-lg"
              >
                加入購物車 - NT$ {selectedItem.price + getToppingPrice()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 購物車彈窗 */}
      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">購物車</h3>
                <button
                  onClick={() => setShowCart(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 max-h-96 overflow-y-auto">
              {Object.entries(groupCartByStore()).map(([storeId, storeData]) => (
                <div key={storeId} className="mb-6 last:mb-0">
                  <h4 className="font-bold text-lg text-gray-900 mb-3 pb-2 border-b-2 border-indigo-200">
                    {storeData.storeName}
                  </h4>
                  {storeData.items.map((item) => (
                    <div key={item.id} className="py-3 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">{item.name}</h5>
                          <p className="text-indigo-600 font-bold mt-1">NT$ {item.finalPrice || item.price}</p>
                          {item.customization && (
                            <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                              <p>🍬 甜度: {item.customization.sweetness} | 🧊 冰塊: {item.customization.ice}</p>
                              {item.customization.toppings.length > 0 && (
                                <p className="mt-1">➕ 加料: {item.customization.toppings.map(t => t.name).join('、')}</p>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-3 ml-4">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 flex items-center justify-center font-bold"
                          >
                            -
                          </button>
                          <span className="font-medium min-w-[30px] text-center">{item.quantity}</span>
                          <button
                            onClick={() => {
                              const updatedCart = {...cart};
                              updatedCart[item.id].quantity += 1;
                              setCart(updatedCart);
                            }}
                            className="w-8 h-8 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 flex items-center justify-center font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xl font-bold">總計</span>
                <span className="text-2xl font-bold text-indigo-600">NT$ {getTotalPrice()}</span>
              </div>
              
              <button
                onClick={submitOrder}
                disabled={isOrdering}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-colors ${
                  isOrdering
                    ? 'bg-gray-300 text-gray-500'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg'
                }`}
              >
                {isOrdering ? '處理中...' : '確認訂單'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedStoreList;

// ====================================
// 檔案位置：src/services/orderService.js
// ====================================