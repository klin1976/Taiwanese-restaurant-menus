// src/components/admin/StoreManagement/TagSelector.js
import React from 'react';
import { getAllTags } from '../../../utils/productTags';

const TagSelector = ({ tags, onChange }) => {
  const allTags = getAllTags();

  // 切換標籤狀態
  const toggleTag = (tagKey) => {
    onChange({
      ...tags,
      [tagKey]: !tags[tagKey]
    });
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600 mb-3">
        選擇適合的標籤來描述此商品（可多選）
      </p>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {allTags.map(tag => {
          const isSelected = tags[tag.key] === true;
          
          return (
            <label
              key={tag.key}
              className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleTag(tag.key)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-3"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-lg">{tag.icon}</span>
                  <span className={`text-sm font-medium truncate ${
                    isSelected ? 'text-blue-900' : 'text-gray-700'
                  }`}>
                    {tag.label}
                  </span>
                </div>
                {tag.description && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {tag.description}
                  </p>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {/* 已選標籤預覽 */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600 mb-2">已選標籤預覽：</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(tags)
            .filter(([key, value]) => value === true)
            .map(([key]) => {
              const tag = allTags.find(t => t.key === key);
              if (!tag) return null;
              
              return (
                <span
                  key={key}
                  className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                >
                  {tag.icon} {tag.label}
                </span>
              );
            })}
          {Object.values(tags).every(v => !v) && (
            <span className="text-xs text-gray-400">尚未選擇任何標籤</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TagSelector;