// src/components/StoreMenu.js
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const StoreMenu = ({ store, onBack, onOrderComplete }) => {
  const { currentUser } = useAuth();
  const [cart, setCart] = useState({});
  const [activeCategory, setActiveCategory] = useState(store.categories[0]?.id);
  const [isOrdering, setIsOrdering] = useState(false);

  // 加入購物車
  const addToCart = (item) => {
    setCart(prev => ({
      ...prev,
      [item.id]: {
        ...item,
        quantity: (prev[item.id]?.quantity || 0) + 1
      }
    }));
  };

  // 減少購物車商品
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

  // 計算總價
  const getTotalPrice = () => {
    return Object.values(cart).reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  };

  // 取得購物車商品總數
  const getCartItemCount = () => {
    return Object.values(cart).reduce((total, item) => total + item.quantity, 0);
  };

  // 送出訂單
  const submitOrder = async () => {
    if (Object.keys(cart).length === 0) {
      alert('請選擇要訂購的商品');
      return;
    }

    setIsOrdering(true);
    try {
      const orderData = {
        userId: currentUser.uid,
        userName: currentUser.displayName,
        userEmail: currentUser.email,
        storeId: store.id,
        storeName: store.name,
        storeType: store.type,
        items: Object.values(cart),
        totalPrice: getTotalPrice(),
        totalQuantity: getCartItemCount(),
        status: 'pending', // pending, confirmed, preparing, ready, completed, cancelled
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 這裡之後會加上儲存到 Firestore 的程式碼
      console.log('訂單資料:', orderData);
      
      // 模擬 API 呼叫
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('訂單送出成功！');
      setCart({});
      
      if (onOrderComplete) {
        onOrderComplete(orderData);
      }
      
    } catch (error) {
      console.error('送出訂單錯誤:', error);
      alert('送出訂單失敗，請稍後再試');
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 店家標頭 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="mr-4 text-gray-600 hover:text-gray-800"
              >
                ← 返回
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{store.name}</h1>
                <div className="flex items-center mt-1 text-sm text-gray-600">
                  {store.phone && <span className="mr-4">📞 {store.phone}</span>}
                  {store.hours && <span>🕒 {store.hours}</span>}
                </div>
              </div>
            </div>
            
            {/* 購物車摘要 */}
            {getCartItemCount() > 0 && (
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    {getCartItemCount()} 項商品
                  </div>
                  <div className="text-lg font-semibold text-blue-600">
                    NT$ {getTotalPrice()}
                  </div>
                </div>
                <button
                  onClick={submitOrder}
                  disabled={isOrdering}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition duration-150"
                >
                  {isOrdering ? '處理中...' : '送出訂單'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* 分類選單 - 左側 */}
          <div className="lg:w-64">
            <div className="bg-white rounded-lg shadow-sm p-4 sticky top-6">
              <h3 className="font-semibold text-gray-900 mb-3">商品分類</h3>
              <nav className="space-y-1">
                {store.categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition duration-150 ${
                      activeCategory === category.id
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {category.name} ({category.items.length})
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* 商品列表 - 右側 */}
          <div className="flex-1">
            {store.categories
              .filter(category => category.id === activeCategory)
              .map((category) => (
                <div key={category.id} className="bg-white rounded-lg shadow-sm">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {category.name}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {category.items.length} 項商品
                    </p>
                  </div>
                  
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {category.items.map((item) => (
                        <div
                          key={item.id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition duration-150"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 mb-1">
                                {item.name}
                              </h4>
                              <p className="text-lg font-semibold text-blue-600">
                                NT$ {item.price}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            {cart[item.id] ? (
                              <div className="flex items-center space-x-3">
                                <button
                                  onClick={() => removeFromCart(item.id)}
                                  className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 flex items-center justify-center"
                                >
                                  -
                                </button>
                                <span className="font-medium">
                                  {cart[item.id].quantity}
                                </span>
                                <button
                                  onClick={() => addToCart(item)}
                                  className="w-8 h-8 rounded-full bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart(item)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-150"
                              >
                                加入購物車
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* 底部購物車摘要 (手機版) */}
      {getCartItemCount() > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">
                {getCartItemCount()} 項商品
              </div>
              <div className="text-lg font-semibold text-blue-600">
                NT$ {getTotalPrice()}
              </div>
            </div>
            <button
              onClick={submitOrder}
              disabled={isOrdering}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition duration-150"
            >
              {isOrdering ? '處理中...' : '送出訂單'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreMenu;