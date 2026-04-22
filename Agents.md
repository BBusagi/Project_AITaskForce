# Agents Doc

## Project

Multi-Agent Task Workspace MVP

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

- `Server` for a minimal in-memory backend and Ollama integration path

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

Core user perception:

> The user gives work to an AI team.
> The leader decomposes the task and routes it through specialist agents.
> The user can inspect ownership, progress, and outputs at every stage.

## 3. Product Signature

The current Desktop prototype has surfaced a product pattern that should be treated as a feature, not just a temporary layout choice.

### 3.1 Overview-First Team Workspace

`Team` should open to a workspace-level `Overview` first.

From there, the user should drill into individual agents through the same sidebar tree.

Why this matters:

- it presents the AI team as one coordinated unit
- it gives the user a stable shared context before role-level detail
- it avoids making the product feel like a flat roster of disconnected bots

This pattern should be preserved as the product evolves.

### 3.2 Desktop Shell Model

The Desktop client should feel like a real client app shell, closer to Slack or VS Code than to a dashboard landing page.

Key shell rules:

- full-window layout
- fixed outer left rail
- fixed-width collapsible middle sidebar
- full workspace stage on the right
- scrolling contained within each region
- no centered dashboard container
- no outer rounded card wrapping the whole app

### 3.3 Operational Workspaces Beyond Chat

The Desktop client is no longer only a chat surface.

The shell now includes product-level operational workspaces:

- `Team`
- `Task`
- `Projects`
- `Usage`
- `Settings`

This is intentional. The product should expose not only conversation, but also coordination, project context, and model consumption.

## 4. MVP Scope

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

### Out of Scope

- code execution sandbox
- file editing tools inside the product
- RAG and retrieval systems
- enterprise auth
- multi-tenant support
- dynamic agent creation
- arbitrary workflow builder
- production analytics pipeline

## 5. Agent Architecture

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

## 6. Workflow Model

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

Revision loop limit:

- max 1 retry in MVP

## 7. Routing Strategy

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

## 8. Shared Data Model

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

These presentation models should not replace the core task model.

## 9. Frontend Client Split

### 9.1 Web

The Web client remains the browser workspace MVP.

Primary focus:

- task input
- agent workspace structure
- timeline and history
- task detail inspection

### 9.2 Desktop

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

### 9.3 Desktop Workspace Requirements

#### Chat

Should contain:

- leader thread
- task compose surface
- quick progress questions

#### Team

Should contain:

- `Overview` as the default entry
- per-agent drilldown entries
- role, status, current responsibility, and skills
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

## 10. Current Prototype Status

### Implemented Now

- repository split between Web and Desktop
- minimal backend under `Server`
- static Web MVP
- Electron-ready Desktop shell prototype
- full-window Desktop shell layout
- outer rail navigation
- collapsible middle sidebar
- right-side workspace stage
- Team overview plus agent drilldown pattern
- project workspace prototype
- usage workspace prototype
- theme switching
- English default UI
- optional Simplified Chinese UI
- in-memory task API and orchestration flow
- Ollama-backed writer route
- Desktop polling against backend task snapshots when the API is available

### Not Implemented Yet

- persistent task storage
- remote GPT routing for leader, planner, and reviewer
- live usage telemetry
- full backend integration in the Web client
- synchronized shared state across both clients

## 11. Development Order

### Phase 1

- define schemas
- split repo into `Clients/Web` and `Clients/Desktop`
- build mock clients

### Phase 2

- build Desktop shell
- build Team overview and drilldown
- build Task workspace surfaces
- build project and usage workspace prototypes
- add theme and language settings

### Phase 3

- persist tasks, subtasks, and events
- extend the current backend beyond in-memory state
- connect GPT routing alongside the local Ollama writer path

### Phase 4

- connect both clients to shared backend
- replace mock usage data with telemetry
- replace mock project summaries with real project state
- improve prompts, error handling, and workflow reliability

## 12. Acceptance Direction

The MVP should be considered directionally successful when:

1. a user can create a text task from Web or Desktop
2. the system shows task ownership and stage clearly
3. the Leader -> Planner -> Writer -> Reviewer flow is inspectable
4. Desktop feels like a real client shell, not an internal dashboard
5. Team opens with Overview before individual agent drilldown
6. project context can be surfaced alongside task context
7. usage context can be surfaced alongside task context
8. shared product language remains aligned between Web and Desktop

## 13. Notes For AI Coding Agents

When implementing:

- protect the overview-first Team pattern
- preserve the full-window Desktop shell model
- do not collapse the product back into a centered dashboard page
- keep project and usage surfaces operational, not marketing-oriented
- keep the shared task vocabulary aligned across both clients
- prioritize end-to-end inspectability over abstraction purity
