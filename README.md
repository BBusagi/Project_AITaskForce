# AI Task Force

AI Task Force is a structured AI team workspace for bounded execution tasks.

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
  Browser workspace client for task input, agent structure, timeline, and task history.
- `Clients/Desktop`
  Electron-style desktop shell with outer rail navigation, workspace sidebar, direct agent chat, Team, Task, Projects, Usage, and Settings surfaces.
- `Server`
  ATF server with JSON-backed task APIs, fixed multi-agent orchestration, model gateway, direct chat endpoint, Ollama integration, and API model candidates.
- `Agents.md`
  Product spec, workflow rules, agent architecture, roadmap, and implementation constraints.

## Current Status

Implemented now:

- Static Web workspace shell for the shared task and event model.
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
- Review contract foundation with:
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
- JSON-backed persistence for tasks, subtasks, events, messages, archived state, and task numbering.
- Mock Projects and Usage workspaces.

Not implemented yet:

- SQLite persistence and migration tooling.
- Persistent direct-chat history across the whole product surface.
- Persistent Settings and route-selection state across the whole product surface.
- Live token telemetry and usage accounting.
- Full Web client backend integration.
- Mobile or web status companion client.
- Safe Leader-controlled document editing workflow.
- Streaming responses and websocket-based live updates.

## Product Problem Summary

AI Task Force treats repeated AI trial-and-error as a product problem, not only a model-quality problem. The current system focuses on two core issues.

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

Current implementation:

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

The useful framework emerging from the current system is:

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

- move from the current JSON-backed persistence layer toward a schema-backed runtime store

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

### Solo-Developer Principle

This roadmap is intentionally compressed for solo development.

The rule is simple:

- keep focus on the smallest execution framework that proves the product idea
- do not spend core execution time on secondary clients or broad product surfaces
- move non-blocking expansion work into TODO instead of treating it as current roadmap scope

Development should be MVP-driven first and roadmap-guided second:

- MVP decides what the system must deliver now
- roadmap decides the minimum runtime capabilities needed to deliver it
- if a feature does not unblock the current MVP, it should usually not be on the current critical path

For this project, the minimum product-defining loop is:

```text
Leader -> Planner -> Writer -> Reviewer -> Final
```

If that loop is not stable, observable, and recoverable, extra clients and extra panels do not prove the product.

### Current Position

The project already has:

- a usable Desktop shell
- routeable model connectivity
- Leader task publication
- a working fixed workflow slice

The main gap is no longer surface layout. The main gap is execution-core hardening.

### Active MVP Targets

#### MVP 1: PPT Generation System

Inputs:

- topic
- target audience
- slide count
- style
- language

Expected outputs:

- PPT outline
- per-slide copy
- speaker notes
- final `.pptx`
- review report

Acceptance:

- structure is complete
- slide count is correct
- tone matches the request
- content has no obvious contradictions
- the system can export a `.pptx`

Current position:

- this is the active MVP focus
- the current system already covers intake, planning, writing, review, and report-shaped outputs
- the main missing layer is deliverable execution: slide schema, `.pptx` generation, and file-level review

#### MVP 2: WebApp Generation System

Input:

- a request for a WebApp that satisfies explicit requirements

Expected outputs:

- requirements clarification
- technical plan
- code
- build result
- error fixing
- final runnable project

Acceptance:

- `npm install` succeeds
- `npm build` succeeds
- the page opens
- functionality matches the request
- Reviewer passes the result

Current position:

- this is intentionally not the current primary MVP
- it depends on a stronger execution loop than the project has today
- it should be treated as the next major MVP after the PPT system proves the runtime on a real deliverable

### Core Roadmap

#### R1 Minimal Execution Core

Objective:

- make the fixed multi-agent loop behave like a real bounded execution system instead of a prompt chain with UI around it
- provide the minimum execution guarantees required for MVP 1

Priority:

- `P0 now`

Required modules:

- `P0 Runtime State Machine`
- `P1 Role Contract System`

Acceptance:

- legal task-state transitions are enforced
- role outputs and failures have stable contracts
- reviewer rejection routes back into writer revision predictably
- common text tasks run end to end without ad hoc patches

Still missing:

- a formal state-machine implementation instead of scattered orchestration branching
- stronger failure contracts between planner, writer, reviewer, and leader
- tighter coupling between Leader publication and Planner execution input

#### R2 Observable Task Runtime

Objective:

- make task progress, failure, retry, and recovery inspectable without relying on chat guesswork or terminal-only debugging
- make PPT-generation failures inspectable at both text and deliverable stages

Priority:

- `P0 now`

Required modules:

- `P2 Evaluation Engine`
- `P3 Convergence Engine`
- `P5 Runtime Trace Model`

Acceptance:

- task traces explain why the runtime moved to the next step
- retry reasons and reviewer outcomes are visible
- failed-step retry and bounded revision behavior are predictable
- users can tell where a task is blocked and what changed between attempts

Still missing:

- a persisted and queryable trace model instead of mostly terminal-oriented debug output
- clearer blocked, warning, and human-confirmation state explanations
- better cross-run comparison for retries and revisions

#### R3 Persistent Single-User Runtime

Objective:

- make the system usable across restarts for one primary user before expanding to more clients or broader product surfaces
- preserve the working context needed to iteratively produce real deliverables such as PPT decks

Priority:

- `P0 next`

Required modules:

- `P5 Runtime Trace Model`
- `P6 Persistence Schema Upgrade`

Acceptance:

- runtime state survives restart
- tasks, task runs, evaluator outputs, and route history can be restored
- direct chats and core settings are not limited to transient client memory

Still missing:

- schema-backed persistence beyond the current JSON baseline
- full restore for direct chats, settings, and route selections
- migration support once storage shape evolves

### TODO / Later

These items may still matter, but they are not part of the current solo-developer critical path:

- Web backend integration
- mobile-friendly status access
- live usage telemetry and richer analytics
- project-memory expansion beyond the current task core
- Leader-controlled document editing
- full WebApp-generation execution loop
- benchmark harness for broader runtime evaluation
- deeper shell polish, keyboard shortcuts, and advanced power-user interaction
