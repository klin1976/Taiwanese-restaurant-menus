---
name: wms-qc-backend
description: >
  撰寫 WMS 品質管制模組（QC）的後端程式碼（ASP.NET SOAP WebService / C#）。
  當使用者需要實作或修改 QC 狀態查詢、QC 決策寫入、Class A 自動隔離移倉、
  阻斷紀錄、狀態變更歷程、解除隔離等 QC 相關 WebMethod / ADO 時，務必使用此 skill。
  涉及移倉共用邏輯（GM 單號生成、庫存更新、物料屬性複製、TGoodsMovementHeaderAdo、
  TGoodsMovementDetailAdo）請同時參照 wms-goods-movement-backend/SKILL.md。
  觸發關鍵字：QC後端、品質管制後端、saveQCDecision、getQCStatusByMtlLotNo、
  saveQCBlockLog、TQcInspectionRecordAdo、TQcBlockLogAdo、TQcStatusLogAdo、
  QC隔離、QC阻斷、特採放行、品質卡控、T_QC_INSPECTION_RECORD、T_QC_BLOCK_LOG。
---

# WMS QC 後端開發 Skill（ASP.NET SOAP WebService / C#）

## 系統定位

- **專案名稱**：WMS_WebService（與移倉模組同一 WebService 專案）
- **技術棧**：ASP.NET SOAP WebService + ADO.NET + SQL Server
- **入口類別**：`Service.cs`（定義 QC WebMethod）
- **業務邏輯**：`EntryService.cs`（聚合 ADO 操作，QC 段與移倉段共用同一 class）
- **架構繼承**：完全沿用 wms-goods-movement-backend 的三層架構（Service → EntryService → ADO）

> **共用邏輯請參照** `wms-goods-movement-backend/SKILL.md`：
> SqlTransaction 開啟/傳遞方式、ConnectionUtils.OpenConnection/CloseConnection、
> ADO 設計原則（一類別對一資料表）、log 格式、DataTable 回傳型態。

---

## QC 類別架構

```
WMS_WebService/
├── Service.cs                      ← QC WebMethod 入口
├── EntryService.cs                 ← QC 業務邏輯（saveQCDecision 等）
└── Ado/
    ├── TQcInspectionRecordAdo      ← SELECT/INSERT/UPDATE T_QC_INSPECTION_RECORD
    ├── TQcBlockLogAdo              ← INSERT T_QC_BLOCK_LOG
    └── TQcStatusLogAdo             ← INSERT T_QC_STATUS_LOG
```

---

## QC WebMethod 清單

### 1. getQCStatusByMtlLotNo

```csharp
[WebMethod]
public DataSet getQCStatusByMtlLotNo(string mtlLotNo, long binId)
// 回傳：DataSet 含欄位 MTL_LOT_NO, BIN_ID, QC_STATUS, QC_CLASS, UPDATE_TIME
// 若無 QC 紀錄，回傳空 DataSet（前端判斷為放行）
// SQL：SELECT * FROM T_QC_INSPECTION_RECORD WHERE MTL_LOT_NO=@LOT AND BIN_ID=@BIN_ID
```

### 2. saveQCDecision

```csharp
[WebMethod]
public string saveQCDecision(
    string mtlLotNo,    // 物料批號
    long binId,         // 當前儲位 BIN_ID（不可硬寫 0，必須從選取列取得真實值）
    string qcClass,     // QC 分類：傳入狀態碼 "01"(A) / "02"(B) / "05"(Release)
    string inspector,   // 操作人員工號（應為 UserDataUtils.UserNo，不可硬寫 TEST_USER）
    string remark       // 備註
)
// 回傳：成功回傳 GM 單號（Class A）或 "success"（B/Release）；失敗回傳 null
```

### 3. saveQCBlockLog

```csharp
[WebMethod]
public string saveQCBlockLog(
    string mtlLotNo,    // 物料批號
    long binId,         // 當前儲位 BIN_ID
    string blockType,   // 事件類型："BLOCK"(A 類阻斷) / "WARN"(B 類警告)
    string operator,    // 操作人員工號
    DateTime blockTime  // 事件發生時間
)
// 回傳："success" 或 null
// 由前端在彈出 Modal 前主動呼叫；與 saveQCDecision 分開，不在同一 Transaction
```

---

## saveQCDecision 完整 Transaction 流程

```csharp
public string saveQCDecision(string mtlLotNo, long binId, string qcClass,
                              string inspector, string remark)
{
    ConnectionUtils.OpenConnection(conn);
    SqlTransaction sqlTrans = conn.BeginTransaction();
    try
    {
        // ── Step 1：更新 QC 主紀錄狀態 ───────────────────────
        var qcAdo = new TQcInspectionRecordAdo(conn, sqlTrans);
        DataTable existing = qcAdo.selByMtlLotNoAndBinId(mtlLotNo, binId);

        if (existing.Rows.Count == 1)
            qcAdo.updateStatus(mtlLotNo, binId, qcClass);
        else if (existing.Rows.Count == 0)
            qcAdo.insert(mtlLotNo, binId, qcClass, inspector);
        else
            throw new Exception($"T_QC_INSPECTION_RECORD 資料異常：{mtlLotNo} BIN_ID={binId} 有多筆");

        // ── Step 2：寫入 QC 狀態變更歷程 ─────────────────────
        new TQcStatusLogAdo(conn, sqlTrans)
            .insert(mtlLotNo, binId, qcClass, inspector, remark, DateTime.Now);

        // ── Step 3：Class A → 隔離移倉至 007 倉 ─────────────
        string resultGmNo = null;
        if (qcClass == "01") // Class A 隔離
        {
            // 取 007 隔離倉 BIN_ID（從 T_CONFIG_INFO 或固定設定取得）
            long isolateBinId = entryService.getIsolateBinId(conn, sqlTrans);

            // 取得當前庫存數量（作為移倉數量基準）
            double qty = entryService.getUsableQty(mtlLotNo, binId, conn, sqlTrans);

            // Step 3-1：產生 GM 單號（QC 隔離專用動作類型）
            string gmNo = entryService.getGmNo("QC_ISOLATE",
                              entryService.getMoveTypeCKey("QC_ISOLATE"), sqlTrans);

            // Step 3-2：寫入移倉表頭
            new TGoodsMovementHeaderAdo(conn, sqlTrans).insert(
                gmNo, DateTime.Now, "", "1", inspector);

            // Step 3-3：組移倉明細（雙列：H 出庫 + S 入庫，數量守恆）
            // 移倉基本原則：無論一般移倉或 QC 隔離，都必須 一出一入、數量守恆
            DataTable gmDetail = new TGoodsMovementDetail();

            // 出庫列（INDICATOR='H'，來源倉）
            DataRow detailOut = gmDetail.NewRow();
            detailOut[TGoodsMovementDetail.ITEM_NO]    = 1;
            detailOut[TGoodsMovementDetail.MTL_LOT_NO] = mtlLotNo;
            detailOut[TGoodsMovementDetail.QTY]        = -qty;         // 負值
            detailOut[TGoodsMovementDetail.BIN_ID]     = binId;        // 來源倉
            detailOut[TGoodsMovementDetail.INDICATOR]  = TGoodsMovementDetail.INDICATOR_H;
            gmDetail.Rows.Add(detailOut);

            // 入庫列（INDICATOR='S'，007 隔離倉）
            DataRow detailIn = gmDetail.NewRow();
            detailIn[TGoodsMovementDetail.ITEM_NO]    = 2;
            detailIn[TGoodsMovementDetail.MTL_LOT_NO] = mtlLotNo;
            detailIn[TGoodsMovementDetail.QTY]        = qty;           // 正值
            detailIn[TGoodsMovementDetail.BIN_ID]     = isolateBinId;  // 007 倉
            detailIn[TGoodsMovementDetail.INDICATOR]  = TGoodsMovementDetail.INDICATOR_S;
            gmDetail.Rows.Add(detailIn);

            new TGoodsMovementDetailAdo(conn, sqlTrans).insertBatch(gmNo, gmDetail);

            // Step 3-4：更新 GM 流水號（不可省略！）
            // 若漏掉此步，每次 Class A 隔離都會產生相同 GM 單號，造成資料衝突
            new TGmSerialNoAdo(conn, sqlTrans).upsertSerialNo("QC_ISOLATE", gmNo);

            // Step 3-5：更新庫存（三路策略，同 saveGoodsMoveBoth Step 5）
            // 來源倉 USABLE_QTY -= qty；007 倉 USABLE_QTY += qty
            // Rows.Count==1 → UPDATE；==0 → INSERT；>1 → Exception
            // 詳見 wms-goods-movement-backend/SKILL.md §「庫存更新策略」

            // Step 3-6：物料屬性複製（視業務決策）
            // Class A 移至 007 隔離倉是否需複製屬性，由業務確認後決定
            // 若需要：參照 wms-goods-movement-backend/SKILL.md §「物料屬性複製規則」

            resultGmNo = gmNo;
        }

        sqlTrans.Commit();
        log.Info($"saveQCDecision success | MTL_LOT_NO:{mtlLotNo} BIN_ID:{binId} CLASS:{qcClass} GM:{resultGmNo}");
        return resultGmNo ?? "success";
    }
    catch (Exception ex)
    {
        sqlTrans.Rollback();
        log.Error($"saveQCDecision error | MTL_LOT_NO:{mtlLotNo} BIN_ID:{binId} | {ex.Message}");
        return null;
    }
    finally
    {
        ConnectionUtils.CloseConnection(conn);
    }
}
```

---

## QC ADO 類別關鍵方法

### TQcInspectionRecordAdo

```csharp
// 查詢
DataTable selByMtlLotNoAndBinId(string lotNo, long binId);
// SQL: SELECT * FROM T_QC_INSPECTION_RECORD WHERE MTL_LOT_NO=@LOT AND BIN_ID=@BIN_ID

// 新增
void insert(string lotNo, long binId, string qcClass, string creator);
// SQL: INSERT INTO T_QC_INSPECTION_RECORD
//      (MTL_LOT_NO, BIN_ID, QC_STATUS, CREATOR, CREATE_TIME, UPDATE_TIME)
//      VALUES (@LOT, @BIN, @STATUS, @CREATOR, GETDATE(), GETDATE())

// 更新狀態
void updateStatus(string lotNo, long binId, string qcClass);
// SQL: UPDATE T_QC_INSPECTION_RECORD
//      SET QC_STATUS=@STATUS, UPDATE_TIME=GETDATE()
//      WHERE MTL_LOT_NO=@LOT AND BIN_ID=@BIN_ID
```

### TQcBlockLogAdo

```csharp
// 新增阻斷/警告事件紀錄
void insert(string lotNo, long binId, string blockType, string operator, DateTime blockTime);
// SQL: INSERT INTO T_QC_BLOCK_LOG
//      (MTL_LOT_NO, BIN_ID, BLOCK_TYPE, OPERATOR, BLOCK_TIME, CREATE_TIME)
//      VALUES (@LOT, @BIN, @TYPE, @OP, @TIME, GETDATE())
// 注意：此 ADO 由 saveQCBlockLog WebMethod 呼叫，不在 saveQCDecision Transaction 內
```

### TQcStatusLogAdo

```csharp
// 寫入狀態變更歷程（每次 saveQCDecision 均須寫入）
void insert(string lotNo, long binId, string qcClass, string inspector,
            string remark, DateTime changeTime);
// SQL: INSERT INTO T_QC_STATUS_LOG
//      (MTL_LOT_NO, BIN_ID, QC_STATUS, INSPECTOR, REMARK, CHANGE_TIME, CREATE_TIME)
//      VALUES (@LOT, @BIN, @STATUS, @INSPECTOR, @REMARK, @CHANGE_TIME, GETDATE())
```

---

## QC 狀態碼定義

| 狀態碼 | 語意 | 觸發動作 |
|--------|------|----------|
| `'01'` | Class A 隔離 | 自動移倉至 007 隔離倉 |
| `'02'` | Class B 警告 | 僅記錄，不移倉；前端軟阻斷 |
| `'03'` | 特採（UAI） | 特殊放行，保留現倉 |
| `'04'` | 報廢（Scrap） | 待後續業務定義 |
| `'05'` | 已解除（Release） | 解除隔離，執行移倉返回原倉或目標倉 |

> **前後端統一規範**：前後端均必須使用數字碼（`"01"/"02"/"05"`）。
> 前端舊有的 `"Forbidden"/"Warning"/"Release"` 英文字串已廢棄，需建立 mapping constant 對應。

---

## QC 資料表 Schema

### T_QC_INSPECTION_RECORD（QC 檢驗主紀錄）

| 欄位 | 型態 | 說明 |
|------|------|------|
| MTL_LOT_NO | NVARCHAR(50) | 物料批號（PK 之一） |
| BIN_ID | BIGINT | 儲位 ID（PK 之一） |
| QC_STATUS | CHAR(2) | 狀態碼（01/02/03/04/05） |
| CREATOR | NVARCHAR(20) | 建立者工號 |
| CREATE_TIME | DATETIME | 建立時間 |
| UPDATE_TIME | DATETIME | 最後更新時間 |

### T_QC_BLOCK_LOG（QC 阻斷/警告事件紀錄）

| 欄位 | 型態 | 說明 |
|------|------|------|
| LOG_ID | BIGINT IDENTITY | 自動流水號（PK） |
| MTL_LOT_NO | NVARCHAR(50) | 物料批號 |
| BIN_ID | BIGINT | 儲位 ID |
| BLOCK_TYPE | NVARCHAR(10) | BLOCK（A 類）/ WARN（B 類） |
| OPERATOR | NVARCHAR(20) | 操作人員工號 |
| BLOCK_TIME | DATETIME | 事件發生時間 |
| CREATE_TIME | DATETIME | 紀錄建立時間 |

### T_QC_STATUS_LOG（QC 狀態變更歷程）

| 欄位 | 型態 | 說明 |
|------|------|------|
| LOG_ID | BIGINT IDENTITY | 自動流水號（PK） |
| MTL_LOT_NO | NVARCHAR(50) | 物料批號 |
| BIN_ID | BIGINT | 儲位 ID |
| QC_STATUS | CHAR(2) | 變更後的狀態碼 |
| INSPECTOR | NVARCHAR(20) | 決策人員工號 |
| REMARK | NVARCHAR(500) | 備註 |
| CHANGE_TIME | DATETIME | 狀態變更時間 |
| CREATE_TIME | DATETIME | 紀錄建立時間 |

---

## QC 特有差異速查（vs 標準移倉）

| 項目 | 標準 saveGoodsMoveBoth | saveQCDecision（Class A） |
|------|----------------------|--------------------------|
| 明細列數 | 每批料 2 列（H + S） | 同樣 2 列（H + S），數量守恆 |
| GM 單號動作類型 | `ACTION_BOTH` | `QC_ISOLATE`（獨立流水號） |
| 流水號更新 | ✅ upsertSerialNo | ✅ upsertSerialNo（不可省略） |
| 物料屬性複製 | ✅ Step 6 固定執行 | ⚠️ 視業務決策（007 倉是否需要） |
| EC 入庫單更新 | ✅ 若有 ecPacking 則更新 | ❌ QC 不涉及 EC，直接跳過 |
| 額外寫入 | 無 | T_QC_INSPECTION_RECORD + T_QC_STATUS_LOG |

---

## 已知待修正項目

| 優先級 | 位置 | 問題 | 修正方式 |
|--------|------|------|----------|
| 🔴 P0 | `EntryService.saveQCDecision` Class A 段 | GM 流水號未呼叫 `upsertSerialNo`，每次產生相同單號 | 在 `insertBatch` 後補上 `new TGmSerialNoAdo(conn, sqlTrans).upsertSerialNo("QC_ISOLATE", gmNo)` |
| 🟡 P1 | `saveQCDecision` 參數 `binId` | 前端傳入硬寫的 `0` | 前端改從 `DataBoundItem` 取真實 BIN_ID |
| 🟡 P1 | `saveQCDecision` 參數 `inspector` | 前端傳入硬寫的 `"TEST_USER"` | 前端改為 `UserDataUtils.UserNo` |
| 🟡 P1 | QC 狀態字串 | 前後端不統一（英文 vs 數字碼） | 統一使用 `api_spec.md` 定義的數字碼 |
| 🟢 P2 | Class A 移倉段 | 未複製物料屬性至 007 倉 | 確認業務需求後，參照 `wms-goods-movement-backend/SKILL.md §物料屬性複製規則` 實作 |
