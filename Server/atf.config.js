module.exports = {
  server: {
    host: "127.0.0.1",
    port: 8787,
  },
  providers: {
    ollama: {
      label: "Ollama Local",
      baseUrl: "http://127.0.0.1:11434",
      models: ["qwen3:8b"],
    },
    openai: {
      label: "GPT API",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "",
      models: ["gpt-4.1", "gpt-4.1-mini"],
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
        provider: "ollama",
        model: "qwen3:8b",
      },
      planner: {
        provider: "ollama",
        model: "qwen3:8b",
      },
      writer: {
        provider: "ollama",
        model: "qwen3:8b",
      },
      reviewer: {
        provider: "ollama",
        model: "qwen3:8b",
      },
    },
  },
  storage: {
    dataDir: ".atf-data",
  },
};
