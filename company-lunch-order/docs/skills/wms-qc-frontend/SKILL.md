---
name: wms-qc-frontend
description: >
  撰寫 WMS 品質管制模組（QC）的前端程式碼（Windows Forms / C#）。
  當使用者需要實作或修改 frmMainIQC_LotNo_Snippet、frmBlockModal、frmWarningModal、
  frmQCDecision、frmReleaseIsolation、QC 雙軌視覺卡控邏輯、CellFormatting 染色、
  右鍵 QC 設定選單、解除隔離移倉等 cIQC 專案相關程式時，務必使用此 skill。
  涉及命名規範（frm/col/cbx/dtv/txt/lbl 前綴）、DataGridView 設計、
  DataBoundItem 取值、btnSubmit 送出雙列組法等共用規範請同時參照
  wms-goods-movement-frontend/SKILL.md。
  觸發關鍵字：QC前端、品質管制前端、frmMainIQC_LotNo_Snippet、frmBlockModal、
  frmWarningModal、frmQCDecision、frmReleaseIsolation、CellFormatting、
  品質卡控、雙軌化、隔離解除、tsmiSetQC_Click、tsmiReleaseIsolation_Click、
  getQCStatusByMtlLotNo、saveQCBlockLog。
---

# WMS QC 前端開發 Skill（Windows Forms / C#）

## 系統定位

- **專案名稱**：cIQC（與 cGoodsMovement 為獨立專案，共用 WMS_WebService）
- **技術棧**：Windows Forms + C#，透過 SOAP Web Reference 呼叫後端
- **命名規範**：完全繼承 wms-goods-movement-frontend/SKILL.md 的控制項前綴規範
- **WebService Proxy**：`wsClient`（wahhongserviceSoapClient 自動產生）

> **共用規範請參照** `wms-goods-movement-frontend/SKILL.md`：
> frm/col/fun/cbx/dtv/txt/lbl 命名前綴、DataGridView EditOnEnter 模式、
> DataBoundItem as DataRowView 取底層資料、MessageBox.Show 錯誤提示、
> DialogResult.OK/Cancel Modal 回傳、三區塊佈局（ToolStrip + GroupBox + DataGridView）。

---

## QC 表單清單

| 表單 | 功能 |
|------|------|
| `frmMainIQC_LotNo_Snippet` | IQC 主表單：批號列表、QC 狀態染色、右鍵選單操作 |
| `frmBlockModal` | Class A 硬阻斷 Modal：強制中斷，無確認按鈕，只能關閉 |
| `frmWarningModal` | Class B 軟警告 Modal：需勾選確認才可繼續 |
| `frmQCDecision` | QC 決策表單：選擇 A/B/Release、輸入備註、呼叫 saveQCDecision |
| `frmReleaseIsolation` | 解除隔離移倉表單：組雙列 GMDetail 呼叫 saveGoodsMoveBoth |

---

## QC 特有前端流程

### 1. 作業前 QC 狀態查詢（領料/移倉必須先執行）

任何領料或移倉按鈕的 Click 事件，**第一步必須查詢 QC 狀態**，
再依回應決定阻斷、警告或放行。

```csharp
private void tsmiPickMaterial_Click(object sender, EventArgs e)
{
    // 正確取法：從 DataBoundItem 取底層 DataRow 資料
    DataRowView drv = gvQCList.CurrentRow.DataBoundItem as DataRowView;
    string lotNo = drv["MTL_LOT_NO"].ToString();
    long binId   = Convert.ToInt64(drv["BIN_ID"]); // 不可硬寫 0

    // Step 1：查詢 QC 狀態
    DataSet qcDs = wsClient.getQCStatusByMtlLotNo(lotNo, binId);

    if (qcDs.Tables[0].Rows.Count > 0)
    {
        string status = qcDs.Tables[0].Rows[0]["QC_STATUS"].ToString();

        if (status == "01") // Class A → 硬阻斷
        {
            // 記錄阻斷事件（Modal 前先呼叫）
            wsClient.saveQCBlockLog(lotNo, binId, "BLOCK", UserDataUtils.UserNo, DateTime.Now);

            using (var modal = new frmBlockModal(qcDs.Tables[0].Rows[0]["REMARK"]?.ToString()))
                modal.ShowDialog(); // 不需判斷 DialogResult，永遠中斷

            return;
        }
        else if (status == "02") // Class B → 軟警告
        {
            wsClient.saveQCBlockLog(lotNo, binId, "WARN", UserDataUtils.UserNo, DateTime.Now);

            using (var modal = new frmWarningModal())
            {
                if (modal.ShowDialog() != DialogResult.OK)
                    return; // 使用者未確認 → 中斷
            }
        }
        // "03"(特採) / "05"(Release) 或無 QC 紀錄 → 正常繼續
    }

    // Step 2：後續業務邏輯（領料/移倉實際操作）
    // ...
}
```

---

### 2. Class A 硬阻斷（frmBlockModal）

```csharp
// frmBlockModal：無確認按鈕，只有關閉
// DialogResult 永遠回傳 Cancel；呼叫方收到後必須 return 中斷流程
public partial class frmBlockModal : Form
{
    public frmBlockModal(string message)
    {
        InitializeComponent();
        lblMessage.Text = string.IsNullOrEmpty(message)
            ? "此批號已被列為 Class A 隔離，無法進行作業。"
            : message;
        // btnClose → DialogResult.Cancel（無 btnConfirm）
    }
}
```

---

### 3. Class B 軟警告（frmWarningModal）

```csharp
// frmWarningModal：需勾選 chkConfirm 才能啟用確認按鈕
public partial class frmWarningModal : Form
{
    private void chkConfirm_CheckedChanged(object sender, EventArgs e)
    {
        btnConfirm.Enabled = chkConfirm.Checked;
    }

    private void btnConfirm_Click(object sender, EventArgs e)
    {
        this.DialogResult = DialogResult.OK;
        this.Close();
    }
    // btnCancel → DialogResult.Cancel
}
// 呼叫方：ShowDialog() == DialogResult.OK → 繼續；Cancel → 中斷
```

---

### 4. QC 決策設定（tsmiSetQC_Click）

```csharp
private void tsmiSetQC_Click(object sender, EventArgs e)
{
    DataRowView drv = gvQCList.CurrentRow.DataBoundItem as DataRowView;
    string lotNo = drv["MTL_LOT_NO"].ToString();
    long binId   = Convert.ToInt64(drv["BIN_ID"]);  // 🔴 P1：不可用 long binId = 0

    using (var decisionForm = new frmQCDecision(lotNo, binId))
    {
        if (decisionForm.ShowDialog() != DialogResult.OK) return;

        string qcClass  = decisionForm.SelectedQcClass;  // "01" / "02" / "05"
        string remark   = decisionForm.Remark;
        string inspector = UserDataUtils.UserNo;          // 🔴 P1：不可硬寫 "TEST_USER"

        string result = wsClient.saveQCDecision(lotNo, binId, qcClass, inspector, remark);

        if (result != null)
        {
            MessageBox.Show($"QC 設定完成{(result != "success" ? $"，GM 單號：{result}" : "")}");
            funLoadQCList(); // 重新載入清單
        }
        else
        {
            MessageBox.Show("QC 設定失敗，請確認資料後重試");
        }
    }
}
```

---

### 5. CellFormatting 染色邏輯

```csharp
// 依 QC_STATUS 欄位將 DataGridView 列染色
private void gvQCList_CellFormatting(object sender, DataGridViewCellFormattingEventArgs e)
{
    if (gvQCList.Rows[e.RowIndex].IsNewRow) return;

    string status = gvQCList.Rows[e.RowIndex]
                             .Cells["colQcStatus"].Value?.ToString();
    switch (status)
    {
        case "01": // Class A 隔離 → 粉紅
            gvQCList.Rows[e.RowIndex].DefaultCellStyle.BackColor = Color.LightPink;
            break;
        case "02": // Class B 警告 → 淡黃
            gvQCList.Rows[e.RowIndex].DefaultCellStyle.BackColor = Color.LightYellow;
            break;
        case "05": // Release → 白
        default:
            gvQCList.Rows[e.RowIndex].DefaultCellStyle.BackColor = Color.White;
            break;
    }
}
// ⚠️ 狀態值必須使用數字碼（"01"/"02"/"05"），不可使用英文字串
```

---

### 6. 解除隔離移倉（tsmiReleaseIsolation_Click）

> 解除隔離需組**雙列** GMDetail（H 從 007 倉出庫 + S 至目標倉入庫），
> 與標準 `saveGoodsMoveBoth` 完全相同。
> 雙列組法詳見 `wms-goods-movement-frontend/SKILL.md §「確定送出（btnSubmit_Click）」`。

```csharp
private void tsmiReleaseIsolation_Click(object sender, EventArgs e)
{
    DataRowView drv = gvQCList.CurrentRow.DataBoundItem as DataRowView;
    string lotNo       = drv["MTL_LOT_NO"].ToString();
    long isolateBinId  = Convert.ToInt64(drv["BIN_ID"]);  // 007 倉 BIN_ID

    using (var releaseForm = new frmReleaseIsolation(lotNo))
    {
        if (releaseForm.ShowDialog() != DialogResult.OK) return;

        long targetBinId = releaseForm.TargetBinId;  // 目標倉 BIN_ID（使用者選擇）
        double qty       = releaseForm.Qty;

        // ── 組 GMHeader ─────────────────────────────────────
        DataTable gmHeader = new TGoodsMovementHeader();
        DataRow headerRow  = gmHeader.NewRow();
        headerRow[TGoodsMovementHeader.IN_DATE]    = DateTime.Now;
        headerRow[TGoodsMovementHeader.INVOICE_NO] = "";
        headerRow[TGoodsMovementHeader.STATUS]     = "1";
        headerRow[TGoodsMovementHeader.CREATOR]    = UserDataUtils.UserNo;
        gmHeader.Rows.Add(headerRow);

        // ── 組 GMDetail（雙列）──────────────────────────────
        DataTable gmDetail = new TGoodsMovementDetail();

        // 出庫列（H：007 倉 → 負值）
        DataRow detailOut = gmDetail.NewRow();
        detailOut[TGoodsMovementDetail.ITEM_NO]    = 1;
        detailOut[TGoodsMovementDetail.MTL_LOT_NO] = lotNo;
        detailOut[TGoodsMovementDetail.QTY]        = -qty;
        detailOut[TGoodsMovementDetail.BIN_ID]     = isolateBinId;
        detailOut[TGoodsMovementDetail.INDICATOR]  = TGoodsMovementDetail.INDICATOR_H;
        gmDetail.Rows.Add(detailOut);

        // 入庫列（S：目標倉 → 正值）
        DataRow detailIn = gmDetail.NewRow();
        detailIn[TGoodsMovementDetail.ITEM_NO]    = 2;
        detailIn[TGoodsMovementDetail.MTL_LOT_NO] = lotNo;
        detailIn[TGoodsMovementDetail.QTY]        = qty;
        detailIn[TGoodsMovementDetail.BIN_ID]     = targetBinId;
        detailIn[TGoodsMovementDetail.INDICATOR]  = TGoodsMovementDetail.INDICATOR_S;
        gmDetail.Rows.Add(detailIn);

        // ── 呼叫 WebService ──────────────────────────────────
        string gmNo = wsClient.saveGoodsMoveBoth(gmHeader, gmDetail, releaseMoveType, "");

        if (gmNo != null)
        {
            MessageBox.Show($"解除隔離成功，GM 單號：{gmNo}");
            funLoadQCList();
        }
        else
        {
            MessageBox.Show("解除隔離失敗，請確認資料後重試");
        }
    }
}
```

---

## WebService 呼叫對照表（QC 專用）

| 方法 | 呼叫時機 |
|------|----------|
| `getQCStatusByMtlLotNo(lotNo, binId)` | 領料/移倉按鈕點擊前，查詢 QC 狀態（API 1） |
| `saveQCDecision(lotNo, binId, qcClass, inspector, remark)` | frmQCDecision 確認後寫入決策（API 3） |
| `saveQCBlockLog(lotNo, binId, blockType, operator, blockTime)` | 阻斷/警告 Modal 前記錄事件（API 4） |
| `saveGoodsMoveBoth(header, detail, moveType, "")` | frmReleaseIsolation 解除隔離移倉（API 6） |

---

## QC 狀態碼 Mapping（前端常數）

```csharp
// 建議建立靜態 mapping class，集中管理，避免各處散落字串
public static class QcStatusCode
{
    public const string ISOLATE  = "01"; // Class A 隔離
    public const string WARNING  = "02"; // Class B 警告
    public const string UAI      = "03"; // 特採（Unconditional Accept）
    public const string SCRAP    = "04"; // 報廢
    public const string RELEASE  = "05"; // 解除
}

// DataGridView 顯示用 mapping（前端顯示文字 ← 後端狀態碼）
public static Dictionary<string, string> QcStatusDisplay = new Dictionary<string, string>
{
    { "01", "Class A 隔離" },
    { "02", "Class B 警告" },
    { "03", "特採" },
    { "04", "報廢" },
    { "05", "已解除" }
};
```

---

## 已知待修正項目

| 優先級 | 位置 | 問題 | 修正方式 |
|--------|------|------|----------|
| 🔴 P0 | `tsmiReleaseIsolation_Click` | 解除隔離移倉完全未實作（header/detail 為空 DataTable，呼叫被註解） | 依上方「解除隔離移倉」範例補完雙列 GMDetail |
| 🟡 P1 | `tsmiSetQC_Click` | `long binId = 0` 硬寫 | 改為 `Convert.ToInt64(drv["BIN_ID"])` |
| 🟡 P1 | `tsmiSetQC_Click` | `inspector = "TEST_USER"` 硬寫 | 改為 `UserDataUtils.UserNo` |
| 🟡 P1 | QC 狀態字串 | 前端用英文（`"Forbidden"/"Warning"/"Release"`），後端用數字碼 | 建立 `QcStatusCode` 常數 class，統一使用數字碼 |
