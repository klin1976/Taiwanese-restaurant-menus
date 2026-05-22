---
name: wms-goods-movement-backend
description: >
  撰寫 WMS 倉儲管理系統 GoodsMovement 移倉功能的後端程式碼（ASP.NET SOAP WebService / C#）。
  當使用者需要實作或修改 Service.cs、EntryService.cs、各 ADO 資料存取類別、
  saveGoodsMoveBoth Transaction 邏輯、GM 單號生成、庫存更新、物料屬性複製等
  WMS_WebService 專案相關程式時，務必使用此 skill。
  觸發關鍵字包含：移倉後端、saveGoodsMoveBoth、WebService、ADO、EntryService、
  TBinMtlInfoAdo、TMaterialPropertyAdo、GM單號、Transaction、INDICATOR、
  T_GOODS_MOVEMENT_HEADER、T_GOODS_MOVEMENT_DETAIL。
---

# WMS GoodsMovement 後端開發 Skill（ASP.NET SOAP WebService / C#）

## 系統定位

- **專案名稱**：WMS_WebService
- **技術棧**：ASP.NET SOAP WebService + ADO.NET + SQL Server
- **入口類別**：`Service.cs`（定義 WebMethod）
- **業務邏輯**：`EntryService.cs`（聚合 ADO 操作）
- **資料存取**：各 `*Ado.cs` 類別（對應單一資料表或視圖）

---

## 類別架構總覽

```
WMS_WebService
├── Service.cs                  ← WebMethod 入口（開關 Connection）
├── EntryService.cs             ← 業務邏輯聚合（getGmNo、getMoveTypeCKey...）
├── Ado/
│   ├── TGoodsMovementHeaderAdo ← INSERT T_GOODS_MOVEMENT_HEADER
│   ├── TGoodsMovementDetailAdo ← INSERT T_GOODS_MOVEMENT_DETAIL（批次）
│   ├── TBinMtlInfoAdo          ← SELECT/UPDATE/INSERT T_BIN_MTL_INFO
│   ├── TMaterialPropertyAdo    ← SELECT/INSERT T_MATERIAL_PROPERTY
│   ├── VStockInfoAdo           ← SELECT V_STOCK_INFO
│   ├── VMaterialInfoAdo        ← SELECT V_MATERIAL_INFO
│   ├── TConfigInfoAdo          ← SELECT T_CONFIG_INFO
│   ├── TGmSerialNoAdo          ← SELECT/INSERT/UPDATE T_GM_SERIAL_NO
│   └── VLocationBinInfoAdo     ← SELECT V_LOCATION_BIN_INFO
├── Entity/
│   ├── TGoodsMovementHeader    ← DataTable 子類別（欄位常數）
│   └── TGoodsMovementDetail    ← DataTable 子類別（含 INDICATOR_H/S 常數）
└── Utility/
    ├── ConnectionUtils          ← OpenConnection / CloseConnection
    └── MaterialUtils            ← findMtlPropValue
```

---

## 查詢類 WebMethod

### getBinMtlInfoByMtlLotNoAndBinId

**功能**：根據批號與倉別 BIN_ID 查詢庫存紀錄（含 BINAREA、BIN）

```csharp
[WebMethod]
public DataTable getBinMtlInfoByMtlLotNoAndBinId(string MTL_LOT_NO, long binId)
{
    ConnectionUtils.OpenConnection(conn);
    try
    {
        return new TBinMtlInfoAdo(conn).selByMtlLotNoAndBinId(MTL_LOT_NO, binId);
    }
    finally { ConnectionUtils.CloseConnection(conn); }
}
```

**SQL**：
```sql
SELECT ID, MTL_NO, MTL_LOT_NO, USABLE_QTY, UNIT, BIN_ID,
       CREATOR, CREATE_TIME, CLAIM_USER, CLAIM_TIME, BINAREA, BIN
FROM T_BIN_MTL_INFO
WHERE MTL_LOT_NO = @MTL_LOT_NO AND BIN_ID = @BIN_ID
```

---

### getMtlDataSetByMtlLotNoAndBinId

**功能**：取得物料完整 DataSet（含四張 DataTable）

```csharp
[WebMethod]
public DataSet getMtlDataSetByMtlLotNoAndBinId(string mtlLotNo, long binId)
{
    // DataSet 包含四張 Table：
    // Tables[0] "TBinMtlInfo"       ← T_BIN_MTL_INFO
    // Tables[1] "VMaterialInfo"      ← V_MATERIAL_INFO（寬幅/材質/單位）
    // Tables[2] "TMaterialProperty"  ← T_MATERIAL_PROPERTY（屬性）
    // Tables[3] "TPackingListDetail" ← NG 批號檢查
}
```

---

### findVStockByMtlLotNo

**功能**：查詢可用庫存（USABLE_QTY > 0）

**SQL**：
```sql
SELECT DESCRIPTION AS STOCKDEC, MTL_LOT_NO, USABLE_QTY, UNIT, BIN_ID
FROM V_Stock_Info
WHERE MTL_LOT_NO = @MTL_LOT_NO AND USABLE_QTY > 0
```

---

### getLocationBinInfoByLocNo

**功能**：取得廠區所有倉別清單，初始化前端下拉

**SQL**：
```sql
SELECT STOCK_DESC, BIN_NO, BIN_ID
FROM V_LOCATION_BIN_INFO
WHERE LOC_NO = @LOC_NO
```

> **前端過濾**：`DataRow[] drSel = locationBinInfo.Select("BIN_NO not in ('0010')")` 排除 N 帳倉

---

## 核心寫入 WebMethod：saveGoodsMoveBoth

### 方法簽名

```csharp
[WebMethod]
public string saveGoodsMoveBoth(
    DataTable GMHeader,   // T_GOODS_MOVEMENT_HEADER 資料列
    DataTable GMDetail,   // T_GOODS_MOVEMENT_DETAIL 多筆（每批料 2 列）
    string moveType,      // 移動類型代碼，如 "311"
    string ecPacking      // EC 入庫單號（選填）
)
// 回傳：GM 單號（成功）或 null（失敗）
```

### 完整 Transaction 流程

```csharp
public string saveGoodsMoveBoth(DataTable GMHeader, DataTable GMDetail,
                                 string moveType, string ecPacking)
{
    ConnectionUtils.OpenConnection(conn);
    SqlTransaction sqlTrans = conn.BeginTransaction();
    try
    {
        // ── Step 1：產生 GM 單號 ──────────────────────────────
        string gmNo = entryService.getGmNo(ACTION_BOTH, "PREFIX_GM_BOTH", sqlTrans);
        // getGmNo 內部：
        //   SELECT CVALUE FROM T_CONFIG_INFO WHERE CONFIG_TYPE='SYSTEM' AND CKEY='PREFIX_GM_BOTH'
        //   → prefix = "32"
        //   SELECT SERIAL_NO FROM T_GM_SERIAL_NO WHERE ACTION='Both' AND DATEDIFF(day,RECORD_DATE,GETDATE())=0
        //   → serialNo（若無記錄則為 "0001"）
        //   gmNo = prefix + DateTime.Now.ToString("yyyyMMdd") + serialNo
        //   範例：3202604290001

        // ── Step 2：寫入表頭 ──────────────────────────────────
        DataRow header = GMHeader.Rows[0];
        new TGoodsMovementHeaderAdo(conn, sqlTrans).insert(
            gmNo,
            header[TGoodsMovementHeader.IN_DATE],
            header[TGoodsMovementHeader.INVOICE_NO],
            "1",  // STATUS = 1（未回拋 SAP）
            header[TGoodsMovementHeader.CREATOR]
        );

        // ── Step 3：寫入明細 ──────────────────────────────────
        // 奇數列（i%2==0）查詢 VENDOR；批次 INSERT 所有明細列
        for (int i = 0; i < GMDetail.Rows.Count; i++)
        {
            DataRow detail = GMDetail.Rows[i];
            if (i % 2 == 0) // 出庫列
            {
                string vendor = new TMaterialPropertyAdo(conn, sqlTrans)
                    .findPropValue(detail[TGoodsMovementDetail.MTL_LOT_NO].ToString(),
                                   Convert.ToInt64(detail[TGoodsMovementDetail.BIN_ID]),
                                   "VENDOR");
                detail[TGoodsMovementDetail.VENDOR] = vendor;
            }
        }
        new TGoodsMovementDetailAdo(conn, sqlTrans).insertBatch(gmNo, GMDetail);

        // ── Step 4：更新流水號 ────────────────────────────────
        // 今日首筆 → INSERT；後續 → UPDATE
        new TGmSerialNoAdo(conn, sqlTrans).upsertSerialNo(ACTION_BOTH, gmNo);

        // ── Step 5：更新庫存 T_BIN_MTL_INFO ──────────────────
        foreach (DataRow detail in GMDetail.Rows)
        {
            long binId   = Convert.ToInt64(detail[TGoodsMovementDetail.BIN_ID]);
            string lotNo = detail[TGoodsMovementDetail.MTL_LOT_NO].ToString();
            double qty   = Convert.ToDouble(detail[TGoodsMovementDetail.QTY]);
            // 出庫 QTY 為負值（減庫存），入庫 QTY 為正值（加庫存）

            var ado = new TBinMtlInfoAdo(conn, sqlTrans);
            DataTable existing = ado.selByMtlLotNoAndBinId(lotNo, binId);

            if (existing.Rows.Count == 1)
            {
                // 記錄存在 → UPDATE
                double curQty = Convert.ToDouble(existing.Rows[0]["USABLE_QTY"]);
                double aftQty = curQty + qty;
                ado.updateUsableQty(lotNo, binId, aftQty);
            }
            else if (existing.Rows.Count == 0)
            {
                // 記錄不存在 → INSERT（僅入庫列才會出現）
                ado.insert(detail, qty);
            }
            else
            {
                // 異常（同批號同倉別多筆）→ Rollback
                throw new Exception($"T_BIN_MTL_INFO 資料異常：{lotNo} BIN_ID={binId} 有多筆記錄");
            }
        }

        // ── Step 6：複製物料屬性 ──────────────────────────────
        // 偶數列（入庫列 INDICATOR='S'）才需複製屬性
        for (int i = 1; i < GMDetail.Rows.Count; i += 2)
        {
            DataRow inDetail   = GMDetail.Rows[i];
            DataRow outDetail  = GMDetail.Rows[i - 1];
            long toBinId       = Convert.ToInt64(inDetail[TGoodsMovementDetail.BIN_ID]);
            long fromBinId     = Convert.ToInt64(outDetail[TGoodsMovementDetail.BIN_ID]);
            string lotNo       = inDetail[TGoodsMovementDetail.MTL_LOT_NO].ToString();
            string mtlNo       = inDetail[TGoodsMovementDetail.MTL_NO].ToString();

            var propAdo = new TMaterialPropertyAdo(conn, sqlTrans);
            DataTable toProp   = propAdo.selByLotNoAndBinId(lotNo, toBinId);

            if (toProp.Rows.Count == 0)
            {
                // 目標倉別無屬性資料 → 從來源倉別複製
                DataTable fromProp = propAdo.selByLotNoAndBinId(lotNo, fromBinId);

                if (fromProp.Rows.Count != 4 && fromProp.Rows.Count != 6)
                    throw new Exception($"來源屬性筆數異常：{lotNo} BIN_ID={fromBinId} ({fromProp.Rows.Count}筆)");

                foreach (DataRow p in fromProp.Rows)
                {
                    string attribute = p["ATTRIBUTE"].ToString();
                    string value     = p["VALUE"].ToString();

                    // IN_DATE 更新為當下時間
                    if (attribute == "IN_DATE")
                        value = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

                    propAdo.insert(mtlNo, lotNo, attribute, value, toBinId, currentUser);
                }
            }
        }

        // ── Step 7：更新 EC 入庫單（選用） ───────────────────
        if (!string.IsNullOrEmpty(ecPacking))
        {
            // UPDATE T_EC_PACKING_HEADER SET IS_MOVED='Y' WHERE INVOICE_NO=@ecPacking
            new TEcPackingHeaderAdo(conn, sqlTrans).setMoved(ecPacking);
        }

        // ── Step 8：Commit ────────────────────────────────────
        sqlTrans.Commit();
        return gmNo;
    }
    catch (Exception ex)
    {
        sqlTrans.Rollback();
        Logger.Error("saveGoodsMoveBoth", ex);
        return null;
    }
    finally
    {
        ConnectionUtils.CloseConnection(conn);
    }
}
```

---

## 各 ADO 類別關鍵方法

### TBinMtlInfoAdo

```csharp
// 查詢
DataTable selByMtlLotNoAndBinId(string lotNo, long binId);

// 更新可用數量
void updateUsableQty(string lotNo, long binId, double aftQty);
// SQL: UPDATE T_BIN_MTL_INFO SET USABLE_QTY=@AFT_QTY, CLAIM_USER=@USER,
//      CLAIM_TIME=GETDATE() WHERE MTL_LOT_NO=@LOT AND BIN_ID=@BIN_ID

// 新增庫存記錄
void insert(DataRow detail, double qty);
// SQL: INSERT INTO T_BIN_MTL_INFO (MTL_NO,MTL_LOT_NO,USABLE_QTY,UNIT,BIN_ID,
//      BINAREA,BIN,CREATOR,CREATE_TIME) VALUES (...)
```

### TMaterialPropertyAdo

```csharp
// 查詢屬性集合
DataTable selByLotNoAndBinId(string lotNo, long binId);
// SQL: SELECT * FROM T_MATERIAL_PROPERTY WHERE MTL_LOT_NO=@LOT AND BIN_ID=@BIN_ID

// 取特定屬性值
string findPropValue(string lotNo, long binId, string attribute);

// 批次新增屬性（INSERT ALL 概念，逐筆 INSERT）
void insert(string mtlNo, string lotNo, string attribute,
            string value, long binId, string creator);
```

### TGmSerialNoAdo

```csharp
// 查詢今日流水號
string selTodaySerialNo(string action);
// SQL: SELECT SERIAL_NO FROM T_GM_SERIAL_NO
//      WHERE ACTION=@ACTION AND DATEDIFF(day,RECORD_DATE,GETDATE())=0

// 新增流水號（今日首筆）
void insert(string action, string serialNo);
// SQL: INSERT INTO T_GM_SERIAL_NO (ACTION,SERIAL_NO,RECORD_DATE) VALUES (@A,@S,GETDATE())

// 更新流水號（後續筆次）
void update(string action, string serialNo);
// SQL: UPDATE T_GM_SERIAL_NO SET SERIAL_NO=@S
//      WHERE ACTION=@ACTION AND DATEDIFF(day,RECORD_DATE,GETDATE())=0
```

### TGoodsMovementDetailAdo

```csharp
// 批次新增明細
void insertBatch(string gmNo, DataTable details);
// 每筆 INSERT INTO T_GOODS_MOVEMENT_DETAIL
// (GM_NO,ITEM_NO,MTL_NO,MTL_LOT_NO,QTY,QTY_UNIT,BIN_ID,VENDOR,
//  INDICATOR,PASS_TIME,MOVE_TYPE_ID,CLAIM_MEMO,BINAREA,BIN) VALUES (...)
```

---

## 資料表設計速查

詳細資料表設計請參考 `references/db-schema.md`

| 資料表 | 用途 |
|--------|------|
| `T_GOODS_MOVEMENT_HEADER` | 移倉單頭（GM_NO 主鍵） |
| `T_GOODS_MOVEMENT_DETAIL` | 移倉明細（每批料 2 列，INDICATOR H/S） |
| `T_BIN_MTL_INFO` | 庫存紀錄（MTL_LOT_NO + BIN_ID 聯合唯一） |
| `T_MATERIAL_PROPERTY` | 物料屬性（ATTRIBUTE: VENDOR/INVOICE_NO/IN_DATE/IS_BONDED/...） |
| `T_GM_SERIAL_NO` | 每日流水號（每日重置） |
| `T_CONFIG_INFO` | 系統設定（GM 前綴 PREFIX_GM_BOTH='32'） |
| `V_MATERIAL_INFO` | 物料主檔視圖（WIDTH/EXT_MTL_GRP/UNIT） |
| `V_STOCK_INFO` | 可用庫存視圖（USABLE_QTY > 0） |
| `V_LOCATION_BIN_INFO` | 倉別清單視圖 |

---

## GM 單號生成規則

```
格式：[ PREFIX ] + [ yyyyMMdd ] + [ 4位流水號（補零） ]
範例：   "32"   +  "20260429" +      "0001"        = 3202604290001

來源：
  PREFIX   → T_CONFIG_INFO WHERE CKEY='PREFIX_GM_BOTH'
  流水號   → T_GM_SERIAL_NO WHERE ACTION='Both' AND 今日
  當日首筆 → INSERT T_GM_SERIAL_NO（SERIAL_NO='0001'）
  後續筆次 → UPDATE T_GM_SERIAL_NO（SERIAL_NO 遞增）
  隔日     → 新 INSERT（自動重置）
```

---

## 雙筆明細設計原則

每一批物料在 `T_GOODS_MOVEMENT_DETAIL` 產生**兩筆記錄**：

| 列別 | INDICATOR | QTY | BIN_ID |
|------|-----------|-----|--------|
| 出庫列（奇數 ITEM_NO） | `'H'`（Haben） | **負值**（如 -180） | 來源倉別 |
| 入庫列（偶數 ITEM_NO） | `'S'`（Soll） | **正值**（如 +180） | 目標倉別 |

ITEM_NO 遞增規則：第一批 → 1/2，第二批 → 3/4，依此類推

---

## 庫存更新策略

```
查詢 T_BIN_MTL_INFO WHERE MTL_LOT_NO=? AND BIN_ID=?

Rows.Count == 1  →  UPDATE  aftQty = curQty + detail.QTY
Rows.Count == 0  →  INSERT  aftQty = detail.QTY（僅入庫列）
Rows.Count  > 1  →  Exception → Rollback
```

---

## 物料屬性複製規則

移倉時若目標倉別無屬性資料（`Rows.Count == 0`）：
1. 從來源倉別取出屬性（須為 **4 筆或 6 筆**，否則視為資料異常）
2. 逐筆複製至目標倉別
3. `IN_DATE` 屬性更新為 `DateTime.Now`（記錄實際移倉時間）
4. `CREATOR` 更新為當前操作人；`BIN_ID` 更新為目標倉別

屬性清單：`VENDOR`、`INVOICE_NO`、`IN_DATE`、`IS_BONDED`（4筆必有）
額外屬性：`MANUFACTURE_DATE`、`EXPIRATION_DATE`（部分物料有，6筆）

---

## Log 範例（對應 EBAC240304）

```
INFO  TBinMtlInfoAdo       selByMtlLotNoAndBinId  MTL_LOT_NO:[EBAC240304] BIN_ID:[14]
INFO  VStockInfoAdo         findVStockByMtlLotNo   BinList:1
INFO  TConfigInfoAdo        selGmPrefix            PREFIX_GM_BOTH → 32
INFO  TGmSerialNoAdo        selTodaySerialNo       ACTION:Both → 0001
INFO  TGoodsMovementHeader  insert                 GMNO:3202604290001
INFO  TGoodsMovementDetail  insertBatch            ITEM_NO:1 QTY:-180 INDICATOR:H BIN_ID:14
INFO  TGoodsMovementDetail  insertBatch            ITEM_NO:2 QTY:+180 INDICATOR:S BIN_ID:13
INFO  TGmSerialNoAdo        insert                 ACTION:Both SERIAL_NO:0001
INFO  TBinMtlInfoAdo        updateUsableQty        BIN_ID:14 aftQty:0（180+(-180)）
INFO  TBinMtlInfoAdo        insert                 BIN_ID:13 USABLE_QTY:180
INFO  TMaterialPropertyAdo  insertBatch            BIN_ID:13 4筆屬性複製完成
INFO  saveGoodsMoveBoth     Commit                 GMNO:3202604290001
```

---

## 詳細資料表 Schema

→ 請參閱 `references/db-schema.md` 取得各資料表完整欄位定義
