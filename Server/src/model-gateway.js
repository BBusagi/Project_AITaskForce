const { providers, defaultRoutes } = require("./config");
const { checkOllama, listModels: listOllamaModels, generate: generateWithOllama, generateConversation: generateOllamaConversation } = require("./ollama");
const {
  isConfigured: isOpenAIConfigured,
  listModels: listOpenAIModels,
  generate: generateWithOpenAI,
  generateConversation: generateOpenAIConversation,
} = require("./openai");
const {
  isConfigured: isAnthropicConfigured,
  listModels: listAnthropicModels,
  generate: generateWithAnthropic,
  generateConversation: generateAnthropicConversation,
} = require("./anthropic");

const roleIds = ["leader", "planner", "writer", "reviewer"];
const DEFAULT_ROUTE_ID = "openai::gpt-5.4-2026-03-05";
const currentRoutes = Object.fromEntries(
  roleIds.map((roleId) => {
    const route = defaultRoutes[roleId] || defaultRoutes.writer;
    return [roleId, buildRoute(route.provider, route.model)];
  })
);
const enabledRouteIds = new Set([DEFAULT_ROUTE_ID, ...Object.values(currentRoutes).map((route) => route.id)]);

const providerOrder = ["openai", "anthropic", "ollama"];

function getProviderLabel(providerId) {
  return providers[providerId]?.label || providerId;
}

function buildRouteId(provider, model) {
  return `${provider}::${model}`;
}

function parseRouteId(routeId) {
  if (!routeId || typeof routeId !== "string") {
    throw new Error("routeId is required");
  }

  const delimiterIndex = routeId.indexOf("::");
  if (delimiterIndex < 0) {
    throw new Error(`Invalid routeId: ${routeId}`);
  }

  return {
    provider: routeId.slice(0, delimiterIndex),
    model: routeId.slice(delimiterIndex + 2),
  };
}

function buildRoute(provider, model) {
  return {
    id: buildRouteId(provider, model),
    provider,
    model,
    label: `${getProviderLabel(provider)} · ${model}`,
  };
}

function isProviderConfigured(providerId) {
  if (providerId === "ollama") return true;
  if (providerId === "openai") return isOpenAIConfigured();
  if (providerId === "anthropic") return isAnthropicConfigured();
  return false;
}

async function loadOllamaCatalog() {
  const configuredModels = (providers.ollama.models || []).map((model) => ({
    name: model,
    source: "config",
  }));

  try {
    const liveModels = await listOllamaModels();
    return {
      provider: {
        id: "ollama",
        label: getProviderLabel("ollama"),
        configured: true,
        available: true,
      },
      models: [...configuredModels, ...liveModels.map((model) => ({ name: model.name, source: "live" }))],
    };
  } catch {
    return {
      provider: {
        id: "ollama",
        label: getProviderLabel("ollama"),
        configured: true,
        available: await checkOllama().catch(() => false),
      },
      models: configuredModels,
    };
  }
}

async function loadOpenAICatalog() {
  const configured = isOpenAIConfigured();
  const configuredModels = (providers.openai.models || []).map((model) => ({
    name: model,
    source: "config",
  }));

  if (!configured) {
    return {
      provider: {
        id: "openai",
        label: getProviderLabel("openai"),
        configured: false,
        available: false,
      },
      models: configuredModels,
    };
  }

  try {
    const liveModels = await listOpenAIModels();
    return {
      provider: {
        id: "openai",
        label: getProviderLabel("openai"),
        configured: true,
        available: true,
      },
      models: [...configuredModels, ...liveModels.map((model) => ({ name: model.id, source: "live" }))],
    };
  } catch {
    return {
      provider: {
        id: "openai",
        label: getProviderLabel("openai"),
        configured: true,
        available: false,
      },
      models: configuredModels,
    };
  }
}

async function loadAnthropicCatalog() {
  const configured = isAnthropicConfigured();
  const configuredModels = (providers.anthropic.models || []).map((model) => ({
    name: model,
    source: "config",
  }));

  if (!configured) {
    return {
      provider: {
        id: "anthropic",
        label: getProviderLabel("anthropic"),
        configured: false,
        available: false,
      },
      models: configuredModels,
    };
  }

  try {
    const liveModels = await listAnthropicModels();
    return {
      provider: {
        id: "anthropic",
        label: getProviderLabel("anthropic"),
        configured: true,
        available: true,
      },
      models: [...configuredModels, ...liveModels.map((model) => ({ name: model.id, source: "live" }))],
    };
  } catch {
    return {
      provider: {
        id: "anthropic",
        label: getProviderLabel("anthropic"),
        configured: true,
        available: false,
      },
      models: configuredModels,
    };
  }
}

function dedupeModels(entries) {
  const seen = new Set();
  const results = [];

  for (const entry of entries) {
    const routeId = buildRouteId(entry.provider, entry.name);
    if (seen.has(routeId)) continue;
    seen.add(routeId);
    results.push({
      id: routeId,
      provider: entry.provider,
      name: entry.name,
      label: `${getProviderLabel(entry.provider)} · ${entry.name}`,
    });
  }

  return results.sort((left, right) => {
    const providerCompare = providerOrder.indexOf(left.provider) - providerOrder.indexOf(right.provider);
    if (providerCompare !== 0) return providerCompare;
    return left.name.localeCompare(right.name);
  });
}

async function getRuntimeCatalog() {
  const catalogs = await Promise.all([loadOpenAICatalog(), loadAnthropicCatalog(), loadOllamaCatalog()]);
  const providerStates = Object.fromEntries(catalogs.map((catalog) => [catalog.provider.id, catalog.provider]));
  const allModels = dedupeModels(
    catalogs.flatMap((catalog) => catalog.models.map((model) => ({ provider: catalog.provider.id, name: model.name })))
  );
  const models = allModels.filter((model) => enabledRouteIds.has(model.id));

  return {
    providers: providerStates,
    models,
    allModels,
    defaultRouteId: DEFAULT_ROUTE_ID,
    enabledRouteIds: getEnabledRouteIds(),
    routes: getConfiguredRoutes(),
  };
}

function getConfiguredRoutes() {
  return Object.fromEntries(roleIds.map((roleId) => [roleId, currentRoutes[roleId]]));
}

function resolveRoute(role) {
  return currentRoutes[role] || currentRoutes.writer;
}

function getEnabledRouteIds() {
  return [...enabledRouteIds];
}

function setRouteEnabled(routeId, enabled) {
  const { provider, model } = parseRouteId(routeId);
  if (!providers[provider]) {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  const normalizedRouteId = buildRouteId(provider, model);
  if (enabled) {
    enabledRouteIds.add(normalizedRouteId);
  } else {
    enabledRouteIds.delete(normalizedRouteId);
  }

  return getEnabledRouteIds();
}

function setRoleRoute(role, routeId) {
  if (!roleIds.includes(role)) {
    throw new Error(`Unsupported role model selection: ${role}`);
  }

  const { provider, model } = parseRouteId(routeId);
  if (!providers[provider]) {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  if (!model) {
    throw new Error("Model name is required");
  }

  currentRoutes[role] = buildRoute(provider, model);
  return getConfiguredRoutes();
}

async function getProviderHealth() {
  const catalog = await getRuntimeCatalog();
  return catalog.providers;
}

async function generate(role, prompt, options = {}) {
  const route = resolveRoute(role);

  if (route.provider === "ollama") {
    return generateWithOllama(route.model, prompt, options);
  }

  if (route.provider === "openai") {
    return generateWithOpenAI(route.model, prompt);
  }

  if (route.provider === "anthropic") {
    return generateWithAnthropic(route.model, prompt);
  }

  throw new Error(`Unsupported provider route: ${route.provider}`);
}

function getRouteProviderLabel(route) {
  return getProviderLabel(route.provider);
}

function buildConversationInstruction(role, route) {
  const baseInstruction = [
    `You are the ${role} agent in AI Task Force, a product role for this workspace.`,
    `Your current runtime route is ${getRouteProviderLabel(route)} using model ${route.model}.`,
    "Keep your product role and runtime model identity separate: when identity, model, provider, runtime, or capability questions come up in any language, answer with both the AI Task Force agent role and the current provider/model route.",
    "Do not claim billing, quota, API, or provider failures unless the current request actually failed and the application surfaced that error.",
    "Reply as a helpful teammate in a direct chat thread.",
    "Keep responses concise, practical, and grounded in the current conversation.",
    "If the user corrects, narrows, or replaces an earlier request, treat the latest correction as authoritative and discard conflicting earlier assumptions.",
  ];

  if (role === "leader") {
    baseInstruction.push(
      "The application separates normal conversation from task creation with an explicit Task Creation button.",
      "In normal Leader chat, answer conversationally and help the user clarify scope when they ask.",
      "Do not claim that a task has been published unless the application explicitly confirms publication."
    );
  }

  return baseInstruction.join(" ");
}

async function generateConversation(role, messages) {
  const route = resolveRoute(role);
  const instruction = buildConversationInstruction(role, route);

  if (route.provider === "ollama") {
    return generateOllamaConversation(route.model, messages, instruction);
  }

  if (route.provider === "openai") {
    return generateOpenAIConversation(route.model, messages, instruction);
  }

  if (route.provider === "anthropic") {
    return generateAnthropicConversation(route.model, messages, instruction);
  }

  throw new Error(`Unsupported provider route: ${route.provider}`);
}

module.exports = {
  buildRouteId,
  DEFAULT_ROUTE_ID,
  getProviderHealth,
  getRuntimeCatalog,
  getConfiguredRoutes,
  getEnabledRouteIds,
  resolveRoute,
  setRouteEnabled,
  setRoleRoute,
  generate,
  generateConversation,
};
