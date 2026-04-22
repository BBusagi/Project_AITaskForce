const fs = require("node:fs");
const path = require("node:path");

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function mergeObjects(base, override) {
  const result = { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    if (isPlainObject(value) && isPlainObject(base?.[key])) {
      result[key] = mergeObjects(base[key], value);
      continue;
    }

    result[key] = value;
  }
  return result;
}

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
const workspaceDir = path.resolve(rootDir, "..");
const baseConfigPath = path.resolve(rootDir, "atf.config.js");
const localConfigPath = path.resolve(rootDir, "atf.config.local.js");
const baseConfig = require(baseConfigPath);
const localConfig = fs.existsSync(localConfigPath) ? require(localConfigPath) : {};
const fileConfig = mergeObjects(baseConfig, localConfig);

function readSecretFile(...candidatePaths) {
  for (const filePath of candidatePaths) {
    if (!filePath || !fs.existsSync(filePath)) continue;

    const value = fs.readFileSync(filePath, "utf8").trim();
    if (value) return value;
  }

  return "";
}

function normalizeModels(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [...fallback];
}

function normalizeRoute(route, fallbackProvider, fallbackModel) {
  return {
    provider: pick(route?.provider, fallbackProvider, "ollama"),
    model: pick(route?.model, fallbackModel, ""),
  };
}

const legacyOllama = fileConfig.ollama || {};
const legacyOllamaModels = legacyOllama.models || {};
const providerConfig = fileConfig.providers || {};
const openAIKeyFromFile = readSecretFile(path.resolve(workspaceDir, "openai.key"), path.resolve(rootDir, "openai.key"));
const anthropicKeyFromFile = readSecretFile(
  path.resolve(workspaceDir, "anthropic.key"),
  path.resolve(workspaceDir, "claude.key"),
  path.resolve(rootDir, "anthropic.key"),
  path.resolve(rootDir, "claude.key")
);

const defaultWriterModel = pick(
  process.env.ATF_OLLAMA_WRITER_MODEL,
  process.env.OLLAMA_MODEL,
  fileConfig.routing?.routes?.writer?.model,
  providerConfig.ollama?.models?.[0],
  legacyOllamaModels.writer,
  "qwen3:8b"
);

const providers = {
  ollama: {
    id: "ollama",
    label: pick(providerConfig.ollama?.label, "Ollama Local"),
    baseUrl: pick(process.env.OLLAMA_BASE_URL, providerConfig.ollama?.baseUrl, legacyOllama.baseUrl, "http://127.0.0.1:11434"),
    models: normalizeModels(providerConfig.ollama?.models, [defaultWriterModel]),
  },
  openai: {
    id: "openai",
    label: pick(providerConfig.openai?.label, "GPT API"),
    baseUrl: pick(process.env.OPENAI_BASE_URL, providerConfig.openai?.baseUrl, "https://api.openai.com/v1"),
    apiKey: pick(process.env.OPENAI_API_KEY, providerConfig.openai?.apiKey, openAIKeyFromFile, ""),
    models: normalizeModels(providerConfig.openai?.models, ["gpt-4.1", "gpt-4.1-mini"]),
  },
  anthropic: {
    id: "anthropic",
    label: pick(providerConfig.anthropic?.label, "Claude API"),
    baseUrl: pick(process.env.ANTHROPIC_BASE_URL, providerConfig.anthropic?.baseUrl, "https://api.anthropic.com"),
    apiKey: pick(process.env.ANTHROPIC_API_KEY, providerConfig.anthropic?.apiKey, anthropicKeyFromFile, ""),
    version: pick(process.env.ANTHROPIC_API_VERSION, providerConfig.anthropic?.version, "2023-06-01"),
    models: normalizeModels(providerConfig.anthropic?.models, ["claude-sonnet-4-20250514", "claude-3-5-haiku-latest"]),
  },
};

const fallbackRoutes = {
  leader: normalizeRoute(
    fileConfig.routing?.routes?.leader,
    "ollama",
    pick(legacyOllamaModels.leader, defaultWriterModel)
  ),
  planner: normalizeRoute(
    fileConfig.routing?.routes?.planner,
    "ollama",
    pick(legacyOllamaModels.planner, defaultWriterModel)
  ),
  writer: normalizeRoute(
    fileConfig.routing?.routes?.writer,
    "ollama",
    pick(legacyOllamaModels.writer, defaultWriterModel)
  ),
  reviewer: normalizeRoute(
    fileConfig.routing?.routes?.reviewer,
    "ollama",
    pick(legacyOllamaModels.reviewer, defaultWriterModel)
  ),
};

module.exports = {
  port: readNumber(process.env.ATF_SERVER_PORT, readNumber(fileConfig.server?.port, 8787)),
  host: pick(process.env.ATF_SERVER_HOST, fileConfig.server?.host, "127.0.0.1"),
  providers,
  defaultRoutes: fallbackRoutes,
  dataDir: path.resolve(rootDir, pick(process.env.ATF_DATA_DIR, fileConfig.storage?.dataDir, ".atf-data")),
  rootDir,
};
