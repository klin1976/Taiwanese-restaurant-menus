// src/components/admin/FixUserRoles.js
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { fixMissingUserRoles, isSuperAdmin } from '../../services/roleService';

const FixUserRoles = ({ onBack }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [canAccess, setCanAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [result, setResult] = useState(null);

  // 檢查權限
  React.useEffect(() => {
    const checkPermission = async () => {
      if (currentUser) {
        const hasAccess = await isSuperAdmin(currentUser.uid);
        setCanAccess(hasAccess);
        
        if (!hasAccess) {
          alert('您沒有權限使用此工具');
        }
      }
      setCheckingAccess(false);
    };

    checkPermission();
  }, [currentUser]);

  // 執行批次修復
  const handleFix = async () => {
    if (!window.confirm('確定要執行批次修復嗎？\n\n這將為所有缺少角色記錄的使用者建立預設角色。')) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      console.log('🔧 開始執行批次修復...');
      const fixResult = await fixMissingUserRoles();
      
      setResult(fixResult);
      
      if (fixResult.fixed > 0) {
        alert(`✅ 批次修復完成！\n\n共修復 ${fixResult.fixed} 個使用者`);
      } else {
        alert('ℹ️ 所有使用者都已有角色記錄，無需修復');
      }
    } catch (error) {
      console.error('❌ 批次修復失敗:', error);
      alert(`批次修復失敗：${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 檢查中
  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">檢查權限中...</p>
        </div>
      </div>
    );
  }

  // 無權限
  if (!canAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">存取被拒</h2>
          <p className="text-gray-600 mb-6">您沒有權限使用此工具</p>
          <button
            onClick={onBack}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      {/* 標頭 */}
      <div className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">🔧 批次修復使用者角色</h1>
                <p className="text-sm text-gray-600 mt-1">自動為缺少角色記錄的使用者建立預設角色</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 說明卡片 */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border border-gray-100">
          <div className="flex items-start mb-6">
            <div className="text-4xl mr-4">ℹ️</div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-3">功能說明</h2>
              <div className="space-y-2 text-gray-600">
                <p>此工具會執行以下操作：</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>掃描所有在 <code className="bg-gray-100 px-2 py-0.5 rounded text-sm">users</code> collection 中的使用者</li>
                  <li>檢查每個使用者是否有對應的 <code className="bg-gray-100 px-2 py-0.5 rounded text-sm">userRoles</code> 記錄</li>
                  <li>為缺少角色記錄的使用者自動建立預設角色（一般使用者）</li>
                  <li>顯示修復結果和錯誤訊息（如有）</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800 mb-1">注意事項</p>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• 此操作會直接寫入 Firestore 資料庫</li>
                  <li>• 建議在非營業高峰時段執行</li>
                  <li>• 執行前請確認 Firestore 安全規則允許寫入 userRoles collection</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 執行按鈕 */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">執行修復</h2>
          
          <button
            onClick={handleFix}
            disabled={loading}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-colors flex items-center justify-center ${
              loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg'
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                執行中...
              </>
            ) : (
              <>
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                開始批次修復
              </>
            )}
          </button>
        </div>

        {/* 結果顯示 */}
        {result && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mt-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">修復結果</h2>
            
            <div className="space-y-4">
              {/* 成功修復 */}
              <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-green-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="font-bold text-green-800">成功修復</p>
                    <p className="text-green-700">共修復 <span className="font-bold text-2xl">{result.fixed}</span> 個使用者</p>
                  </div>
                </div>
              </div>

              {/* 錯誤訊息 */}
              {result.errors && result.errors.length > 0 && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                  <div className="flex items-start">
                    <svg className="w-6 h-6 text-red-600 mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="font-bold text-red-800 mb-2">發生錯誤 ({result.errors.length} 個)</p>
                      <div className="space-y-2">
                        {result.errors.map((error, index) => (
                          <div key={index} className="bg-white p-3 rounded border border-red-200">
                            <p className="text-sm text-red-800">
                              <span className="font-medium">使用者:</span> {error.email || error.userId}
                            </p>
                            <p className="text-sm text-red-600 mt-1">
                              <span className="font-medium">錯誤:</span> {error.error}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 建議 */}
              {result.fixed > 0 && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-800 mb-1">建議</p>
                      <p className="text-sm text-blue-700">
                        修復完成後，建議前往「角色權限管理」頁面確認所有使用者的角色是否正確。
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 使用說明 */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mt-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">常見問題</h2>
          
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
              <h3 className="font-semibold text-gray-900 mb-2">Q: 什麼時候需要使用此工具？</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                A: 當您在「角色權限管理」頁面發現使用者數量與實際註冊人數不符時，可能有部分使用者缺少角色記錄。此工具可以自動修復這個問題。
              </p>
            </div>

            <div className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
              <h3 className="font-semibold text-gray-900 mb-2">Q: 修復後的使用者會是什麼角色？</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                A: 所有透過此工具修復的使用者都會被設定為「一般使用者」角色。如需調整，請前往「角色權限管理」頁面手動修改。
              </p>
            </div>

            <div className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
              <h3 className="font-semibold text-gray-900 mb-2">Q: 會影響現有的角色記錄嗎？</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                A: 不會。此工具只會為「沒有」角色記錄的使用者建立新記錄，不會修改已存在的角色。
              </p>
            </div>

            <div className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
              <h3 className="font-semibold text-gray-900 mb-2">Q: 可以重複執行嗎？</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                A: 可以。重複執行是安全的，系統會自動跳過已有角色記錄的使用者。
              </p>
            </div>

            <div className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
              <h3 className="font-semibold text-gray-900 mb-2">Q: 執行需要多長時間？</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                A: 執行時間取決於使用者數量。一般來說，100 個使用者大約需要 10-20 秒。執行期間請勿關閉頁面。
              </p>
            </div>
          </div>
        </div>

        {/* 技術資訊 */}
        <div className="bg-gray-50 rounded-xl p-6 mt-6 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">技術資訊</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600">
            <div>
              <p className="font-medium text-gray-700 mb-1">資料來源</p>
              <p><code className="bg-white px-2 py-1 rounded border border-gray-300">users</code> collection</p>
            </div>
            <div>
              <p className="font-medium text-gray-700 mb-1">寫入目標</p>
              <p><code className="bg-white px-2 py-1 rounded border border-gray-300">userRoles</code> collection</p>
            </div>
            <div>
              <p className="font-medium text-gray-700 mb-1">預設角色</p>
              <p><code className="bg-white px-2 py-1 rounded border border-gray-300">user</code> (一般使用者)</p>
            </div>
            <div>
              <p className="font-medium text-gray-700 mb-1">分配者</p>
              <p><code className="bg-white px-2 py-1 rounded border border-gray-300">system</code></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FixUserRoles;