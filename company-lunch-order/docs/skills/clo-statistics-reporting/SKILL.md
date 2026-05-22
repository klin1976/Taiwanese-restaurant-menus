---
name: clo-statistics-reporting
description: >
  適用於公司午餐訂購系統（CLO）的「營業統計報表與 CSV 導出」模組開發。
  當需要修改統計計算邏輯、訂單日期篩選、熱銷商品排行、以及處理 Excel 開啟 CSV 時的 UTF-8 中文亂碼（BOM 地雷）時，務必使用此技能。
  觸發關鍵字包含：統計報表、營業統計、csvExporter、papaparse、statisticsService、OrderStatistics、BOM亂碼、\uFEFF、Excel亂碼。
---

# CLO 營業統計報表與 CSV 導出開發技能

## 系統定位

- **專案名稱**：company-lunch-order (公司午餐訂購系統)
- **技術棧**：React + Firestore Direct Access (`orders` collection) + `papaparse` (CSV 導出庫)
- **核心目標**：為管理員提供即時的數據決策支援。統計結果主要由前端於記憶體中，針對篩選出來的批量訂單進行動態計算聚合，避免高昂的後端計算成本。

---

## 模組架構與檔案關聯

```
src/
├── services/
│   └── statisticsService.js     ← 統計分析計算核心，包含店家、使用者、熱銷商品的聚合計算
├── utils/
│   └── csvExporter.js           ← CSV 報表生成與防亂碼下載工具 (BOM \uFEFF)
└── components/
    └── admin/
        └── OrderStatistics.js   ← 統計報表 UI 畫面，包含日期篩選、摘要卡片與各項統計圖表
```

---

## 核心計算邏輯 (`statisticsService.js`)

統計服務從 Firestore 中拉取指定日期區間的訂單，並在 JavaScript 記憶體中進行高效聚合：

```javascript
export const calculateOrderStatistics = (orders) => {
  const stats = {
    totalRevenue: 0,
    totalOrders: 0,
    byStore: {},
    byUser: {},
    topItems: {}
  };

  orders.forEach(order => {
    // 排除已取消的訂單
    if (order.status === '已取消') return;

    stats.totalOrders++;
    stats.totalRevenue += order.totalAmount;

    // A. 依店家聚合
    if (!stats.byStore[order.restaurantId]) {
      stats.byStore[order.restaurantId] = { name: order.restaurantName, total: 0, count: 0 };
    }
    stats.byStore[order.restaurantId].total += order.totalAmount;
    stats.byStore[order.restaurantId].count++;

    // B. 依商品聚合 (熱銷排行)
    order.items.forEach(item => {
      if (!stats.topItems[item.id]) {
        stats.topItems[item.id] = { name: item.name, quantity: 0, revenue: 0 };
      }
      stats.topItems[item.id].quantity += item.quantity;
      stats.topItems[item.id].revenue += (item.price * item.quantity);
    });
  });

  return stats;
};
```

---

## 關鍵技術與防亂碼地雷 (Excel BOM)

### 1. Windows Excel 中文亂碼防禦機制 (BOM)
> [!CAUTION]
> **中文 CSV 亂碼地雷**：
> 當導出的 CSV 含有中文字（如姓名、店名、商品名），若直接以標準 UTF-8 寫入，Windows 系統的 Excel 會在開啟時因為無法辨識編碼而將中文字全部顯示為**亂碼**。
> 
> **解決方案 (BOM 注入)**：
> 在 CSV 字串轉換完成後，必須在文件頭手動附加「**BOM 標記 (`\uFEFF`)**」後再進行 Blob 封裝，以強制 Excel 使用 UTF-8 解碼：

```javascript
import Papa from 'papaparse';

export const exportToCSV = (data, filename) => {
  // 1. 使用 papaparse 將 JSON 轉換為 CSV 字串
  const csvString = Papa.unparse(data);

  // 2. 核心防亂碼：在 CSV 內容最前面強行加入 BOM 標記 (\uFEFF)
  const bomCsvString = '\uFEFF' + csvString;

  // 3. 封裝為 blob 下載
  const blob = new Blob([bomCsvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
```

### 2. 時區與日期過濾基準
Firestore `Timestamp` 預設以 UTC 儲存。統計時，前端必須將日期篩選範圍精確轉換為當地的 `00:00:00` 至 `23:59:59`，以免產生跨日訂單統計遺漏的問題。

---

## 測試與驗證計畫

1. **BOM 亂碼驗證**：導出一份含有「富家小鋪」、「珍珠奶茶」、「王大明」等中文資料的 CSV 檔案。下載後直接在 **Windows Excel 中按兩下開啟**，確認中文字元顯示完美，無任何亂碼。
2. **統計正確性測試**：
   - 設定兩筆各 100 元且已確認的訂單，以及一筆 50 元但已取消的訂單。
   - 驗證統計總營業額是否為 200 元（不包含已取消的 50 元）。
3. **日期篩選驗證**：選擇「今天」的日期範圍，確認只會拉出今天的訂單，不包含昨天或明天的訂單。
