// src/components/EnhancedStoreList.js
import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, ShoppingCart, Check, AlertCircle } from 'lucide-react';
import { getActiveTags, getTagColorClass } from '../utils/productTags';

const EnhancedStoreList = ({ store, items, onAddToCart, onBack }) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [showItemModal, setShowItemModal] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // 重置選擇
  const resetSelection = () => {
    setSelectedItem(null);
    setSelectedVariant(null);
    setSelectedOptions({});
    setQuantity(1);
    setGalleryIndex(0);
  };

  // 開啟商品詳情
  const handleItemClick = (item) => {
    setSelectedItem(item);

    // 如果有變體，預設選擇第一個可用的
    if (item.hasVariants && item.variants && item.variants.length > 0) {
      const defaultVariant = item.variants.find(v => v.available && v.isDefault) || 
                            item.variants.find(v => v.available);
      setSelectedVariant(defaultVariant);
    }

    // 如果有選項組，預設選擇所有預設選項
    if (item.hasOptions && item.optionGroups) {
      const defaultOptions = {};
      item.optionGroups.forEach(group => {
        if (group.type === 'single') {
          const defaultChoice = group.choices.find(c => c.isDefault && c.available);
          if (defaultChoice) {
            defaultOptions[group.id] = [defaultChoice.id];
          }
        } else {
          // 多選預設為空
          defaultOptions[group.id] = [];
        }
      });
      setSelectedOptions(defaultOptions);
    }

    setShowItemModal(true);
  };

  // 關閉商品詳情
  const handleCloseModal = () => {
    setShowItemModal(false);
    setTimeout(() => resetSelection(), 300);
  };

  // 選擇變體
  const handleSelectVariant = (variant) => {
    if (variant.available && (variant.stock === null || variant.stock > 0)) {
      setSelectedVariant(variant);
    }
  };

  // 選擇選項（單選）
  const handleSelectSingleOption = (groupId, choiceId) => {
    setSelectedOptions(prev => ({
      ...prev,
      [groupId]: [choiceId]
    }));
  };

  // 選擇選項（多選）
  const handleToggleMultipleOption = (groupId, choiceId, maxSelections) => {
    setSelectedOptions(prev => {
      const current = prev[groupId] || [];
      
      if (current.includes(choiceId)) {
        // 取消選擇
        return {
          ...prev,
          [groupId]: current.filter(id => id !== choiceId)
        };
      } else {
        // 新增選擇
        if (current.length >= maxSelections) {
          alert(`最多只能選擇 ${maxSelections} 個`);
          return prev;
        }
        return {
          ...prev,
          [groupId]: [...current, choiceId]
        };
      }
    });
  };

  // 計算總價
  const calculateTotalPrice = () => {
    if (!selectedItem) return 0;

    let total = selectedItem.basePrice || selectedItem.price || 0;

    // 加上變體價格調整
    if (selectedVariant && selectedVariant.priceAdjustment) {
      total += selectedVariant.priceAdjustment;
    }

    // 加上選項價格調整
    if (selectedItem.hasOptions && selectedItem.optionGroups) {
      selectedItem.optionGroups.forEach(group => {
        const selectedChoiceIds = selectedOptions[group.id] || [];
        selectedChoiceIds.forEach(choiceId => {
          const choice = group.choices.find(c => c.id === choiceId);
          if (choice && choice.priceAdjustment) {
            total += choice.priceAdjustment;
          }
        });
      });
    }

    return total * quantity;
  };

  // 驗證是否可加入購物車
  const canAddToCart = () => {
    if (!selectedItem) return false;

    // 檢查變體
    if (selectedItem.hasVariants) {
      if (!selectedVariant) return false;
      if (!selectedVariant.available) return false;
      if (selectedVariant.stock !== null && selectedVariant.stock <= 0) return false;
    }

    // 檢查必填選項組
    if (selectedItem.hasOptions && selectedItem.optionGroups) {
      for (const group of selectedItem.optionGroups) {
        if (group.required) {
          const selected = selectedOptions[group.id] || [];
          if (selected.length === 0) return false;
        }
      }
    }

    return true;
  };

  // 加入購物車
  const handleAddToCart = () => {
    if (!canAddToCart()) {
      alert('請完整選擇商品選項');
      return;
    }

    const cartItem = {
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      basePrice: selectedItem.basePrice || selectedItem.price,
      quantity,
      variant: selectedVariant ? {
        id: selectedVariant.id,
        name: selectedVariant.name,
        priceAdjustment: selectedVariant.priceAdjustment
      } : null,
      options: {}
    };

    // 整理選項資訊
    if (selectedItem.hasOptions && selectedItem.optionGroups) {
      selectedItem.optionGroups.forEach(group => {
        const selectedChoiceIds = selectedOptions[group.id] || [];
        if (selectedChoiceIds.length > 0) {
          cartItem.options[group.id] = {
            groupName: group.name,
            choices: selectedChoiceIds.map(choiceId => {
              const choice = group.choices.find(c => c.id === choiceId);
              return {
                id: choice.id,
                name: choice.name,
                priceAdjustment: choice.priceAdjustment
              };
            })
          };
        }
      });
    }

    cartItem.totalPrice = calculateTotalPrice();

    onAddToCart(cartItem);
    handleCloseModal();
    alert('已加入購物車！');
  };

  // 渲染商品卡片
  const renderItemCard = (item) => {
    const activeTags = getActiveTags(item.tags);
    const mainImage = item.images?.main || item.imageUrl || '';
    const hasDiscount = item.basePrice && item.price && item.price < item.basePrice;

    return (
      <div
        key={item.id}
        onClick={() => handleItemClick(item)}
        className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer group"
      >
        {/* 商品圖片 */}
        <div className="relative h-48 bg-gray-100">
          {mainImage ? (
            <img
              src={mainImage}
              alt={item.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">
              {store.type === 'drinks' ? '🧋' : '🍱'}
            </div>
          )}

          {/* 標籤 */}
          {activeTags.length > 0 && (
            <div className="absolute top-2 left-2 flex flex-wrap gap-1">
              {activeTags.slice(0, 2).map(tag => {
                const colorClass = getTagColorClass(tag.color);
                return (
                  <span
                    key={tag.key}
                    className={`px-2 py-1 ${colorClass.bg} ${colorClass.text} rounded-full text-xs font-bold shadow-sm`}
                  >
                    {tag.icon} {tag.label}
                  </span>
                );
              })}
            </div>
          )}

          {/* 狀態標籤 */}
          {item.status !== 'available' && (
            <div className="absolute top-2 right-2">
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                item.status === 'sold_out' 
                  ? 'bg-yellow-500 text-white' 
                  : 'bg-gray-500 text-white'
              }`}>
                {item.status === 'sold_out' ? '已售完' : '已停售'}
              </span>
            </div>
          )}
        </div>

        {/* 商品資訊 */}
        <div className="p-4">
          <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-1">
            {item.name}
          </h3>

          {item.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {item.description}
            </p>
          )}

          {/* 價格 */}
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              {hasDiscount ? (
                <>
                  <span className="text-lg font-bold text-red-600">
                    NT$ {item.price}
                  </span>
                  <span className="text-sm text-gray-500 line-through">
                    NT$ {item.basePrice}
                  </span>
                </>
              ) : (
                <span className="text-lg font-bold text-indigo-600">
                  NT$ {item.basePrice || item.price}
                  {item.hasVariants && ' 起'}
                </span>
              )}
            </div>

            {/* 加入按鈕 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleItemClick(item);
              }}
              disabled={item.status !== 'available'}
              className={`p-2 rounded-full transition-colors ${
                item.status === 'available'
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 渲染商品詳情彈窗
  const renderItemModal = () => {
    if (!selectedItem) return null;

    const images = selectedItem.images?.gallery || [];
    const mainImage = selectedItem.images?.main || selectedItem.imageUrl;
    const allImages = mainImage ? [mainImage, ...images] : images;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* 關閉按鈕 */}
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
            <h2 className="text-xl font-bold text-gray-900">
              {selectedItem.name}
            </h2>
            <button
              onClick={handleCloseModal}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* 圖片輪播 */}
            {allImages.length > 0 && (
              <div className="space-y-3">
                <div className="relative bg-gray-100 rounded-xl overflow-hidden aspect-square">
                  <img
                    src={allImages[galleryIndex]}
                    alt={selectedItem.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {allImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {allImages.map((img, index) => (
                      <button
                        key={index}
                        onClick={() => setGalleryIndex(index)}
                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                          index === galleryIndex
                            ? 'border-indigo-600 scale-105'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <img
                          src={img}
                          alt={`${selectedItem.name} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 商品描述 */}
            {selectedItem.description && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 text-sm leading-relaxed">
                  {selectedItem.description}
                </p>
              </div>
            )}

            {/* 變體選擇 */}
            {selectedItem.hasVariants && selectedItem.variants && selectedItem.variants.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  尺寸選擇
                  {selectedItem.variants.some(v => v.required) && (
                    <span className="text-red-500 text-sm">*</span>
                  )}
                </h3>

                <div className="grid grid-cols-3 gap-3">
                  {selectedItem.variants.map(variant => {
                    const isSelected = selectedVariant?.id === variant.id;
                    const isAvailable = variant.available && 
                                      (variant.stock === null || variant.stock > 0);
                    const stockInfo = variant.stock !== null && variant.stock !== undefined
                      ? `剩餘 ${variant.stock}`
                      : '';

                    return (
                      <button
                        key={variant.id}
                        onClick={() => handleSelectVariant(variant)}
                        disabled={!isAvailable}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          !isAvailable
                            ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                            : isSelected
                            ? 'bg-indigo-50 border-indigo-600 text-indigo-900'
                            : 'bg-white border-gray-300 hover:border-indigo-400'
                        }`}
                      >
                        <div className="font-medium mb-1">{variant.name}</div>
                        {variant.priceAdjustment !== 0 && (
                          <div className={`text-sm ${
                            variant.priceAdjustment > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {variant.priceAdjustment > 0 ? '+' : ''}
                            NT$ {variant.priceAdjustment}
                          </div>
                        )}
                        {stockInfo && (
                          <div className="text-xs text-gray-500 mt-1">
                            {stockInfo}
                          </div>
                        )}
                        {!isAvailable && (
                          <div className="text-xs text-red-500 mt-1">
                            已售完
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 選項組 */}
            {selectedItem.hasOptions && selectedItem.optionGroups && selectedItem.optionGroups.map(group => (
              <div key={group.id} className="space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  {group.name}
                  {group.required && (
                    <span className="text-red-500 text-sm">*</span>
                  )}
                  {group.type === 'multiple' && (
                    <span className="text-sm text-gray-500">
                      (最多選 {group.maxSelections} 個)
                    </span>
                  )}
                </h3>

                <div className="space-y-2">
                  {group.choices.map(choice => {
                    const isSelected = (selectedOptions[group.id] || []).includes(choice.id);
                    const isAvailable = choice.available && 
                                      (choice.stock === null || choice.stock > 0);
                    const stockInfo = choice.stock !== null && choice.stock !== undefined
                      ? `剩餘 ${choice.stock}`
                      : '';

                    return (
                      <button
                        key={choice.id}
                        onClick={() => {
                          if (!isAvailable) return;
                          if (group.type === 'single') {
                            handleSelectSingleOption(group.id, choice.id);
                          } else {
                            handleToggleMultipleOption(group.id, choice.id, group.maxSelections);
                          }
                        }}
                        disabled={!isAvailable}
                        className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                          !isAvailable
                            ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                            : isSelected
                            ? 'bg-indigo-50 border-indigo-600 text-indigo-900'
                            : 'bg-white border-gray-300 hover:border-indigo-400'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {group.type === 'multiple' ? (
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                            }`}>
                              {isSelected && <Check size={14} className="text-white" />}
                            </div>
                          ) : (
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'border-indigo-600' : 'border-gray-300'
                            }`}>
                              {isSelected && (
                                <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
                              )}
                            </div>
                          )}

                          <div className="text-left">
                            <div className="font-medium">{choice.name}</div>
                            {stockInfo && (
                              <div className="text-xs text-gray-500">{stockInfo}</div>
                            )}
                            {!isAvailable && (
                              <div className="text-xs text-red-500">已售完</div>
                            )}
                          </div>
                        </div>

                        {choice.priceAdjustment !== 0 && (
                          <div className={`font-medium ${
                            choice.priceAdjustment > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {choice.priceAdjustment > 0 ? '+' : ''}
                            NT$ {choice.priceAdjustment}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* 數量選擇 */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">數量</h3>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                >
                  <Minus size={18} />
                </button>
                <span className="text-xl font-bold w-12 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* 價格明細 */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">基礎價格</span>
                <span className="font-medium">NT$ {selectedItem.basePrice || selectedItem.price}</span>
              </div>

              {selectedVariant && selectedVariant.priceAdjustment !== 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{selectedVariant.name}</span>
                  <span className={selectedVariant.priceAdjustment > 0 ? 'text-red-600' : 'text-green-600'}>
                    {selectedVariant.priceAdjustment > 0 ? '+' : ''}
                    NT$ {selectedVariant.priceAdjustment}
                  </span>
                </div>
              )}

              {selectedItem.hasOptions && selectedItem.optionGroups && 
                selectedItem.optionGroups.map(group => {
                  const selectedChoiceIds = selectedOptions[group.id] || [];
                  if (selectedChoiceIds.length === 0) return null;

                  return selectedChoiceIds.map(choiceId => {
                    const choice = group.choices.find(c => c.id === choiceId);
                    if (!choice || choice.priceAdjustment === 0) return null;

                    return (
                      <div key={`${group.id}_${choiceId}`} className="flex justify-between text-sm">
                        <span className="text-gray-600">{choice.name}</span>
                        <span className={choice.priceAdjustment > 0 ? 'text-red-600' : 'text-green-600'}>
                          {choice.priceAdjustment > 0 ? '+' : ''}
                          NT$ {choice.priceAdjustment}
                        </span>
                      </div>
                    );
                  });
                })
              }

              {quantity > 1 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">數量</span>
                  <span className="font-medium">× {quantity}</span>
                </div>
              )}

              <div className="border-t border-gray-300 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">總計</span>
                  <span className="text-2xl font-bold text-indigo-600">
                    NT$ {calculateTotalPrice()}
                  </span>
                </div>
              </div>
            </div>

            {/* 加入購物車按鈕 */}
            <button
              onClick={handleAddToCart}
              disabled={!canAddToCart()}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                canAddToCart()
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <ShoppingCart size={22} />
              加入購物車 - NT$ {calculateTotalPrice()}
            </button>

            {/* 提示訊息 */}
            {!canAddToCart() && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle size={18} className="text-orange-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-orange-800">
                  請完整選擇商品選項（標有 * 的項目為必選）
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 店家資訊（保留原有） */}
      <div className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={onBack}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            ← 返回店家列表
          </button>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            {store.name}
          </h1>
        </div>
      </div>

      {/* 商品列表 */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-gray-600">目前沒有商品</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(item => renderItemCard(item))}
          </div>
        )}
      </div>

      {/* 商品詳情彈窗 */}
      {showItemModal && renderItemModal()}
    </div>
  );
};

export default EnhancedStoreList;