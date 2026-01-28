// src/components/admin/StoreManagement/OptionEditor.js
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, AlertCircle, Settings, Copy } from 'lucide-react';
import { ReactSortable } from 'react-sortablejs';

const OptionEditor = ({ 
  optionGroups = [], 
  onChange, 
  disabled = false 
}) => {
  const [groupList, setGroupList] = useState([]);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showChoiceForm, setShowChoiceForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [editingChoice, setEditingChoice] = useState(null);
  const [currentGroupId, setCurrentGroupId] = useState(null);
  
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    type: 'single',
    required: false,
    maxSelections: 1
  });

  const [choiceFormData, setChoiceFormData] = useState({
    name: '',
    priceAdjustment: 0,
    stock: '',
    available: true,
    isDefault: false
  });

  useEffect(() => {
    setGroupList(optionGroups || []);
  }, [optionGroups]);

  // ============================================
  // 選項組管理
  // ============================================

  const handleAddGroup = () => {
    setEditingGroup(null);
    setGroupFormData({
      name: '',
      type: 'single',
      required: false,
      maxSelections: 1
    });
    setShowGroupForm(true);
  };

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setGroupFormData({
      name: group.name,
      type: group.type,
      required: group.required,
      maxSelections: group.maxSelections || 1
    });
    setShowGroupForm(true);
  };

  const handleSaveGroup = () => {
    if (!groupFormData.name.trim()) {
      alert('請輸入選項組名稱');
      return;
    }

    const newGroup = {
      id: editingGroup?.id || `group_${Date.now()}`,
      name: groupFormData.name.trim(),
      type: groupFormData.type,
      required: groupFormData.required,
      maxSelections: groupFormData.type === 'multiple' ? parseInt(groupFormData.maxSelections) : 1,
      choices: editingGroup?.choices || []
    };

    let updatedList;
    if (editingGroup) {
      updatedList = groupList.map(g => 
        g.id === editingGroup.id ? newGroup : g
      );
    } else {
      updatedList = [...groupList, newGroup];
    }

    setGroupList(updatedList);
    onChange(updatedList);
    setShowGroupForm(false);
  };

  const handleDeleteGroup = (id) => {
    if (!window.confirm('確定要刪除此選項組嗎？')) return;

    const updatedList = groupList.filter(g => g.id !== id);
    setGroupList(updatedList);
    onChange(updatedList);
  };

  const handleGroupSortEnd = (newList) => {
    setGroupList(newList);
    onChange(newList);
  };

  // ============================================
  // 選項管理
  // ============================================

  const handleAddChoice = (groupId) => {
    setCurrentGroupId(groupId);
    setEditingChoice(null);
    setChoiceFormData({
      name: '',
      priceAdjustment: 0,
      stock: '',
      available: true,
      isDefault: false
    });
    setShowChoiceForm(true);
  };

  const handleEditChoice = (groupId, choice) => {
    setCurrentGroupId(groupId);
    setEditingChoice(choice);
    setChoiceFormData({
      name: choice.name,
      priceAdjustment: choice.priceAdjustment,
      stock: choice.stock || '',
      available: choice.available !== false,
      isDefault: choice.isDefault || false
    });
    setShowChoiceForm(true);
  };

  const handleSaveChoice = () => {
    if (!choiceFormData.name.trim()) {
      alert('請輸入選項名稱');
      return;
    }

    const newChoice = {
      id: editingChoice?.id || `choice_${Date.now()}`,
      name: choiceFormData.name.trim(),
      priceAdjustment: parseFloat(choiceFormData.priceAdjustment) || 0,
      stock: choiceFormData.stock ? parseInt(choiceFormData.stock) : null,
      available: choiceFormData.available,
      isDefault: choiceFormData.isDefault
    };

    const updatedList = groupList.map(group => {
      if (group.id === currentGroupId) {
        let updatedChoices;
        
        if (editingChoice) {
          // 編輯模式
          updatedChoices = group.choices.map(c => 
            c.id === editingChoice.id ? newChoice : c
          );
        } else {
          // 新增模式
          updatedChoices = [...(group.choices || []), newChoice];
        }

        // 如果設定為預設，取消其他選項的預設狀態
        if (newChoice.isDefault) {
          updatedChoices = updatedChoices.map(c => ({
            ...c,
            isDefault: c.id === newChoice.id
          }));
        }

        return { ...group, choices: updatedChoices };
      }
      return group;
    });

    setGroupList(updatedList);
    onChange(updatedList);
    setShowChoiceForm(false);
  };

  const handleDeleteChoice = (groupId, choiceId) => {
    if (!window.confirm('確定要刪除此選項嗎？')) return;

    const updatedList = groupList.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          choices: group.choices.filter(c => c.id !== choiceId)
        };
      }
      return group;
    });

    setGroupList(updatedList);
    onChange(updatedList);
  };

  const handleChoiceSortEnd = (groupId, newChoices) => {
    const updatedList = groupList.map(group => {
      if (group.id === groupId) {
        return { ...group, choices: newChoices };
      }
      return group;
    });

    setGroupList(updatedList);
    onChange(updatedList);
  };

  // ============================================
  // 複製選項組
  // ============================================

  const handleDuplicateGroup = (group) => {
    const duplicatedGroup = {
      id: `group_${Date.now()}`,
      name: `${group.name} (副本)`,
      type: group.type,
      required: group.required,
      maxSelections: group.maxSelections,
      choices: group.choices.map(choice => ({
        ...choice,
        id: `choice_${Date.now()}_${Math.random()}`,
        isDefault: false
      }))
    };

    const updatedList = [...groupList, duplicatedGroup];
    setGroupList(updatedList);
    onChange(updatedList);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900">客製化選項</h4>
        <button
          type="button"
          onClick={handleAddGroup}
          disabled={disabled}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
            disabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
        >
          <Plus size={16} />
          新增選項組
        </button>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
        <div className="flex items-start gap-2 text-sm text-purple-800">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">選項組說明</p>
            <p className="text-xs mt-1">選項組不影響<strong>庫存</strong>，但可影響<strong>價格</strong>（例如：加料 +10元）</p>
          </div>
        </div>
      </div>

      {/* 選項組列表 */}
      {groupList.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-sm">尚未新增選項組</p>
          <p className="text-xs mt-1">選項組為選填項目，適用於飲料店等需要客製化的商品</p>
        </div>
      ) : (
        <ReactSortable
          list={groupList}
          setList={handleGroupSortEnd}
          animation={200}
          handle=".drag-handle-group"
          className="space-y-4"
        >
          {groupList.map((group) => (
            <div
              key={group.id}
              className="bg-white border-2 border-purple-200 rounded-lg overflow-hidden"
            >
              {/* 選項組標頭 */}
              <div className="bg-purple-50 p-4 flex items-center gap-3">
                <div className="drag-handle-group cursor-move text-purple-400 hover:text-purple-600">
                  <GripVertical size={20} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900">{group.name}</span>
                    
                    <span className={`text-xs px-2 py-1 rounded ${
                      group.type === 'single' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {group.type === 'single' ? '單選' : `多選（最多${group.maxSelections}個）`}
                    </span>

                    {group.required && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                        必填
                      </span>
                    )}

                    <span className="text-xs text-gray-500">
                      {group.choices?.length || 0} 個選項
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleDuplicateGroup(group)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                    title="複製選項組"
                  >
                    <Copy size={18} />
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleEditGroup(group)}
                    className="p-2 text-purple-600 hover:bg-purple-100 rounded"
                    title="編輯選項組"
                  >
                    <Settings size={18} />
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleDeleteGroup(group.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="刪除選項組"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* 選項列表 */}
              <div className="p-4">
                {(!group.choices || group.choices.length === 0) ? (
                  <p className="text-center text-gray-500 text-sm py-4">
                    尚未新增選項
                  </p>
                ) : (
                  <ReactSortable
                    list={group.choices}
                    setList={(newList) => handleChoiceSortEnd(group.id, newList)}
                    animation={200}
                    handle=".drag-handle-choice"
                    className="space-y-2"
                  >
                    {group.choices.map((choice) => (
                      <div
                        key={choice.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="drag-handle-choice cursor-move text-gray-400 hover:text-gray-600">
                          <GripVertical size={16} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900">{choice.name}</span>
                            
                            {choice.priceAdjustment !== 0 && (
                              <span className={`text-sm font-medium ${
                                choice.priceAdjustment > 0 ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {choice.priceAdjustment > 0 ? '+' : ''} NT$ {choice.priceAdjustment}
                              </span>
                            )}

                            {choice.stock !== null && choice.stock !== undefined && (
                              <span className={`text-xs px-2 py-1 rounded ${
                                choice.stock > 0 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {choice.stock > 0 ? `庫存: ${choice.stock}` : '已售完'}
                              </span>
                            )}

                            {choice.isDefault && (
                              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                                預設
                              </span>
                            )}

                            {!choice.available && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                不可選
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditChoice(group.id, choice)}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                          >
                            編輯
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteChoice(group.id, choice.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </ReactSortable>
                )}

                <button
                  type="button"
                  onClick={() => handleAddChoice(group.id)}
                  className="w-full mt-3 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 text-gray-600 hover:text-purple-600 text-sm flex items-center justify-center gap-1"
                >
                  <Plus size={16} />
                  新增選項
                </button>
              </div>
            </div>
          ))}
        </ReactSortable>
      )}

      {/* 選項組表單彈窗 */}
      {showGroupForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h3 className="text-lg font-bold">
                {editingGroup ? '編輯選項組' : '新增選項組'}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              {/* 選項組名稱 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  選項組名稱 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={groupFormData.name}
                  onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                  placeholder="例如：甜度、冰塊、加料"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
              </div>

              {/* 選擇類型 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  選擇類型 <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="type"
                      value="single"
                      checked={groupFormData.type === 'single'}
                      onChange={(e) => setGroupFormData({ ...groupFormData, type: e.target.value })}
                      className="mr-3"
                    />
                    <div>
                      <span className="font-medium">單選</span>
                      <p className="text-xs text-gray-500">只能選擇一個（例如：甜度）</p>
                    </div>
                  </label>

                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="type"
                      value="multiple"
                      checked={groupFormData.type === 'multiple'}
                      onChange={(e) => setGroupFormData({ ...groupFormData, type: e.target.value })}
                      className="mr-3"
                    />
                    <div>
                      <span className="font-medium">多選</span>
                      <p className="text-xs text-gray-500">可選擇多個（例如：加料）</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 最多選擇數（多選時顯示） */}
              {groupFormData.type === 'multiple' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最多選擇數
                  </label>
                  <input
                    type="number"
                    value={groupFormData.maxSelections}
                    onChange={(e) => setGroupFormData({ ...groupFormData, maxSelections: e.target.value })}
                    min="1"
                    max="10"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    限制最多可選擇幾個選項
                  </p>
                </div>
              )}

              {/* 是否必填 */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={groupFormData.required}
                    onChange={(e) => setGroupFormData({ ...groupFormData, required: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    此選項組為必填
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  顧客必須選擇此選項組才能加入購物車
                </p>
              </div>
            </div>

            <div className="p-6 border-t flex gap-3">
              <button
                type="button"
                onClick={() => setShowGroupForm(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveGroup}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                儲存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 選項表單彈窗 */}
      {showChoiceForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h3 className="text-lg font-bold">
                {editingChoice ? '編輯選項' : '新增選項'}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              {/* 選項名稱 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  選項名稱 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={choiceFormData.name}
                  onChange={(e) => setChoiceFormData({ ...choiceFormData, name: e.target.value })}
                  placeholder="例如：正常、少糖、珍珠"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
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
                    value={choiceFormData.priceAdjustment}
                    onChange={(e) => setChoiceFormData({ ...choiceFormData, priceAdjustment: e.target.value })}
                    placeholder="0"
                    className="w-full pl-12 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  正數為加價（如：+10），零為無調整
                </p>
              </div>

              {/* 庫存 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  庫存數量 <span className="text-gray-500">(選填)</span>
                </label>
                <input
                  type="number"
                  value={choiceFormData.stock}
                  onChange={(e) => setChoiceFormData({ ...choiceFormData, stock: e.target.value })}
                  placeholder="不填表示無限庫存"
                  min="0"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  適用於加料類選項（如：珍珠剩餘 50 份）
                </p>
              </div>

              {/* 設為預設 */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={choiceFormData.isDefault}
                    onChange={(e) => setChoiceFormData({ ...choiceFormData, isDefault: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    設為預設選項
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  此選項會被預先選取
                </p>
              </div>

              {/* 可選購 */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={choiceFormData.available}
                    onChange={(e) => setChoiceFormData({ ...choiceFormData, available: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    此選項可供選擇
                  </span>
                </label>
              </div>
            </div>

            <div className="p-6 border-t flex gap-3">
              <button
                type="button"
                onClick={() => setShowChoiceForm(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveChoice}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
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

export default OptionEditor;