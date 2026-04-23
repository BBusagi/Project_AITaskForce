module.exports = {
  server: {
    host: "127.0.0.1",
    port: 8787,
  },
  providers: {
    ollama: {
      label: "Ollama Local",
      baseUrl: "http://127.0.0.1:11434",
      requestTimeoutMs: 180000,
      models: ["qwen3:8b"],
    },
    openai: {
      label: "GPT API",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "",
      models: ["gpt-5.4-2026-03-05", "gpt-4.1", "gpt-4.1-mini"],
    },
    anthropic: {
      label: "Claude API",
      baseUrl: "https://api.anthropic.com",
      apiKey: "",
      version: "2023-06-01",
      models: ["claude-sonnet-4-20250514", "claude-3-5-haiku-latest"],
    },
  },
  routing: {
    routes: {
      leader: {
        provider: "openai",
        model: "gpt-5.4-2026-03-05",
      },
      planner: {
        provider: "openai",
        model: "gpt-5.4-2026-03-05",
      },
      writer: {
        provider: "ollama",
        model: "qwen3:8b",
      },
      reviewer: {
        provider: "openai",
        model: "gpt-5.4-2026-03-05",
      },
    },
  },
  storage: {
    dataDir: ".atf-data",
  },
};
