# AI Task Force Server

Minimal ATF backend with:

- in-memory task store
- fixed orchestration flow
- Ollama writer integration
- task, event, message, and agent APIs

## Run

```bash
cd Server
npm start
```

Default server URL:

```text
http://127.0.0.1:8787
```

## Ollama

The backend expects a local Ollama service at:

```text
http://127.0.0.1:11434
```

The default local config now lives in:

```text
Server/atf.config.js
```

Edit that file directly in VSCode to change:

- server host and port
- Ollama base URL
- writer / planner / reviewer / leader model names
- local data directory

Current default writer model:

```text
qwen3:8b
```

Environment variables are still supported as overrides when needed:

```bash
set OLLAMA_BASE_URL=http://127.0.0.1:11434
set ATF_OLLAMA_WRITER_MODEL=qwen3:8b
set ATF_SERVER_PORT=8787
```

## API

- `GET /api/health`
- `GET /api/agents`
- `GET /api/tasks`
- `POST /api/tasks`
- `GET /api/tasks/:taskId`
- `GET /api/tasks/:taskId/events`
- `GET /api/tasks/:taskId/messages`
- `GET /api/tasks/:taskId/snapshot`
