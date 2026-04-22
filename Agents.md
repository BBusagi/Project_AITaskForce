# Agents Doc

## Project: Multi-Agent Task Workspace MVP

## 1. Project Goal

Build an MVP product for a **multi-agent text task processing system**.

This project now has **two frontend clients** under one shared product model:

* `Clients/Web` for the browser-based workspace MVP
* `Clients/Desktop` for the Electron desktop dialogue-first app

The system should feel like an **AI team management workspace**, not a plain chatbot.

Users can:

* submit one or more text tasks through chat
* view how the leader agent decomposes tasks
* observe task flow and agent assignments
* inspect outputs from planner / writer / reviewer
* see final merged results
* review historical tasks and task timelines

This is **not** a general autonomous AI platform yet.
This MVP is a **structured workflow-based task system** for text processing.

The product spec, agent roles, data model, and API semantics are shared by both clients.

---

## 2. Product Positioning

This product is a combination of:

* chat interface
* task management board
* agent organization dashboard

Core user perception:

> The user gives work to an AI team.
> The team leader decomposes the task and assigns it to specialist agents.
> The user can inspect progress, reasoning stages, and final output.

---

## 3. MVP Scope

### In Scope

* text-based task input
* fixed multi-agent workflow
* task lifecycle tracking
* agent status display
* timeline / event log
* task detail page
* browser workspace MVP under `Clients/Web`
* Electron desktop app under `Clients/Desktop`
* mixed model routing:

  * local model for drafting
  * remote GPT API for planning/review/final synthesis

### Out of Scope

* code execution sandbox
* file system editing
* retrieval system / RAG
* enterprise auth / RBAC
* multi-tenant support
* dynamic autonomous agent creation
* drag-and-drop workflow builder
* advanced analytics dashboard

---

## 4. Agent Architecture

### 4.1 Agent Roles

#### Leader Agent

Responsibilities:

* receive user task
* create top-level task record
* decide workflow start
* call planner
* collect outputs from writer/reviewer
* produce final response to user

Recommended model:

* remote GPT API

---

#### Planner Agent

Responsibilities:

* convert user task into structured subtasks
* define objective, constraints, output format
* decide which subtask goes to which specialist agent

Recommended model:

* remote GPT API

---

#### Writer Agent

Responsibilities:

* generate first draft
* perform text rewriting, summarization, translation, formatting
* produce structured content for reviewer

Recommended model:

* local Qwen via Ollama

---

#### Reviewer Agent

Responsibilities:

* inspect writer output
* check completeness, clarity, consistency, instruction adherence
* approve or reject draft
* if rejected, return review comments

Recommended model:

* remote GPT API

---

#### Optional Summarizer Agent

Responsibilities:

* shorten intermediate content for display
* generate compact timeline summaries

Recommended model:

* local Qwen via Ollama

---

### 4.2 Workflow Model

For MVP, do **not** implement dynamic free-form multi-agent autonomy.

Use a **fixed orchestration flow**:

```text
User Input
→ Leader
→ Planner
→ Writer
→ Reviewer
→ Leader Final Response
```

If review fails:

```text
Writer Revision
→ Reviewer Re-check
→ Leader Final Response
```

Limit revision loop to:

* max 1 retry in MVP

---

## 5. Model Routing Strategy

### Remote GPT API

Use for:

* Leader
* Planner
* Reviewer
* Final synthesis

### Local Ollama + Qwen

Use for:

* Writer
* Summarizer
* low-risk bulk text processing

### Routing Principle

* high-risk / high-judgment tasks → GPT
* high-frequency / draft generation tasks → Qwen
* final user-facing quality gate → GPT

---

## 6. System Modules

### 6.1 Frontend

Main modules:

* Chat Workspace
* Agent Panel
* Task Timeline Panel
* Task History
* Task Detail View

Suggested stack:

* React + TypeScript
* Tailwind
* state management: lightweight preferred
* polling first, websocket optional later

### 6.1.1 Client Split

The repository should keep frontend work split by client:

* `Clients/Web`
  browser-based MVP workspace
* `Clients/Desktop`
  Electron desktop app with dialogue-first layout

Both clients should follow the same:

* task states
* agent roles
* event semantics
* API contract

But they may use different:

* entry points
* layout priorities
* component structure
* local UI state

---

### 6.2 Backend

Main modules:

* Task API
* Agent Orchestrator
* Event Logger
* Model Gateway
* Task Storage

Suggested stack:

* Python FastAPI or Node.js Express/Nest
* SQLite/Postgres for storage
* simple async job handling
* no heavy distributed architecture in MVP

---

### 6.3 Model Gateway

Responsibilities:

* abstract model calls
* unify GPT API and Ollama API
* expose a common interface:

  * generateText(role, prompt, modelClass)

Model classes:

* planner
* writer
* reviewer
* leader

---

## 7. Data Models

## 7.1 Agent

```ts
type AgentStatus = "idle" | "working" | "waiting" | "error";

interface Agent {
  id: string;
  name: string;
  role: "leader" | "planner" | "writer" | "reviewer" | "summarizer";
  description: string;
  modelProvider: "gpt" | "ollama";
  modelName: string;
  status: AgentStatus;
  currentTaskId?: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

## 7.2 Task

```ts
type TaskStatus =
  | "pending"
  | "planning"
  | "writing"
  | "reviewing"
  | "revising"
  | "completed"
  | "failed";

interface Task {
  id: string;
  title: string;
  userInput: string;
  status: TaskStatus;
  priority: "low" | "medium" | "high";
  createdBy: string;
  assignedLeaderId: string;
  finalOutput?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

## 7.3 Subtask

```ts
type SubtaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "rejected";

interface Subtask {
  id: string;
  taskId: string;
  type: "plan" | "draft" | "review" | "revise" | "summary";
  assignedAgentId: string;
  inputText: string;
  outputText?: string | null;
  reviewComment?: string | null;
  status: SubtaskStatus;
  sequence: number;
  createdAt: string;
  updatedAt: string;
}
```

---

## 7.4 Event / Timeline

```ts
type EventType =
  | "task_created"
  | "task_started"
  | "task_assigned"
  | "planning_started"
  | "planning_completed"
  | "writing_started"
  | "writing_completed"
  | "review_started"
  | "review_passed"
  | "review_failed"
  | "revision_started"
  | "revision_completed"
  | "final_output_ready"
  | "task_failed";

interface TaskEvent {
  id: string;
  taskId: string;
  subtaskId?: string | null;
  actorType: "user" | "agent" | "system";
  actorId?: string | null;
  eventType: EventType;
  message: string;
  metadata?: Record<string, any>;
  createdAt: string;
}
```

---

## 7.5 Conversation Message

```ts
interface ConversationMessage {
  id: string;
  taskId: string;
  senderType: "user" | "leader" | "system";
  senderId?: string | null;
  content: string;
  createdAt: string;
}
```

---

## 8. API Design

## 8.1 Create Task

`POST /api/tasks`

Request:

```json
{
  "title": "Summarize meeting notes",
  "userInput": "Please summarize this meeting and produce EN/JP output.",
  "priority": "medium"
}
```

Response:

```json
{
  "taskId": "task_001",
  "status": "pending"
}
```

---

## 8.2 Get Task List

`GET /api/tasks`

Returns task summaries.

---

## 8.3 Get Task Detail

`GET /api/tasks/:taskId`

Returns:

* task info
* subtasks
* final output
* latest status

---

## 8.4 Get Task Events

`GET /api/tasks/:taskId/events`

Returns ordered timeline entries.

---

## 8.5 Get Conversation

`GET /api/tasks/:taskId/messages`

Returns task-related chat/event messages.

---

## 8.6 Get Agents

`GET /api/agents`

Returns current registered agents and statuses.

---

## 8.7 Retry Failed Review

`POST /api/tasks/:taskId/retry`

Triggers one more writer-review cycle.

---

## 9. Frontend Requirements

## 9.1 Shared Frontend Rules

Both clients should:

* expose the current task stage clearly
* show which agent is working on what
* make task progression inspectable
* preserve a conversation-style entry point for task submission
* use the same task and event vocabulary from the API model

---

## 9.2 Web Client Requirements

The Web MVP under `Clients/Web` should use a **3-column workspace layout**.

### Left Panel: Agent Organization

Display:

* agent list
* role
* current status
* current task
* model source or skill tags

### Center Panel: Chat + Task Input

Display:

* conversation thread
* task creation input
* system progress messages
* leader updates
* subtask board

### Right Panel: Task Progress / Timeline

Display:

* current task stage
* subtask progress
* event log
* history entry points
* final output or task detail summary

### Suggested Web Views

* Dashboard
* Workspace
* Task Detail
* Task History
* Agents

---

## 9.3 Desktop Client Requirements

The Desktop app under `Clients/Desktop` should open directly into a **dialogue-first window**.

### Main Area

Display:

* conversation between user and Leader agent
* current task banner
* current workflow stage summary

### Sidebar

Sidebar must contain exactly these 3 panels for MVP:

* `Team`
* `Task`
* `Chat`

### Team Panel

Display:

* current agents in the AI team
* each agent's responsibility
* current task
* status
* included skills

### Task Panel

Display:

* current user task
* current execution stage
* stage owner
* simple progress indication

### Chat Panel

Display:

* input to publish a new task to Leader
* quick actions to ask current progress
* quick actions to ask who is currently responsible

---

## 10. UI Behavior

### Task Submission Flow

When the user submits a task:

1. create task immediately
2. append user message to conversation
3. show system message: "Leader received task"
4. backend starts workflow
5. UI polls for updates every few seconds

### Timeline Rendering

Every backend state change should create an event.
Frontend renders events in chronological order.

For Desktop MVP, the same status change should also immediately update:

* Team panel statuses
* Task panel stage
* Leader conversation updates

### Status Display

Use clear labels:

* Pending
* Planning
* Writing
* Reviewing
* Revising
* Completed
* Failed

### Final Output

Task detail page should clearly separate:

* user request
* planner breakdown
* writer draft
* reviewer judgment
* final answer

---

## 11. Backend Orchestration Logic

Implement a simple orchestrator service.

Pseudo flow:

```text
create task
log task_created

leader receives task
log task_started

planner generates structured plan
create subtask(plan)
log planning_started / planning_completed

writer generates draft
create subtask(draft)
log writing_started / writing_completed

reviewer checks draft
create subtask(review)
log review_started

if approved:
    log review_passed
    leader generates final output
    save final output
    log final_output_ready
    set task completed
else:
    log review_failed
    if retry count < 1:
        writer revises using review comments
        reviewer re-checks
    else:
        set task failed
```

---

## 12. Prompting Rules

### General

* all agent outputs should be concise and structured
* use deterministic structured formatting where possible
* do not allow free-form rambling in planner/reviewer outputs

### Planner Output Schema

Planner should return:

* task objective
* key constraints
* expected output format
* execution steps
* assigned role suggestions

### Writer Output Schema

Writer should return:

* draft content only
* no hidden analysis
* respect requested language and format

### Reviewer Output Schema

Reviewer should return:

* result: pass/fail
* issues found
* revision guidance
* concise rationale

---

## 13. Engineering Constraints

### MVP Simplicity Rules

* do not implement websocket first
* use polling
* do not implement authentication first
* do not implement dynamic agent spawning
* do not implement tool-use-heavy autonomous behavior
* do not implement arbitrary workflow builder
* do not implement advanced queue infra

### Prioritize

* correctness of state transitions
* clean data model
* inspectable timeline
* understandable UI
* stable API contract

---

## 14. Development Order

## Phase 1

* define schemas
* split repo into `Clients/Web` and `Clients/Desktop`
* build mock frontend clients with mock data

## Phase 2

* implement Web task creation
* implement Web agent list
* implement Web timeline rendering
* implement Desktop dialogue-first shell

## Phase 3

* build mock API
* implement orchestrator with fixed flow
* connect GPT and Ollama gateway
* persist task/subtask/events

## Phase 4

* connect both clients to shared API
* implement review retry
* improve prompts
* polish UI
* improve error handling

---

## 15. Acceptance Criteria

MVP is considered complete when:

1. user can create a text task from Web or Desktop UI
2. system creates a task record and shows it immediately
3. leader/planner/writer/reviewer flow can run end to end
4. task status updates are visible in both clients
5. timeline events are visible in the Web workspace
6. Desktop app opens into the Leader dialogue window
7. Desktop sidebar shows `Team / Task / Chat`
8. task detail page shows intermediate outputs
9. at least one review fail/retry path works
10. local and remote model routing both work

---

## 16. Nice-to-Have After MVP

* websocket streaming updates
* manual reassign to different agent
* user-selectable quality/cost mode
* forced local-only / GPT-only mode
* task templates
* upload text files
* export final output
* agent performance stats

---

## 17. Notes for AI Coding Agent

When implementing:

* start from schema-first design
* keep orchestration deterministic
* use mock data first
* keep Web and Desktop clients separate in directory structure
* keep UI clean and functional
* avoid overengineering
* prioritize end-to-end demo completion over architectural perfection

The first goal is:

> make the system feel like an AI team workspace

Not:

> build a full autonomous agent platform
