# Agent Schema Field Reference

Complete specification for every field in an `agent_schema` YAML block.
Read this before writing any agent schema. Every field listed here is required
unless marked **optional**.

---

## Full Schema Template

```yaml
agent_schema:
  id: string                        # required
  role: COORDINATOR|IMPLEMENTER|VALIDATOR|DOCUMENTER  # required
  layer: string                     # required for IMPLEMENTER
  description: string               # required (2–4 sentences)

  input_types:                      # required
    - string

  output_types:                     # required
    - string

  triggers:                         # required
    - keywords: [string, ...]
    - pattern: string

  excludes:                         # required
    - string

  depends_on:                       # required (use [] if none)
    - agent: string
      reason: string
      dependency_type: HARD|SOFT

  can_parallel: boolean             # required
  confidence_threshold: float       # required (0.0–1.0)

  required_skills:                  # optional
    - path: string
      mandatory: boolean
      reason: string

  known_issues:                     # optional
    - id: string
      severity: P0|P1|P2
      description: string
      status: string
      assigned_fix: string          # optional

  known_apis:                       # optional
    - name: string
      signature: string
      location: string
      status: ACTIVE|DEPRECATED|PLANNED

  known_tables:                     # optional
    active: [string]
    planned: [string]
    deprecated: [string]

  known_forms:                      # optional (frontend agents)
    - name: string
      purpose: string

  pending_decisions:                # optional (orchestrator only)
    - id: string
      description: string
      status: BLOCKED_PENDING_CONFIRMATION
      affects: [string]
```

---

## Field-by-Field Specification

### `id`
**Type**: string, kebab-case  
**Purpose**: Unique identifier used in `depends_on`, `pipeline_templates`, and task assignments.  
**Convention**: `agent-{role}` e.g. `agent-frontend`, `agent-database`  
**Rules**:
- Lowercase only
- Hyphens, no underscores
- Must be unique within the document
- Referenced exactly in all cross-agent references

---

### `role`
**Type**: enum  
**Purpose**: Tells the Orchestrator what category of agent this is.

| Value | Meaning |
|-------|---------|
| `COORDINATOR` | Routes tasks, never produces implementation output. Only one per document. |
| `IMPLEMENTER` | Produces code, SQL, config, or other implementation artifacts. |
| `VALIDATOR` | Reviews or tests output. Does not modify code. |
| `DOCUMENTER` | Produces documentation. Does not modify code. |

---

### `layer`
**Type**: string (required for IMPLEMENTER role)  
**Purpose**: Which architectural layer this agent owns.  
**Common values**: `presentation`, `service`, `data`, `infrastructure`, `mobile`, `ml`  
**Rules**: Two agents must not claim the same layer, or their `triggers` must not overlap.

---

### `description`
**Type**: string (2–4 sentences)  
**Purpose**: Primary semantic routing material. The Orchestrator embeds this in its
prompt when scoring agents against a task. Write it so a language model can match
it to task descriptions.  
**Good example**:
> Responsible for all WinForms UI code. Handles Form events, control layouts, SOAP
> proxy calls from the presentation layer, and front-end validation. Does not write
> SQL or business logic.

**Bad example** (too vague):
> Handles the front end of the application.

---

### `input_types`
**Type**: string array  
**Purpose**: Machine-matchable identifiers for what this agent can accept.
The Orchestrator compares task input characteristics against this list.  
**Convention**: snake_case identifiers, not prose.

**Common input_type values by layer**:

| Layer | Typical input_types |
|-------|-------------------|
| Frontend | `form_name`, `control_name`, `event_name`, `webmethod_name`, `ui_requirement`, `soap_response_schema` |
| Backend | `webmethod_requirement`, `business_logic_spec`, `sql_result_schema`, `transaction_requirement`, `caller_form_name` |
| Database | `data_requirement`, `table_name`, `business_condition`, `migration_requirement`, `performance_issue` |
| QA | `implemented_feature`, `bug_report`, `cs_snippet`, `sql_query`, `cross_layer_spec` |
| Docs | `webmethod_signature`, `cs_snippet`, `column_schema`, `feature_completion` |

---

### `output_types`
**Type**: string array  
**Purpose**: What this agent produces. Used by the Orchestrator to chain agents:
if Agent A's output_type matches Agent B's input_type, they can be pipelined.  
**Convention**: snake_case identifiers.

**Common output_type values by layer**:

| Layer | Typical output_types |
|-------|---------------------|
| Frontend | `cs_snippet`, `designer_cs_snippet`, `validation_logic`, `ui_state_logic` |
| Backend | `webmethod_signature`, `cs_implementation`, `sql_request`, `return_schema`, `web_config_entry` |
| Database | `sql_query`, `stored_procedure`, `table_ddl`, `migration_script`, `index_recommendation`, `column_schema` |
| QA | `test_case`, `manual_test_script`, `soap_test_request`, `sql_validation_query`, `bug_analysis`, `verification_report` |
| Docs | `api_doc`, `db_doc`, `xml_doc_comment`, `changelog_entry`, `progress_report`, `feature_spec` |

---

### `triggers`
**Type**: array of `{keywords: [...]}` or `{pattern: string}` objects  
**Purpose**: Rules the Orchestrator uses to score this agent for a given task.
Higher keyword match → higher routing score.  
**Rules**:
- Include method/table/form names the agent owns
- Include domain vocabulary the user might say
- Include both English and the project's working language
- Each `keywords` entry is an OR group (any match counts)
- `pattern` entries are natural-language rules for LLM scoring

**Example**:
```yaml
triggers:
  - keywords: ["WebMethod", "Service.cs", "ADO", "三層式", "後端"]
  - keywords: ["saveQCDecision", "getQCStatus", "TQcInspectionRecordAdo"]
  - keywords: ["Transaction", "DataSet", "DataTable", "商業邏輯"]
  - pattern: "任務涉及 WebMethod 設計或商業邏輯實作"
```

---

### `excludes`
**Type**: string array  
**Purpose**: Conditions that reduce this agent's routing score even if triggers match.
Prevents an agent from being dispatched to tasks it cannot handle.  
**Rules**:
- Write as natural-language disqualifiers
- Cover cross-layer boundary violations
- Cover deprecated feature touches
- Cover version/syntax limitations

**Example**:
```yaml
excludes:
  - "直接撰寫 SQL 語法（需交由 agent-database）"
  - "修改 WinForms Form 的程式碼"
  - "使用 .NET 4.5+ 語法（本專案限 .NET 4.0）"
  - "實作任何廢棄功能"
```

---

### `depends_on`
**Type**: array of dependency objects (or empty `[]`)  
**Purpose**: Defines prerequisite agents. The Orchestrator uses this to build a DAG.

```yaml
depends_on:
  - agent: agent-database
    reason: "WebMethod 呼叫的 SQL 需由 agent-database 先確認"
    dependency_type: SOFT   # or HARD
```

| `dependency_type` | Meaning |
|------------------|---------|
| `HARD` | This agent cannot start at all until the dependency completes |
| `SOFT` | This agent can start partial work; the dependency output fills gaps later |

---

### `can_parallel`
**Type**: boolean  
**Purpose**: Whether this agent can run concurrently with other agents in a DAG step.  
**Guidance**:
- `true` for agents with no shared state dependencies (e.g., `agent-qa` and `agent-docs` both read completed code)
- `false` for agents that produce output consumed by the next agent in a strict sequence

---

### `confidence_threshold`
**Type**: float, 0.0–1.0  
**Purpose**: Minimum routing score for this agent to be selected.
Tasks scoring below this threshold either go to a different agent or trigger clarification.  
**Recommended defaults**:

| Role | Recommended value |
|------|-----------------|
| COORDINATOR | not applicable |
| IMPLEMENTER (core layer) | 0.75 |
| IMPLEMENTER (specialized) | 0.80 |
| VALIDATOR | 0.70 |
| DOCUMENTER | 0.65 |

---

### `required_skills` (optional)
**Type**: array  
**Purpose**: Skill files this agent must read before executing.
```yaml
required_skills:
  - path: "skills/my-backend/SKILL.md"
    mandatory: true
    reason: "Contains naming conventions that must not be violated"
```

---

### `known_issues` (optional)
**Type**: array  
**Purpose**: Open bugs or incomplete implementations this agent must be aware of.
Prevents AI from assuming things are complete when they aren't.
```yaml
known_issues:
  - id: P0_missing_detail_row
    severity: P0
    description: "saveTransaction writes only 1 detail row; should write H+S pair"
    status: PENDING_FIX
    assigned_fix: agent-backend
```

---

### `known_apis` (optional, backend agents)
**Type**: array  
**Purpose**: Existing methods/endpoints this agent maintains. Prevents AI from
rewriting or duplicating existing implementations.
```yaml
known_apis:
  - name: "getStatusByKey(key, lotNo)"
    signature: "DataTable getStatusByKey(string key, string lotNo)"
    location: "Service.cs L8719"
    status: ACTIVE
```

---

### `known_tables` (optional, database agents)
**Type**: object with `active`, `planned`, `deprecated` arrays  
**Purpose**: DB tables in scope. Deprecated tables trigger auto-rejection of DML tasks.
```yaml
known_tables:
  active:    [T_ORDER_HEADER, T_ORDER_DETAIL]
  planned:   [T_ORDER_TRACE]
  deprecated: [T_ORDER_ATTACHMENT]   # AI must never touch these
```

---

## Deprecated Features Block (document-level)

Place this **before** the agent registry. The Orchestrator checks this first, before
any agent scoring.

```yaml
deprecated_features:
  - id: string
    cancelled_date: "YYYY-MM-DD"
    keywords: [string, ...]    # any of these in the task → auto-reject
    action: REJECT
    rejection_message: string  # shown to user when rejected
```

---

## Pipeline Templates Block (orchestrator-level)

Standard DAG patterns the Orchestrator can apply without LLM reasoning:

```yaml
pipeline_templates:
  new_feature:
    description: "新增完整功能（DB → Backend → Frontend → QA ‖ Docs）"
    dag:
      - step: 1
        agent: agent-database
        task_type: schema_design
        can_parallel: false
      - step: 2
        agent: agent-backend
        task_type: implementation
        depends_on: [agent-database]
        can_parallel: false
      - step: 3
        agent: agent-frontend
        task_type: ui_implementation
        depends_on: [agent-backend]
        can_parallel: false
      - step: 4
        agents: [agent-qa, agent-docs]
        task_type: [testing, documentation]
        depends_on: [agent-frontend]
        can_parallel: true

  bug_fix:
    description: "修復 Bug（QA 重現 → 修復層 → QA 驗證）"
    dag:
      - step: 1
        agent: agent-qa
        task_type: bug_reproduction
        can_parallel: false
      - step: 2
        agents: [agent-backend, agent-database, agent-frontend]
        task_type: bug_fix
        depends_on: [agent-qa]
        can_parallel: true   # Orchestrator prunes to affected layers
      - step: 3
        agent: agent-qa
        task_type: fix_verification
        depends_on: [agent-backend, agent-database, agent-frontend]

  query_only:
    description: "純查詢或狀態確認，不需修改程式碼"
    dag:
      - step: 1
        agent: agent-database
        task_type: sql_query
        can_parallel: false
```
