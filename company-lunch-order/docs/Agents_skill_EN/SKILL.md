---
name: agents-md
description: >
  Generate or upgrade an AGENTS.md file that supports automatic AI agent routing.
  Use this skill whenever the user wants to create, rewrite, or improve an AGENTS.md
  (or CLAUDE.md / agent manifest) for a multi-agent AI project.
  Trigger on phrases like: "幫我寫 AGENTS.md", "建立 Agent 規格文件", "write an agents manifest",
  "create agent definitions", "upgrade my AGENTS.md for auto-routing", "define agents for my project",
  "我要設計多 Agent 架構", "幫我把現有的 AGENTS.md 改成可以自動路由的格式", or any request
  to define, document, or structure AI agents for a codebase. Always use this skill when
  the user is designing a multi-agent system, even if they don't use the exact term "AGENTS.md".
---

# AGENTS.md Skill

Produces an AGENTS.md that serves dual purposes: **human-readable** project documentation
AND **machine-parseable** routing spec that an Orchestrator Agent can use to automatically
dispatch tasks to the correct sub-agent — without hardcoded if/else rules.

---

## Overview

A well-formed AGENTS.md must satisfy two audiences simultaneously:

| Audience | What they need |
|----------|---------------|
| Human developer | Clear role descriptions, known tables/methods, naming conventions, gotchas |
| Orchestrator AI | Structured `agent_schema` YAML blocks with `input_types`, `output_types`, `triggers`, `excludes`, `depends_on` |

The skill produces both in one document. Routing quality is **directly proportional** to
schema quality — invest time in the interview phase before writing.

---

## Step 1 — Project Interview

Before writing a single line, gather this information. If the user provides an existing
AGENTS.md or codebase description, extract answers from it and only ask for the gaps.

### Required (block if missing)
```
[TECH_STACK]   Front-end framework / language / version
[BACKEND]      API style (REST / SOAP / gRPC / GraphQL), language, framework
[DATABASE]     DB engine, ORM or raw SQL, known table names
[PROTOCOL]     How layers communicate (HTTP, SOAP, message queue, etc.)
[CONSTRAINTS]  Language version limits, forbidden libraries, deprecated features
```

### Optional but improves quality
```
[KNOWN_APIS]      Existing method / endpoint names
[KNOWN_TABLES]    DB table names already in use
[KNOWN_BUGS]      Open P0/P1 issues that Agents must know about
[DEPRECATED]      Features / tables / methods that AI must NOT touch
[PENDING]         Architecture decisions that are unresolved (block agents until confirmed)
[SKILL_FILES]     Path to any existing SKILL.md files agents must read first
```

Ask at most **two questions per turn** if information is missing. Never ask all at once.

---

## Step 2 — Identify Agents

Determine the agent roster based on the tech stack. Start with these canonical roles
and add or remove based on project needs:

| Canonical Role | Trigger Layer | Skip when… |
|---------------|---------------|------------|
| `agent-orchestrator` | Always present | — |
| `agent-frontend` | UI / presentation | CLI-only or API-only projects |
| `agent-backend` | Business logic / API | Static site or DB-only projects |
| `agent-database` | Data / SQL / migrations | No persistent storage |
| `agent-qa` | Testing / validation | Very small solo projects |
| `agent-docs` | Documentation / changelog | — |

**Custom agents**: If the project has a distinct layer not covered above (e.g., `agent-infra`
for DevOps, `agent-ml` for model training, `agent-mobile` for native apps), add them.
Each custom agent must still receive a full `agent_schema` block.

---

## Step 3 — Write the Document

Build the AGENTS.md in this order. Read [schema-spec.md](./schema-spec.md) for the full
YAML field reference before writing any `agent_schema` block.

### 3-A  Document Header
- Project name, one-sentence purpose
- Tech architecture table (layer → technology mapping)
- Mandatory note: all agents must read this file before starting any task

### 3-B  Global Definitions (before any agent section)
- **Status codes / enums** shared across all agents
- **Deprecated features** with `deprecated_features` YAML block and `action: REJECT`
- **Global technical constraints** (language version, forbidden libs, protocol rules)

### 3-C  Agent Registry (machine-readable index)
```yaml
agent_registry:
  - id: agent-orchestrator
    role: COORDINATOR
  - id: agent-frontend
    role: IMPLEMENTER
    layer: presentation
  # … etc
routing_priority:
  1: deprecated_features    # always check first
  2: cross_layer_task       # decompose, then DAG
  3: single_layer_match     # direct trigger match
  4: fallback               # ask user for clarification
```

### 3-D  Orchestrator Agent Section
- Role: COORDINATOR — routes tasks, never writes code
- `routing_rules`: condition → target mapping (one per known task type)
- `pipeline_templates`: standard DAGs for common multi-agent workflows
  - `new_feature`: db → backend → frontend → (qa ‖ docs)
  - `bug_fix`: qa → [backend|db|frontend] → qa (verify)
  - `query_only`: database alone
- `prohibitions`: what orchestrator must never do
- `pending_decisions`: blocked items requiring human confirmation

### 3-E  Each Sub-agent Section
For each agent, write in this order:
1. Section header with role name
2. `agent_schema` YAML block (see [schema-spec.md](./schema-spec.md))
3. Human-readable prose: responsibilities, known APIs/tables/forms, gotchas
4. Input format template (what orchestrator sends)
5. Output format template (what agent returns)

### 3-F  Context Firewall Rules
```yaml
context_firewall:
  rules:
    - id: CONTEXT_ISOLATION      # each agent sees only its relevant context
    - id: NO_DIRECT_COMMUNICATION # sub-agents route through orchestrator only
    - id: SECRET_EXCLUSION       # no passwords / PII in any agent context
    - id: LAYER_BOUNDARY         # agents only modify their own layer
    - id: RESULT_ONLY_REPORT     # agents report conclusions, not intermediate steps
```

### 3-G  Orchestrator Auto-Routing Algorithm
Include a pseudocode block showing:
```
STEP 1  Check deprecated_features → REJECT if match
STEP 2  Extract task features (input_type, output_need, keywords)
STEP 3  Score each agent: triggers (+) minus excludes (-)
STEP 4  Single match → dispatch; multi-match → build DAG; no match → clarify
```

### 3-H  Version Changelog
Append a table with version, date, and change summary.

---

## Step 4 — Quality Checklist

Before delivering, verify every item:

```
Schema completeness (per agent):
  ☐ id             — unique, kebab-case
  ☐ role           — COORDINATOR | IMPLEMENTER | VALIDATOR | DOCUMENTER
  ☐ description    — 2–4 sentences, semantic routing material
  ☐ input_types    — array of string identifiers, not prose
  ☐ output_types   — array of string identifiers
  ☐ triggers       — keywords arrays AND pattern strings
  ☐ excludes       — explicit list, prevents misrouting
  ☐ depends_on     — empty [] or list of {agent, reason, dependency_type}
  ☐ can_parallel   — true/false
  ☐ confidence_threshold — 0.0–1.0 (recommend 0.70–0.80)

Routing correctness:
  ☐ Every known API/table/form appears in at least one agent's triggers
  ☐ No two agents have identical trigger keywords (causes ambiguity)
  ☐ Every deprecated feature is in deprecated_features.keywords
  ☐ DAG templates cover the top 3 most common task patterns
  ☐ pipeline_templates reference only agents that exist in agent_registry

Document quality:
  ☐ Human prose sections include concrete examples (method names, table names)
  ☐ Known bugs / P0-P1 issues documented in relevant agent's known_issues
  ☐ Pending decisions listed in orchestrator's pending_decisions with status: BLOCKED
  ☐ Input/output format templates present for every sub-agent
  ☐ Version changelog entry added
```

---

## Step 5 — Upgrade Mode (existing AGENTS.md provided)

If the user uploads an existing AGENTS.md, run a gap analysis first:

1. **Parse existing content** — extract agent names, descriptions, any existing rules
2. **Score against checklist** — identify missing fields per agent
3. **Report gaps** — show a table: field × agent, with ✅ / ⚠️ / ❌
4. **Rewrite with preservation** — keep all existing business knowledge intact;
   add structured `agent_schema` blocks without removing human-readable prose
5. **Changelog entry** — document what v→v upgrade added

> See [upgrade-gap-analysis.md](./upgrade-gap-analysis.md) for a worked example
> of the gap analysis → rewrite workflow.

---

## Reference Files

Read these when you need detailed specs — do not load all at once:

| File | When to read |
|------|-------------|
| [schema-spec.md](./schema-spec.md) | Before writing any `agent_schema` YAML block |
| [routing-logic.md](./routing-logic.md) | When writing the Orchestrator routing algorithm section |
| [fullstack.md](./fullstack.md) | When the project has 4+ agents across multiple layers |
| [single-layer.md](./single-layer.md) | When the project needs only 1–2 implementation agents |
| [upgrade-gap-analysis.md](./upgrade-gap-analysis.md) | When upgrading an existing AGENTS.md |
