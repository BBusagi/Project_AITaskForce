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
  Minimal ATF backend with in-memory task APIs, model gateway, direct chat endpoint, Ollama integration, and API model candidates.
- `Agents.md`
  Product spec, workflow rules, agent architecture, roadmap, and implementation constraints.

## Current Status

Implemented today:

- Static Web MVP.
- Electron-ready Desktop shell prototype.
- Full-window Desktop layout with left rail, collapsible middle sidebar, and right workspace stage.
- `Team` overview plus per-agent drilldown.
- Direct agent chat through `POST /api/chat`.
- Ollama direct chat through native `/api/chat`.
- OpenAI and Claude API model candidates in the model gateway.
- Writer default route set to `Ollama Local / qwen3:8b`.
- Per-agent provider/model route display in Team overview and agent detail.
- Settings controls for theme, language, and LLM enablement.
- Mock Projects and Usage workspaces.

Not implemented yet:

- Persistent task, chat, event, and route storage.
- Real end-to-end orchestrator execution through all agents.
- Live token telemetry.
- Full Web client backend integration.
- Mobile status client.
- Safe Leader-controlled document editing workflow.

## Product Problem Summary

AI-assisted development often becomes repeated trial and error because the working loop is opaque: information is incomplete, execution is hard to inspect, validation is weak, and model reasoning is probabilistic.

AI Task Force treats this as a product problem. The workspace should make agent ownership, model routes, task state, project context, and validation signals visible while work is happening.

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

## Near-Term Direction

The next development phase is to move from a convincing shell to a usable observable workflow:

- Persist tasks, subtasks, events, direct chat messages, and model route history.
- Run the fixed Leader -> Planner -> Writer -> Reviewer -> Leader loop through real model calls.
- Add validation surfaces for reviewer checks, retry reasons, and final approval.
- Connect Web to the shared backend for project and agent status visibility.
- Add lightweight mobile or mobile-friendly status views.
- Allow the Leader to perform controlled lightweight document edits for status notes, README updates, and roadmap summaries.
