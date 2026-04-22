const { ollamaBaseUrl, writerModel, plannerModel, reviewerModel, leaderModel } = require("./config");

const defaultModels = {
  writer: writerModel,
  planner: plannerModel || writerModel,
  reviewer: reviewerModel || writerModel,
  leader: leaderModel || writerModel,
};

const currentModels = { ...defaultModels };

async function postJson(path, body) {
  const response = await fetch(`${ollamaBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama request failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

async function checkOllama() {
  try {
    const response = await fetch(`${ollamaBaseUrl}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}

async function listModels() {
  const response = await fetch(`${ollamaBaseUrl}/api/tags`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama tags request failed (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  return (result.models || []).map((model) => ({
    name: model.name,
    size: model.size,
    modifiedAt: model.modified_at,
  }));
}

function resolveModel(role) {
  return currentModels[role] || currentModels.writer;
}

function getConfiguredModels() {
  return { ...currentModels };
}

function setRoleModel(role, model) {
  if (!currentModels[role]) {
    throw new Error(`Unsupported role model selection: ${role}`);
  }

  if (!model || typeof model !== "string") {
    throw new Error("Model name is required");
  }

  currentModels[role] = model;
  return getConfiguredModels();
}

async function generate(role, prompt) {
  const model = resolveModel(role);
  const payload = {
    model,
    prompt,
    stream: false,
    options: {
      temperature: 0.2,
    },
  };

  const result = await postJson("/api/generate", payload);
  return {
    provider: "ollama",
    model,
    text: (result.response || "").trim(),
  };
}

module.exports = {
  checkOllama,
  listModels,
  generate,
  resolveModel,
  getConfiguredModels,
  setRoleModel,
};
