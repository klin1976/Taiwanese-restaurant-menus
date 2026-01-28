// src/components/admin/StoreManagement/VariantEditor.js
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, AlertCircle } from 'lucide-react';
import { ReactSortable } from 'react-sortablejs';

const VariantEditor = ({ 
  variants = [], 
  onChange, 
  disabled = false 
}) => {
  const [variantList, setVariantList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    priceAdjustment: 0,
    stock: '',
    sku: '',
    available: true
  });

  useEffect(() => {
    setVariantList(variants || []);
  }, [variants]);

  // 新增變體
  const handleAdd = () => {
    setEditingVariant(null);
    setFormData({
      name: '',
      priceAdjustment: 0,
      stock: '',
      sku: '',
      available: true
    });
    setShowForm(true);
  };

  // 編輯變體
  const handleEdit = (variant) => {
    setEditingVariant(variant);
    setFormData({
      name: variant.name,
      priceAdjustment: variant.priceAdjustment,
      stock: variant.stock || '',
      sku: variant.sku || '',
      available: variant.available !== false
    });
    setShowForm(true);
  };

  // 儲存變體
  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('請輸入變體名稱');
      return;
    }

    const newVariant = {
      id: editingVariant?.id || `variant_${Date.now()}`,
      name: formData.name.trim(),
      priceAdjustment: parseFloat(formData.priceAdjustment) || 0,
      stock: formData.stock ? parseInt(formData.stock) : null,
      sku: formData.sku.trim(),
      available: formData.available
    };

    let updatedList;
    if (editingVariant) {
      updatedList = variantList.map(v => 
        v.id === editingVariant.id ? newVariant : v
      );
    } else {
      updatedList = [...variantList, newVariant];
    }

    setVariantList(updatedList);
    onChange(updatedList);
    setShowForm(false);
  };

  // 刪除變體
  const handleDelete = (id) => {
    if (!window.confirm('確定要刪除此變體嗎？')) return;

    const updatedList = variantList.filter(v => v.id !== id);
    setVariantList(updatedList);
    onChange(updatedList);
  };

  // 排序變更
  const handleSortEnd = (newList) => {
    setVariantList(newList);
    onChange(newList);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900">商品變體</h4>
        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
            disabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          <Plus size={16} />
          新增變體
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2 text-sm text-blue-800">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">變體說明</p>
            <p className="text-xs mt-1">變體會影響商品的<strong>價格</strong>和<strong>庫存</strong>（例如：大中小杯）</p>
          </div>
        </div>
      </div>

      {/* 變體列表 */}
      {variantList.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-sm">尚未新增變體</p>
          <p className="text-xs mt-1">變體為選填項目，不新增則使用基礎價格</p>
        </div>
      ) : (
        <ReactSortable
          list={variantList}
          setList={handleSortEnd}
          animation={200}
          handle=".drag-handle"
          className="space-y-2"
        >
          {variantList.map((variant, index) => (
            <div
              key={variant.id}
              className="bg-white border-2 border-gray-200 rounded-lg p-4 flex items-center gap-3 hover:border-green-300 transition-colors"
            >
              {/* 拖曳手柄 */}
              <div className="drag-handle cursor-move text-gray-400 hover:text-gray-600">
                <GripVertical size={20} />
              </div>

              {/* 變體資訊 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-900">{variant.name}</span>
                  
                  {variant.priceAdjustment !== 0 && (
                    <span className={`text-sm font-medium ${
                      variant.priceAdjustment > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {variant.priceAdjustment > 0 ? '+' : ''} NT$ {variant.priceAdjustment}
                    </span>
                  )}

                  {variant.stock !== null && variant.stock !== undefined && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      庫存: {variant.stock}
                    </span>
                  )}

                  {variant.sku && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      SKU: {variant.sku}
                    </span>
                  )}

                  {!variant.available && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                      不可選購
                    </span>
                  )}
                </div>
              </div>

              {/* 操作按鈕 */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleEdit(variant)}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                >
                  編輯
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(variant.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </ReactSortable>
      )}

      {/* 新增/編輯表單 */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h3 className="text-lg font-bold">
                {editingVariant ? '編輯變體' : '新增變體'}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              {/* 變體名稱 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  變體名稱 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：大杯"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  autoFocus
                />
              </div>

              {/* 價格調整 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  價格調整
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    NT$
                  </span>
                  <input
                    type="number"
                    value={formData.priceAdjustment}
                    onChange={(e) => setFormData({ ...formData, priceAdjustment: e.target.value })}
                    placeholder="0"
                    className="w-full pl-12 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  正數為加價，負數為減價
                </p>
              </div>

              {/* 庫存 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  庫存數量 <span className="text-gray-500">(選填)</span>
                </label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="不填表示無限庫存"
                  min="0"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* SKU */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU 編號 <span className="text-gray-500">(選填)</span>
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="例如：BOBA-L"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* 可選購 */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.available}
                    onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                    className="w-4 h-4 text-green-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    此變體可供選購
                  </span>
                </label>
              </div>
            </div>

            <div className="p-6 border-t flex gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                儲存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VariantEditor;