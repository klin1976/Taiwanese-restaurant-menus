// src/services/notificationService.js
/**
 * 通知服務 - 處理各類通知傳送
 * 目前支援：Google Chat Webhook
 */

// Google Chat Webhook URL (可在未來改為從店家設定中讀取)
// 🔑 請將此 URL 替換為您的實際 Webhook 連結
const GOOGLE_CHAT_WEBHOOK_URL = process.env.REACT_APP_GOOGLE_CHAT_WEBHOOK || '';

/**
 * 發送訊息至 Google Chat
 * @param {string} message - 純文字訊息
 * @param {object} options - 額外選項 (可選)
 * @returns {Promise<boolean>} - 是否發送成功
 */
export const sendGoogleChatNotification = async (message, options = {}) => {
    const webhookUrl = options.webhookUrl || GOOGLE_CHAT_WEBHOOK_URL;

    if (!webhookUrl) {
        console.warn('[通知] Google Chat Webhook URL 未設定，跳過發送');
        return false;
    }

    try {
        const payload = {
            text: message
        };

        // 如果有提供卡片格式，使用卡片
        if (options.card) {
            payload.cards = [options.card];
        }

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log('[通知] Google Chat 訊息發送成功');
            return true;
        } else {
            console.error('[通知] Google Chat 發送失敗:', response.status, response.statusText);
            return false;
        }
    } catch (error) {
        console.error('[通知] Google Chat 發送錯誤:', error);
        return false;
    }
};

/**
 * 發送新訂單通知 (給店家)
 * @param {object} order - 訂單物件
 */
export const notifyStoreNewOrder = async (order) => {
    const itemList = order.items
        .map(item => `• ${item.name} x${item.quantity} ($${item.price})`)
        .join('\n');

    const message = `🔔 *新訂單通知*
━━━━━━━━━━━━━━━━━━━
📝 訂單編號：${order.orderNumber || order.id}
🏪 店家：${order.restaurantName}
👤 訂購人：${order.userName}
━━━━━━━━━━━━━━━━━━━
${itemList}
━━━━━━━━━━━━━━━━━━━
💰 *總金額：NT$ ${order.totalAmount}*

⏰ 請盡快確認訂單！`;

    await sendGoogleChatNotification(message);
};

/**
 * 發送訂單取消通知 (給店家)
 * @param {object} order - 訂單物件
 */
export const notifyStoreOrderCancelled = async (order) => {
    const message = `❌ *訂單取消通知*
━━━━━━━━━━━━━━━━━━━
📝 訂單編號：${order.orderNumber || order.id}
👤 訂購人：${order.userName}
━━━━━━━━━━━━━━━━━━━
此訂單已被使用者取消。`;

    await sendGoogleChatNotification(message);
};

/**
 * 發送訂單狀態變更通知 (給使用者 - 未來擴充用)
 * @param {object} order - 訂單物件  
 * @param {string} newStatus - 新狀態
 */
export const notifyUserOrderStatusChanged = async (order, newStatus) => {
    // 預留：未來可串接其他通知管道 (Email, Line, 站內通知等)
    console.log(`[通知-預留] 通知使用者 ${order.userName}: 訂單 ${order.orderNumber || order.id} 狀態變更為 ${newStatus}`);
};
