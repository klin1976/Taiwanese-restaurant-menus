# Example: Full-Stack Multi-Agent Project

This example shows a complete AGENTS.md skeleton for a project with 5 agents
across presentation / service / data layers. Use this as your starting template
when the project has 4+ agents.

Substitute bracketed `{placeholders}` with real project values from the interview.

---

```markdown
# AGENTS.md — {PROJECT_NAME}

> All agents must read this file before starting any task.
> This document is the Single Source of Truth for AI collaboration.

---

## 🏗️ Project Architecture

**Project**: {one-sentence description}

| Layer | Technology |
|-------|-----------|
| Frontend | {framework, language, version} |
| Backend | {API style, language, framework} |
| Database | {engine, ORM or raw} |
| Protocol | {HTTP/SOAP/gRPC/etc.} |
| IDE | {tool and version} |

> [!IMPORTANT]
> {Any critical architecture caveat — e.g., "REST URLs in specs are descriptive only;
> actual interface is SOAP WebMethod in Service.cs"}

---

## 📚 Required Skill Files

| Skill File | Applicable Agent | When to Read |
|-----------|-----------------|-------------|
| `{path/to/skill}` | `{agent-id}` | {situation} |

---

## 📊 Global Status Codes / Enums

| Code | Meaning | Notes |
|------|---------|-------|
| `{code}` | {description} | {constraint} |

---

## 🚫 Deprecated Features

> [!CAUTION]
> The following features are cancelled. All agents must refuse tasks related to them.

​```yaml
deprecated_features:
  - id: {feature_id}
    cancelled_date: "{YYYY-MM-DD}"
    keywords: ["{term1}", "{term2}", "{ClassName}", "{MethodName}"]
    action: REJECT
    rejection_message: "{Feature} was cancelled on {date} and will not be implemented."
​```

---

## 🤖 Agent Registry

​```yaml
agent_registry:
  - id: agent-orchestrator
    role: COORDINATOR
  - id: agent-frontend
    role: IMPLEMENTER
    layer: presentation
  - id: agent-backend
    role: IMPLEMENTER
    layer: service
  - id: agent-database
    role: IMPLEMENTER
    layer: data
  - id: agent-qa
    role: VALIDATOR
  - id: agent-docs
    role: DOCUMENTER

routing_priority:
  1: deprecated_features
  2: cross_layer_task
  3: single_layer_match
  4: fallback
​```

---

## 🧠 Orchestrator

**Role**: `agent-orchestrator`

### Agent Schema

​```yaml
agent_schema:
  id: agent-orchestrator
  role: COORDINATOR
  description: >
    Reads AGENTS.md, decomposes user requests into sub-tasks,
    dispatches to appropriate sub-agents, and synthesizes results.
    Never writes implementation code directly.

  input_types:
    - user_request
    - task_description
    - cross_layer_requirement

  output_types:
    - task_assignment
    - final_summary
    - clarification_request

  triggers:
    - pattern: "All user input is received here first"

  routing_rules:
    - condition: "Task involves {UI element type}"
      target: agent-frontend
    - condition: "Task involves {API/service type}"
      target: agent-backend
    - condition: "Task involves SQL / tables / migrations"
      target: agent-database
    - condition: "Task involves testing / bug reproduction"
      target: agent-qa
    - condition: "Task involves documentation / changelog"
      target: agent-docs
    - condition: "Task spans multiple layers"
      target: [agent-database, agent-backend, agent-frontend, agent-qa, agent-docs]
      execution: SEQUENTIAL_WITH_DAG

  pipeline_templates:
    new_feature:
      description: "New end-to-end feature"
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
      description: "Bug reproduction → fix → verification"
      dag:
        - step: 1
          agent: agent-qa
          task_type: bug_reproduction
          can_parallel: false
        - step: 2
          agents: [agent-backend, agent-database, agent-frontend]
          task_type: bug_fix
          depends_on: [agent-qa]
          can_parallel: true
        - step: 3
          agent: agent-qa
          task_type: fix_verification
          depends_on: [agent-backend, agent-database, agent-frontend]

    query_only:
      description: "Data query or status check — no code changes"
      dag:
        - step: 1
          agent: agent-database
          task_type: sql_query
          can_parallel: false

  prohibitions:
    - "Never write implementation code or SQL directly"
    - "Never assume unresolved architecture decisions — ask user first"
    - "Never include secrets or PII in any agent's context"

  pending_decisions:
    - id: {decision_id}
      description: "{What needs to be decided}"
      status: BLOCKED_PENDING_CONFIRMATION
      affects: [agent-backend]
​```

### Task Assignment Format

​```
【Task Assignment】
Target Agent : {agent_id}
Task ID      : TASK-{NNN}
Description  : {what to do}
Input Data   : {relevant context — minimum necessary}
Expected Output : {output_types}
Constraints  : {what not to touch}
Depends On   : {prior agent output, or N/A}
​```

---

## 🖥️ Frontend Agent

**Role**: `agent-frontend`

### Agent Schema

​```yaml
agent_schema:
  id: agent-frontend
  role: IMPLEMENTER
  layer: presentation
  description: >
    Owns all {framework} UI code: {UI element types}, event handlers,
    {API proxy} calls, and front-end validation.
    Does not write {backend language} business logic or SQL.

  input_types:
    - form_name
    - control_name
    - event_name
    - api_method_name
    - ui_requirement
    - api_response_schema

  output_types:
    - ui_code_snippet
    - validation_logic
    - ui_state_logic

  triggers:
    - keywords: ["{UIComponent}", "{FormClass}", "{EventType}", "UI", "介面", "畫面"]
    - keywords: ["{KnownFormName1}", "{KnownFormName2}", "{KnownEventName}"]
    - pattern: "Task involves {UI element types} or {event handling}"

  excludes:
    - "Writing raw SQL"
    - "Modifying backend service files"
    - "Using {language version}+ syntax not available in {project version}"
    - "Any deprecated {feature name} UI"

  depends_on: []
  can_parallel: true
  confidence_threshold: 0.75

  required_skills:
    - path: "{path/to/frontend/skill}"
      mandatory: true
      reason: "Naming conventions and gotchas"
​```

### Responsibilities
- {List specific UI responsibilities}
- {Known form names with purpose}
- {Known event handlers}
- {Naming convention gotchas}

**Input format**:
​```
[Requirement]  : {what UI behavior is needed}
[Form / Component] : {which form or component}
[Expected behavior]: {how the UI should react}
[API to call]  : {which backend method}
​```

**Output format**:
​```
[Modified files]: {filename(s)}
[Code snippet]  : {complete pasteable code}
[Notes]         : {dependencies on backend / DB fields}
​```

---

## ⚙️ Backend Agent

**Role**: `agent-backend`

### Agent Schema

​```yaml
agent_schema:
  id: agent-backend
  role: IMPLEMENTER
  layer: service
  description: >
    Owns all {API framework} business logic: {API method types},
    {data access class types}, transaction management, and {serialization format}.
    Does not modify UI code or write raw SQL directly.

  input_types:
    - api_method_requirement
    - business_logic_spec
    - sql_result_schema
    - transaction_requirement
    - caller_component_name

  output_types:
    - method_signature
    - service_implementation
    - sql_request
    - return_schema
    - config_entry

  triggers:
    - keywords: ["{APIMethodKeyword}", "{ServiceClass}", "{DataAccessClass}"]
    - keywords: ["{KnownMethodName1}", "{KnownMethodName2}", "Transaction", "商業邏輯"]
    - keywords: ["後端", "backend", "{protocol}", "service"]
    - pattern: "Task involves {API method} design or business logic"

  excludes:
    - "Writing SQL directly (request from agent-database)"
    - "Modifying UI components"
    - "Using language features not available in {project version}"
    - "Implementing any deprecated feature"
    - "Assuming unresolved architecture decisions"

  depends_on:
    - agent: agent-database
      reason: "{Data access layer} SQL needed before service implementation"
      dependency_type: SOFT
  can_parallel: false
  confidence_threshold: 0.75

  required_skills:
    - path: "{path/to/backend/skill}"
      mandatory: true
      reason: "{Critical gotcha — e.g., sequence number update logic}"

  known_apis:
    - name: "{MethodName}({params})"
      signature: "{ReturnType} {MethodName}({ParamType} {paramName})"
      location: "{File} L{line}"
      status: ACTIVE

  known_issues:
    - id: P0_{issue_name}
      severity: P0
      description: "{What is broken}"
      status: PENDING_FIX
      assigned_fix: agent-backend
​```

### Responsibilities
- {List specific backend responsibilities}
- {Known API methods — Phase 1 complete}
- {Known API methods — Phase 2 planned}
- {Transaction rules}
- {Architecture warnings}

---

## 🗄️ Database Agent

**Role**: `agent-database`

### Agent Schema

​```yaml
agent_schema:
  id: agent-database
  role: IMPLEMENTER
  layer: data
  description: >
    Owns all {DB engine} work: table design, SQL queries,
    stored procedures, indexes, and migration scripts.
    Does not modify application code.

  input_types:
    - data_requirement
    - table_name
    - business_condition
    - migration_requirement
    - performance_issue

  output_types:
    - sql_query
    - stored_procedure
    - table_ddl
    - migration_script
    - index_recommendation
    - column_schema

  triggers:
    - keywords: ["SQL", "資料表", "Table", "欄位", "Column", "Schema", "Index"]
    - keywords: ["SELECT", "INSERT", "UPDATE", "DELETE", "JOIN"]
    - keywords: ["{KnownTableName1}", "{KnownTableName2}", "Stored Procedure"]
    - pattern: "Task involves SQL, table structure, or data migration"

  excludes:
    - "Modifying application code"
    - "Writing business logic that belongs in the service layer"
    - "Using {DB version}+ syntax before version is confirmed"
    - "Any DML on deprecated tables"

  depends_on: []
  can_parallel: true
  confidence_threshold: 0.75

  known_tables:
    active:
      - {TABLE_NAME_1}    # {purpose}
      - {TABLE_NAME_2}    # {purpose}
    planned:
      - {TABLE_NAME_3}    # {purpose, phase}
    deprecated:
      - {TABLE_NAME_4}    # deprecated {date}, reason: {reason}
​```

---

## 🧪 QA Agent

**Role**: `agent-qa`

### Agent Schema

​```yaml
agent_schema:
  id: agent-qa
  role: VALIDATOR
  description: >
    Designs test cases, reproduces bugs, and verifies fixes.
    Does not modify any code or database schema.
    Reports issues and recommendations; implementation goes to the relevant agent.

  input_types:
    - implemented_feature
    - bug_report
    - code_snippet
    - sql_query
    - cross_layer_spec

  output_types:
    - test_case
    - manual_test_script
    - api_test_request
    - sql_validation_query
    - bug_analysis
    - verification_report

  triggers:
    - keywords: ["測試", "test", "驗證", "verify", "QA", "bug", "錯誤", "問題"]
    - keywords: ["P0", "P1", "regression", "排查", "debug"]
    - pattern: "Task involves testing, verification, or bug investigation"

  excludes:
    - "Directly modifying any code file"
    - "Modifying any database table"

  depends_on:
    - agent: agent-frontend
      dependency_type: SOFT
      reason: "UI test requires completed frontend"
    - agent: agent-backend
      dependency_type: SOFT
      reason: "API test requires completed backend"
  can_parallel: true
  confidence_threshold: 0.70

  known_pending_issues:
    - id: {issue_id}
      description: "{What needs to be verified after fix}"
      assigned_fix: {agent-id}
​```

---

## 📄 Docs Agent

**Role**: `agent-docs`

### Agent Schema

​```yaml
agent_schema:
  id: agent-docs
  role: DOCUMENTER
  description: >
    Writes and maintains technical documentation based on other agents' outputs.
    Never assumes technical details — always waits for implementation confirmation.
    Does not modify code or database.

  input_types:
    - method_signature
    - code_snippet
    - column_schema
    - feature_completion

  output_types:
    - api_doc
    - db_doc
    - code_comment
    - changelog_entry
    - progress_report

  triggers:
    - keywords: ["文件", "document", "說明", "CHANGELOG", "API 文件", "規格"]
    - pattern: "Task involves writing or updating documentation"

  excludes:
    - "Modifying code or database"
    - "Assuming technical details not confirmed by other agents"
    - "Documenting deprecated features"

  depends_on:
    - agent: agent-backend
      dependency_type: SOFT
      reason: "API docs require confirmed method signatures"
    - agent: agent-database
      dependency_type: SOFT
      reason: "DB docs require confirmed table schema"
  can_parallel: true
  confidence_threshold: 0.65
​```

---

## 🔥 Context Firewall

​```yaml
context_firewall:
  rules:
    - id: CONTEXT_ISOLATION
      description: "Each agent receives only context relevant to its task"
    - id: NO_DIRECT_COMMUNICATION
      description: "Sub-agents communicate only through the orchestrator"
    - id: SECRET_EXCLUSION
      description: "No credentials, PII, or production data in any agent context"
      blocked_content: [DB_PASSWORDS, CUSTOMER_DATA, PROD_CREDENTIALS]
    - id: LAYER_BOUNDARY
      description: "Agents only modify their own layer"
    - id: RESULT_ONLY_REPORT
      description: "Agents report conclusions; trial-and-error stays internal"
​```

---

## ⚙️ Global Constraints

​```yaml
global_constraints:
  ide: "{IDE and version}"
  language_version: "{version}"
  db: "{DB engine}"
  protocol: "{HTTP/SOAP/gRPC}"
  no_new_dependencies: true
  deprecated_features:
    - {see deprecated_features block above}
​```

---

## 📋 Orchestrator Routing Algorithm

​```
FUNCTION auto_route(user_task):
  STEP 1 — Check deprecated_features → REJECT if keyword match
  STEP 2 — Extract: input_type, output_need, keywords
  STEP 3 — Score agents: trigger_score - exclude_penalty
           Select agents above confidence_threshold
  STEP 4 — Single match → dispatch
           Multi-match → match pipeline_template or build DAG
           No match → request clarification
​```

---

## 📝 Changelog

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | {date} | Initial AGENTS.md created |
```
