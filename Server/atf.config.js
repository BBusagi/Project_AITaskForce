module.exports = {
  server: {
    host: "127.0.0.1",
    port: 8787,
  },
  ollama: {
    baseUrl: "http://127.0.0.1:11434",
    models: {
      writer: "qwen3:8b",
      planner: "",
      reviewer: "",
      leader: "",
    },
  },
  storage: {
    dataDir: ".atf-data",
  },
};
