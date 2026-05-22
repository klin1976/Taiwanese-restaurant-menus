# Orchestrator Routing Logic Reference

This document provides the pseudocode and scoring logic that an Orchestrator Agent
should implement when using an AGENTS.md produced by this skill.

Include a condensed version (the pseudocode block only) in the AGENTS.md you produce.
Keep this full reference in the skill for Claude's use when explaining or debugging routing.

---

## Full Routing Algorithm

```
FUNCTION auto_route(user_task, agents_md):

  ── STEP 1: Deprecated Feature Guard (highest priority) ──────────────────────
  FOR each feature IN agents_md.deprecated_features:
    IF any(kw IN user_task.lower() FOR kw IN feature.keywords):
      RETURN REJECT(feature.rejection_message)
      # Hard stop — no further routing attempted

  ── STEP 2: Task Feature Extraction ──────────────────────────────────────────
  task_keywords  = tokenize(user_task)            # word list
  task_input     = classify_input_type(user_task) # e.g. "source_code", "sql_query"
  task_output    = classify_expected_output(user_task)
  is_cross_layer = detect_multi_layer(user_task)  # does this span >1 layer?

  ── STEP 3: Agent Scoring ────────────────────────────────────────────────────
  scores = {}
  FOR each agent IN agents_md.agent_registry (skip orchestrator):

    trigger_score = 0
    FOR each trigger IN agent.triggers:
      IF trigger has "keywords":
        hits = count(kw IN task_keywords FOR kw IN trigger.keywords)
        trigger_score += hits * KEYWORD_WEIGHT         # default: 1.0 per hit
      IF trigger has "pattern":
        trigger_score += llm_match(user_task, trigger.pattern) * PATTERN_WEIGHT  # default: 2.0

    exclude_score = 0
    FOR each exclusion IN agent.excludes:
      IF llm_match(user_task, exclusion) > 0.5:
        exclude_score += EXCLUDE_PENALTY               # default: 3.0

    raw_score = trigger_score - exclude_score
    normalized = normalize(raw_score, 0.0, 1.0)

    IF normalized >= agent.confidence_threshold:
      scores[agent.id] = normalized

  ── STEP 4: Route Decision ────────────────────────────────────────────────────

  IF len(scores) == 0:
    RETURN clarify(user_task)
    # No agent matched above threshold

  IF len(scores) == 1:
    RETURN dispatch_single(top_agent, user_task)
    # Clear single-agent task

  IF len(scores) > 1:

    # Try pipeline template first (faster, more reliable)
    template = match_pipeline_template(scores.keys(), agents_md.pipeline_templates)
    IF template FOUND:
      RETURN execute_dag(template, user_task)

    # Dynamic DAG construction
    dag = build_dag_from_depends_on(scores, agents_md)
    RETURN execute_dag(dag, user_task)

  ── STEP 5: DAG Execution ─────────────────────────────────────────────────────
  FUNCTION execute_dag(dag, user_task):
    context = {original_task: user_task, outputs: {}}

    FOR each step IN dag.steps (ordered by step number):
      parallel_agents = [a FOR a IN step.agents IF a.can_parallel]
      serial_agents   = [a FOR a IN step.agents IF NOT a.can_parallel]

      # Run parallel agents concurrently
      IF parallel_agents:
        results = parallel_dispatch(parallel_agents, context)
        context.outputs.update(results)

      # Run serial agents one at a time
      FOR agent IN serial_agents:
        task_packet = build_task_packet(agent, context)
        result = dispatch(agent, task_packet)
        context.outputs[agent.id] = result

    RETURN synthesize(context.outputs)
```

---

## Scoring Weight Recommendations

| Weight Constant | Default Value | Notes |
|----------------|---------------|-------|
| `KEYWORD_WEIGHT` | 1.0 per keyword hit | Increase for domain-specific vocabulary |
| `PATTERN_WEIGHT` | 2.0 per pattern match | Patterns are higher-quality signals |
| `EXCLUDE_PENALTY` | 3.0 per exclusion match | Exclusions should strongly suppress |
| `confidence_threshold` | 0.70–0.80 | Per-agent, set in schema |

---

## Task Packet Format

When dispatching to a sub-agent, the Orchestrator sends a structured packet.
Include this template in the Orchestrator section of your AGENTS.md:

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

**Key principle — Context Isolation**: Each packet contains only the context that
agent needs. Never broadcast the full project context to every agent.

---

## DAG Construction Rules

When building a DAG dynamically (no matching pipeline template):

1. **Sort by dependency depth** — agents with no `depends_on` are step 1
2. **Group parallel-capable agents** — agents with `can_parallel: true` that share
   the same dependency frontier run together
3. **Prune unused branches** — for `bug_fix` pattern, only dispatch to the layers
   the bug actually touches (QA output identifies which layers)
4. **Short-circuit on failure** — if a HARD dependency fails, halt the DAG and
   report the failure; do not proceed to dependent steps

---

## Clarification Triggers

The Orchestrator should request clarification (not guess) when:

| Condition | Action |
|-----------|--------|
| `scores` is empty | Ask user which layer the task touches |
| Two agents score within 0.05 of each other | Ask user to confirm which agent should lead |
| Task matches a pending_decision item | Inform user the decision is blocked and list options |
| Task input_type is ambiguous | Ask for a concrete example (method name, table name, etc.) |

---

## Routing Quality Diagnostics

When an AGENTS.md causes frequent misrouting, check:

```
SYMPTOM: Wrong agent selected
  → Review trigger keyword overlap between agents
  → Add specific method/table/form names to the correct agent's triggers
  → Increase exclude_penalty for the wrongly-selected agent

SYMPTOM: No agent selected (always falls to clarification)
  → Lower confidence_threshold by 0.05 increments
  → Add more keyword variants (synonyms, abbreviations) to triggers
  → Add pattern triggers for the task type

SYMPTOM: Parallel agents produce conflicting outputs
  → Set can_parallel: false for agents that share write scope
  → Add explicit depends_on relationships

SYMPTOM: Deprecated feature still being implemented
  → Check keyword list completeness in deprecated_features block
  → Add synonyms and alternate phrasings to keywords
```
