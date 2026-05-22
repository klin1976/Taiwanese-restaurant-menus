---
name: clo-notification-system
description: >
  適用於公司午餐訂購系統（CLO）的「即時通知系統與 Teams Webhook 對接」模組開發。
  當需要修改 Firestore 即時訂單監聽器（onSnapshot）、瀏覽器原生推播通知（Browser Push Notification）、系統內置 Toast 通知、以及 Cloud Functions 中的 Teams 頻道 Webhook 傳送邏輯時，務必使用此技能。
  觸發關鍵字包含：通知系統、即時通知、Teams通知、sendTeamsNotification、NotificationManager、onSnapshot、Browser Notification、requestPermission、Push推播。
---

# CLO 即時通知系統與 Teams Webhook 開發技能

## 系統定位

- **專案名稱**：company-lunch-order (公司午餐訂購系統)
- **技術棧**：React + Firestore `onSnapshot` (即時監聽) + Browser Notification API + Firebase Functions + Microsoft Teams Webhook
- **核心目標**：確保訂單狀態變更（例如「可取餐」）能即時、多管道地送達使用者與管理員，以防餐點遺忘。包含網頁內置 Toast、作業系統原生推播與外部 Teams 頻道。

---

## 模組架構與檔案關聯

```
functions/ (Cloud Functions 後端)
└── index.js                  ← 匯出 sendTeamsNotification 函式，對接 Teams Webhook API

src/ (React 前端)
├── services/
│   └── notificationService.js ← 前端通知服務，負責 Teams 格式組裝與 Functions 發送
└── components/
    └── NotificationManager.js ← 實時通知核心元件，實現 Firestore 監聽與雙軌通知 (Toast + Push)
```

---

## 核心技術實現與通知管道

### 1. 雙軌通知機制 (Toast + Browser Push)
`NotificationManager.js` 在使用者登入後啟動。它首先向使用者請求瀏覽器通知權限，並啟動 Firestore `onSnapshot` 即時監聽與該使用者相關的訂單：

```javascript
// 請求瀏覽器原生通知權限
const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);
  }
};

// 啟動即時監聽與狀態過濾
useEffect(() => {
  if (!currentUser) return;

  const q = query(
    collection(db, 'orders'),
    where('userId', '==', currentUser.uid)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      // 排除初次加載，只處理 "modified" (狀態變更)
      if (change.type === 'modified') {
        const order = change.doc.data();
        triggerDoubleNotification(order);
      }
    });
  });

  return () => unsubscribe();
}, [currentUser]);
```

#### 雙軌觸發邏輯：
- **軌道一 (In-App Toast)**：在網頁內部彈出漂亮的 Toast 視窗，設定 `setTimeout` 在 6 秒後自動淡出移除。
- **軌道二 (Browser Push)**：若瀏覽器通知權限為 `granted`，且網頁處於背景（`document.hidden === true`），則調用操作系統原生通知視窗，發送推播：

```javascript
new Notification(`訂單狀態更新：${order.restaurantName}`, {
  body: `您的訂單 (單號: ${order.orderNumber}) 狀態已變更為【${order.status}】！`,
  icon: '/logo192.png'
});
```

---

## 2. 後端 Teams Webhook 通知管道
當新訂單建立、取消或被合併時，系統會調用 `notificationService.js` 組裝符合 Microsoft Teams Message Card 格式的 JSON Payload，並呼叫 Cloud Function 發送：

### Teams Message Card 格式範例：
```json
{
  "@type": "MessageCard",
  "@context": "http://schema.org/extensions",
  "themeColor": "0078D7",
  "summary": "新訂單通知",
  "sections": [{
    "activityTitle": "🔔 收到新訂單！",
    "activitySubtitle": "店家：富家小鋪",
    "facts": [
      { "name": "訂單編號", "value": "20260522-0001" },
      { "name": "訂購人", "value": "王大明" },
      { "name": "總金額", "value": "NT$ 180" }
    ],
    "markdown": true
  }]
}
```

後端 Functions (`sendTeamsNotification`) 從環境變數安全讀取 Webhook URL，使用 `node-fetch` POST 傳送。

---

## 測試與驗證計畫

1. **瀏覽器推播測試 (Push)**：
   - 登入系統並允許通知權限。
   - 將瀏覽器**縮小至背景**，或切換到其他分頁。
   - 由另一名帳號（管理員）將你的訂單狀態修改為「可取餐」。
   - 驗證電腦的作業系統右下角（或右上角）是否彈出原生推播通知。
2. **Teams 通知測試**：
   - 在開發環境下送出一筆訂單。
   - 檢查對接的 Teams 測試頻道是否即時收到格式精美、含有訂單明細與金額的 Message Card。
3. **已讀與清理測試**：確認 Toast 提示在顯示 6 秒後會自動平滑地從 DOM 中移除，無殘留記憶體洩漏。
