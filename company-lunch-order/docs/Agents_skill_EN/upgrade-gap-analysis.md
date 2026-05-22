# Upgrading an Existing AGENTS.md

This document describes the gap analysis and rewrite workflow
used when a user provides an existing AGENTS.md for upgrade.

---

## Step 1 — Parse the Existing Document

Read the uploaded AGENTS.md and extract:

```
existing_agents    = list of agent names / sections found
existing_schema    = any YAML blocks already present per agent
existing_knowledge = tables, methods, forms, constraints documented in prose
existing_version   = version / changelog if present
```

---

## Step 2 — Score Against Schema Checklist

For each agent found, score each required field:

| Symbol | Meaning |
|--------|---------|
| ✅ | Field present and machine-parseable (structured YAML) |
| ⚠️ | Field present but human-readable prose only (needs structuring) |
| ❌ | Field completely absent |

**Score table to produce**:

```
Field                  | agent-orch | agent-frontend | agent-backend | agent-db | agent-qa | agent-docs
-----------------------|------------|----------------|---------------|----------|----------|----------
id                     |            |                |               |          |          |
role                   |            |                |               |          |          |
description            |            |                |               |          |          |
input_types            |            |                |               |          |          |
output_types           |            |                |               |          |          |
triggers               |            |                |               |          |          |
excludes               |            |                |               |          |          |
depends_on             |            |                |               |          |          |
can_parallel           |            |                |               |          |          |
confidence_threshold   |            |                |               |          |          |
--- optional fields ---
required_skills        |            |                |               |          |          |
known_issues           |            |                |               |          |          |
known_apis             |            |                |               |          |          |
known_tables           |            |                |               |          |          |
```

Calculate per-agent scores:
- ✅ = 2 points (machine-parseable)
- ⚠️ = 1 point (present but needs structuring)
- ❌ = 0 points

Produce overall scores:
- **Human readability**: percentage of fields with any content (✅ or ⚠️)
- **Auto-routing fitness**: percentage of required fields that are ✅

---

## Step 3 — Report Gaps to User

Before rewriting, show the user the gap analysis:

```
## Gap Analysis Report

Human readability score:   {X}%  (based on ⚠️ + ✅ coverage)
Auto-routing fitness:      {Y}%  (based on ✅ only)

Critical gaps (blocking auto-routing):
  - agent-frontend: missing input_types, output_types, triggers (machine-readable)
  - agent-backend:  missing depends_on, can_parallel, confidence_threshold
  - All agents:     no agent_registry or routing_priority at document level

Strengths to preserve:
  - {e.g., "Detailed WebMethod listing with line numbers"}
  - {e.g., "Deprecated feature warnings"}
  - {e.g., "Known P0/P1 issues documented"}
```

---

## Step 4 — Rewrite with Preservation

**Rule: preserve all existing business knowledge. Add structure, don't delete prose.**

For each agent section:

1. **Keep all prose** — descriptions, known method/table/form lists, gotchas, naming rules
2. **Add `agent_schema` YAML block** immediately after the section header
3. **Extract keywords** from the prose into `triggers.keywords`
4. **Extract prohibitions** from "禁止事項" / "Forbidden" sections into `excludes`
5. **Extract table/method names** into `known_tables` / `known_apis`
6. **Infer `depends_on`** from language like "需等後端完成" or "depends on backend"
7. **Infer `can_parallel`** from context (QA + Docs after implementation = parallel)

**For document-level additions**:
- Add `agent_registry` YAML block before the first agent section
- Add `deprecated_features` YAML block if deprecation notices exist in prose
- Add Orchestrator routing algorithm pseudocode at the end
- Add `global_constraints` YAML block from prose constraints

---

## Step 5 — Changelog Entry

Always append a changelog entry documenting the upgrade:

```markdown
| v{N+1} | {date} | Upgraded to auto-routing standard: added agent_schema blocks
(input_types, output_types, triggers, excludes, depends_on, can_parallel,
confidence_threshold) per agent; added agent_registry, routing_priority,
pipeline_templates, deprecated_features YAML; added Orchestrator routing
algorithm; all original business knowledge preserved. |
```

---

## Common Patterns in Existing Documents

When parsing an existing AGENTS.md, watch for these informal patterns
and translate them to structured schema:

| Prose pattern | Schema field |
|--------------|-------------|
| "職責範圍 / Responsibilities" section | `description` + `input_types` |
| "禁止事項 / Forbidden / Must NOT" section | `excludes` |
| "輸入格式 / Input format" template | `input_types` |
| "輸出格式 / Output format" template | `output_types` |
| "發包判斷原則 / Routing rules" section | `routing_rules` in orchestrator |
| "已知 API / Known methods" table | `known_apis` |
| "已知資料表 / Known tables" table | `known_tables` |
| "已廢棄 / Deprecated / Cancelled" notice | `deprecated_features` |
| "待確認 / Pending / Blocked" notice | `pending_decisions` |
| "必讀 Skill / Required skill" reference | `required_skills` |
| "已知問題 / Known bugs / P0 / P1" items | `known_issues` |
| "需等XXX完成 / depends on" language | `depends_on` |
| "同時執行 / parallel / 並行" language | `can_parallel: true` |
