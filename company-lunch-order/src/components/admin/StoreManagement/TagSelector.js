// src/components/admin/StoreManagement/TagSelector.js
import React, { useState, useMemo } from 'react';
import { Search, X, AlertCircle } from 'lucide-react';
import {
  TAG_CATEGORIES,
  TAG_CATEGORY_NAMES,
  getTagsByCategory,
  getTagColorClass,
  getActiveTags,
  searchTags
} from '../../../utils/productTags';

const TagSelector = ({ tags, onChange, maxTags = 10 }) => {
  const [activeTab, setActiveTab] = useState(TAG_CATEGORIES.RECOMMENDATION);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileSheet, setShowMobileSheet] = useState(false);

  // 檢測手機版
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 獲取已選標籤
  const activeTags = useMemo(() => getActiveTags(tags), [tags]);
  const selectedCount = activeTags.length;
  const isMaxReached = selectedCount >= maxTags;

  // 搜尋過濾
  const filteredTags = useMemo(() => {
    if (searchQuery.trim() === '') {
      return getTagsByCategory(activeTab);
    }
    return searchTags(searchQuery);
  }, [activeTab, searchQuery]);

  // 切換標籤
  const toggleTag = (tagKey) => {
    const isSelected = tags[tagKey] === true;
    
    // 如果已達上限且要新增，則阻止
    if (!isSelected && isMaxReached) {
      alert(`最多只能選擇 ${maxTags} 個標籤`);
      return;
    }

    onChange({
      ...tags,
      [tagKey]: !isSelected
    });
  };

  // 移除標籤
  const removeTag = (tagKey) => {
    onChange({
      ...tags,
      [tagKey]: false
    });
  };

  // 清除所有標籤
  const clearAllTags = () => {
    if (window.confirm('確定要清除所有標籤嗎？')) {
      const clearedTags = {};
      Object.keys(tags).forEach(key => {
        clearedTags[key] = false;
      });
      onChange(clearedTags);
    }
  };

  // 分頁標籤
  const categoryTabs = [
    { key: TAG_CATEGORIES.RECOMMENDATION, icon: '⭐' },
    { key: TAG_CATEGORIES.DIETARY, icon: '🥗' },
    { key: TAG_CATEGORIES.FLAVOR, icon: '🌶️' },
    { key: TAG_CATEGORIES.COOKING, icon: '🍳' },
    { key: TAG_CATEGORIES.TEMPERATURE, icon: '🔥' },
    { key: TAG_CATEGORIES.HEALTH, icon: '💪' },
    { key: TAG_CATEGORIES.SPECIAL, icon: '✨' }
  ];

  // 渲染標籤列表
  const renderTagList = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {filteredTags.length === 0 ? (
        <div className="col-span-full text-center py-8 text-gray-500">
          <Search size={48} className="mx-auto text-gray-400 mb-2" />
          <p className="text-sm">找不到相關標籤</p>
        </div>
      ) : (
        filteredTags.map(tag => {
          const isSelected = tags[tag.key] === true;
          const colorClass = getTagColorClass(tag.color);
          const isDisabled = !isSelected && isMaxReached;
          
          return (
            <label
              key={tag.key}
              className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                isDisabled
                  ? 'opacity-50 cursor-not-allowed'
                  : isSelected
                  ? `${colorClass.bg} border-${tag.color}-500 shadow-sm`
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleTag(tag.key)}
                disabled={isDisabled}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-3"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-lg">{tag.icon}</span>
                  <span className={`text-sm font-medium truncate ${
                    isSelected ? `${colorClass.text}` : 'text-gray-700'
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
        })
      )}
    </div>
  );

  // 手機版內容
  if (isMobile) {
    return (
      <div className="space-y-3">
        {/* 已選標籤 + 開啟按鈕 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              商品標籤 <span className="text-gray-500">({selectedCount}/{maxTags})</span>
            </p>
            {activeTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {activeTags.slice(0, 3).map(tag => (
                  <span
                    key={tag.key}
                    className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                  >
                    {tag.icon} {tag.label}
                  </span>
                ))}
                {activeTags.length > 3 && (
                  <span className="text-xs text-gray-500 px-2 py-1">
                    +{activeTags.length - 3} 個
                  </span>
                )}
              </div>
            )}
          </div>
          
          <button
            type="button"
            onClick={() => setShowMobileSheet(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            選擇標籤
          </button>
        </div>

        {/* 底部 Sheet */}
        {showMobileSheet && (
          <>
            {/* 遮罩 */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-30 z-[55]"
              onClick={() => setShowMobileSheet(false)}
            ></div>

            {/* Sheet 內容 */}
            <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl z-[56] max-h-[85vh] flex flex-col animate-slide-up">
              {/* 拖曳指示條 */}
              <div className="flex justify-center py-3 border-b border-gray-200">
                <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
              </div>

              {/* 標題 + 已選標籤 */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-900">
                    選擇標籤 ({selectedCount}/{maxTags})
                  </h3>
                  {activeTags.length > 0 && (
                    <button
                      onClick={clearAllTags}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      清除全部
                    </button>
                  )}
                </div>

                {/* 已選標籤 */}
                {activeTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {activeTags.map(tag => {
                      const colorClass = getTagColorClass(tag.color);
                      return (
                        <span
                          key={tag.key}
                          className={`inline-flex items-center gap-1 px-2 py-1 ${colorClass.bg} ${colorClass.text} rounded-full text-xs font-medium`}
                        >
                          {tag.icon} {tag.label}
                          <button
                            onClick={() => removeTag(tag.key)}
                            className="hover:bg-black hover:bg-opacity-10 rounded-full p-0.5"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* 上限提示 */}
                {isMaxReached && (
                  <div className="mt-2 flex items-center gap-2 text-orange-600 text-xs bg-orange-50 p-2 rounded">
                    <AlertCircle size={14} />
                    <span>已達標籤數量上限</span>
                  </div>
                )}
              </div>

              {/* 搜尋框 */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜尋標籤..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* 分類標籤 */}
              {!searchQuery && (
                <div className="px-4 py-2 border-b border-gray-200 overflow-x-auto">
                  <div className="flex gap-2">
                    {categoryTabs.map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                          activeTab === tab.key
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {tab.icon} {TAG_CATEGORY_NAMES[tab.key]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 標籤列表 */}
              <div className="flex-1 overflow-y-auto p-4">
                {renderTagList()}
              </div>

              {/* 底部按鈕 */}
              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={() => setShowMobileSheet(false)}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  完成
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // 桌面版
  return (
    <div className="space-y-4">
      {/* 已選標籤區（頂部固定） */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-blue-900">
            已選標籤 ({selectedCount}/{maxTags})
          </h4>
          {activeTags.length > 0 && (
            <button
              onClick={clearAllTags}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              清除全部
            </button>
          )}
        </div>

        {activeTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {activeTags.map(tag => {
              const colorClass = getTagColorClass(tag.color);
              return (
                <span
                  key={tag.key}
                  className={`inline-flex items-center gap-1 px-3 py-1 ${colorClass.bg} ${colorClass.text} rounded-full text-sm font-medium`}
                >
                  {tag.icon} {tag.label}<button
onClick={() => removeTag(tag.key)}
className="hover:bg-black hover:bg-opacity-10 rounded-full p-0.5"
>
<X size={14} />
</button>
</span>
);
})}
</div>
) : (
<p className="text-sm text-gray-500">尚未選擇任何標籤</p>
)}
{/* 上限提示 */}
    {isMaxReached && (
      <div className="mt-2 flex items-center gap-2 text-orange-600 text-sm">
        <AlertCircle size={16} />
        <span>已達標籤數量上限（{maxTags} 個）</span>
      </div>
    )}
  </div>

  {/* 搜尋框 */}
  <div className="relative">
    <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
    <input
      type="text"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder="搜尋標籤..."
      className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
    {searchQuery && (
      <button
        onClick={() => setSearchQuery('')}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        <X size={18} />
      </button>
    )}
  </div>

  {/* 分類標籤 */}
  {!searchQuery && (
    <div className="flex flex-wrap gap-2">
      {categoryTabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === tab.key
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {tab.icon} {TAG_CATEGORY_NAMES[tab.key]}
        </button>
      ))}
    </div>
  )}

  {/* 標籤列表 */}
  {renderTagList()}

  {/* 說明文字 */}
  <p className="text-xs text-gray-500 text-center">
    💡 提示：最多可選擇 {maxTags} 個標籤
  </p>
</div>
);
};
export default TagSelector;