# Agents Doc

## Project

Multi-Agent Task Workspace MVP

## Document Role

`Agents.md` is the canonical product and implementation specification for AI coding agents working in this repository.

This file should contain:

- product behavior rules
- agent responsibilities
- workflow and routing constraints
- frontend shell requirements
- backend orchestration expectations
- roadmap and acceptance direction
- implementation notes for future AI coding agents

This file should not be treated as a quick-start guide. Use `README.md` for the English project entry point and `readme-zh.md` for the Chinese project entry point.

## 1. Goal

Build an MVP for a multi-agent text task processing system.

The system should feel like an AI team workspace, not a general chatbot and not a free-form autonomous agent platform.

The first product goal is:

> make the system feel like an AI team workspace

Not:

> build a general autonomous agent platform

This repository currently has two frontend clients under one shared product model:

- `Clients/Web`
- `Clients/Desktop`

The repository now also includes:

- `Server` for a minimal JSON-backed backend, model gateway, and fixed orchestration path

Both clients should share:

- task states
- agent roles
- event semantics
- API contract

They may differ in:

- layout
- navigation model
- local UI state
- emphasis of the user journey

## 2. Product Positioning

The product sits at the intersection of:

- chat
- task management
- team coordination
- workflow inspection
- model routing visibility
- validation feedback

Core user perception:

> The user gives work to an AI team.
> The leader decomposes the task and routes it through specialist agents.
> The user can inspect ownership, progress, and outputs at every stage.

## 3. Core Product Problem

AI development often fails through repeated trial and error rather than a clean forward path.

This is not only because models are imperfect. The deeper product problem is that the work loop is usually opaque.

Primary causes:

- information is incomplete when an AI agent begins acting
- the execution loop is not visible enough for the user to inspect
- validation is weak, delayed, or disconnected from the action that caused the issue
- model reasoning is probabilistic, so the same intent can still produce variable outputs

AI Task Force should solve this by making the work loop observable:

- show which agent owns the current action
- show which model route is being used
- show the task stage and recent event history
- show project and module context near the work
- show validation results and reviewer feedback as first-class artifacts

The product should reduce blind prompting and replace it with inspectable coordination.

## 4. Execution Runtime Framing

AI Task Force should be understood as more than a multi-agent workflow demo.

The intended system shape is:

> AI Execution Runtime = deterministic shell for probabilistic compute

In this framing:

- LLMs are compute units
- workflow steps are bounded search operations
- the runtime is responsible for control, evaluation, convergence, and observability

This means the product should evolve toward a runtime system, not toward an unbounded collection of prompts and agents.

### 4.1 Runtime Pillars

The target execution system must cover these five pillars:

- Generation
- Control
- Evaluation
- Convergence
- Observability

### 4.2 Current Engineering Gaps

The current architecture direction is correct, but three engineering closures are still missing.

#### Control Layer Gap

The runtime must move beyond loose prompt-shaped IO.

Required direction:

- typed role IO
- explicit input, output, and failure contracts per role
- context slicing rules so each role only sees the minimum required state

#### Evaluation Layer Gap

Reviewer judgement alone is not enough.

Required direction:

- evaluator outputs must directly drive runtime behavior
- rule-based and programmatic validation should complement LLM judgement
- the system should support multi-evaluator composition such as LLM reviewer + rule validator + regression checker

#### Convergence Layer Gap

Retries must become runtime-aware, not generic loops.

Required direction:

- state-aware retries that change the next input based on prior failure
- partial rerun so only the failed segment is recomputed
- explicit search policy for exploring and refining candidate outputs

### 4.3 Minimum Executable System

The project already has working task slices, such as end-to-end multilingual summarization through the current fixed workflow.

That is not yet the same thing as a reusable execution runtime.

For implementation purposes, the minimum executable system should mean:

- a state machine that explicitly defines valid task states and legal transitions
- an evaluation loop that can inspect output and decide the next runtime action

The distinction matters:

- a working vertical slice proves that one workflow can run
- a minimum executable runtime proves that workflow execution has an enforceable core

### 4.4 Concrete Runtime Modules

The next engineering modules should be treated as explicit build targets.

#### P0 Runtime State Machine

Responsibilities:

- define task states and legal transitions
- define transition triggers and failure exits
- emit stable runtime events on every state change

#### P1 Role Contract System

Responsibilities:

- define typed input contracts per role
- define typed output contracts per role
- define failure contracts per role

#### P2 Evaluation Engine

Responsibilities:

- support LLM reviewer evaluation
- support rule-based validation
- support regression checks
- produce machine-readable evaluator results that can drive runtime behavior

#### P3 Convergence Engine

Responsibilities:

- enforce retry budgets
- support partial rerun
- change retry input based on prior failure state
- manage search and refinement strategy

#### P4 Context Slicing Layer

Responsibilities:

- expose only minimum-required context to each role
- reduce role coupling caused by oversized context
- keep role prompts aligned with runtime state boundaries

#### P5 Runtime Trace Model

Responsibilities:

- assign run ids
- store transition records
- store evaluator outcomes
- store retry reasons
- store route, duration, and execution metadata

#### P6 Persistence Schema Upgrade

Responsibilities:

- replace JSON-only persistence with schema-backed runtime storage
- normalize tasks, task runs, task states, evaluator results, runtime events, and route history

#### P7 Benchmark Harness

Responsibilities:

- compare single-pass baseline generation against AES runtime execution
- track quality, retries, latency, and cost
- make runtime improvements measurable

## 5. Product Signature

The current Desktop prototype has surfaced a product pattern that should be treated as a feature, not just a temporary layout choice.

### 5.1 Overview-First Team Workspace

`Team` should open to a workspace-level `Overview` first.

From there, the user should drill into individual agents through the same sidebar tree.

Why this matters:

- it presents the AI team as one coordinated unit
- it gives the user a stable shared context before role-level detail
- it avoids making the product feel like a flat roster of disconnected bots

This pattern should be preserved as the product evolves.

### 5.2 Desktop Shell Model

The Desktop client should feel like a real client app shell, closer to Slack or VS Code than to a dashboard landing page.

Key shell rules:

- full-window layout
- fixed outer left rail
- fixed-width collapsible middle sidebar
- full workspace stage on the right
- scrolling contained within each region
- no centered dashboard container
- no outer rounded card wrapping the whole app

### 5.3 Operational Workspaces Beyond Chat

The Desktop client is no longer only a chat surface.

The shell now includes product-level operational workspaces:

- `Team`
- `Task`
- `Projects`
- `Usage`
- `Settings`

This is intentional. The product should expose not only conversation, but also coordination, project context, and model consumption.

### 5.4 Agent Identity And Runtime Identity

Every agent has two identities:

- product role identity, such as Leader, Planner, Writer, or Reviewer
- runtime model identity, such as `Ollama Local / qwen3:8b` or `GPT API / gpt-5.4-2026-03-05`

The UI and backend prompts should keep these separate but visible together. If a user asks an agent who it is or what model it is using, the answer should include both the ATF role and the current provider/model route.

## 6. MVP Scope

### In Scope

- text-based task input
- fixed multi-agent workflow
- task lifecycle tracking
- agent status display
- timeline and event log
- task detail inspection
- browser workspace MVP under `Clients/Web`
- desktop shell prototype under `Clients/Desktop`
- mixed model routing design
- project-level context surfaces
- usage and token consumption surfaces
- theme switching
- UI language switching
- direct agent chat backed by the selected model route
- visible model route metadata per agent

### Out of Scope

- code execution sandbox
- file editing tools inside the product
- RAG and retrieval systems
- enterprise auth
- multi-tenant support
- dynamic agent creation
- arbitrary workflow builder
- production analytics pipeline

## 7. Agent Architecture

### Leader

Responsibilities:

- receive the user task
- create the top-level task record
- start the workflow
- call planner
- collect downstream outputs
- deliver the final answer

Recommended model:

- remote GPT API

### Planner

Responsibilities:

- convert the user task into structured subtasks
- define objective, constraints, and output format
- decide which specialist role should handle each step

Recommended model:

- remote GPT API

### Writer

Responsibilities:

- generate the first draft
- perform summarization, rewriting, translation, and formatting
- produce structured content for review

Recommended model:

- local Qwen via Ollama

### Reviewer

Responsibilities:

- inspect writer output
- check completeness, clarity, consistency, and instruction adherence
- approve or reject the draft
- return revision guidance when needed

Recommended model:

- remote GPT API

### Optional Summarizer

Responsibilities:

- shorten intermediate content for display
- generate compact summaries for timeline or overview surfaces

Recommended model:

- local Qwen via Ollama

## 8. Workflow Model

MVP should use a fixed orchestration flow:

```text
User Input
-> Leader
-> Planner
-> Writer
-> Reviewer
-> Leader Final Response
```

If review fails:

```text
Writer Revision
-> Reviewer Re-check
-> Leader Final Response
```

Revision loop shape:

- full review on attempt 1
- scoped revision review on attempt 2
- escalate to `human_confirmation` after the bounded automated attempts

## 9. Routing Strategy

### Remote GPT API

Use for:

- Leader
- Planner
- Reviewer
- final synthesis

### Local Ollama + Qwen

Use for:

- Writer
- Summarizer
- low-risk bulk text processing

### Routing Principle

- high-judgment tasks -> GPT
- high-frequency drafting -> Qwen
- final user-facing quality gate -> GPT
- every direct chat should follow the selected route for that agent
- route selection and enabled model candidates must remain visible in Settings and Team

## 10. Shared Data Model

Shared domain objects still center on:

- `Agent`
- `Task`
- `Subtask`
- `TaskEvent`
- `ConversationMessage`

The frontend may add client-local presentation models for:

- project summaries
- module surfaces
- token usage summaries
- shell preferences such as theme and language
- model route summaries
- validation summaries

These presentation models should not replace the core task model.

## 11. Frontend Client Split

### 11.1 Web

The Web client remains the browser workspace MVP.

Primary focus:

- task input
- agent workspace structure
- timeline and history
- task detail inspection
- read-only project and agent status views in later phases

### 11.2 Desktop

The Desktop client is a dialogue-first shell, but it is no longer limited to three panels.

Current top-level Desktop workspaces:

- `Chat`
- `Team`
- `Task`
- `Projects`
- `Usage`
- `Settings`

Current Desktop shell expectations:

- launch directly into a workspace shell
- use outer left rail for workspace switching
- use collapsible middle sidebar as the workspace tree
- render the selected content in the right-side stage

### 11.3 Desktop Workspace Requirements

#### Chat

Should contain:

- `Check-ins` for lightweight status questions and progress inspection
- direct agent chat sessions created from Team, including Leader
- Leader direct chat with two explicit actions: normal `Send Message` and task-oriented `Task Creation`
- a publication confirmation card after the user uses `Task Creation`

Main tasks must originate from the Leader direct chat through the explicit `Task Creation` action, not from a standalone compose form and not from ordinary chat messages.

Expected task publication flow:

```text
User opens Leader from Team
-> Leader appears under Direct Chats like other agents
-> User can use Send Message for natural conversation
-> User uses Task Creation for task requirements
-> UI generates a task draft and publication confirmation card
-> User confirms publication
-> System publishes the main task
-> Leader mentions Planner
-> Planner breaks the task into subtasks and assigns specialist agents
```

#### Team

Should contain:

- `Overview` as the default entry
- per-agent drilldown entries
- role, status, current responsibility, and skills
- provider/model route metadata for each routable agent
- list and grid presentation modes for overview

#### Task

Should contain:

- current task summary
- stage flow
- timeline

#### Projects

Should contain:

- project-level management surface
- module-level workspace breakdown
- basic project information
- current development stage
- bug counts
- progress indicators

#### Usage

Should contain:

- token usage by team member
- token usage by project or module
- cost summary
- budget and routing mix view

#### Settings

Should contain:

- theme selection
- language selection
- Local LLM model enablement
- API LLM model enablement
- default and enabled model route visibility

## 12. Current Prototype Status

### Implemented Now

- repository split between Web and Desktop
- minimal backend under `Server`
- static Web MVP
- Electron-style Desktop shell
- full-window Desktop shell layout
- outer rail navigation
- collapsible middle sidebar
- right-side workspace stage
- Team overview plus agent drilldown pattern
- task workspace with overview, team timeline, and per-task detail views
- per-task stage flow in task detail views
- project workspace prototype
- usage workspace prototype
- theme switching
- English default UI
- optional Simplified Chinese UI
- JSON-backed task API and persistence MVP
- fixed orchestrator execution through real model calls
- Ollama-backed writer route
- `POST /api/chat` direct chat endpoint
- Ollama direct chat through native `/api/chat`
- OpenAI and Claude API model candidates in the model gateway
- default Writer route set to `ollama / qwen3:8b`
- enabled-model filtering for agent model dropdowns
- per-agent model route display in Team overview and agent detail
- backend request/response/error logging for direct chat
- backend task lifecycle logging and model invocation visibility
- Desktop polling against backend task snapshots when the API is available
- retry task, retry failed step, archive, and delete actions

### Not Implemented Yet

- SQLite-backed persistence and migration tooling
- persistent direct chat history across the whole product surface
- fully contract-based role IO and failure handling
- hybrid evaluation stack with rule validators beyond LLM review
- stronger partial rerun and search-policy execution
- live usage telemetry
- full backend integration in the Web client
- synchronized shared state across both clients
- mobile status client
- safe document editing workflow through Leader

## 13. Roadmap

### 13.1 M0 Product Definition

- Define AI Task Force as a structured AI team workspace for bounded execution.
- Keep the product centered on inspectability, routing clarity, and task ownership.
- Avoid drifting into a free-form autonomous agent platform too early.

Status:

- mostly complete

Priority:

- `P0 foundation`

Required modules:

- shared product vocabulary
- shared task model
- shared routing language

Acceptance:

- Desktop, Web, Server, and docs describe the same system boundaries
- the product is clearly framed as a bounded AI workspace, not a general autonomous platform

Still missing:

- remove leftover MVP-era wording that conflicts with runtime framing
- keep product language aligned across Desktop, Web, Server, and docs as execution evolves

### 13.2 M1 Desktop Shell

- Keep the Desktop client as a full-window shell, not a centered dashboard.
- Preserve outer rail navigation, collapsible middle sidebar, and right workspace stage.
- Keep `Chat`, `Team`, `Task`, `Projects`, `Usage`, and `Settings` as first-class workspaces.

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
- navigation no longer depends on dashboard-card patterns
- each pane scrolls internally instead of forcing page-level scroll

Still missing:

- remaining shell polish for spacing, overflow, and cross-panel consistency
- stronger loading, empty, and error states per workspace
- future keyboard navigation and power-user interactions

### 13.3 M2 Model Connectivity

- Support Ollama, OpenAI, and Anthropic under one routing model.
- Keep provider/model identity visible in the UI.
- Allow per-agent route selection and enablement filtering.

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
- clearer runtime contracts for provider failure modes

### 13.4 M3 Leader Task Publication

- Make the Leader the main intake surface.
- Separate natural conversation from explicit task publication.
- Require a publication confirmation step before task execution begins.

Status:

- complete for MVP

Priority:

- `P1 stabilize`

Required modules:

- Leader direct chat
- task publication draft
- publication confirmation flow

Acceptance:

- main tasks originate from explicit Leader publication, not ordinary chat text
- publication creates a task record and starts the workflow consistently
- users can distinguish normal conversation from task creation

Still missing:

- a formal task-contract schema beyond the current publication card flow
- milestone-aware publication data persisted into the backend task model
- stronger structure between publication output and downstream Planner execution state

### 13.5 M4 Fixed Multi-Agent Workflow

- Run the fixed orchestration loop:
  `Leader -> Planner -> Writer -> Reviewer -> Leader Final Response`
- Keep orchestration deterministic and inspectable.
- Stabilize retry, review, and human-confirmation behavior across common text-task patterns.
- Move from prompt chaining toward contract-based runtime execution.

Status:

- implemented but still being hardened

Priority:

- `P0 current`

Required modules:

- `P0 Runtime State Machine`
- `P1 Role Contract System`

Acceptance:

- legal workflow transitions are enforced
- role outputs are contract-shaped
- review, revise, and human-confirmation paths are deterministic enough to reuse across common task types

Still missing:

- a formal state-machine implementation instead of flow logic scattered across orchestrator branches
- stronger failure contracts between planner, writer, reviewer, and leader stages
- milestone-aware planning is not yet wired into execution

### 13.6 M5 Task Observability And Recovery

- Make task state, owner, route, invocation status, intermediate outputs, final output, and timeline visible.
- Support full retry, failed-step retry, archive, and delete.
- Distinguish clearly between in-progress, warning, failed, and human-confirmation states.
- Make runtime failures debuggable as first-class events rather than inferred from chat text.

Status:

- in active development

Priority:

- `P0 current`

Required modules:

- `P2 Evaluation Engine`
- `P3 Convergence Engine`
- `P5 Runtime Trace Model`

Acceptance:

- runtime failures are explainable through events and traces
- retry reasons are visible
- partial rerun is supported in the main task flow
- a user can understand why the system moved to the next step

Still missing:

- a persisted and queryable trace model instead of mostly terminal-oriented debug output
- clearer blocked, warning, and human-confirmation state explanations
- better cross-run comparison for retries and revisions

### 13.7 M6 Persistence And Project Memory

- Move from JSON MVP persistence to a stable schema-backed store.
- Persist tasks, subtasks, events, direct chats, settings, route history, and later project memory.
- Keep restored state consistent across Desktop and future clients.

Status:

- JSON MVP only

Priority:

- `P0 next`

Required modules:

- `P5 Runtime Trace Model`
- `P6 Persistence Schema Upgrade`

Acceptance:

- runtime state can survive restart
- tasks, task runs, evaluator results, and route history can be restored
- persistence is no longer limited to ad hoc JSON snapshots

Still missing:

- SQLite or Postgres-backed schema storage
- full restore for direct chats, settings, and route selections
- project-level memory and migration support

### 13.8 M7 Multi-Client Access

- Connect Web to the same backend used by Desktop.
- Add lightweight read-only or light-action Web and mobile-friendly access.
- Keep Desktop as the primary deep-control surface.

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

### 13.9 M8 AI Execution System

- Move from “AI task processing workspace” toward “AI execution system”.
- Execute against real project objects, documents, modules, and future controlled targets.
- Make outputs traceable, recoverable, and auditable.

Status:

- future direction

Priority:

- `P1 strategic`

Additional direction:

- models should be treated as probabilistic compute inside a deterministic runtime shell

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

- runtime behavior can be evaluated as a system instead of as a prompt sequence
- baseline single-pass generation can be compared with AES execution
- cost, retries, traces, and quality can be measured together

Still missing:

- real execution targets have not been modeled yet
- benchmark tasks do not yet prove runtime advantage over single-pass generation
- control, evaluation, and convergence are not yet complete enough to call this a full execution runtime

### 13.10 Leader-Controlled Editing

The Leader should eventually support safe, lightweight document editing commands.

Initial allowed targets:

- README updates
- Agents document updates
- project status notes
- roadmap summaries
- release notes or progress reports

Guardrails:

- edits should be explicit and reviewable
- the Leader should summarize what changed
- destructive edits should not be allowed without confirmation
- document edits should create timeline events

Status:

- future direction

Priority:

- `P2 later`

Required modules:

- document target model
- safe edit contract
- reviewable diff summary
- timeline event logging for edits

Acceptance:

- Leader can perform bounded document edits against approved targets
- every edit is reviewable and attributable
- destructive actions require confirmation

Still missing:

- document objects are not yet first-class runtime targets
- no safe edit contract or diff workflow exists yet
- no approval flow has been wired into execution

## 14. Development Order

### Current Focus

- harden `M4 Fixed Multi-Agent Workflow`
- improve `M5 Task Observability And Recovery`
- prepare `M6 Persistence And Project Memory`
- convert the architecture into an execution-grade runtime model

### Next Build Order

#### Phase A: Runtime Hardening

- introduce typed role IO
- define explicit input, output, and failure contracts per role
- implement stricter context slicing for Leader, Planner, Writer, and Reviewer
- keep execution surfaces readable while exposing more runtime state

#### Phase B: Executable Evaluation Loop

- combine LLM review with programmatic validation
- let evaluator outputs drive next runtime actions
- strengthen state-aware retry and partial rerun logic
- reduce retry loops that do not materially change the next candidate

#### Phase C: Benchmark And Trace

- choose at least one benchmark task domain such as document generation
- compare baseline single-pass generation against AES runtime execution
- add cost tracking and execution trace UI
- make the runtime measurable as a system, not only observable as chat

#### Phase D: Persistence And Client Expansion

- move persistence from JSON MVP to SQLite once the schema stabilizes
- persist direct chats, settings, and route-selection history more systematically
- connect Web to the shared backend
- add lightweight mobile-friendly status access

## 15. Acceptance Direction

The MVP should be considered directionally successful when:

1. a user can create a text task from Web or Desktop
2. the system shows task ownership and stage clearly
3. the Leader -> Planner -> Writer -> Reviewer flow is inspectable
4. Desktop feels like a real client shell, not an internal dashboard
5. Team opens with Overview before individual agent drilldown
6. project context can be surfaced alongside task context
7. usage context can be surfaced alongside task context
8. shared product language remains aligned between Web and Desktop
9. users can tell which model each agent is using
10. validation and retry reasons are visible rather than hidden inside chat text

## 16. Notes For AI Coding Agents

When implementing:

- protect the overview-first Team pattern
- preserve the full-window Desktop shell model
- do not collapse the product back into a centered dashboard page
- keep project and usage surfaces operational, not marketing-oriented
- keep the shared task vocabulary aligned across both clients
- prioritize end-to-end inspectability over abstraction purity
- do not hide provider/model identity from the user
- do not treat repeated model retries as a UX detail; expose the reason, owner, and validation result
- prefer typed role IO and explicit contracts over free-form prompt coupling
- design evaluator outputs so they can drive runtime actions programmatically
- treat partial rerun and state-aware retry as core runtime features, not optional polish
