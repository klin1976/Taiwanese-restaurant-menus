// src/components/admin/StoreManagement/TemplateSelector.js
import React, { useState } from 'react';
import { Zap, Coffee, Utensils, X, Check, AlertCircle } from 'lucide-react';

const TemplateSelector = ({ 
  currentTemplate = 'none',
  currentVariants = [],
  currentOptions = [],
  onApply,
  storeType,
  disabled = false 
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('none');
  const [previewData, setPreviewData] = useState(null);

  // ============================================
  // 範本定義
  // ============================================

  const templates = {
    none: {
      id: 'none',
      name: '無範本',
      description: '手動設定變體和選項',
      icon: X,
      color: 'gray',
      variants: [],
      options: []
    },

    drink_standard: {
      id: 'drink_standard',
      name: '飲料店標準範本',
      description: '甜度 + 冰塊 + 加料（適用於一般飲料店）',
      icon: Coffee,
      color: 'blue',
      variants: [
        {
          id: 'variant_large',
          name: '大杯',
          priceAdjustment: 10,
          stock: null,
          sku: '',
          available: true
        },
        {
          id: 'variant_medium',
          name: '中杯',
          priceAdjustment: 0,
          stock: null,
          sku: '',
          available: true
        },
        {
          id: 'variant_small',
          name: '小杯',
          priceAdjustment: -5,
          stock: null,
          sku: '',
          available: true
        }
      ],
      options: [
        {
          id: 'group_sweetness',
          name: '甜度',
          type: 'single',
          required: false,
          maxSelections: 1,
          choices: [
            { id: 'sweet_normal', name: '正常', priceAdjustment: 0, stock: null, available: true, isDefault: true },
            { id: 'sweet_less', name: '少糖', priceAdjustment: 0, stock: null, available: true, isDefault: false },
            { id: 'sweet_half', name: '半糖', priceAdjustment: 0, stock: null, available: true, isDefault: false },
            { id: 'sweet_little', name: '微糖', priceAdjustment: 0, stock: null, available: true, isDefault: false },
            { id: 'sweet_none', name: '無糖', priceAdjustment: 0, stock: null, available: true, isDefault: false }
          ]
        },
        {
          id: 'group_ice',
          name: '冰塊',
          type: 'single',
          required: false,
          maxSelections: 1,
          choices: [
            { id: 'ice_normal', name: '正常冰', priceAdjustment: 0, stock: null, available: true, isDefault: true },
            { id: 'ice_less', name: '少冰', priceAdjustment: 0, stock: null, available: true, isDefault: false },
            { id: 'ice_little', name: '微冰', priceAdjustment: 0, stock: null, available: true, isDefault: false },
            { id: 'ice_none', name: '去冰', priceAdjustment: 0, stock: null, available: true, isDefault: false },
            { id: 'ice_warm', name: '溫', priceAdjustment: 0, stock: null, available: true, isDefault: false },
            { id: 'ice_hot', name: '熱', priceAdjustment: 0, stock: null, available: true, isDefault: false }
          ]
        },
        {
          id: 'group_toppings',
          name: '加料',
          type: 'multiple',
          required: false,
          maxSelections: 3,
          choices: [
            { id: 'topping_boba', name: '珍珠', priceAdjustment: 10, stock: null, available: true, isDefault: false },
            { id: 'topping_qq', name: '雙Q果', priceAdjustment: 10, stock: null, available: true, isDefault: false },
            { id: 'topping_jelly', name: '檸檬凍', priceAdjustment: 10, stock: null, available: true, isDefault: false },
            { id: 'topping_pudding', name: '布丁', priceAdjustment: 10, stock: null, available: true, isDefault: false },
            { id: 'topping_cheese', name: '芝芝', priceAdjustment: 20, stock: null, available: true, isDefault: false }
          ]
        }
      ]
    },

    drink_simple: {
      id: 'drink_simple',
      name: '飲料店簡易範本',
      description: '僅甜度 + 冰塊（適用於茶類飲品）',
      icon: Coffee,
      color: 'green',
      variants: [],
      options: [
        {
          id: 'group_sweetness',
          name: '甜度',
          type: 'single',
          required: false,
          maxSelections: 1,
          choices: [
            { id: 'sweet_normal', name: '正常', priceAdjustment: 0, stock: null, available: true, isDefault: true },
            { id: 'sweet_less', name: '少糖', priceAdjustment: 0, stock: null, available: true, isDefault: false },
            { id: 'sweet_half', name: '半糖', priceAdjustment: 0, stock: null, available: true, isDefault: false },
            { id: 'sweet_none', name: '無糖', priceAdjustment: 0, stock: null, available: true, isDefault: false }
          ]
        },
        {
          id: 'group_ice',
          name: '冰塊',
          type: 'single',
          required: false,
          maxSelections: 1,
          choices: [
            { id: 'ice_normal', name: '正常冰', priceAdjustment: 0, stock: null, available: true, isDefault: true },
            { id: 'ice_less', name: '少冰', priceAdjustment: 0, stock: null, available: true, isDefault: false },
            { id: 'ice_none', name: '去冰', priceAdjustment: 0, stock: null, available: true, isDefault: false },
            { id: 'ice_hot', name: '熱', priceAdjustment: 0, stock: null, available: true, isDefault: false }
          ]
        }
      ]
    },

    lunch_standard: {
      id: 'lunch_standard',
      name: '午餐店標準範本',
      description: '主餐 + 飲料（適用於便當店）',
      icon: Utensils,
      color: 'orange',
      variants: [],
      options: [
        {
          id: 'group_drink',
          name: '飲料',
          type: 'single',
          required: false,
          maxSelections: 1,
          choices: [
            { id: 'drink_none', name: '不加飲料', priceAdjustment: 0, stock: null, available: true, isDefault: true },
            { id: 'drink_tea', name: '紅茶', priceAdjustment: 10, stock: null, available: true, isDefault: false },
            { id: 'drink_milk_tea', name: '奶茶', priceAdjustment: 15, stock: null, available: true, isDefault: false },
            { id: 'drink_soy', name: '豆漿', priceAdjustment: 15, stock: null, available: true, isDefault: false }
          ]
        }
      ]
    }
  };

  // 根據店家類型過濾範本
  const availableTemplates = Object.values(templates).filter(template => {
    if (template.id === 'none') return true;
    if (storeType === 'drinks') {
      return template.id.startsWith('drink_');
    }
    if (storeType === 'lunch') {
      return template.id.startsWith('lunch_');
    }
    return true;
  });

  // ============================================
  // 處理範本套用
  // ============================================

  const handleSelectTemplate = (templateId) => {
    setSelectedTemplate(templateId);
    const template = templates[templateId];
    setPreviewData({
      variants: template.variants,
      options: template.options
    });
  };

  const handleApplyTemplate = () => {
    if (selectedTemplate === 'none') {
      onApply({ variants: [], options: [] });
      setShowModal(false);
      return;
    }

    const template = templates[selectedTemplate];
    
    // 檢查是否會覆蓋現有資料
    const hasExistingData = currentVariants.length > 0 || currentOptions.length > 0;
    
    if (hasExistingData) {
      if (!window.confirm('套用範本會覆蓋現有的變體和選項，確定要繼續嗎？')) {
        return;
      }
    }

    // 套用範本
    onApply({
      variants: template.variants.map(v => ({
        ...v,
        id: `variant_${Date.now()}_${Math.random()}`
      })),
      options: template.options.map(g => ({
        ...g,
        id: `group_${Date.now()}_${Math.random()}`,
        choices: g.choices.map(c => ({
          ...c,
          id: `choice_${Date.now()}_${Math.random()}`
        }))
      }))
    });

    setShowModal(false);
  };

  // 取得當前範本資訊
  const currentTemplateInfo = templates[currentTemplate] || templates.none;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
          <Zap size={18} className="text-yellow-500" />
          快速範本
        </h4>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-900 mb-2">
              當前範本：{currentTemplateInfo.name}
            </p>
            <p className="text-xs text-yellow-700">
              {currentTemplateInfo.description}
            </p>
          </div>
          
          <button
            type="button"
            onClick={() => setShowModal(true)}
            disabled={disabled}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 flex-shrink-0 ${
              disabled
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-yellow-600 text-white hover:bg-yellow-700'
            }`}
          >
            <Zap size={16} />
            套用範本
          </button>
        </div>

        {(currentVariants.length > 0 || currentOptions.length > 0) && (
          <div className="mt-3 pt-3 border-t border-yellow-300">
            <div className="flex items-center gap-4 text-xs text-yellow-700">
              {currentVariants.length > 0 && (
                <span>✓ {currentVariants.length} 個變體</span>
              )}
              {currentOptions.length > 0 && (
                <span>✓ {currentOptions.length} 個選項組</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 範本選擇彈窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-6 border-b z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Zap size={24} className="text-yellow-500" />
                  選擇快速範本
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                選擇適合的範本，快速建立商品變體和選項組
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* 範本列表 */}
              {availableTemplates.map(template => {
                const Icon = template.icon;
                const isSelected = selectedTemplate === template.id;
                
                return (
                  <label
                    key={template.id}
                    className={`block p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'border-yellow-500 bg-yellow-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="radio"
                        name="template"
                        value={template.id}
                        checked={isSelected}
                        onChange={() => handleSelectTemplate(template.id)}
                        className="mt-1"
                      />
                      
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-yellow-500' : `bg-${template.color}-100`
                      }`}>
                        <Icon size={24} className={isSelected ? 'text-white' : `text-${template.color}-600`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className={`font-bold mb-1 ${
                          isSelected ? 'text-yellow-900' : 'text-gray-900'
                        }`}>
                          {template.name}
                        </h4>
                        <p className="text-sm text-gray-600 mb-3">
                          {template.description}
                        </p>

                        {/* 範本內容預覽 */}
                        {template.id !== 'none' && (
                          <div className="flex flex-wrap gap-2 text-xs">
                            {template.variants.length > 0 && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                                {template.variants.length} 個變體
                              </span>
                            )}
                            {template.options.length > 0 && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                                {template.options.length} 個選項組
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {isSelected && (
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                            <Check size={16} className="text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            {/* 預覽區 */}
            {previewData && selectedTemplate !== 'none' && (
              <div className="px-6 pb-6">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <AlertCircle size={18} className="text-blue-600" />
                    範本內容預覽
                  </h4>

                  {/* 變體預覽 */}
                  {previewData.variants.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">變體：</p>
                      <div className="flex flex-wrap gap-2">
                        {previewData.variants.map((v, idx) => (
                          <span key={idx} className="px-3 py-1 bg-white border border-green-300 rounded-lg text-sm">
                            {v.name} ({v.priceAdjustment > 0 ? '+' : ''}{v.priceAdjustment === 0 ? '基準價' : `NT$ ${v.priceAdjustment}`})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 選項組預覽 */}
                  {previewData.options.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">選項組：</p>
                      <div className="space-y-3">
                        {previewData.options.map((group, gIdx) => (
                          <div key={gIdx} className="bg-white border border-purple-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-gray-900">{group.name}</span>
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                {group.type === 'single' ? '單選' : `多選(最多${group.maxSelections})`}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {group.choices.map((choice, cIdx) => (
                                <span 
                                  key={cIdx}
                                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded"
                                >
                                  {choice.name}
                                  {choice.priceAdjustment !== 0 && ` (+NT$ ${choice.priceAdjustment})`}
                                  {choice.isDefault && ' ★'}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 按鈕區 */}
            <div className="sticky bottom-0 bg-white p-6 border-t flex gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleApplyTemplate}
                disabled={!selectedTemplate}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  selectedTemplate
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Zap size={18} />
                套用範本
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateSelector;