// src/services/notificationService.js
/**
 * 通知服務 - 處理各類通知傳送
 * 目前支援：Microsoft Teams Webhook (使用最穩定的 MessageCard 格式)
 */

import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';

/**
 * 發送訊息至 Microsoft Teams (透過 Firebase Cloud Functions 避開 CORS)
 */
export const sendTeamsNotification = async (payload) => {
  try {
    console.log('[通知] 正在透過 Cloud Function 發送至 Teams...', payload.summary);
    const sendTeamsFunc = httpsCallable(functions, 'sendTeamsNotification');

    // Fix: Stringify payload on client side to avoid serialization issues in onCall
    const payloadString = JSON.stringify(payload);
    const result = await sendTeamsFunc({ payload: payloadString });

    if (result.data && result.data.success) {
      console.log('[通知] Teams 訊息發送成功');
      return true;
    } else {
      console.error('[通知] Teams 發送失敗:', result.data?.error || '未知錯誤');
      return false;
    }
  } catch (error) {
    console.error('[通知] 呼叫 Cloud Function 錯誤:', error);
    return false;
  }
};

/**
 * 發送新訂單通知 (使用 MessageCard 確保傳統 Webhook 相容性)
 */
export const notifyStoreNewOrder = async (order) => {
  const itemsText = order.items
    .map(item => `- ${item.name} x${item.quantity} ($${item.totalPrice || item.price})`)
    .join('\n');

  const payload = {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "themeColor": "0076D7",
    "summary": "新訂單通知 - " + (order.orderNumber || order.id),
    "sections": [{
      "activityTitle": "🔔 新訂單通知",
      "activitySubtitle": `編號: ${order.orderNumber || order.id}`,
      "facts": [
        { "name": "🏪 店家", "value": order.restaurantName },
        { "name": "👤 訂購人", "value": order.userName },
        { "name": "💰 總金額", "value": `NT$ ${order.totalAmount}` }
      ],
      "text": `### 訂單內容\n${itemsText}\n\n**註記：** ${order.note || '無'}`
    }],
    "potentialAction": [
      {
        "@type": "OpenUri",
        "name": "查看訂單詳情",
        "targets": [{ "os": "default", "uri": window.location.origin + "/admin/orders" }]
      }
    ]
  };

  await sendTeamsNotification(payload);
};

/**
 * 發送訂單取消通知
 */
export const notifyStoreOrderCancelled = async (order) => {
  const payload = {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "themeColor": "E81123",
    "summary": "訂單取消通知",
    "sections": [{
      "activityTitle": "❌ 訂單已取消",
      "facts": [
        { "name": "📝 訂單編號", "value": order.orderNumber || order.id },
        { "name": "👤 訂購人", "value": order.userName }
      ],
      "text": "此訂單已被使用者取消。"
    }]
  };

  await sendTeamsNotification(payload);
};

export const notifyUserOrderStatusChanged = async (order, newStatus) => {
  console.log(`[通知-預留] 使用者通知: ${newStatus}`);
};
