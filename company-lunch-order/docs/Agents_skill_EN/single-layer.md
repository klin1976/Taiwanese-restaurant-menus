# Example: Single-Layer or Small Project

Use this template when the project has only **1–2 implementation agents**
(e.g., a pure API project with no UI, a data pipeline, or a small solo project).

Skip `agent-frontend` if there is no UI layer.
Skip `agent-qa` and `agent-docs` only for very small personal projects.

---

## When to use this template vs fullstack.md

| Signal | Template |
|--------|---------|
| 1–2 implementation agents | **This file** |
| 3+ implementation agents | `fullstack.md` |
| Pure API / CLI / data pipeline | **This file** |
| WinForms / Web / Mobile + Backend + DB | `fullstack.md` |

---

## Minimal 2-Agent Example (Backend + Database)

```markdown
# AGENTS.md — {PROJECT_NAME}

> All agents read this file before starting any task.

## Architecture

| Layer | Technology |
|-------|-----------|
| Service | {language, framework} |
| Database | {engine} |

---

## Deprecated Features

​```yaml
deprecated_features: []   # none initially; add as needed
​```

---

## Agent Registry

​```yaml
agent_registry:
  - id: agent-orchestrator
    role: COORDINATOR
  - id: agent-backend
    role: IMPLEMENTER
    layer: service
  - id: agent-database
    role: IMPLEMENTER
    layer: data

routing_priority:
  1: deprecated_features
  2: single_layer_match
  3: fallback
​```

---

## Orchestrator

### Agent Schema

​```yaml
agent_schema:
  id: agent-orchestrator
  role: COORDINATOR
  description: >
    Routes tasks between agent-backend and agent-database.
    Never writes implementation code.

  input_types: [user_request]
  output_types: [task_assignment, final_summary, clarification_request]
  triggers:
    - pattern: "All user input enters here"

  routing_rules:
    - condition: "Task involves API endpoints, business logic, or service code"
      target: agent-backend
    - condition: "Task involves SQL, tables, migrations, or DB schema"
      target: agent-database
    - condition: "Task spans both layers"
      target: [agent-database, agent-backend]
      execution: SEQUENTIAL_WITH_DAG

  pipeline_templates:
    new_feature:
      dag:
        - step: 1
          agent: agent-database
          can_parallel: false
        - step: 2
          agent: agent-backend
          depends_on: [agent-database]
          can_parallel: false

  prohibitions:
    - "Never write implementation code directly"
​```

---

## Backend Agent

### Agent Schema

​```yaml
agent_schema:
  id: agent-backend
  role: IMPLEMENTER
  layer: service
  description: >
    {2-4 sentence description of what this agent owns.}

  input_types:
    - api_endpoint_requirement
    - business_logic_spec
    - sql_result_schema

  output_types:
    - endpoint_implementation
    - sql_request
    - return_schema

  triggers:
    - keywords: ["{framework}", "{language}", "endpoint", "route", "handler"]
    - keywords: ["{KnownMethod1}", "{KnownMethod2}"]
    - pattern: "Task involves API logic or service implementation"

  excludes:
    - "Writing SQL directly"
    - "Modifying DB schema"

  depends_on:
    - agent: agent-database
      reason: "SQL needed before service implementation"
      dependency_type: SOFT
  can_parallel: false
  confidence_threshold: 0.75
​```

### Responsibilities
- {Description}

---

## Database Agent

### Agent Schema

​```yaml
agent_schema:
  id: agent-database
  role: IMPLEMENTER
  layer: data
  description: >
    {2-4 sentence description.}

  input_types:
    - data_requirement
    - table_name
    - business_condition

  output_types:
    - sql_query
    - table_ddl
    - column_schema

  triggers:
    - keywords: ["SQL", "table", "migration", "schema", "query"]
    - keywords: ["{KnownTable1}", "{KnownTable2}"]
    - pattern: "Task involves SQL, table structure, or data"

  excludes:
    - "Modifying application code"

  depends_on: []
  can_parallel: true
  confidence_threshold: 0.75

  known_tables:
    active: ["{TABLE1}", "{TABLE2}"]
    deprecated: []
​```

---

## Context Firewall

​```yaml
context_firewall:
  rules:
    - id: CONTEXT_ISOLATION
    - id: LAYER_BOUNDARY
    - id: SECRET_EXCLUSION
​```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | {date} | Initial |
```
