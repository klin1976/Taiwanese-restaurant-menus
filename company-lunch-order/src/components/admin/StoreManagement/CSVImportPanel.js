// src/components/admin/StoreManagement/CSVImportPanel.js
import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle, X, Download, RefreshCw, Eye } from 'lucide-react';
import { parseCSV, processImportData, mergeImportDataToCategories } from '../../../utils/csvImporter';

const CSVImportPanel = ({ store, onClose, onImportComplete }) => {
    const [file, setFile] = useState(null);
    const [importState, setImportState] = useState('idle'); // idle, analyzing, ready, importing, success, error
    const [stats, setStats] = useState(null);
    const [errors, setErrors] = useState([]);
    const [processedData, setProcessedData] = useState([]);
    const [skipIds, setSkipIds] = useState([]); // 紀錄選擇跳過覆蓋的商品 ID
    const fileInputRef = useRef(null);

    // 處理檔案選擇
    const handleFileSelect = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
            alert('請上傳 CSV 格式的檔案');
            return;
        }

        setFile(selectedFile);
        analyzeFile(selectedFile);
    };

    // 分析檔案
    const analyzeFile = async (selectedFile) => {
        setImportState('analyzing');
        setSkipIds([]);
        try {
            const rawData = await parseCSV(selectedFile);
            const result = processImportData(rawData, store);

            setStats(result.stats);
            setErrors(result.errors);
            setProcessedData(result.processedItems);

            setImportState('ready');
        } catch (error) {
            console.error('分析失敗:', error);
            setImportState('error');
            setErrors([{ row: 0, message: error.message }]);
        }
    };

    // 執行匯入 (改為純前端合併，返回給上層)
    const handleImport = async () => {
        if (processedData.length === 0) return;

        setImportState('importing');
        try {
            const newCategories = mergeImportDataToCategories(processedData, store.categories || [], skipIds);

            setImportState('success');
            setTimeout(() => {
                onImportComplete(newCategories);
            }, 1000);
        } catch (error) {
            console.error('匯入失敗:', error);
            setImportState('error');
            setErrors([{ row: 0, message: `資料合併失敗: ${error.message}` }]);
        }
    };

    const toggleSkip = (id) => {
        setSkipIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    // 下載範本
    const downloadTemplate = () => {
        const headers = ['分類名稱', '商品名稱', '價格', '描述', '狀態', '標籤'];
        const sampleRow = ['便當類', '排骨飯', '100', '招牌排骨', 'available', '熱門/推薦'];

        // 加入 BOM 以支援 Excel 中文顯示
        const BOM = '\uFEFF';
        const csvContent = BOM + [headers.join(','), sampleRow.join(',')].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', '菜單匯入範本.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // 取得需要 Diff 比對的更新項目
    const updateItems = processedData.filter(item => item.isUpdate && !item.isIdentical);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">批次匯入菜單</h3>
                        <p className="text-sm text-gray-500 mt-1">透過 CSV 檔案快速更新商品資料</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto bg-gray-50">

                    {/* 1. 下載範本提示 */}
                    <div className="bg-blue-50 p-4 rounded-lg mb-6 flex justify-between items-center bg-white shadow-sm border border-gray-100">
                        <div className="flex items-center text-blue-700">
                            <FileText className="mr-3" size={20} />
                            <div className="text-sm">
                                <p className="font-medium">請使用標準 CSV 格式</p>
                                <p className="text-gray-600 mt-0.5">必要欄位：分類名稱、商品名稱、價格</p>
                            </div>
                        </div>
                        <button
                            onClick={downloadTemplate}
                            className="px-4 py-2 bg-white text-blue-600 text-sm font-medium rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors flex items-center shadow-sm"
                        >
                            <Download size={16} className="mr-2" />
                            下載範本
                        </button>
                    </div>

                    {/* 2. 檔案上傳區 */}
                    {importState === 'idle' || importState === 'analyzing' || importState === 'error' ? (
                        <div
                            className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer bg-white
                                ${importState === 'error' ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'}`}
                            onClick={() => fileInputRef.current.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept=".csv"
                                className="hidden"
                            />
                            <Upload className={`mx-auto mb-4 ${importState === 'error' ? 'text-red-400' : 'text-indigo-400'}`} size={48} />
                            <p className="text-gray-900 font-medium mb-1 text-lg">
                                {file ? file.name : '點擊或拖曳檔案至此上傳'}
                            </p>
                            <p className="text-gray-500 text-sm">支援 .csv 格式 (UTF-8編碼)</p>
                        </div>
                    ) : null}

                    {/* 3. 分析結果與 Diff 對照 */}
                    {(importState === 'ready' || importState === 'importing' || importState === 'success') && stats && (
                        <div className="space-y-6">
                            {/* 統計面板 */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                                    <div className="text-3xl font-bold text-gray-800">{stats.total}</div>
                                    <div className="text-sm font-medium text-gray-500 mt-1">總筆數</div>
                                </div>
                                <div className="bg-green-50 p-4 rounded-xl shadow-sm border border-green-100 text-center">
                                    <div className="text-3xl font-bold text-green-600">+{stats.newItems}</div>
                                    <div className="text-sm font-medium text-green-600 mt-1">新增商品</div>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-xl shadow-sm border border-blue-100 text-center relative group">
                                    <div className="text-3xl font-bold text-blue-600">{stats.updatedItems}</div>
                                    <div className="text-sm font-medium text-blue-600 mt-1">更新異動</div>
                                </div>
                                <div className="bg-yellow-50 p-4 rounded-xl shadow-sm border border-yellow-100 text-center">
                                    <div className="text-3xl font-bold text-yellow-600">+{stats.newCategories}</div>
                                    <div className="text-sm font-medium text-yellow-600 mt-1">新分類</div>
                                </div>
                                <div className="bg-gray-100 p-4 rounded-xl shadow-sm border border-gray-200 text-center">
                                    <div className="text-3xl font-bold text-gray-600">{processedData.filter(i => i.isIdentical).length}</div>
                                    <div className="text-sm font-medium text-gray-500 mt-1">資料無異動</div>
                                </div>
                            </div>

                            {/* Diff 差異對照表 */}
                            {updateItems.length > 0 && (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                                        <h4 className="font-bold text-gray-800 flex items-center">
                                            <Eye size={18} className="mr-2 text-indigo-600" />
                                            衝突差異對照 (Diff)
                                        </h4>
                                        <span className="text-sm text-gray-500">
                                            請取消勾選不想覆蓋的項目
                                        </span>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto p-0">
                                        <table className="w-full text-left text-sm border-collapse">
                                            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 sticky top-0 z-10">
                                                <tr>
                                                    <th className="py-3 px-4 w-12 text-center">更新</th>
                                                    <th className="py-3 px-4">商品名稱</th>
                                                    <th className="py-3 px-4">原始資料</th>
                                                    <th className="py-3 px-4">新資料 (CSV)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {updateItems.map((item, idx) => {
                                                    const isSkipped = skipIds.includes(item.id);
                                                    const priceChanged = item.oldData.price !== item.price;
                                                    const descChanged = (item.oldData.description || '') !== (item.description || '');
                                                    return (
                                                        <tr key={item.id || idx} className={`hover:bg-gray-50 transition-colors ${isSkipped ? 'opacity-50 bg-gray-50' : ''}`}>
                                                            <td className="py-3 px-4 text-center align-middle">
                                                                <input
                                                                    type="checkbox"
                                                                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                                                                    checked={!isSkipped}
                                                                    onChange={() => toggleSkip(item.id)}
                                                                />
                                                            </td>
                                                            <td className="py-3 px-4 font-medium text-gray-900">
                                                                <span className="text-xs text-gray-500 block mb-0.5">{item.categoryName}</span>
                                                                {item.name}
                                                            </td>
                                                            <td className="py-3 px-4 text-gray-500">
                                                                {priceChanged && <div>$ {item.oldData.price}</div>}
                                                                {descChanged && <div className="text-xs truncate max-w-[150px]" title={item.oldData.description}>{item.oldData.description || '(無)'}</div>}
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                {priceChanged && <div className="text-blue-600 font-medium">$ {item.price}</div>}
                                                                {descChanged && <div className="text-xs text-blue-600 truncate max-w-[150px]" title={item.description}>{item.description || '(無)'}</div>}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* 錯誤列表 */}
                            {errors.length > 0 ? (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-5 shadow-sm">
                                    <h4 className="flex items-center text-red-800 font-bold mb-3 text-lg">
                                        <AlertTriangle size={20} className="mr-2" />
                                        發現 {errors.length} 個錯誤 (系統將自動跳過)
                                    </h4>
                                    <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                                        {errors.map((err, idx) => (
                                            <div key={idx} className="text-sm text-red-700 bg-white p-3 rounded-lg border border-red-100 flex items-start shadow-sm">
                                                <span className="font-bold mr-3 min-w-[60px]">第 {err.row} 行:</span>
                                                <span>{err.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-center justify-center text-green-800 shadow-sm font-bold text-lg">
                                    <CheckCircle size={24} className="mr-3" />
                                    分析完成，資料格式全數正確！
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-white flex justify-end space-x-3 items-center">
                    {importState === 'success' ? (
                        <div className="flex items-center text-green-600 mr-auto font-bold animate-pulse">
                            <CheckCircle size={20} className="mr-2" />
                            匯入成功，即將自動關閉...
                        </div>
                    ) : null}

                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
                        disabled={importState === 'importing' || importState === 'success'}
                    >
                        取消
                    </button>

                    {importState === 'ready' && (
                        <button
                            onClick={handleImport}
                            className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-md flex items-center"
                            disabled={processedData.length === 0}
                        >
                            確認並套用匯入
                        </button>
                    )}

                    {importState === 'importing' && (
                        <button disabled className="px-6 py-2.5 bg-indigo-400 text-white font-medium rounded-lg flex items-center shadow-md cursor-not-allowed">
                            <RefreshCw size={18} className="mr-2 animate-spin" />
                            處理中...
                        </button>
                    )}

                    {(importState === 'success' || (importState === 'idle' && file)) && importState !== 'ready' && importState !== 'importing' && (
                        <button onClick={() => { setFile(null); setImportState('idle'); setStats(null); }} className="px-5 py-2.5 text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg border border-indigo-200">
                            重新選擇檔案
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CSVImportPanel;
