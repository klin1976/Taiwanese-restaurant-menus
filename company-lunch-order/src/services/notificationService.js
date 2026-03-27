// src/services/notificationService.js
/**
 * 通知服務 - 處理各類通知傳送
 * 目前支援：Microsoft Teams Webhook (使用最穩定的 MessageCard 格式)
 */

import { functions, db } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';

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

export const notifyUserOrderStatusChanged = async (orderId, newStatus) => {
  try {
    // 取得訂單詳情
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) return;

    const orderData = orderSnap.data();
    const statusTexts = {
      '待確認': '待產中',
      '已確認': '訂單已由店家確認 (接單)',
      '準備中': '餐點準備中',
      '可取餐': '餐點已做好，快來拿喔！',
      '已完成': '訂單已成立並完成',
      '已取消': '訂單已被取消'
    };

    const statusText = statusTexts[newStatus] || newStatus;

    const payload = {
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      "themeColor": newStatus === '已取消' ? "E81123" : "0076D7",
      "summary": `訂單狀態變更: ${statusText}`,
      "sections": [{
        "activityTitle": "🔔 訂單狀態更新",
        "activitySubtitle": `訂單編號: ${orderData.orderNumber || orderId}`,
        "facts": [
          { "name": "新狀態", "value": statusText },
          { "name": "店家", "value": orderData.restaurantName },
          { "name": "訂購人", "value": orderData.userName }
        ],
        "text": `您的訂單狀態已更改為 **${statusText}**。`
      }],
      "potentialAction": [
        {
          "@type": "OpenUri",
          "name": "查看個人訂單",
          "targets": [{ "os": "default", "uri": window.location.origin + "/orders" }]
        }
      ]
    };

    await sendTeamsNotification(payload);
  } catch (error) {
    console.error('[通知] 發送用戶通知出錯:', error);
  }
};

/**
 * 整合式合併訂單通知 (專供 mergeOrder 使用)
 */
export const notifyStoreOrderMerged = async (order, existingOrderNumber, mergeDetails) => {
  const { originalItems, newTotal, addAmount } = mergeDetails;

  const originalItemsText = originalItems
    .map(item => `- ${item.name} x${item.quantity}`)
    .join('\n');

  const newItemsText = order.items
    .map(item => `- ${item.name} x${item.quantity} ($${item.totalPrice || item.price})`)
    .join('\n');

  const payload = {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "themeColor": "F39C12",
    "summary": `訂單合併追加 - ${existingOrderNumber}`,
    "sections": [{
      "activityTitle": "🔄 訂單合併追加通知",
      "activitySubtitle": `編號: ${existingOrderNumber}`,
      "facts": [
        { "name": "🏪 店家", "value": order.restaurantName },
        { "name": "👤 訂購人", "value": order.userName },
        { "name": "💰 原金額", "value": `NT$ ${newTotal - addAmount}` },
        { "name": "➕ 追加金額", "value": `NT$ ${addAmount}` },
        { "name": "💎 總金額", "value": `**NT$ ${newTotal}**` }
      ],
      "text": `### 📝 原有清單\n${originalItemsText}\n\n### 🆕 追加內容\n${newItemsText}\n\n**註記：** 系統已自動合併至現有單號。`
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
