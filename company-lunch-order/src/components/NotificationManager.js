// src/components/NotificationManager.js
import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { ORDER_STATUS_TEXT, ORDER_STATUS } from '../services/orderService';
import { Bell, X, CheckCircle, Coffee, AlertCircle } from 'lucide-react';

const NotificationManager = () => {
    const { currentUser } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const initialLoadDone = useRef(false);

    const [permission, setPermission] = useState('Notification' in window ? Notification.permission : 'denied');

    const requestPermission = async () => {
        if ('Notification' in window) {
            const result = await Notification.requestPermission();
            setPermission(result);
            if (result === 'granted') {
                addNotification({
                    id: 'perm-success',
                    title: '推播已開啟',
                    message: '您現在可以在背景收到訂單通知了！',
                    type: 'success'
                });
            }
        }
    };

    useEffect(() => {
        if (!currentUser) return;

        // 監聽當天使用者的訂單
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const q = query(
            collection(db, 'orders'),
            where('userId', '==', currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!initialLoadDone.current) {
                initialLoadDone.current = true;
                return; // 跳過初始載入
            }

            snapshot.docChanges().forEach((change) => {
                const data = change.doc.data();
                const updatedAt = data.updatedAt?.toDate() || new Date();

                // 只處理 modified 的情況，並且不重複跳已建立的通知 (通常只關注當天)
                if (change.type === 'modified' && updatedAt >= today) {
                    const statusText = ORDER_STATUS_TEXT[data.status] || data.status;

                    // 根據不同狀態給予不同的樣式與圖標
                    let type = 'info';
                    if (data.status === ORDER_STATUS.READY || data.status === ORDER_STATUS.COMPLETED) type = 'success';
                    if (data.status === ORDER_STATUS.CANCELLED) type = 'error';
                    if (data.status === ORDER_STATUS.PREPARING) type = 'warning';

                    const message = `您的訂單 (${data.restaurantName}) 目前狀態已變更為「${statusText}」！`;

                    // 1. 站內通知 UI
                    addNotification({
                        id: Date.now() + Math.random(),
                        title: '訂單狀態更新',
                        message,
                        type,
                        status: data.status
                    });

                    // 2. 瀏覽器系統推播 (若在背景也能收到)
                    if ('Notification' in window && Notification.permission === 'granted') {
                        try {
                            new Notification('🛎️ 訂單狀態更新', {
                                body: message,
                                icon: '/favicon.ico' // 可以換成系統 logo
                            });
                        } catch (e) {
                            console.warn('無法發送系統推播:', e);
                        }
                    }
                }
            });
        }, (error) => {
            console.error('監聽訂單狀態錯誤:', error);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const addNotification = (notif) => {
        setNotifications(prev => [notif, ...prev]);
        // 自動消除
        setTimeout(() => {
            removeNotification(notif.id);
        }, 6000);
    };

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    if (notifications.length === 0 && permission !== 'default') return null;

    const getTypeStyles = (type) => {
        switch (type) {
            case 'success':
                return { border: 'border-green-500', icon: <CheckCircle className="text-green-500" size={20} /> };
            case 'warning':
                return { border: 'border-orange-500', icon: <Coffee className="text-orange-500" size={20} /> };
            case 'error':
                return { border: 'border-red-500', icon: <AlertCircle className="text-red-500" size={20} /> };
            default:
                return { border: 'border-blue-500', icon: <Bell className="text-blue-500" size={20} /> };
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
            {/* 權限請求提示 (當權限尚未決定時顯示) */}
            {permission === 'default' && (
                <div className="bg-indigo-600 text-white rounded-lg shadow-xl p-4 flex items-center justify-between pointer-events-auto animate-pulse">
                    <div className="flex items-center">
                        <Bell className="mr-3" size={24} />
                        <div>
                            <p className="font-bold text-sm">想要收到即時通知嗎？</p>
                            <p className="text-xs opacity-90">開啟瀏覽器推播，不錯過任何訂單更新</p>
                        </div>
                    </div>
                    <button 
                        onClick={requestPermission}
                        className="ml-4 bg-white text-indigo-600 px-3 py-1 rounded-md text-sm font-bold hover:bg-indigo-50 transition-colors"
                    >
                        立即開啟
                    </button>
                </div>
            )}

            {notifications.map(n => {
                const styles = getTypeStyles(n.type);
                return (
                    <div
                        key={n.id}
                        className={`bg-white dark:bg-slate-800 rounded-lg shadow-xl border-l-[6px] ${styles.border} overflow-hidden transform transition-all duration-300 pointer-events-auto`}
                    >
                        <div className="p-4 flex items-start">
                            <div className="flex-shrink-0 mt-0.5 animate-bounce">
                                {styles.icon}
                            </div>
                            <div className="ml-3 w-0 flex-1 pt-0.5">
                                <p className="text-sm font-bold text-gray-900 dark:text-white">{n.title}</p>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 font-medium">
                                    {n.message}
                                </p>
                            </div>
                            <div className="ml-4 flex-shrink-0 flex">
                                <button
                                    onClick={() => removeNotification(n.id)}
                                    className="bg-white dark:bg-slate-800 rounded-md inline-flex text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default NotificationManager;
