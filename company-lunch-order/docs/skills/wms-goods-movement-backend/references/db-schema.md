# 資料庫 Schema 參考（GoodsMovement）

## T_GOODS_MOVEMENT_HEADER（移倉表頭）

| 欄位 | 型別 | NULL | 說明 |
|------|------|------|------|
| GM_NO (PK) | NVARCHAR | 否 | 移倉單號，格式：前綴+yyyyMMdd+4位流水號 |
| IN_DATE | DATETIME | 是 | 單據日期（異動日期） |
| INVOICE_NO | NVARCHAR | 是 | EC 入庫單號（選填） |
| STATUS | NVARCHAR | 否 | 1=未回拋SAP、2=已關閉、3=報廢 |
| CREATOR | NVARCHAR | 否 | 製單人工號 |
| CREATE_TIME | DATETIME | 否 | 建立時間（GETDATE()） |
| CLAIM_USER | NVARCHAR | 是 | 最後修改人 |
| CLAIM_TIME | DATETIME | 是 | 最後修改時間 |

## T_GOODS_MOVEMENT_DETAIL（移倉明細）

| 欄位 | 型別 | NULL | 說明 |
|------|------|------|------|
| GM_NO | NVARCHAR | 否 | FK→ T_GOODS_MOVEMENT_HEADER |
| ITEM_NO | INT | 否 | 項次（出庫=奇數，入庫=偶數） |
| MTL_NO | NVARCHAR | 否 | 物料料號 |
| MTL_LOT_NO | NVARCHAR | 否 | 物料批號 |
| QTY | FLOAT | 否 | 出庫為負值，入庫為正值 |
| QTY_UNIT | NVARCHAR | 是 | 計量單位（如 KG） |
| BIN_ID | BIGINT | 否 | 倉別 ID |
| VENDOR | NVARCHAR | 是 | 供應商（自動帶入） |
| INDICATOR | NVARCHAR | 否 | H=出庫、S=入庫 |
| PASS_TIME | DATETIME | 是 | 過帳時間 |
| MOVE_TYPE_ID | BIGINT | 否 | FK→ T_MOVE_TYPE |
| CLAIM_MEMO | NVARCHAR | 是 | 備註 |
| BINAREA | NVARCHAR | 是 | 儲區代碼 |
| BIN | NVARCHAR | 是 | 儲位代碼 |
| PO_NO | NVARCHAR | 是 | 採購單號（移倉通常空） |
| LOT_NO | NVARCHAR | 是 | EC 入庫單號 |
| MTL_DOC | NVARCHAR | 是 | SAP 物料憑證號 |
| SCRAP_TYPE_NO | NVARCHAR | 是 | 報廢類型 |

## T_BIN_MTL_INFO（庫存紀錄）

| 欄位 | 型別 | NULL | 說明 |
|------|------|------|------|
| ID (PK) | BIGINT | 否 | 主鍵 |
| MTL_NO | NVARCHAR | 否 | 物料料號 |
| MTL_LOT_NO | NVARCHAR | 否 | 物料批號（查詢關鍵） |
| USABLE_QTY | FLOAT | 否 | 可使用數量 |
| UNIT | NVARCHAR | 是 | 計量單位 |
| BIN_ID | BIGINT | 否 | 倉別 ID（與 MTL_LOT_NO 聯合唯一） |
| BINAREA | NVARCHAR | 是 | 儲區代碼 |
| BIN | NVARCHAR | 是 | 儲位代碼 |
| CREATOR | NVARCHAR | 否 | 建立人工號 |
| CREATE_TIME | DATETIME | 否 | 建立時間 |
| CLAIM_USER | NVARCHAR | 是 | 最後修改人 |
| CLAIM_TIME | DATETIME | 是 | 最後修改時間 |

## T_MATERIAL_PROPERTY（物料屬性）

| 欄位 | 型別 | NULL | 說明 |
|------|------|------|------|
| ID (PK) | BIGINT | 否 | 主鍵 |
| MTL_NO | NVARCHAR | 否 | 物料料號 |
| MTL_LOT_NO | NVARCHAR | 否 | 物料批號 |
| ATTRIBUTE | NVARCHAR | 否 | 屬性名稱 |
| VALUE | NVARCHAR | 是 | 屬性值 |
| BIN_ID | BIGINT | 否 | 倉別 ID |
| CREATOR | NVARCHAR | 否 | 建立人工號 |
| CLAIM_TIME | DATETIME | 是 | 最後修改時間 |

**ATTRIBUTE 允許值**：
- `VENDOR`（供應商）
- `INVOICE_NO`（發票號）
- `IN_DATE`（進倉日期，移倉時更新為 DateTime.Now）
- `IS_BONDED`（是否保稅，Y/N）
- `MANUFACTURE_DATE`（製造日期）
- `EXPIRATION_DATE`（到期日期）

## T_GM_SERIAL_NO（每日流水號）

| 欄位 | 型別 | 說明 |
|------|------|------|
| ACTION | NVARCHAR | Both / Increase / Decrease |
| SERIAL_NO | NVARCHAR | 4碼流水號，初始值 0001，次日重置 |
| RECORD_DATE | DATETIME | 記錄日期 |

**判斷今日**：`DATEDIFF(day, RECORD_DATE, GETDATE()) = 0`

## T_CONFIG_INFO（系統設定）

| CONFIG_TYPE | CKEY | CVALUE | 說明 |
|-------------|------|--------|------|
| SYSTEM | PREFIX_GM_BOTH | 32 | 移倉 GM 單號前綴 |
