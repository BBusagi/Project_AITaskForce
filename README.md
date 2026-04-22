# AI Task Force

AI Task Force is a multi-agent workspace MVP for text tasks.

The goal is not to build a general autonomous agent platform first. The goal is to make one fixed, inspectable, product-grade collaboration flow feel real:

`User -> Leader -> Planner -> Writer -> Reviewer -> Leader Final Response`

The repository currently contains two clients under one shared product model:

- `Clients/Web` for the browser workspace MVP
- `Clients/Desktop` for the Electron-style desktop shell prototype

## Product Direction

AI Task Force should feel like an AI team workspace, not a plain chatbot.

Users should be able to:

- submit work through chat
- see which agent currently owns the task
- inspect the workflow stage and task history
- drill into team members, projects, and usage
- review intermediate and final outputs

## Current Product Signature

One product pattern is important enough to call out explicitly because it has become part of the identity of the Desktop client:

- `Team` is not just a flat agent list
- it opens with a workspace-level `Overview` conversation and summary surface
- the user can then drill down into individual agents from the same sidebar tree

This `overview first, agent drilldown second` structure is now a product feature. It frames the AI team as one coordinated unit before exposing each specialist.

## Repository Structure

- [Agents.md](/mnt/d/GitProject/Project_AITaskForce/Agents.md)
  Shared product spec, workflow rules, client split, and implementation status.
- [Clients/Web](/mnt/d/GitProject/Project_AITaskForce/Clients/Web)
  Browser MVP for the shared workspace model.
- [Clients/Desktop](/mnt/d/GitProject/Project_AITaskForce/Clients/Desktop)
  Desktop shell prototype with outer rail navigation and dialogue-first interaction.

## Desktop Status

The current Desktop prototype is no longer an internal dashboard page. It is a full-window shell with:

- full-height outer app layout
- fixed left rail navigation
- collapsible middle resource sidebar
- right-side full workspace stage

Current top-level Desktop workspaces:

- `Chat`
- `Team`
- `Task`
- `Projects`
- `Usage`
- `Settings`

Current Desktop capabilities:

- dialogue-first shell with `Leader` thread and task compose flow
- `Team` workspace with `Overview` plus per-agent drilldown
- list and grid views for team overview
- person-style SVG role icons for agents
- `Projects` workspace for project and module-level tracking
- `Usage` workspace for token and cost visualization by team and by project
- `Settings` workspace with theme switching
- `Settings` workspace with interface language switching
- English default UI with optional Simplified Chinese

## Web Status

The current Web client remains a static MVP focused on the shared task workspace model:

- task input
- agent workspace structure
- task timeline and event log
- task history and detail-oriented browsing

## What Is Implemented Today

- repository split into `Clients/Web` and `Clients/Desktop`
- static Web MVP prototype
- Electron-ready Desktop prototype shell
- shared multi-agent product framing across both clients
- mock task progression in the frontend
- mock team, project, and usage data in the Desktop client

## What Is Not Implemented Yet

- real orchestrator service
- real backend API
- persistent storage
- GPT / Ollama gateway integration
- live token telemetry
- shared backend state between Web and Desktop

## Run

### Web

Open [Clients/Web/index.html](/mnt/d/GitProject/Project_AITaskForce/Clients/Web/index.html) directly, or serve the repository statically:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/Clients/Web/`

### Desktop

From `Clients/Desktop`:

```bash
npm install
npm start
```

## Current Development Focus

The current priority is still frontend-first validation:

- make the system feel like a real AI team product
- keep the workflow easy to inspect
- make the Desktop shell feel like a real client app
- keep Web and Desktop aligned to the same product vocabulary

Backend integration remains the next major phase after the frontend shell and information architecture stabilize.
