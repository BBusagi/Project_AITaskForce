module.exports = {
  providers: {
    openai: {
      apiKey: "sk-your-openai-key",
      models: ["gpt-4.1", "gpt-4.1-mini"],
    },
    anthropic: {
      apiKey: "sk-ant-your-anthropic-key",
      models: ["claude-sonnet-4-20250514", "claude-3-5-haiku-latest"],
    },
  },
  routing: {
    routes: {
      leader: {
        provider: "openai",
        model: "gpt-4.1",
      },
      planner: {
        provider: "openai",
        model: "gpt-4.1-mini",
      },
      writer: {
        provider: "ollama",
        model: "qwen3:8b",
      },
      reviewer: {
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
      },
    },
  },
};
