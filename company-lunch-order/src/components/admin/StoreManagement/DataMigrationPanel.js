// src/components/admin/StoreManagement/DataMigrationPanel.js
import React, { useState } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, X, Download, Upload } from 'lucide-react';
import {
  scanItemsForMigration,
  executeMigration,
  migrateAllStores,
  rollbackMigration
} from '../../../utils/dataMigration';

const DataMigrationPanel = ({ onBack, isSuperAdmin }) => {
  const [scanning, setScanning] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [migrationResult, setMigrationResult] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);
  const [storeType, setStoreType] = useState('all');
  const [options, setOptions] = useState({
    applyTemplate: true,
    preserveOldData: true,
    dryRun: false
  });

  // 掃描單一店家
  const handleScanStore = async (storeId, type) => {
    setScanning(true);
    setScanResult(null);
    setMigrationResult(null);

    try {
      const result = await scanItemsForMigration(storeId, type);
      setScanResult(result);
      setSelectedStore({ id: storeId, type });
      
      if (result.oldFormatItems === 0) {
        alert('✅ 此店家所有商品都已是最新格式！');
      }
    } catch (error) {
      console.error('掃描失敗:', error);
      alert(`掃描失敗：${error.message}`);
    } finally {
      setScanning(false);
    }
  };

  // 執行單一店家遷移
  const handleMigrateSingleStore = async () => {
    if (!selectedStore) return;

    if (!window.confirm(
      `確定要遷移「${scanResult.storeData.name}」嗎？\n\n` +
      `將遷移 ${scanResult.oldFormatItems} 個商品。` +
      (options.applyTemplate ? '\n\n✓ 將自動套用飲料店標準範本' : '') +
      (options.preserveOldData ? '\n✓ 將保留舊資料以便回滾' : '')
    )) {
      return;
    }

    setMigrating(true);
    setMigrationResult(null);

    try {
      const result = await executeMigration(
        selectedStore.id,
        selectedStore.type,
        options
      );

      setMigrationResult(result);

      if (result.success) {
        alert(`✅ 遷移完成！\n\n成功遷移 ${result.migratedCount} 個商品`);
        
        // 重新掃描
        await handleScanStore(selectedStore.id, selectedStore.type);
      }
    } catch (error) {
      console.error('遷移失敗:', error);
      alert(`遷移失敗：${error.message}`);
    } finally {
      setMigrating(false);
    }
  };

  // 批次遷移所有店家
  const handleMigrateAll = async () => {
    if (!isSuperAdmin) {
      alert('只有超級管理員可以執行批次遷移');
      return;
    }

    if (!window.confirm(
      `⚠️ 確定要批次遷移所有店家嗎？\n\n` +
      `這將會處理 ${storeType === 'all' ? '所有' : storeType === 'lunch' ? '午餐' : '飲料'} 類型的店家。\n\n` +
      `建議先進行 Dry Run 測試。`
    )) {
      return;
    }

    setMigrating(true);

    try {
      const result = await migrateAllStores(storeType, options);
      
      alert(
        `🎉 批次遷移完成！\n\n` +
        `✅ 成功: ${result.successStores} 家\n` +
        `❌ 失敗: ${result.failedStores} 家\n` +
        `📦 總遷移商品數: ${result.totalMigratedItems}`
      );

      setMigrationResult(result);
    } catch (error) {
      console.error('批次遷移失敗:', error);
      alert(`批次遷移失敗：${error.message}`);
    } finally {
      setMigrating(false);
    }
  };

  // 回滾遷移
  const handleRollback = async () => {
    if (!selectedStore) return;

    if (!window.confirm(
      `⚠️ 確定要回滾遷移嗎？\n\n` +
      `這將會恢復所有商品的舊資料格式，並刪除新格式的資料。\n\n` +
      `此操作無法撤銷！`
    )) {
      return;
    }

    setMigrating(true);

    try {
      await rollbackMigration(selectedStore.id, selectedStore.type);
      alert('✅ 回滾成功！');
      setScanResult(null);
      setMigrationResult(null);
      setSelectedStore(null);
    } catch (error) {
      console.error('回滾失敗:', error);
      alert(`回滾失敗：${error.message}`);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      {/* 標頭 */}
      <div className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">📦 資料遷移工具</h1>
                <p className="text-sm text-gray-600 mt-1">
                  自動將舊商品資料升級為新格式（支援變體和選項）
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* 警告訊息 */}
        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle size={32} className="text-orange-600 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-orange-900 mb-2">
                ⚠️ 重要提醒
              </h3>
              <ul className="space-y-1 text-orange-800 text-sm">
                <li>• 遷移前建議先備份 Firestore 資料</li>
                <li>• 可使用 Dry Run 模式預覽遷移結果</li>
                <li>• 如果保留舊資料，可以隨時回滾</li>
                <li>• 批次遷移需要超級管理員權限</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 遷移選項 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">遷移選項</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 店家類型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                店家類型（批次遷移用）
              </label>
              <select
                value={storeType}
                onChange={(e) => setStoreType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">全部</option>
                <option value="lunch">午餐</option>
                <option value="drinks">飲料</option>
              </select>
            </div>

            {/* 空白佔位 */}
            <div></div>

            {/* 套用範本 */}
            <div className="col-span-1 md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.applyTemplate}
                  onChange={(e) => setOptions({ ...options, applyTemplate: e.target.checked })}
                  className="w-5 h-5 text-purple-600 rounded"
                />
                <div>
                  <span className="font-medium text-gray-900">
                    自動套用飲料店標準範本
                  </span>
                  <p className="text-sm text-gray-600">
                    為飲料類商品自動建立甜度、冰塊、加料等選項組
                  </p>
                </div>
              </label>
            </div>

            {/* 保留舊資料 */}
            <div className="col-span-1 md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.preserveOldData}
                  onChange={(e) => setOptions({ ...options, preserveOldData: e.target.checked })}
                  className="w-5 h-5 text-purple-600 rounded"
                />
                <div>
                  <span className="font-medium text-gray-900">
                    保留舊資料以便回滾
                  </span>
                  <p className="text-sm text-gray-600">
                    將舊資料儲存在 _oldData 欄位，之後可以回滾
                  </p>
                </div>
              </label>
            </div>

            {/* Dry Run */}
            <div className="col-span-1 md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.dryRun}
                  onChange={(e) => setOptions({ ...options, dryRun: e.target.checked })}
                  className="w-5 h-5 text-purple-600 rounded"
                />
                <div>
                  <span className="font-medium text-gray-900">
                    Dry Run 模式（僅預覽，不實際寫入）
                  </span>
                  <p className="text-sm text-gray-600">
                    先測試遷移流程，確認無誤後再正式執行
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* 單一店家遷移 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">單一店家遷移</h3>
          
          <div className="space-y-4">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="輸入店家 ID（例如: fu_jia）"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                id="storeIdInput"
              />
              <select
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                id="storeTypeSelect"
              >
                <option value="lunch">午餐</option>
                <option value="drinks">飲料</option>
              </select>
              <button
                onClick={() => {
                  const storeId = document.getElementById('storeIdInput').value;
                  const type = document.getElementById('storeTypeSelect').value;
                  if (storeId.trim()) {
                    handleScanStore(storeId.trim(), type);
} else {
alert('請輸入店家 ID');
}
}}
disabled={scanning}
className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center gap-2"
>
<RefreshCw size={18} className={scanning ? 'animate-spin' : ''} />
掃描
</button>
</div>
{/* 掃描結果 */}
        {scanResult && (
          <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
            <h4 className="font-bold text-purple-900 mb-3">
              掃描結果：{scanResult.storeData.name}
            </h4>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {scanResult.totalItems}
                </p>
                <p className="text-sm text-gray-600">總商品數</p>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {scanResult.oldFormatItems}
                </p>
                <p className="text-sm text-gray-600">需遷移</p>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {scanResult.newFormatItems}
                </p>
                <p className="text-sm text-gray-600">已最新</p>
              </div>
            </div>

            {scanResult.oldFormatItems > 0 && (
              <div className="flex gap-3">
                <button
                  onClick={handleMigrateSingleStore}
                  disabled={migrating}
                  className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 font-medium flex items-center justify-center gap-2"
                >
                  <Upload size={18} />
                  {options.dryRun ? 'Dry Run 測試' : '開始遷移'}
                </button>
                
                {options.preserveOldData && (
                  <button
                    onClick={handleRollback}
                    disabled={migrating}
                    className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-400 font-medium flex items-center gap-2"
                  >
                    <RefreshCw size={18} />
                    回滾
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 遷移結果 */}
        {migrationResult && (
          <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={24} className="text-green-600" />
              <h4 className="font-bold text-green-900">
                遷移完成！
              </h4>
            </div>

            <div className="space-y-2 text-sm">
              <p className="text-green-800">
                ✅ 成功遷移 {migrationResult.migratedCount} 個商品
              </p>
              
              {migrationResult.errors && migrationResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded p-3 mt-3">
                  <p className="font-medium text-red-800 mb-2">
                    ⚠️ {migrationResult.errors.length} 個商品遷移失敗：
                  </p>
                  {migrationResult.errors.map((err, idx) => (
                    <p key={idx} className="text-red-700 text-xs">
                      • {err.itemName}: {err.error}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* 批次遷移（僅超級管理員） */}
    {isSuperAdmin && (
      <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-red-200">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle size={24} className="text-red-600" />
          <div>
            <h3 className="text-lg font-bold text-gray-900">批次遷移所有店家</h3>
            <p className="text-sm text-red-600">
              ⚠️ 此功能僅限超級管理員，建議先進行 Dry Run 測試
            </p>
          </div>
        </div>

        <button
          onClick={handleMigrateAll}
          disabled={migrating}
          className="w-full px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 font-bold text-lg flex items-center justify-center gap-2"
        >
          <Upload size={22} />
          {migrating ? '遷移中...' : `批次遷移所有 ${storeType === 'all' ? '' : storeType === 'lunch' ? '午餐' : '飲料'} 店家`}
        </button>
      </div>
    )}
  </div>
</div>
);
};
export default DataMigrationPanel;