# AI Task Force

AI Task Force is a multi-agent workspace MVP for text tasks.

It is not trying to become a general autonomous agent platform first. The current goal is to make one fixed, inspectable collaboration loop feel usable:

```text
User -> Leader -> Planner -> Writer -> Reviewer -> Leader Final Response
```

## Documentation Roles

- `README.md` is the project entry point. It explains what this repository is, how to run it, what currently works, and where to find deeper specs.
- `Agents.md` is the canonical product and agent specification. It contains the workflow model, agent responsibilities, routing principles, UI constraints, implementation notes, and roadmap.

If the two documents conflict, treat `Agents.md` as the source of truth for product behavior and AI coding-agent instructions.

## Repository Structure

- `Clients/Web`
  Browser workspace MVP for task input, agent structure, timeline, and task history.
- `Clients/Desktop`
  Electron-style desktop shell with outer rail navigation, workspace sidebar, direct agent chat, Team, Task, Projects, Usage, and Settings surfaces.
- `Server`
  Minimal ATF backend with JSON-backed task APIs, fixed multi-agent orchestration, model gateway, direct chat endpoint, Ollama integration, and API model candidates.
- `Agents.md`
  Product spec, workflow rules, agent architecture, roadmap, and implementation constraints.

## Current Status

Implemented now:

- Static Web MVP for the shared workspace model.
- Full-window Desktop shell with outer rail, collapsible middle sidebar, and right workspace stage.
- `Chat`, `Team`, `Task`, `Projects`, `Usage`, and `Settings` workspaces in the Desktop client.
- Leader-first chat flow with requirement negotiation plus a separate task-publication action.
- Direct agent chat through `POST /api/chat` using each agent's currently selected route.
- Fixed backend workflow:
  `Leader -> Planner -> Writer -> Reviewer -> Leader Final Response`
- Real model routing across providers:
  OpenAI, Anthropic, and local Ollama.
- Default role routing:
  Leader / Planner / Reviewer -> `GPT API / gpt-5.4-2026-03-05`
  Writer -> `Ollama Local / qwen3:8b`
- Settings controls for theme, language, and LLM enablement filters.
- Team overview plus per-agent drilldown with current route, provider, model, and status visibility.
- Task creation from the Leader chat into the backend workflow.
- Task workspace with:
  `Overview`
  `Timeline`
  per-task detail views
- Task detail view now shows:
  task summary
  per-task stage flow
  intermediate outputs
  final output
- Team timeline endpoint and UI that aggregate events across tasks and label each event with its task.
- Task actions:
  full retry
  retry only the failed step
  archive
  delete
- Review contract MVP with:
  fixed rubric
  structured Writer submission
  machine-readable Reviewer output
  bounded automated review attempts
  `human_confirmation` escalation
- Model invocation observability in task subtasks:
  provider
  model
  duration
  timeout
  response size
  request status
- Backend terminal logging for chat requests and key task lifecycle events.
- JSON persistence MVP for tasks, subtasks, events, messages, archived state, and task numbering.
- Mock Projects and Usage workspaces.

Not implemented yet:

- SQLite persistence and migration tooling.
- Persistent direct-chat history outside the current in-memory Desktop client state.
- Persistent Settings and route-selection state across the whole product surface.
- Live token telemetry and usage accounting.
- Full Web client backend integration.
- Mobile or web status companion client.
- Safe Leader-controlled document editing workflow.
- Streaming responses and websocket-based live updates.

## Product Problem Summary

AI Task Force treats repeated AI trial-and-error as a product problem, not only a model-quality problem. The current MVP focuses on two core issues.

### Problem 1: The Execution Loop Is Opaque

AI-assisted development often becomes repeated trial and error because the working loop is opaque: information is incomplete, execution is hard to inspect, validation is weak, and model reasoning is probabilistic.

The workspace should make agent ownership, model routes, task state, project context, and validation signals visible while work is happening.

### Problem 2: Review Standards Are Not Formalized

Reviewer feedback cannot stay purely free-form. If review standards are vague, the Writer may fix the rejected issue while accidentally changing content that was already correct. This can create a loop where each revision introduces new defects, the Reviewer keeps rejecting the output, and the workflow fails even though the task is making partial progress.

The review layer needs a more formal contract:

- Fixed Reviewer rubric: `completeness`, `correctness`, `format`, `consistency`, and `regression`.
- Structured Writer submissions with `changed`, `unchanged`, `why`, and `draft_text`.
- Revision reviews should inspect only unresolved prior issues, current changed regions, and regressions caused by those changes.
- Preservation rule: revised drafts should keep previously correct sections unchanged unless the Reviewer explicitly marks them as affected.
- Stable issue IDs for Reviewer findings so Writer revisions can target specific defects instead of rewriting the whole output.
- Machine-readable reject reasons with blocking issues, minor issues, resolved issue IDs, rubric status, and next action.
- A pass threshold that rejects only blocking defects, not minor style preferences.
- A bounded retry policy: max 2 automated review attempts, followed by human confirmation instead of endless automated revision.

Current MVP implementation:

```text
Writer submission
  -> { changed, unchanged, why, draft_text }

Reviewer decision
  -> {
       result,
       rubric,
       blocking_issues,
       minor_issues,
       resolved_issue_ids,
       next_action
     }

Attempt 1: full review
Attempt 2: prior issues + changed regions + regression only
After attempt 2: human_confirmation
```

## Collaboration Framework

The current project can already be described as a structured AI collaboration workflow, but not yet as a fully autonomous multi-agent society.

The useful framework emerging from the MVP is:

```text
1. Intake
   Natural conversation with Leader

2. Task Contract
   Leader turns the request into an explicit task

3. Planning
   Planner defines objective, constraints, output format, and handoff logic

4. Execution
   Specialist agent produces a structured submission

5. Quality Gate
   Reviewer applies a fixed rubric and machine-readable issue contract

6. Scoped Revision
   Writer revises only blocking issues and changed regions

7. Escalation
   Human confirmation after bounded automated review attempts

8. Finalization
   Leader synthesizes the final deliverable

9. Observability
   Every stage records events, model route, invocation status, intermediate outputs, and review decisions
```

This is a role-based multi-agent workflow framework:

- Agents are workflow roles, not fully autonomous long-running processes yet.
- Different roles can route to different model providers.
- Value comes from bounded execution, inspectable state, quality gates, and recoverable failure handling.

## Execution Runtime Direction

AI Task Force is increasingly better described as an execution runtime candidate rather than as a chatbot product.

The intended system shape is:

> AI Execution Runtime = deterministic shell for probabilistic compute

In this framing:

- models are compute units
- workflow steps are bounded search operations
- the runtime is responsible for control, evaluation, convergence, and observability

This means the project direction is not simply "more prompts" or "more agents". It is a runtime-system direction.

### What Is Already Aligned

The current architecture already points at the right top-level pillars:

- Generation
- Control
- Evaluation
- Convergence
- Observability

### What Is Still Missing

The current gap is not conceptual completeness. The current gap is execution-grade engineering closure in three places.

#### Harder Control Layer

The runtime still needs:

- typed role IO rather than mostly prompt-shaped loose payloads
- explicit input, output, and failure contracts for each role
- stricter context slicing so each role only sees the minimum required state

#### Executable Evaluation Layer

Reviewer scoring alone is not enough. The system also needs:

- evaluation outputs that directly drive runtime behavior
- rule-based and programmatic validation alongside LLM judgement
- multi-evaluator composition such as LLM reviewer + rule validator + regression checker

#### Stronger Convergence Layer

Retries cannot stay generic. The runtime needs:

- state-aware retry based on prior failure output
- partial rerun support so only the failed segment is recomputed
- explicit search policy for exploring and refining candidate outputs

### What "Minimum Executable System" Means

The project already has a working vertical slice. For example, it can run tasks such as multilingual summarization through the current Leader -> Planner -> Writer -> Reviewer path.

However, that is not yet the same thing as a reusable execution runtime.

What is still missing is a smaller, harder execution core made of:

- a state machine that explicitly defines valid task states and legal transitions
- an evaluation loop that can inspect outputs and decide the next runtime action

In practical terms:

- today's system can run a concrete workflow successfully
- the future runtime must make that workflow reusable, enforceable, and extensible

### Concrete Modules Still To Build

#### P0 Runtime State Machine

Purpose:

- turn the current implicit orchestration flow into an explicit state-transition system

Needed work:

- define task states and legal transitions
- define transition triggers and failure exits
- emit stable runtime events on every state change

#### P1 Role Contract System

Purpose:

- formalize what each role receives, returns, and how it fails

Needed work:

- typed input contracts
- typed output contracts
- failure contracts per role

#### P2 Evaluation Engine

Purpose:

- make evaluation a first-class runtime subsystem instead of only a Reviewer prompt

Needed work:

- LLM reviewer
- rule validator
- regression checker
- machine-readable evaluator outputs

#### P3 Convergence Engine

Purpose:

- make retries state-aware and controlled

Needed work:

- retry budget
- partial rerun
- failure-aware input mutation
- explicit search and refinement policy

#### P4 Context Slicing Layer

Purpose:

- strictly control which context each role can see

Needed work:

- role-specific context views
- minimum-required context delivery
- context leak reduction between roles

#### P5 Runtime Trace Model

Purpose:

- record execution as structured runtime traces rather than only terminal logs

Needed work:

- run ids
- transition records
- evaluator outputs
- retry reasons
- route and duration metadata

#### P6 Persistence Schema Upgrade

Purpose:

- move from JSON MVP persistence toward a schema-backed runtime store

Needed work:

- tasks
- task runs
- task states
- evaluator results
- runtime events
- route history

#### P7 Benchmark Harness

Purpose:

- measure whether the runtime is actually better than a single-pass baseline

Needed work:

- choose one benchmark task domain
- compare baseline generation vs AES runtime execution
- track quality, retries, cost, and latency

See `Agents.md` for the full product problem, workflow model, and roadmap.

## Run

### Server

From `Server`:

```bash
npm start
```

Default backend URL:

```text
http://127.0.0.1:8787
```

Expected Ollama URL:

```text
http://127.0.0.1:11434
```

Default editable backend config:

```text
Server/atf.config.js
```

Optional local override:

```text
Server/atf.config.local.js
```

API keys can be provided by either environment variables or local secret files:

```text
Server/openai.key
Server/anthropic.key
Server/claude.key
```

Default JSON persistence location:

```text
Server/.atf-data/store.json
```

Current default local writer model:

```text
qwen3:8b
```

### Desktop

From `Clients/Desktop`:

```bash
npm install
npm start
```

### Web

Open `Clients/Web/index.html` directly, or serve the repository statically:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/Clients/Web/
```

## Roadmap

### Current Position

The project is currently between:

- `M3 Leader Task Publication`
- `M4 Fixed Multi-Agent Workflow`
- `M5 Task Observability And Recovery`

`M1` and most of `M2` are already in place. `M6` exists only as a JSON-based MVP. `M7` and `M8` are still future work.

### Milestone Structure

From this point onward, milestones should not be treated as a separate list from engineering modules.

The intended structure is:

```text
Milestone
-> Objective
-> Priority
-> Required Modules
-> Acceptance
-> Still Missing
```

In other words:

- milestones define the product goal
- priority defines how urgently that goal should be pushed
- modules define the engineering capabilities required to reach that goal
- acceptance defines when the milestone can be treated as reached

### What "Usable At MVP Level" Means

When this roadmap says a milestone is "usable at MVP level", it does not mean the area is fully complete.

It means:

- the main user path exists
- the feature can be exercised end to end
- the behavior is usable for demos and narrow-scope real testing

It does not mean:

- production-grade persistence is finished
- failure handling is fully hardened
- cross-client state is complete
- every edge case already has a stable runtime contract

### Milestone Map

#### M0 Product Definition

- Define AI Task Force as a structured AI team workspace rather than a general autonomous agent platform.
- Lock the shared product language used by Desktop, Web, Server, and `Agents.md`.

Status:

- mostly complete

Priority:

- `P0 foundation`

Required modules:

- shared product vocabulary
- shared task and event model
- shared routing language

Acceptance:

- Desktop, Web, Server, and docs describe the same bounded system
- the project is framed as an AI workspace and runtime, not as a free-form autonomous platform

Still missing:

- remove leftover MVP-era wording that conflicts with the runtime framing
- keep Desktop, Web, and docs aligned as the execution model evolves

#### M1 Desktop Shell

- Build the full-window Desktop shell with outer rail, collapsible middle sidebar, and right workspace stage.
- Establish `Chat`, `Team`, `Task`, `Projects`, `Usage`, and `Settings` as primary workspaces.

Status:

- largely complete

Priority:

- `P1 maintain`

Required modules:

- Desktop shell layout
- workspace rail
- collapsible middle sidebar
- right-stage workspace renderer

Acceptance:

- Desktop behaves like a full-window client shell
- navigation no longer depends on centered dashboard-card patterns
- each pane scrolls internally instead of forcing page-level scroll

Still missing:

- remaining shell polish for spacing, overflow, and cross-panel consistency
- stronger loading, empty, and error states per workspace
- future keyboard navigation and power-user interactions

#### M2 Model Connectivity

- Connect Ollama, OpenAI, and Anthropic model routes.
- Support per-agent route selection, enablement filters, and visible provider/model identity.

Status:

- functionally complete for MVP

Priority:

- `P1 stabilize`

Required modules:

- model gateway
- route selection UI
- enabled-model filter

Acceptance:

- routable agents can be bound to visible provider/model routes
- local and API model candidates can coexist under one routing surface
- enabled-model filtering controls what appears in agent selectors

Still missing:

- persistent route-selection history
- stronger provider-health and fallback behavior
- usage telemetry tied to route and model activity
- clearer runtime contracts around provider failure modes

#### M3 Leader Task Publication

- Keep the Leader as the main intake surface.
- Separate natural chat from explicit task publication.
- Create a clear publication confirmation step before a task enters workflow execution.

Status:

- complete for MVP

Priority:

- `P1 stabilize`

Required modules:

- Leader direct chat
- task publication draft
- publication confirmation flow

Acceptance:

- main tasks originate from explicit Leader publication rather than ordinary chat text
- publication creates a task record and starts workflow execution consistently
- users can distinguish normal conversation from task creation

Still missing:

- a fully formalized task-contract schema beyond the current publication card flow
- milestone-aware publication data persisted into the backend task model
- stronger linkage between publication output and downstream Planner execution state

#### M4 Fixed Multi-Agent Workflow

- Run the fixed flow:
  `Leader -> Planner -> Writer -> Reviewer -> Leader Final Response`
- Keep the workflow inspectable and deterministic.
- Stabilize retry, review, and human-confirmation behavior across common task types.
- Upgrade execution from prompt chaining toward contract-based runtime behavior.

Status:

- implemented but still being hardened

Priority:

- `P0 current`

Required modules:

- `P0 Runtime State Machine`
- `P1 Role Contract System`

Acceptance:

- legal task-state transitions are enforced
- role outputs are stable and contract-shaped
- review, revise, and human-confirmation paths are predictable
- common text tasks can run end to end without ad hoc flow patches

Still missing:

- a formal state-machine implementation instead of flow logic scattered across orchestrator branches
- stronger failure contracts between planner, writer, reviewer, and leader stages
- milestone-aware planning is not yet wired into execution

#### M5 Task Observability And Recovery

- Show task state, owner, intermediate outputs, final output, model route, invocation status, and timeline events.
- Support full retry, failed-step retry, archive, and delete.
- Improve per-task execution readability without falling back into a dashboard UI.
- Make failures debuggable as runtime events rather than guessed from chat text.

Status:

- in active development

Priority:

- `P0 current`

Required modules:

- `P2 Evaluation Engine`
- `P3 Convergence Engine`
- `P5 Runtime Trace Model`

Acceptance:

- evaluator outputs are visible and actionable
- retry reasons are visible
- partial rerun is supported in the main task flow
- execution traces are sufficient to debug failures without relying on chat reconstruction

Still missing:

- a persisted and queryable trace model instead of mostly terminal-oriented debug output
- clearer blocked, warning, and human-confirmation state explanations
- better cross-run comparison for retries and revisions

#### M6 Persistence And Project Memory

- Move from JSON MVP persistence to a stable schema-backed store.
- Persist direct chats, settings, route history, project state, and future milestone state consistently across restarts.

Status:

- JSON MVP only

Priority:

- `P0 next`

Required modules:

- `P5 Runtime Trace Model`
- `P6 Persistence Schema Upgrade`

Acceptance:

- runtime state survives restart
- task runs, evaluator outputs, and route history can be restored
- persistence is no longer limited to a single JSON MVP path

Still missing:

- SQLite or Postgres-backed schema storage
- full restore for direct chats, settings, and route selections
- project-level memory and migration support

#### M7 Multi-Client Access

- Connect Web to the shared backend.
- Add lightweight read-only or light-action access from Web and mobile-friendly surfaces.

Status:

- not started beyond prototype work

Priority:

- `P2 later`

Required modules:

- backend-connected Web client
- shared state restoration
- lightweight mobile-friendly status access

Acceptance:

- Web can inspect shared task and agent state from the same backend as Desktop
- future mobile-friendly access can reuse the same runtime state

Still missing:

- the Web client is still prototype-level
- no mobile check-in surface exists yet
- no multi-client sync polish or auth boundary has been defined

#### M8 AI Execution System

- Move beyond "task generation" into real execution against project objects, documents, modules, and future workspace targets.
- Make outputs traceable, recoverable, and auditable as part of a real execution system.

Status:

- future direction

Priority:

- `P1 strategic`

Required modules:

- `P0 Runtime State Machine`
- `P1 Role Contract System`
- `P2 Evaluation Engine`
- `P3 Convergence Engine`
- `P4 Context Slicing Layer`
- `P5 Runtime Trace Model`
- `P6 Persistence Schema Upgrade`
- `P7 Benchmark Harness`

Acceptance:

- the runtime can be evaluated as a system rather than as a prompt chain
- baseline single-pass generation can be compared against runtime execution
- execution cost, retries, traces, and output quality can be measured together

Still missing:

- real execution targets have not been modeled yet
- benchmark tasks do not yet prove runtime advantage over single-pass generation
- control, evaluation, and convergence are not yet complete enough to call this a full execution runtime

### Immediate Next Focus

#### Phase A: Runtime Hardening

- Add typed role IO and contract-based execution boundaries.
- Define per-role failure contracts, not only success payloads.
- Introduce stricter context slicing for Leader, Planner, Writer, and Reviewer.

#### Phase B: Executable Evaluation Loop

- Combine LLM review with programmatic validation.
- Make evaluator outputs directly drive next actions in the runtime.
- Strengthen state-aware retry and partial rerun behavior.

#### Phase C: Benchmark And Trace

- Pick one benchmark task domain such as document generation.
- Compare baseline single-pass generation against AES runtime execution.
- Add cost tracking and execution trace UI so the runtime can be evaluated as a system.
