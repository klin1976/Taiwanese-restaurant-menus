// src/components/ErrorBoundary.js
import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { devError } from '../utils/devLog';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    devError('❌ ErrorBoundary 捕獲錯誤:', error);
    devError('錯誤資訊:', errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
  }

  handleRetry = async () => {
    try {
      // 清除認證狀態
      await signOut(auth);
      
      // 清除 localStorage
      localStorage.clear();
      
      // 重新載入頁面
      window.location.reload();
    } catch (error) {
      devError('重試失敗:', error);
      // 強制重新載入
      window.location.reload();
    }
  };

  handleGoHome = () => {
    this.setState({ hasError: false });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 px-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            {/* 錯誤圖標 */}
            <div className="mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-full mx-auto flex items-center justify-center">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>

            {/* 錯誤標題 */}
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              糟糕！發生了一些問題
            </h1>

            {/* 錯誤說明 */}
            <p className="text-gray-600 mb-6">
              系統遇到了意外的錯誤。請嘗試重新整理頁面，或點擊下方按鈕重試。
            </p>

            {/* 開發環境顯示錯誤詳情 */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg text-left">
                <p className="text-xs font-mono text-red-800 mb-2 font-semibold">
                  錯誤訊息：
                </p>
                <p className="text-xs font-mono text-red-700 break-all">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-3">
                    <summary className="text-xs text-red-600 cursor-pointer hover:text-red-800">
                      查看詳細堆疊
                    </summary>
                    <pre className="text-xs mt-2 text-red-700 overflow-auto max-h-40">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* 操作按鈕 */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleRetry}
                className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                🔄 重新載入
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
              >
                🏠 返回首頁
              </button>
            </div>

            {/* 提示文字 */}
            <p className="mt-6 text-sm text-gray-500">
              如果問題持續發生，請聯繫系統管理員
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;