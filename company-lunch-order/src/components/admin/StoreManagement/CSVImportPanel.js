// src/components/admin/StoreManagement/CSVImportPanel.js
import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle, X, Download, RefreshCw } from 'lucide-react';
import { parseCSV, processImportData, executeImport } from '../../../utils/csvImporter';

const CSVImportPanel = ({ store, onClose, onImportComplete }) => {
    const [file, setFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [importState, setImportState] = useState('idle'); // idle, analyzing, ready, importing, success, error
    const [stats, setStats] = useState(null);
    const [errors, setErrors] = useState([]);
    const [processedData, setProcessedData] = useState([]);
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

    // 執行匯入
    const handleImport = async () => {
        if (processedData.length === 0) return;

        setImportState('importing');
        try {
            await executeImport(store.id, store.type, processedData, store);
            setImportState('success');
            setTimeout(() => {
                onImportComplete();
            }, 2000);
        } catch (error) {
            console.error('匯入失敗:', error);
            setImportState('error');
            setErrors([{ row: 0, message: `寫入資料庫失敗: ${error.message}` }]);
        }
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

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
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
                <div className="p-6 flex-1 overflow-y-auto">

                    {/* 1. 下載範本提示 */}
                    <div className="bg-blue-50 p-4 rounded-lg mb-6 flex justify-between items-center">
                        <div className="flex items-center text-blue-700">
                            <FileText className="mr-3" size={20} />
                            <div className="text-sm">
                                <p className="font-medium">請使用標準 CSV 格式</p>
                                <p>必要欄位：分類名稱、商品名稱、價格</p>
                            </div>
                        </div>
                        <button
                            onClick={downloadTemplate}
                            className="px-3 py-1.5 bg-white text-blue-600 text-sm font-medium rounded border border-blue-200 hover:bg-blue-50 transition-colors flex items-center"
                        >
                            <Download size={14} className="mr-1.5" />
                            下載範本
                        </button>
                    </div>

                    {/* 2. 檔案上傳區 */}
                    {importState === 'idle' || importState === 'analyzing' || importState === 'error' ? (
                        <div
                            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
                ${importState === 'error' ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'}`}
                            onClick={() => fileInputRef.current.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept=".csv"
                                className="hidden"
                            />
                            <Upload className={`mx-auto mb-4 ${importState === 'error' ? 'text-red-400' : 'text-gray-400'}`} size={48} />
                            <p className="text-gray-900 font-medium mb-1">
                                {file ? file.name : '點擊或拖曳檔案至此'}
                            </p>
                            <p className="text-gray-500 text-sm">支援 .csv 格式 (UTF-8)</p>
                        </div>
                    ) : null}

                    {/* 3. 分析結果預覽 */}
                    {(importState === 'ready' || importState === 'importing' || importState === 'success') && stats && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="bg-gray-50 p-3 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
                                    <div className="text-xs text-gray-500">總筆數</div>
                                </div>
                                <div className="bg-green-50 p-3 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-green-600">+{stats.newItems}</div>
                                    <div className="text-xs text-green-600">新增商品</div>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-blue-600">{stats.updatedItems}</div>
                                    <div className="text-xs text-blue-600">更新商品</div>
                                </div>
                                <div className="bg-yellow-50 p-3 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-yellow-600">{stats.newCategories}</div>
                                    <div className="text-xs text-yellow-600">新分類</div>
                                </div>
                            </div>

                            {/* 錯誤列表 */}
                            {errors.length > 0 ? (
                                <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                                    <h4 className="flex items-center text-red-800 font-medium mb-3">
                                        <AlertTriangle size={18} className="mr-2" />
                                        發現 {errors.length} 個錯誤 (將跳過這些項目)
                                    </h4>
                                    <div className="max-h-40 overflow-y-auto space-y-2">
                                        {errors.map((err, idx) => (
                                            <div key={idx} className="text-sm text-red-700 bg-white p-2 rounded border border-red-100">
                                                <span className="font-bold mr-2">第 {err.row} 行:</span>
                                                {err.message}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-green-50 border border-green-100 rounded-lg p-4 flex items-center text-green-800">
                                    <CheckCircle size={20} className="mr-2" />
                                    所有資料格式正確，隨時可以匯入！
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
                    {importState === 'success' ? (
                        <div className="flex items-center text-green-600 mr-auto font-medium">
                            <CheckCircle size={20} className="mr-2" />
                            匯入成功！視窗將自動關閉...
                        </div>
                    ) : null}

                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
                        disabled={importState === 'importing' || importState === 'success'}
                    >
                        取消
                    </button>

                    {importState === 'ready' && (
                        <button
                            onClick={handleImport}
                            className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center"
                            disabled={processedData.length === 0}
                        >
                            確認匯入
                        </button>
                    )}

                    {importState === 'importing' && (
                        <button disabled className="px-6 py-2 bg-indigo-400 text-white font-medium rounded-lg flex items-center cursor-not-allowed">
                            <RefreshCw size={18} className="mr-2 animate-spin" />
                            正在匯入...
                        </button>
                    )}

                    {(importState === 'success' || (importState === 'idle' && file)) && importState !== 'ready' && importState !== 'importing' && (
                        <button onClick={() => { setFile(null); setImportState('idle'); setStats(null); }} className="px-4 py-2 text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg">
                            重新選擇檔案
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CSVImportPanel;
