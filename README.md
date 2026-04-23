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
- Expand the Reviewer contract UI so rubric status, issue IDs, changed regions, regressions, and human-confirmation state are readable without opening raw JSON.
- Connect Web to the shared backend for project and agent status visibility.
- Add lightweight mobile or mobile-friendly status views.
- Allow the Leader to perform controlled lightweight document edits for status notes, README updates, and roadmap summaries.
