// src/components/admin/StoreManagement/AIMenuScanner.js
// P4: AI 菜單辨識 UI 元件
import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Check, AlertTriangle, RefreshCw, Eye, ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';
import { analyzeMenuImage, convertAIResultToMenuFormat, mergeAIResultToMenu } from '../../../services/menuAIService';

const AIMenuScanner = ({ store, onClose, onImportComplete }) => {
    // 狀態管理
    const [scanState, setScanState] = useState('idle'); // idle, uploading, analyzing, preview, importing, success, error
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [aiResult, setAiResult] = useState(null);
    const [convertedData, setConvertedData] = useState(null);
    const [error, setError] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const [showImage, setShowImage] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState(new Set());
    const [promptHints, setPromptHints] = useState('');
    const [showHints, setShowHints] = useState(false);
    const fileInputRef = useRef(null);

    // 處理檔案選擇
    const handleFileSelect = useCallback(async (file) => {
        if (!file) return;

        // 驗證檔案類型
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
        if (!validTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)) {
            setError('請上傳圖片格式（JPG、PNG、WebP）');
            return;
        }

        // 預覽
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target.result);
        reader.readAsDataURL(file);

        setImageFile(file);
        setError('');
        setScanState('uploading');

        // 自動開始辨識
        await startRecognition(file);
    }, [store]);

    // 開始辨識
    const startRecognition = async (file) => {
        setScanState('analyzing');
        setError('');

        try {
            const storeType = store?.type === 'drinks' ? 'drinks' : 'meals';
            const result = await analyzeMenuImage(file, storeType, promptHints);

            if (!result.success) {
                setError(result.error || '辨識失敗，請重新嘗試');
                setScanState('error');
                return;
            }

            setAiResult(result.data);

            // 轉換為系統格式並檢測衝突
            const converted = convertAIResultToMenuFormat(result.data, store);
            setConvertedData(converted);

            // 預設展開所有分類
            const allCatNames = new Set(converted.categories.map(c => c.name));
            setExpandedCategories(allCatNames);

            setScanState('preview');
        } catch (err) {
            console.error('AI 辨識錯誤:', err);
            if (err.code === 'functions/resource-exhausted') {
                setError('辨識請求過於頻繁，請稍後再試（每分鐘最多 5 次）');
            } else if (err.code === 'functions/unauthenticated') {
                setError('請重新登入後再試');
            } else {
                setError(err.message || '辨識過程發生錯誤，請重新嘗試');
            }
            setScanState('error');
        }
    };

    // 重新辨識
    const handleRetry = () => {
        if (imageFile) {
            startRecognition(imageFile);
        } else {
            setScanState('idle');
            setImagePreview(null);
            setAiResult(null);
            setConvertedData(null);
        }
    };

    // 切換衝突項目的行為
    const toggleConflictAction = (index) => {
        setConvertedData(prev => {
            const newConflicts = [...prev.conflicts];
            newConflicts[index] = {
                ...newConflicts[index],
                action: newConflicts[index].action === 'skip' ? 'overwrite' : 'skip',
            };
            return { ...prev, conflicts: newConflicts };
        });
    };

    // 移除待匯入的品項
    const removeItem = (categoryName, itemName) => {
        setConvertedData(prev => {
            const newCategories = prev.categories.map(cat => {
                if (cat.name === categoryName) {
                    return {
                        ...cat,
                        items: cat.items.filter(item => item.name !== itemName),
                    };
                }
                return cat;
            }).filter(cat => cat.items.length > 0);

            return {
                ...prev,
                categories: newCategories,
                stats: {
                    ...prev.stats,
                    totalItems: prev.stats.totalItems - 1,
                    newItems: prev.stats.newItems - 1,
                },
            };
        });
    };

    // 執行匯入
    const handleImport = () => {
        setScanState('importing');

        try {
            // 如果是飲料店且有全域選項但尚未套用，則自動執行套用邏輯 (P0 優化)
            let finalCategories = convertedData.categories;
            if (store.type === 'drinks' && convertedData.globalOptions?.length > 0 && !convertedData.globalOptionsApplied) {
                console.log('🤖 偵測到未套用的全域選項，執行自動合併...');
                finalCategories = convertedData.categories.map(cat => ({
                    ...cat,
                    items: cat.items.map(item => ({
                        ...item,
                        options: [
                            ...(item.options || []),
                            ...convertedData.globalOptions.map(go => ({
                                ...go,
                                id: `auto_group_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                                choices: go.choices.map(choice => ({ ...choice, id: `auto_choice_${Date.now()}_${Math.random().toString(36).substr(2, 4)}` }))
                            }))
                        ]
                    }))
                }));
            }

            const merged = mergeAIResultToMenu(
                store.categories || [],
                finalCategories,
                convertedData.conflicts
            );

            onImportComplete(merged);
            setScanState('success');

            // 延長至 4 秒後自動關閉，讓使用者看清楚成功訊息 (P3 優化)
            setTimeout(() => onClose(), 4000);
        } catch (err) {
            setError('合併菜單時發生錯誤：' + err.message);
            setScanState('error');
        }
    };

    // 拖放處理
    const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
    const handleDragLeave = () => setDragOver(false);
    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    };

    // 展開/收合分類
    const toggleCategory = (name) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            next.has(name) ? next.delete(name) : next.add(name);
            return next;
        });
    };

    // 一鍵套用全域選項
    const applyGlobalOptionsToAll = () => {
        if (!convertedData?.globalOptions?.length) return;
        
        setConvertedData(prev => {
            const newCategories = prev.categories.map(cat => ({
                ...cat,
                items: cat.items.map(item => ({
                    ...item,
                    options: [
                        ...(item.options || []),
                        ...prev.globalOptions.map(go => ({
                            ...go,
                            id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, // 給予全新 ID
                            choices: go.choices.map(choice => ({ ...choice, id: `choice_${Date.now()}_${Math.random().toString(36).substr(2, 4)}` }))
                        }))
                    ]
                }))
            }));
            
            return {
                ...prev,
                categories: newCategories,
                globalOptionsApplied: true
            };
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-violet-50 to-indigo-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 text-lg">AI 菜單辨識</h3>
                            <p className="text-sm text-gray-500">上傳菜單照片，自動產生品項資料</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* === 上傳區域 === */}
                    {(scanState === 'idle' || scanState === 'error') && (
                        <div className="space-y-4">
                            <div
                                className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${dragOver
                                        ? 'border-violet-400 bg-violet-50'
                                        : 'border-gray-300 hover:border-violet-300 hover:bg-violet-50/30'
                                    }`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center">
                                        <Camera className="w-8 h-8 text-violet-500" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-700">拖放菜單照片至此處</p>
                                        <p className="text-sm text-gray-500 mt-1">或點擊選擇圖片 • 支援 JPG、PNG、WebP</p>
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-2 text-sm font-medium"
                                            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                        >
                                            <Upload className="w-4 h-4" /> 選擇圖片
                                        </button>
                                        <button
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-medium"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // 手機拍照模式
                                                if (fileInputRef.current) {
                                                    fileInputRef.current.setAttribute('capture', 'environment');
                                                    fileInputRef.current.click();
                                                    fileInputRef.current.removeAttribute('capture');
                                                }
                                            }}
                                        >
                                            <Camera className="w-4 h-4" /> 拍照辨識
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 辨識提示詞輸入框 (P0 優化) */}
                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                <button 
                                    onClick={() => setShowHints(!showHints)}
                                    className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-sm text-gray-700 font-medium"
                                >
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-violet-500" />
                                        <span>AI 辨識提示詞 (選填)</span>
                                    </div>
                                    {showHints ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                                {showHints && (
                                    <div className="p-3 bg-white">
                                        <textarea
                                            value={promptHints}
                                            onChange={(e) => setPromptHints(e.target.value)}
                                            placeholder="例如：這家店有 L 和 XL 兩種規格、紅框區是隱藏選單..."
                                            className="w-full h-24 p-3 text-sm border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none resize-none bg-gray-50"
                                        />
                                        <p className="text-[10px] text-gray-400 mt-2">
                                            💡 提示詞可以幫助 AI 更好地理清特殊排版或特定店門規則。
                                        </p>
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-red-700 font-medium">辨識失敗</p>
                                        <p className="text-red-600 text-sm mt-1">{error}</p>
                                        {imageFile && (
                                            <button
                                                onClick={handleRetry}
                                                className="mt-2 text-sm text-red-600 hover:text-red-800 flex items-center gap-1 font-medium"
                                            >
                                                <RefreshCw className="w-3.5 h-3.5" /> 重新辨識
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                                className="hidden"
                                onChange={(e) => handleFileSelect(e.target.files[0])}
                            />
                        </div>
                    )}

                    {/* === 辨識中 === */}
                    {scanState === 'analyzing' && (
                        <div className="flex flex-col items-center py-12 gap-6">
                            {imagePreview && (
                                <div className="w-40 h-40 rounded-xl overflow-hidden shadow-lg border-2 border-violet-200">
                                    <img src={imagePreview} alt="菜單" className="w-full h-full object-cover" />
                                </div>
                            )}
                            <div className="flex flex-col items-center gap-3">
                                <div className="relative">
                                    <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
                                    <Sparkles className="w-4 h-4 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
                                </div>
                                <p className="font-semibold text-gray-700 text-lg">AI 正在辨識菜單...</p>
                                <p className="text-sm text-gray-500">正在分析照片中的品項、價格與分類</p>
                                <div className="flex gap-1 mt-2">
                                    {[0, 1, 2].map(i => (
                                        <div
                                            key={i}
                                            className="w-2 h-2 rounded-full bg-violet-400 animate-bounce"
                                            style={{ animationDelay: `${i * 0.2}s` }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* === 預覽結果 === */}
                    {scanState === 'preview' && convertedData && (
                        <div className="space-y-4">
                            {/* 統計摘要 */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="bg-violet-50 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-bold text-violet-600">{convertedData.stats.totalItems}</p>
                                    <p className="text-xs text-violet-500">辨識品項</p>
                                </div>
                                <div className="bg-green-50 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-bold text-green-600">{convertedData.stats.newItems}</p>
                                    <p className="text-xs text-green-500">新品項</p>
                                </div>
                                <div className="bg-amber-50 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-bold text-amber-600">{convertedData.stats.conflictItems}</p>
                                    <p className="text-xs text-amber-500">衝突品項</p>
                                </div>
                                <div className="bg-blue-50 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-bold text-blue-600">{Math.round((aiResult?.confidence || 0) * 100)}%</p>
                                    <p className="text-xs text-blue-500">信心度</p>
                                </div>
                            </div>

                            {/* AI 備註 */}
                            {aiResult?.notes && (
                                <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 flex items-start gap-2">
                                    <Sparkles className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                                    <span>{aiResult.notes}</span>
                                </div>
                            )}

                            {/* 圖片預覽按鈕 */}
                            {imagePreview && (
                                <button
                                    onClick={() => setShowImage(!showImage)}
                                    className="text-sm text-violet-600 hover:text-violet-800 flex items-center gap-1 font-medium"
                                >
                                    <Eye className="w-4 h-4" /> {showImage ? '隱藏原始圖片' : '查看原始圖片'}
                                </button>
                            )}
                            {showImage && imagePreview && (
                                <div className="rounded-xl overflow-hidden border shadow-sm">
                                    <img src={imagePreview} alt="原始菜單" className="w-full" />
                                </div>
                            )}

                            {/* 全店通用客製化選項 (方案A) */}
                            {convertedData.globalOptions?.length > 0 && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-semibold text-yellow-800 flex items-center gap-2">
                                            <Sparkles className="w-5 h-5 text-yellow-500" />
                                            偵測到 {convertedData.globalOptions.length} 項全店通用選項
                                        </h4>
                                        <button
                                            onClick={applyGlobalOptionsToAll}
                                            disabled={convertedData.globalOptionsApplied}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                                convertedData.globalOptionsApplied
                                                    ? 'bg-yellow-200 text-yellow-600 cursor-not-allowed'
                                                    : 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-sm'
                                            }`}
                                        >
                                            {convertedData.globalOptionsApplied ? '✓ 已套用至所有品項' : '一鍵套用至所有品項'}
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {convertedData.globalOptions.map((opt, i) => (
                                            <div key={i} className="bg-white border text-sm border-yellow-100 rounded-lg px-3 py-1.5 shadow-sm">
                                                <span className="font-bold text-yellow-700">{opt.name}</span>
                                                <span className="text-gray-400 mx-1">|</span>
                                                <span className="text-gray-600">{opt.choices.map(c => c.name).join('、')}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {!convertedData.globalOptionsApplied && (
                                        <p className="text-xs text-yellow-600 mt-2">
                                            💡 請點擊上方按鈕，系統將自動這些把選項附加上到下方所有辨識出的飲料中。
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* 衝突項目 */}
                            {convertedData.conflicts.length > 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                    <h4 className="font-semibold text-amber-700 flex items-center gap-2 mb-3">
                                        <AlertTriangle className="w-4 h-4" />
                                        偵測到 {convertedData.conflicts.length} 個重複品項
                                    </h4>
                                    <div className="space-y-2">
                                        {convertedData.conflicts.map((conflict, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-100">
                                                <div>
                                                    <span className="font-medium text-gray-700">{conflict.itemName}</span>
                                                    <span className="text-xs text-gray-400 ml-2">({conflict.categoryName})</span>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        現有: ${conflict.existing.price} → 新: ${conflict.incoming.price}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => toggleConflictAction(idx)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${conflict.action === 'skip'
                                                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                            : 'bg-amber-500 text-white hover:bg-amber-600'
                                                        }`}
                                                >
                                                    {conflict.action === 'skip' ? '保留現有' : '覆蓋'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 辨識結果清單 */}
                            <div className="space-y-3">
                                <h4 className="font-semibold text-gray-700">辨識結果預覽</h4>
                                {convertedData.categories.map((cat) => (
                                    <div key={cat.name} className="border rounded-xl overflow-hidden">
                                        <button
                                            onClick={() => toggleCategory(cat.name)}
                                            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-700">{cat.name}</span>
                                                {cat._isNew && (
                                                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">新分類</span>
                                                )}
                                                <span className="text-xs text-gray-400">{cat.items.length} 個品項</span>
                                            </div>
                                            {expandedCategories.has(cat.name) ? (
                                                <ChevronUp className="w-4 h-4 text-gray-400" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-gray-400" />
                                            )}
                                        </button>
                                        {expandedCategories.has(cat.name) && (
                                            <div className="divide-y">
                                                {cat.items.map((item) => (
                                                    <div key={item.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-gray-700 truncate">{item.name}</span>
                                                                {item.variants?.length > 0 && (
                                                                    <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
                                                                        {item.variants.length} 規格
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {item.description && (
                                                                <p className="text-xs text-gray-500 mt-0.5 truncate">{item.description}</p>
                                                            )}
                                                            {item.options?.length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                                    {item.options.map((opt, oi) => (
                                                                        <div key={oi} className="flex items-center bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5" title={opt.choices.map(c => c.name).join(', ')}>
                                                                            <Sparkles className="w-2.5 h-2.5 text-amber-500 mr-1" />
                                                                            <span className="text-[10px] font-medium text-amber-700">{opt.name}: </span>
                                                                            <span className="text-[10px] text-amber-600 ml-1">{opt.choices.length}項</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {item.variants?.length > 0 && (
                                                                <div className="flex gap-2 mt-1 flex-wrap">
                                                                    {item.variants.map((v, vi) => (
                                                                        <span key={vi} className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                                                                            {v.name} ${v.price}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 ml-3">
                                                            <span className="font-bold text-violet-600">${item.price}</span>
                                                            <button
                                                                onClick={() => removeItem(cat.name, item.name)}
                                                                className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                                                title="移除此品項"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* === 匯入成功 === */}
                    {scanState === 'success' && (
                        <div className="flex flex-col items-center py-12 gap-4">
                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                                <Check className="w-8 h-8 text-green-600" />
                            </div>
                            <p className="font-semibold text-green-700 text-lg">菜單已成功匯入！</p>
                            <p className="text-sm text-gray-500">請記得點擊「儲存」保存變更</p>
                        </div>
                    )}
                </div>

                {/* Footer (操作按鈕) */}
                {scanState === 'preview' && (
                    <div className="border-t px-6 py-4 bg-gray-50 flex items-center justify-between">
                        <div className="flex gap-2">
                            <button
                                onClick={handleRetry}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-2 text-sm"
                            >
                                <RefreshCw className="w-4 h-4" /> 重新辨識
                            </button>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors text-sm"
                            >
                                取消
                            </button>
                        </div>
                        <button
                            onClick={handleImport}
                            disabled={convertedData?.categories?.length === 0}
                            className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all flex items-center gap-2 font-medium shadow-lg shadow-violet-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Check className="w-4 h-4" /> 匯入 {convertedData?.stats?.totalItems || 0} 個品項
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIMenuScanner;
