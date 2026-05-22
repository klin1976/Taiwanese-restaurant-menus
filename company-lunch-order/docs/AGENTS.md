# AGENTS.md — CLO 系統 AI 協作作戰手冊 (Company Lunch Order)

> 本文件是 `company-lunch-order` (公司午餐訂購系統) 整個專案 AI 協作的唯一真相來源 (Single Source of Truth)。
> 所有 AI Agent 在接收任何任務前，**必須先讀取本文件**。
> 本文件同時作為 **機器可解析的路由規格**，Orchestrator 可直接讀取 `agent_schema` 區塊執行自動路由。

---

## 🏗️ 專案技術架構總覽 (Firebase Single-Layer)

**專案名稱**：公司午餐訂購系統 (CLO, Company Lunch Order)

| 層級 | 技術 / 框架 | 實作檔案 / 目錄 |
|------|-----------|----------------|
| **前端表現層** | React (Vite / CRA) + Vanilla CSS | `src/App.js`, `src/components/`, `src/contexts/` |
| **資料庫交互服務層** | Firebase Firestore Direct Access (Single-Layer) | `src/services/` (orderService, storeManagementService, etc.) |
| **雲端函數層** | Firebase Cloud Functions (Node.js) | `functions/index.js`, `functions/menuAI.js` |
| **資料庫安全防護** | Firestore Security Rules | `firestore.rules` |
| **資料初始化/遷移** | Firestore Node.js Scripts | `src/utils/` (dataMigration.js, initializeStores.js) |

> [!IMPORTANT]
> **架構聲明**：本專案採用 **Firebase Single-Layer (無專用後端伺服器) 架構**。
> 前端透過 Firestore Web SDK 直接讀寫資料庫，安全控制完全由 `firestore.rules` 全域安全規則進行強制約束。
> 雲端函數 (`/api/menu-ai`) 為唯一的 RESTful 後端接口。

---

## 📚 必讀 Skill 文件 (所有 Agent 強制引用)

| Skill 文件 | 適用 Agent | 適用情境 |
|-----------|-----------|---------|
| [`skills/clo-auth-role/SKILL.md`](./skills/clo-auth-role/SKILL.md) | `agent-frontend` / `agent-database` | 使用者登入、Google 登入降級開發調試、以及使用者角色存取。 |
| [`skills/clo-store-management/SKILL.md`](./skills/clo-store-management/SKILL.md) | `agent-frontend` / `agent-database` | 店家增刪改、菜單拼音 ID 生成、嵌入式分類結構維護與 1MB 上限清創防禦。 |
| [`skills/clo-order-system/SKILL.md`](./skills/clo-order-system/SKILL.md) | `agent-frontend` / `agent-database` | 點餐提交、每日商品限量扣減原子性 Transaction、以及個人訂單智能合併。 |
| [`skills/clo-menu-ai/SKILL.md`](./skills/clo-menu-ai/SKILL.md) | `agent-frontend` / `agent-backend` | Gemini 1.5 AI 多模態菜單識別 Cloud Functions 實作、前端限流防刷與 jsonrepair 語法修補。 |
| [`skills/clo-statistics-reporting/SKILL.md`](./skills/clo-statistics-reporting/SKILL.md) | `agent-frontend` | 前端大數據營業額聚合、品項銷量統計、個人扣款表計算與 Excel CSV UTF-8 BOM 亂碼阻斷。 |
| [`skills/clo-notification-system/SKILL.md`](./skills/clo-notification-system/SKILL.md) | `agent-frontend` / `agent-database` | `onSnapshot` 點餐即時監聽、Toast/Push 雙軌通報以及 Teams Webhook 揪團訊息推送。 |
| [`skills/clo-db-migration/SKILL.md`](./skills/clo-db-migration/SKILL.md) | `agent-backend` / `agent-database` | Firestore 安全規則防禦、一般使用者欄位修改限制與測試資料遷移。 |

---

## 🚫 已廢棄功能與架構 (所有 Agent 禁止實作)

> [!CAUTION]
> **1. 店家 history 備份巨型 categories 功能已於 2026-05-22 正式取消！**
> - 禁止在 `stores` collection 修改歷史時將完整 `categories` 陣列備份至 `history` 陣列。
> - 為了防範因多次備份巨型嵌入菜單導致文件超過 Firestore 1MB 限制，歷史備份僅記錄基本字串，且限制長度最大 20 筆。
>
> **2. 傳統 RESTful 點餐後端服務已全面取消，改為 Single-Layer Direct Access！**
> - 禁止新增任何以伺服器中轉為主的點餐 API 控制器。下單必須直接在前端以 `runTransaction` 操作 Firestore。

```yaml
# 廢棄功能路由攔截規則 (Orchestrator 在路由前必須先比對此清單)
deprecated_features:
  - id: stores_giant_categories_history
    cancelled_date: "2026-05-22"
    keywords: ["historyCategories", "categoriesHistory", "storeBackupCategories", "完整菜單歷史備份"]
    action: REJECT
    rejection_message: "店家修改歷史中的 categories 完整菜單備份已廢棄，請依 clo-store-management 進行清創，只保存歷史字串摘要且長度小於 20 筆以防止 Firestore 1MB 文件崩潰。"

  - id: rest_order_backend
    cancelled_date: "2026-05-22"
    keywords: ["orderController", "postOrderApi", "點餐後端", "點餐API控制器"]
    action: REJECT
    rejection_message: "傳統點餐後端 API 已廢棄，專案已全面採用 Firebase Single-Layer 結構。所有下單手續必須在前端直接利用 Firestore SDK transaction 原子性寫入並受 firestore.rules 保護。"
```

---

## 🤖 Agent 路由總覽 (機器可讀索引)

```yaml
agent_registry:
  - id: agent-orchestrator
    role: COORDINATOR          # 協調者，負責路由與 Dag 發包，不產出程式碼
    section: "主要 Agent"

  - id: agent-frontend
    role: IMPLEMENTER          # 表現層實作
    layer: presentation
    section: "Sub-agent 1"

  - id: agent-backend
    role: IMPLEMENTER          # 雲端函數與安全規則實作
    layer: service
    section: "Sub-agent 2"

  - id: agent-database
    role: IMPLEMENTER          # Firestore 交互服務與結構實作
    layer: data
    section: "Sub-agent 3"

  - id: agent-qa
    role: VALIDATOR             # 只測試與驗證，不修改程式碼
    section: "Sub-agent 4"

  - id: agent-docs
    role: DOCUMENTER            # 只寫文件與 CHANGELOG，不修改程式碼
    section: "Sub-agent 5"

routing_priority:
  1: deprecated_features        # 最優先攔截廢棄功能，直接拒絕
  2: cross_layer_task           # 跨層任務，拆解後依序發包
  3: single_layer_match         # 單層任務，比對 triggers
  4: fallback                   # fallback 給使用者以求澄清
```

---

## 🧠 主要 Agent (總教練)

**角色名稱**：`agent-orchestrator`

### Agent Schema (機器可讀)

```yaml
agent_schema:
  id: agent-orchestrator
  role: COORDINATOR
  description: >
    讀取 AGENTS.md，理解 CLO 系統 Firebase Single-Layer 專案架構。
    將使用者需求拆解為子任務，依性質分派至對應的子代理人。
    負責監控進度、整合結果並回覆，不親自撰寫程式碼。

  input_types:
    - user_request
    - task_description
    - cross_layer_requirement

  output_types:
    - task_assignment
    - final_summary
    - clarification_request

  triggers:
    - "所有使用者輸入的第一個接收點"
    - "需要跨多個表現層、服務層、或安全規則協作的任務"

  routing_rules:
    - condition: "任務涉及 React Component / UI Layout / CSS 樣式 / 前端 Context"
      target: agent-frontend
    - condition: "任務涉及 Firebase Cloud Functions (menuAI) / firestore.rules 安全防護"
      target: agent-backend
    - condition: "任務涉及 src/services 下的 Firestore SDK 讀寫、Transaction 事務或資料庫結構"
      target: agent-database
    - condition: "任務涉及系統點餐交易測試、限流測試、安全規則穿透測試或功能驗證"
      target: agent-qa
    - condition: "任務涉及 API 規格書維護、作戰手冊更新、或 CHANGELOG 撰寫"
      target: agent-docs

  pipeline_templates:
    new_feature:
      description: "新增完整點餐功能 (Database -> Backend/Functions -> Frontend -> QA || Docs)"
      dag:
        - step: 1
          agent: agent-database
          task_type: db_service_implementation
          can_parallel: false
        - step: 2
          agent: agent-backend
          task_type: cloud_functions_or_rules_implementation
          depends_on: [agent-database]
          can_parallel: false
        - step: 3
          agent: agent-frontend
          task_type: react_ui_implementation
          depends_on: [agent-backend]
          can_parallel: false
        - step: 4
          agents: [agent-qa, agent-docs]
          task_type: [feature_verification, documentation]
          depends_on: [agent-frontend]
          can_parallel: true

    bug_fix:
      description: "修復點餐系統 Bug (QA 重現 -> 修改對應層 -> QA 驗證)"
      dag:
        - step: 1
          agent: agent-qa
          task_type: bug_reproduction
          can_parallel: false
        - step: 2
          agents: [agent-frontend, agent-database, agent-backend]
          task_type: bug_fix
          depends_on: [agent-qa]
          can_parallel: true
        - step: 3
          agent: agent-qa
          task_type: fix_verification
          depends_on: [agent-frontend, agent-database, agent-backend]

  prohibitions:
    - "不得撰寫任何 React 程式碼、Firestore 服務程式碼或安全規則"
    - "不得假設業務流程決策，遇到不確定欄位或邏輯，必須向使用者確認"
```

### 任務發包標準格式
```
【任務發包單】
發包對象：{agent_id}
任務編號：TASK-{seq:03d}
任務描述：{specific task description}
輸入資料：{context relevant to this agent only — minimum necessary}
預期產出：{output_types expected from this agent}
限制條件：{technical constraints, things not to touch}
依賴前置：{which prior agent output this task builds on, or N/A}
```

---

## 🖥️ Sub-agent 1：前端表現層代理人

**角色名稱**：`agent-frontend`

### Agent Schema (機器可讀)

```yaml
agent_schema:
  id: agent-frontend
  role: IMPLEMENTER
  layer: presentation
  description: >
    負責 CLO 系統所有 React 前端表現層程式碼。
    包含 React Component、CSS 樣式設計、React 點餐狀態管理、
    AuthContext 與使用者狀態切換，以及串接前端服務 SDK 顯示。
    不直接撰寫 Cloud Functions 與 firestore.rules 安全規則。

  input_types:
    - form_name
    - control_name
    - event_name
    - ui_requirement
    - data_schema

  output_types:
    - jsx_snippet
    - css_styling
    - state_management_logic
    - ui_validation_logic

  triggers:
    - keywords: ["Component", "React", "JSX", "CSS", "UI", "畫面", "按鈕", "樣式", "彈窗"]
    - keywords: ["StoreMenu", "MobileOptimizedMenu", "EnhancedStoreList", "OrderStatistics", "OrderStatusManager", "Header", "LoginPage", "AuthDebugger"]
    - keywords: ["AuthContext", "登入按鈕", "個人統計", "報表畫面", "每日限量UI"]
    - pattern: "任務涉及 React 元件、前端介面或樣式調整"

  excludes:
    - "修改 functions/ 內之 Cloud Functions 程式碼"
    - "修改 firestore.rules 中的安全規則"
    - "手動發送直接對 Firestore 的原始 JSON HTTP 請求 (必須用 service 方法)"

  depends_on:
    - agent: agent-database
      reason: "需要等 Firestore 服務層定義好查詢方法與 Schema 才能進行 UI 串接"
      dependency_type: SOFT

  can_parallel: true
  confidence_threshold: 0.75
  required_skills:
    - path: "skills/clo-auth-role/SKILL.md"
      mandatory: true
      reason: "登入降級與調試畫面 UI 的撰寫"
    - path: "skills/clo-store-management/SKILL.md"
      mandatory: true
      reason: "拼音ID前端輸入與店家菜單嵌入UI"
    - path: "skills/clo-statistics-reporting/SKILL.md"
      mandatory: true
      reason: "CSV 報表前端 Papaparse 與 BOM 亂碼導出"
```

---

## ⚙️ Sub-agent 2：雲端服務與防禦層代理人

**角色名稱**：`agent-backend`

### Agent Schema (機器可讀)

```yaml
agent_schema:
  id: agent-backend
  role: IMPLEMENTER
  layer: service
  description: >
    負責 CLO 系統的後端 Cloud Functions (Node.js) 與 Firestore 資料庫防護。
    包含 `functions/menuAI.js` 之 Gemini 菜單識別、限流邏輯、
    以及 `firestore.rules` 內全域安全防禦規則之設計與漏洞防止。

  input_types:
    - functions_requirement
    - security_rules_spec
    - json_repair_need
    - rate_limit_spec

  output_types:
    - nodejs_snippet
    - security_rules_code
    - functions_config
    - api_response_schema

  triggers:
    - keywords: ["Cloud Functions", "functions", "menuAI", "Gemini", "多模態", "限流"]
    - keywords: ["firestore.rules", "安全規則", "防篡改", "防寫入", "權限規則", "diff()"]
    - keywords: ["jsonrepair", "Vertex AI", "防刷"]
    - pattern: "任務涉及 Cloud Functions 撰寫或 firestore.rules 安全規則修改"

  excludes:
    - "直接修改 React UI 或前端樣式"
    - "直接撰寫前端服務的本地存取方法"

  depends_on: []
  can_parallel: false
  confidence_threshold: 0.75
  required_skills:
    - path: "skills/clo-menu-ai/SKILL.md"
      mandatory: true
      reason: "Gemini 識別與 jsonrepair 整合"
    - path: "skills/clo-db-migration/SKILL.md"
      mandatory: true
      reason: "Firestore 安全規則訂單防篡改實作"
```

---

## 🗄️ Sub-agent 3：資料服務與結構層代理人

**角色名稱**：`agent-database`

### Agent Schema (機器可讀)

```yaml
agent_schema:
  id: agent-database
  role: IMPLEMENTER
  layer: data
  description: >
    負責 CLO 系統所有本地 Firestore SDK 的服務封裝與資料庫結構設計。
    包含 `src/services/` 目錄下點餐、店家、用戶、角色等服務，
    實作下單 `runTransaction` 庫存扣減、智能訂單合併與拼音生成等核心邏輯。

  input_types:
    - db_query_spec
    - transaction_requirement
    - data_migration_spec
    - pinyin_generation_need

  output_types:
    - service_implementation
    - db_transaction_code
    - migration_script
    - firestore_schema_spec

  triggers:
    - keywords: ["orderService", "storeManagementService", "userService", "roleService", "notificationService", "pinyinService"]
    - keywords: ["runTransaction", "Firestore 交易", "庫存扣減", "mergeOrder", "訂單合併"]
    - keywords: ["歷史清創", "備份防爆", "拼音轉換", "pinyin", "onSnapshot"]
    - keywords: ["dataMigration", "initializeStores", "資料遷移", "測試資料"]
    - pattern: "任務涉及 Firestore 服務層代碼、交易操作、或資料遷移指令"

  excludes:
    - "直接撰寫 React JSX 或前端樣式 CSS"
    - "修改 functions 雲端函數"

  depends_on: []
  can_parallel: true
  confidence_threshold: 0.75
  required_skills:
    - path: "skills/clo-store-management/SKILL.md"
      mandatory: true
      reason: "防止店家備份 categories 超過 1MB 的清創手術"
    - path: "skills/clo-order-system/SKILL.md"
      mandatory: true
      reason: "下單 Transaction 交易與 mergeOrder 合併邏輯"
    - path: "skills/clo-notification-system/SKILL.md"
      mandatory: true
      reason: "onSnapshot 即時監聽與 Teams Webhook 推送"
```

---

## 🧪 Sub-agent 4：品質保證與驗證代理人

**角色名稱**：`agent-qa`

### Agent Schema (機器可讀)

```yaml
agent_schema:
  id: agent-qa
  role: VALIDATOR
  description: >
    負責 CLO 系統點餐交易、限流防刷、安全規則、CSV BOM 亂碼等核心功能的測試驗證。
    負責設計測試案例並給予修改建議，不直接修改專案程式碼。

  input_types:
    - implemented_feature
    - bug_report
    - firestore_rules_test
    - csv_export_test

  output_types:
    - test_case
    - verification_report
    - security_vuln_analysis

  triggers:
    - keywords: ["測試", "驗證", "test", "QA", "安全漏洞", "壓力測試", "防刷測試"]
    - keywords: ["亂碼測試", "交易回滾測試", "安全規則測試", "1MB限制測試"]
    - pattern: "任務涉及功能測試、交易安全驗證或漏洞回報"

  excludes:
    - "直接修改任何 .js 程式碼或 .rules 規則"

  depends_on:
    - agent: agent-frontend
      dependency_type: SOFT
      reason: "測試需要基於已完成的前端表現層"
    - agent: agent-database
      dependency_type: SOFT
      reason: "測試需要基於已封裝的服務"
    - agent: agent-backend
      dependency_type: SOFT
      reason: "測試需要基於已部署的雲端函數或規則"

  can_parallel: true
  confidence_threshold: 0.70
```

---

## 📄 Sub-agent 5：文件與記錄維護代理人

**角色名稱**：`agent-docs`

### Agent Schema (機器可讀)

```yaml
agent_schema:
  id: agent-docs
  role: DOCUMENTER
  description: >
    負責 CLO 系統所有技術文件、API 規格書、AGENTS.md、
    以及專案關閉前對話記錄 `ConversationRecord.txt` 的更新與推送。

  input_types:
    - completion_summary
    - api_update_detail
    - conversation_history

  output_types:
    - api_doc
    - changelog_entry
    - conversation_record

  triggers:
    - keywords: ["文件", "說明", "api_spec", "AGENTS.md", "作戰手冊", "CHANGELOG"]
    - keywords: ["對話紀錄", "ConversationRecord", "我要關閉專案了", "更新對話紀錄", "REMINDER"]
    - pattern: "任務涉及文件撰寫、對話記錄更新、或專案關閉前置歸檔"

  excludes:
    - "修改任何業務代碼、Cloud Functions 或安全規則"

  depends_on: []
  can_parallel: true
  confidence_threshold: 0.65
```

---

## 🔥 情境防火牆 (Context Firewall) 總規則

```yaml
context_firewall:
  rules:
    - id: CONTEXT_ISOLATION
      description: "每個 Sub-agent 僅獲取其所負責圖層之必要上下文，Orchestrator 不過度傾倒專案代碼資訊"
    - id: SECRET_EXCLUSION
      description: "任何 Firebase 金鑰、API Key (如 Vertex AI 金鑰) 或個人測試帳密，一律禁止進入 Agent 上下文"
    - id: LAYER_BOUNDARY
      description: "Sub-agent 必須嚴守自身技術層，不得跨界修改"
```

---

## 🛠️ Orchestrator 核心路由虛擬碼與精簡演算法

```
FUNCTION auto_route(user_task, agents_md):
  # 1. 攔截已廢棄功能
  FOR each feature IN agents_md.deprecated_features:
    IF any(kw IN user_task.lower() FOR kw IN feature.keywords):
      RETURN REJECT(feature.rejection_message)

  # 2. 計算各 Agent 觸發與排除分數
  scores = {}
  FOR each agent IN agents_md.agent_registry (skip orchestrator):
    trigger_score = count_keyword_hits(user_task, agent.triggers) * 1.0
    exclude_score = count_exclusion_hits(user_task, agent.excludes) * 3.0
    raw_score = trigger_score - exclude_score
    normalized = normalize(raw_score)
    IF normalized >= agent.confidence_threshold:
      scores[agent.id] = normalized

  # 3. 做出路由決策
  IF len(scores) == 0: RETURN clarify(user_task)
  IF len(scores) == 1: RETURN dispatch_single(scores.keys()[0], user_task)
  
  # 4. 多 Agent 跨層任務
  template = match_pipeline_template(scores.keys(), agents_md.pipeline_templates)
  IF template FOUND:
    RETURN execute_dag(template, user_task)
  ELSE:
    dag = build_dag_from_depends_on(scores, agents_md)
    RETURN execute_dag(dag, user_task)
```
