# AI Task Force Server

JSON-backed ATF backend with:

- JSON-backed task store
- fixed orchestration flow
- provider-aware model gateway for Ollama, OpenAI, and Anthropic
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

## Configuration

The default shared config lives in:

```text
Server/atf.config.js
```

For local API keys and machine-specific overrides, create:

```text
Server/atf.config.local.js
```

Use [atf.config.local.example.js](/D:/GitProject/Project_AITaskForce/Server/atf.config.local.example.js) as the template.

Edit the config directly in VSCode to change:

- server host and port
- Ollama base URL and local models
- OpenAI API key and GPT model candidates
- Anthropic API key and Claude model candidates
- per-role default routing for leader / planner / writer / reviewer
- local data directory

Default local writer model:

```text
qwen3:8b
```

Example local override:

```js
module.exports = {
  providers: {
    openai: {
      apiKey: "sk-your-openai-key",
    },
    anthropic: {
      apiKey: "sk-ant-your-anthropic-key",
    },
  },
  routing: {
    routes: {
      leader: { provider: "openai", model: "gpt-4.1" },
      planner: { provider: "openai", model: "gpt-4.1-mini" },
      writer: { provider: "ollama", model: "qwen3:8b" },
      reviewer: { provider: "anthropic", model: "claude-sonnet-4-20250514" },
    },
  },
};
```

Environment variables are still supported as overrides:

```bash
set OLLAMA_BASE_URL=http://127.0.0.1:11434
set OPENAI_API_KEY=sk-your-openai-key
set ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
set ATF_SERVER_PORT=8787
```

## API

- `GET /api/health`
- `GET /api/models`
- `POST /api/models`
- `GET /api/agents`
- `GET /api/tasks`
- `POST /api/tasks`
- `GET /api/tasks/:taskId`
- `GET /api/tasks/:taskId/events`
- `GET /api/tasks/:taskId/messages`
- `GET /api/tasks/:taskId/snapshot`
