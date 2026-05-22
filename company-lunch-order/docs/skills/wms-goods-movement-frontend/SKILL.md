---
name: wms-goods-movement-frontend
description: >
  撰寫 WMS 倉儲管理系統 GoodsMovement 移倉功能的前端程式碼（Windows Forms / C#）。
  當使用者需要實作或修改 frmMainGMBoth、DataGridView 明細欄位、工具列按鈕、表頭控制項、
  批號輸入自動帶值、批次瀏覽 CSV、前端驗證邏輯等 cGoodsMovement 專案相關程式時，
  務必使用此 skill。觸發關鍵字包含：移倉前端、frmMainGMBoth、DataGridView、
  BatchExplore、CellEndEdit、Windows Forms、cbxBinFrom、cbxBinTo、gvGoodsMovement。
---

# WMS GoodsMovement 前端開發 Skill（Windows Forms / C#）

## 系統定位

- **專案名稱**：cGoodsMovement
- **技術棧**：Windows Forms + C# + ASP.NET SOAP WebService 呼叫（Web Reference）
- **主要表單**：`frmMainGMBoth`（繼承自 `BasisForm`）
- **功能定位**：雙向移倉（Both），物料在不同倉別間搬移

---

## 表單架構（frmMainGMBoth）

### 三區塊佈局

```
┌──────────────────────────────────────────────────────┐
│  ToolStrip（工具列）：瀏覽 | 確定 | 取消             │
├──────────────────────────────────────────────────────┤
│  GroupBox grpbInfo（表頭資訊）                       │
│    異動日期 | 過帳日期 | 來自倉別 | 移至倉別         │
│    儲區（目標）| 儲位（目標）| 製單人 | 異動類型     │
├──────────────────────────────────────────────────────┤
│  DataGridView gvGoodsMovement（物料明細）            │
│    多筆輸入，EditOnEnter 模式                        │
└──────────────────────────────────────────────────────┘
```

---

## 控制項命名規範

### 工具列按鈕

| 控制項 | 文字 | 功能 |
|--------|------|------|
| `btnExplore` | 瀏覽 | 批次載入 CSV 文字檔，填入 DataGridView |
| `btnSubmit` | 確定 | 驗證 + 呼叫 `saveGoodsMoveBoth` WebService |
| `btnCancel` | 取消 | 呼叫 `resetControl()` 清除所有欄位 |

### 表頭控制項（GroupBox grpbInfo）

| 控制項 | 型別 | 說明 |
|--------|------|------|
| `dtpDocDate` | DateTimePicker | 異動日期，預設今日 |
| `dtpPassDate` | DateTimePicker | 過帳日期 |
| `cbxBinFrom` | ComboBox | 來源倉別（排除 BIN_NO='0010' N帳倉） |
| `cbxBinTo` | ComboBox | 目標倉別 |
| `txtBINAREA` | TextBox | 目標儲區，TextChanged 同步全部列 |
| `txtBIN` | TextBox | 目標儲位，TextChanged 同步全部列 |
| `lblUser` | Label（唯讀） | 登入使用者工號 |
| `lblMoveType` | Label（唯讀） | 異動類型，如 "311" |
| `txtNO` | TextBox（唯讀） | 批次瀏覽後顯示筆數 |
| `txtStockInNo` | TextBox（可隱藏） | 僅異動類型 311 顯示，Enter 查詢 EC 入庫單 |

---

## DataGridView 欄位設計（gvGoodsMovement）

編輯模式：`EditOnEnter`

| 欄位名稱 | HeaderText | 唯讀 | 型別 | 來源 |
|----------|-----------|------|------|------|
| `colMaterialNo` | 物料料號 | ✅ 是 | TextBox | `T_BIN_MTL_INFO.MTL_NO`，Frozen |
| `colMtlLotNo` | 物料批號 | ❌ 否 | TextBox | 使用者輸入，Frozen，**觸發 CellEndEdit** |
| `colWidth` | 寬幅 | ✅ 是 | TextBox | `V_MATERIAL_INFO.WIDTH` |
| `colExtMtlGrp` | 材質 | ✅ 是 | TextBox | `V_MATERIAL_INFO.EXT_MTL_GRP` |
| `colQty` | 數量 | ❌ 否 | TextBox | 可改；驗證 > 0 |
| `colUnit` | 單位 | ✅ 是 | TextBox | `V_MATERIAL_INFO.UNIT` |
| `colIsBonded` | 是否保稅 | ✅ 是 | CheckBox | `T_MATERIAL_PROPERTY.IS_BONDED` (Y/N) |
| `colFromBinNo` | 來自倉別 | ❌ 否 | ComboBox（隱藏） | 由 `cbxBinFrom` 控制 |
| `colToBinNo` | 移至倉別 | ❌ 否 | ComboBox（隱藏） | 由 `cbxBinTo` 控制 |
| `colClaimMemo` | 備註 | ❌ 否 | TextBox | `T_GOODS_MOVEMENT_DETAIL.CLAIM_MEMO` |
| `colfromBINAREA` | 來自儲區 | ✅ 是 | TextBox | `T_BIN_MTL_INFO.BINAREA` |
| `colfromBIN` | 來自儲位 | ✅ 是 | TextBox | `T_BIN_MTL_INFO.BIN` |
| `coltoBINAREA` | 移至儲區 | ❌ 否 | TextBox | 由 `txtBINAREA` 同步，可個別改 |
| `coltoBIN` | 移至儲位 | ❌ 否 | TextBox | 由 `txtBIN` 同步，可個別改 |
| `colManufactureDate` | 製造日期 | ✅ 是 | TextBox | `T_MATERIAL_PROPERTY.MANUFACTURE_DATE` |
| `colExpirationDate` | 到期日期 | ✅ 是 | TextBox | `T_MATERIAL_PROPERTY.EXPIRATION_DATE` |

---

## 關鍵事件與流程

### 1. 初始化（Form_Load）

```csharp
private void frmMainGMBoth_Load(object sender, EventArgs e)
{
    // 1. 設定製單人
    lblUser.Text = UserDataUtils.UserNo;

    // 2. 載入倉別下拉（排除 N帳倉）
    DataTable locationBinInfo = wsClient.getLocationBinInfoByLocNo(locNo);
    DataRow[] drSel = locationBinInfo.Select("BIN_NO not in ('0010')");
    // 綁定至 cbxBinFrom / cbxBinTo

    // 3. 取得移動類型 ID
    long moveTypeId = wsClient.getMoveTypeIdByTypeAndLocNo(moveType, locNo);

    // 4. 預設日期為今日
    dtpDocDate.Value = DateTime.Now;
    dtpPassDate.Value = DateTime.Now;
}
```

### 2. 批號輸入後自動帶值（CellEndEdit）

```csharp
private void gvGoodsMovement_CellEndEdit(object sender, DataGridViewCellEventArgs e)
{
    if (gvGoodsMovement.Columns[e.ColumnIndex].Name != "colMtlLotNo") return;

    string lotNo = gvGoodsMovement.Rows[e.RowIndex].Cells["colMtlLotNo"].Value?.ToString();
    long binId = Convert.ToInt64(cbxBinFrom.SelectedValue);

    // 1. 查詢庫存紀錄
    DataTable binMtlInfo = wsClient.getBinMtlInfoByMtlLotNoAndBinId(lotNo, binId);
    if (binMtlInfo.Rows.Count == 0)
    {
        funResetGMRow(e.RowIndex); // 清除該列
        MessageBox.Show("查無此批號庫存");
        return;
    }

    // 2. 取得完整 DataSet（料號主檔、屬性等）
    DataSet ds = wsClient.getMtlDataSetByMtlLotNoAndBinId(lotNo, binId);
    DataTable tBinMtlInfo    = ds.Tables["TBinMtlInfo"];
    DataTable vMaterialInfo  = ds.Tables["VMaterialInfo"];
    DataTable tMtlProperty   = ds.Tables["TMaterialProperty"];

    // 3. 查詢可用庫存數
    DataTable stockInfo = wsClient.findVStockByMtlLotNo(lotNo);

    // 4. 填入各欄
    var row = gvGoodsMovement.Rows[e.RowIndex];
    row.Cells["colMaterialNo"].Value    = tBinMtlInfo.Rows[0]["MTL_NO"];
    row.Cells["colWidth"].Value         = vMaterialInfo.Rows[0]["WIDTH"];
    row.Cells["colExtMtlGrp"].Value     = vMaterialInfo.Rows[0]["EXT_MTL_GRP"];
    row.Cells["colUnit"].Value          = vMaterialInfo.Rows[0]["UNIT"];
    row.Cells["colQty"].Value           = stockInfo.Rows[0]["USABLE_QTY"]; // 可用數
    row.Cells["colfromBINAREA"].Value   = tBinMtlInfo.Rows[0]["BINAREA"];
    row.Cells["colfromBIN"].Value       = tBinMtlInfo.Rows[0]["BIN"];
    row.Cells["coltoBINAREA"].Value     = txtBINAREA.Text;
    row.Cells["coltoBIN"].Value         = txtBIN.Text;

    // IS_BONDED 屬性
    string isBonded = MaterialUtils.findMtlPropValue(tMtlProperty, "IS_BONDED");
    row.Cells["colIsBonded"].Value = (isBonded == "Y");

    // 製造/到期日期
    row.Cells["colManufactureDate"].Value = MaterialUtils.findMtlPropValue(tMtlProperty, "MANUFACTURE_DATE");
    row.Cells["colExpirationDate"].Value  = MaterialUtils.findMtlPropValue(tMtlProperty, "EXPIRATION_DATE");
}
```

### 3. 目標儲區/儲位同步（TextChanged）

```csharp
private void txtBINAREA_TextChanged(object sender, EventArgs e)
{
    foreach (DataGridViewRow row in gvGoodsMovement.Rows)
        if (!row.IsNewRow)
            row.Cells["coltoBINAREA"].Value = txtBINAREA.Text;
}

private void txtBIN_TextChanged(object sender, EventArgs e)
{
    foreach (DataGridViewRow row in gvGoodsMovement.Rows)
        if (!row.IsNewRow)
            row.Cells["coltoBIN"].Value = txtBIN.Text;
}
```

### 4. 批次瀏覽（btnExplore_Click）

```csharp
// CSV 格式：批號,數量,備註,文件日期
private void btnExplore_Click(object sender, EventArgs e)
{
    using (OpenFileDialog ofd = new OpenFileDialog())
    {
        ofd.Filter = "Text files|*.txt;*.csv";
        if (ofd.ShowDialog() != DialogResult.OK) return;

        // 解析：使用 CtxGMTxtFile 解析
        List<GMTxtRow> rows = CtxGMTxtFile.Parse(ofd.FileName);

        gvGoodsMovement.Rows.Clear();
        bool hasError = false;
        long binId = Convert.ToInt64(cbxBinFrom.SelectedValue);

        foreach (var r in rows)
        {
            DataTable dt = wsClient.getBinMtlInfoByMtlLotNoAndBinId(r.LotNo, binId);
            if (dt.Rows.Count == 0)
            {
                hasError = true;
                MessageBox.Show($"批號 {r.LotNo} 無庫存，資料全部清除");
                break;
            }
            // 加入至 DataGridView（同 CellEndEdit 邏輯）
        }

        if (hasError) gvGoodsMovement.Rows.Clear();
        else txtNO.Text = rows.Count.ToString();
    }
}
```

### 5. 送出驗證（funCheckGVGoodsMovementData）

```csharp
private bool funCheckGVGoodsMovementData()
{
    // 1. DataGridView 不可為空
    if (gvGoodsMovement.Rows.Count == 0 || 
        (gvGoodsMovement.Rows.Count == 1 && gvGoodsMovement.Rows[0].IsNewRow))
    {
        MessageBox.Show("請至少輸入一筆批號");
        return false;
    }

    var lotNos = new HashSet<string>();
    foreach (DataGridViewRow row in gvGoodsMovement.Rows)
    {
        if (row.IsNewRow) continue;
        string lotNo = row.Cells["colMtlLotNo"].Value?.ToString();
        string qtyStr = row.Cells["colQty"].Value?.ToString();

        // 2. 批號不可重複
        if (!lotNos.Add(lotNo))
        {
            MessageBox.Show($"批號 {lotNo} 重複"); return false;
        }

        // 3. 數量必須 > 0
        if (!double.TryParse(qtyStr, out double qty) || qty <= 0)
        {
            MessageBox.Show("數量必須大於 0"); return false;
        }
    }

    // 4. 來源倉別 ≠ 目標倉別
    if (cbxBinFrom.SelectedValue?.ToString() == cbxBinTo.SelectedValue?.ToString())
    {
        MessageBox.Show("來源倉別與目標倉別不可相同"); return false;
    }

    return true;
}
```

### 6. 確定送出（btnSubmit_Click）

```csharp
private void btnSubmit_Click(object sender, EventArgs e)
{
    if (!funCheckGVGoodsMovementData()) return;

    // 組 GMHeader DataTable
    DataTable gmHeader = new TGoodsMovementHeader();
    DataRow headerRow = gmHeader.NewRow();
    headerRow[TGoodsMovementHeader.IN_DATE]    = dtpDocDate.Value;
    headerRow[TGoodsMovementHeader.STATUS]     = "1";
    headerRow[TGoodsMovementHeader.CREATOR]    = UserDataUtils.UserNo;
    headerRow[TGoodsMovementHeader.INVOICE_NO] = txtStockInNo.Visible ? txtStockInNo.Text : "";
    gmHeader.Rows.Add(headerRow);

    // 組 GMDetail DataTable（每批料兩列：出庫 H + 入庫 S）
    DataTable gmDetail = new TGoodsMovementDetail();
    int itemNo = 1;
    foreach (DataGridViewRow row in gvGoodsMovement.Rows)
    {
        if (row.IsNewRow) continue;
        double qty = Convert.ToDouble(row.Cells["colQty"].Value);

        // 出庫列（INDICATOR = H）
        DataRow detailOut = gmDetail.NewRow();
        detailOut[TGoodsMovementDetail.ITEM_NO]    = itemNo;
        detailOut[TGoodsMovementDetail.MTL_LOT_NO] = row.Cells["colMtlLotNo"].Value;
        detailOut[TGoodsMovementDetail.QTY]        = -qty; // 負值
        detailOut[TGoodsMovementDetail.BIN_ID]     = cbxBinFrom.SelectedValue;
        detailOut[TGoodsMovementDetail.INDICATOR]  = TGoodsMovementDetail.INDICATOR_H;
        detailOut[TGoodsMovementDetail.BINAREA]    = row.Cells["colfromBINAREA"].Value;
        detailOut[TGoodsMovementDetail.BIN]        = row.Cells["colfromBIN"].Value;
        detailOut[TGoodsMovementDetail.PASS_TIME]  = dtpPassDate.Value;
        detailOut[TGoodsMovementDetail.CLAIM_MEMO] = row.Cells["colClaimMemo"].Value;
        gmDetail.Rows.Add(detailOut);

        // 入庫列（INDICATOR = S）
        DataRow detailIn = gmDetail.NewRow();
        detailIn[TGoodsMovementDetail.ITEM_NO]    = itemNo + 1;
        detailIn[TGoodsMovementDetail.MTL_LOT_NO] = row.Cells["colMtlLotNo"].Value;
        detailIn[TGoodsMovementDetail.QTY]        = qty;  // 正值
        detailIn[TGoodsMovementDetail.BIN_ID]     = cbxBinTo.SelectedValue;
        detailIn[TGoodsMovementDetail.INDICATOR]  = TGoodsMovementDetail.INDICATOR_S;
        detailIn[TGoodsMovementDetail.BINAREA]    = row.Cells["coltoBINAREA"].Value;
        detailIn[TGoodsMovementDetail.BIN]        = row.Cells["coltoBIN"].Value;
        detailIn[TGoodsMovementDetail.PASS_TIME]  = dtpPassDate.Value;
        gmDetail.Rows.Add(detailIn);

        itemNo += 2;
    }

    string gmNo = wsClient.saveGoodsMoveBoth(gmHeader, gmDetail, lblMoveType.Text, txtStockInNo.Text);
    if (gmNo != null)
        MessageBox.Show($"移倉成功，GM 單號：{gmNo}");
    else
        MessageBox.Show("移倉失敗，請確認資料後重試");
}
```

---

## WebService 呼叫對照表

前端呼叫的 WebService 方法（`wsClient` 為 Web Reference 產生的 proxy）：

| 方法 | 呼叫時機 |
|------|----------|
| `getLocationBinInfoByLocNo(locNo)` | Form_Load 初始化倉別下拉 |
| `getMoveTypeIdByTypeAndLocNo(moveType, locNo)` | Form_Load 取得移動類型 ID |
| `getBinMtlInfoByMtlLotNoAndBinId(lotNo, binId)` | CellEndEdit / btnExplore |
| `getMtlDataSetByMtlLotNoAndBinId(lotNo, binId)` | CellEndEdit 取完整 DataSet |
| `findVStockByMtlLotNo(lotNo)` | CellEndEdit 取可用庫存數 |
| `saveGoodsMoveBoth(header, detail, moveType, ecPacking)` | btnSubmit 送出 |

---

## 程式命名慣例

- 表單類別：`frm` 前綴，如 `frmMainGMBoth`
- 控制項：型別縮寫前綴，如 `dtpDocDate`（DateTimePicker）、`cbxBinFrom`（ComboBox）、`gv`（DataGridView）
- DataGridView 欄：`col` 前綴，如 `colMtlLotNo`
- 私有方法：`fun` 前綴，如 `funCheckGVGoodsMovementData`、`funResetGMRow`
- Entity/DataTable：`T` 或 `V` 前綴對應資料庫資料表/視圖

---

## 其他前端類別參考

| 類別 | 說明 |
|------|------|
| `frmMainGMBothBIN` | 儲位層級移倉表單 |
| `frmMainGMIncrease` / `frmMainGMDecrease` | 加/減庫存表單 |
| `frmDetailAdd` / `frmDetailModify` | 明細新增/修改對話框 |
| `UserCtrl/GMHeaderBoth` | 移倉表頭使用者控制項 |
| `datacheck.cs` | 資料驗證工具 |
| `CtxGMTxtFile` | CSV 批次文字檔解析器 |
| `MaterialUtils` | `findMtlPropValue`：取特定屬性值 |
| `UserDataUtils` | `UserNo`：當前登入使用者工號 |
