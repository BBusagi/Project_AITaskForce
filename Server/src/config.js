const path = require("node:path");

const fileConfig = require("../atf.config.js");

function readNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pick(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

const rootDir = path.resolve(__dirname, "..");

module.exports = {
  port: readNumber(process.env.ATF_SERVER_PORT, readNumber(fileConfig.server?.port, 8787)),
  host: pick(process.env.ATF_SERVER_HOST, fileConfig.server?.host, "127.0.0.1"),
  ollamaBaseUrl: pick(process.env.OLLAMA_BASE_URL, fileConfig.ollama?.baseUrl, "http://127.0.0.1:11434"),
  writerModel: pick(process.env.ATF_OLLAMA_WRITER_MODEL, process.env.OLLAMA_MODEL, fileConfig.ollama?.models?.writer, "qwen3:8b"),
  plannerModel: pick(process.env.ATF_OLLAMA_PLANNER_MODEL, fileConfig.ollama?.models?.planner, ""),
  reviewerModel: pick(process.env.ATF_OLLAMA_REVIEWER_MODEL, fileConfig.ollama?.models?.reviewer, ""),
  leaderModel: pick(process.env.ATF_OLLAMA_LEADER_MODEL, fileConfig.ollama?.models?.leader, ""),
  dataDir: path.resolve(rootDir, pick(process.env.ATF_DATA_DIR, fileConfig.storage?.dataDir, ".atf-data")),
};
