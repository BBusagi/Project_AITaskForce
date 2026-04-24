# Agents Doc

## Project

AI Task Force Workspace

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

Build a structured AI team workspace for bounded execution tasks.

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

### 4.5 Documentation Synchronization Rule

Documentation synchronization is part of product integrity, not optional cleanup.

Whenever task states, routing behavior, workspace names, role contracts, evaluator behavior, or runtime semantics change, the same change set should also update:

- `README.md`
- `readme-zh.md`
- `Agents.md`
- visible Desktop or Web UI copy that describes the changed behavior

The rule is:

- code, UI wording, and product docs must describe the same execution model
- roadmap status changes must be reflected in the docs during the same stage of work
- old wording that frames the product as a simple chat demo or an obsolete MVP shell should be removed when the behavior has already moved beyond that description

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
- JSON-backed backend under `Server`
- static Web workspace shell
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

This roadmap should be read as a solo-developer plan, not as a broad multi-team product plan.

The main rule is:

- prioritize the smallest execution framework that proves the product idea
- keep non-blocking expansion work out of the current core roadmap
- move side surfaces and extra clients into TODO unless they directly unlock the execution core

Execution priority should be MVP-driven:

- the current MVP defines what the system must actually deliver
- the roadmap defines the minimum runtime capabilities needed to support that MVP
- if a feature does not directly unblock the current MVP, it should normally stay out of the current core path

### 13.1 Core Principle

The product-defining loop is:

```text
Leader -> Planner -> Writer -> Reviewer -> Final
```

If this loop is not stable, observable, and recoverable, then added clients and added product surfaces do not prove the product.

### 13.2 Active MVP Targets

#### MVP 1: PPT Generation System

Inputs:

- topic
- target audience
- slide count
- style
- language

Outputs:

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

Current product meaning:

- this is the current primary MVP
- it is the nearest deliverable that matches the existing text-workflow strengths
- the missing step is moving from structured text outputs into real file deliverables

#### MVP 2: WebApp Generation System

Input:

- a request for a WebApp that satisfies explicit requirements

Outputs:

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

Current product meaning:

- this is not the current primary MVP
- it depends on a stronger execution loop than the project has today
- it should follow after the PPT system proves the runtime against a real deliverable

### 13.3 R1 Minimal Execution Core

Objective:

- make the fixed workflow behave like a bounded execution system rather than a prompt chain with UI around it
- provide the minimum execution guarantees required for MVP 1

Priority:

- `P0 now`

Required modules:

- `P0 Runtime State Machine`
- `P1 Role Contract System`

Acceptance:

- legal workflow transitions are enforced
- role outputs and failures are contract-shaped
- reviewer rejection routes back into writer revision predictably
- common text tasks run end to end without ad hoc flow patches

Still missing:

- a formal state-machine implementation instead of scattered orchestration branching
- stronger failure contracts between planner, writer, reviewer, and leader
- tighter linkage between Leader publication and Planner execution input

### 13.4 R2 Observable Task Runtime

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

- runtime traces explain why the system moved to the next step
- retry reasons and reviewer outcomes are visible
- failed-step retry and bounded revision behavior are predictable
- users can tell where a task is blocked and what changed between attempts

Still missing:

- a persisted and queryable trace model instead of mostly terminal-oriented debug output
- clearer blocked, warning, and human-confirmation state explanations
- better cross-run comparison for retries and revisions

### 13.5 R3 Persistent Single-User Runtime

Objective:

- make the system reliably usable across restarts for one primary user before broadening client scope
- preserve the working context needed to iteratively produce real deliverables such as PPT decks

Priority:

- `P0 next`

Required modules:

- `P5 Runtime Trace Model`
- `P6 Persistence Schema Upgrade`

Acceptance:

- runtime state survives restart
- tasks, task runs, evaluator outputs, and route history can be restored
- direct chats and core settings are no longer limited to transient client memory

Still missing:

- schema-backed persistence beyond the current JSON baseline
- full restore for direct chats, settings, and route selections
- migration support once storage shape evolves

## 14. Development Order

### Current Focus

- finish `R1 Minimal Execution Core`
- harden `R2 Observable Task Runtime`
- prepare `R3 Persistent Single-User Runtime`

### TODO / Later

These items may still matter, but they are not on the current solo-developer critical path:

- Web backend integration
- mobile-friendly status access
- live usage telemetry and broader analytics
- project-memory expansion beyond the current task core
- Leader-controlled document editing
- full WebApp-generation execution loop
- benchmark harness for wider runtime evaluation
- deeper shell polish, keyboard shortcuts, and advanced power-user interaction

## 15. Acceptance Direction

The current solo-build should be considered directionally successful when:

1. a user can publish a task through Leader and start the fixed workflow reliably
2. the Leader -> Planner -> Writer -> Reviewer flow is inspectable as execution, not only as chat
3. reviewer rejection triggers bounded revision rather than silent downstream continuation
4. users can tell which model route each agent is using
5. retry, retry-failed-step, and failure states are understandable without terminal guesswork
6. a restart does not destroy the core task state needed for continued use

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
