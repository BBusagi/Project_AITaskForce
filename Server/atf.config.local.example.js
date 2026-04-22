module.exports = {
  providers: {
    openai: {
      apiKey: "sk-your-openai-key",
      models: ["gpt-5.4-2026-03-05", "gpt-4.1", "gpt-4.1-mini"],
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
        model: "gpt-5.4-2026-03-05",
      },
      planner: {
        provider: "openai",
        model: "gpt-5.4-2026-03-05",
      },
      writer: {
        provider: "openai",
        model: "gpt-5.4-2026-03-05",
      },
      reviewer: {
        provider: "openai",
        model: "gpt-5.4-2026-03-05",
      },
    },
  },
};
