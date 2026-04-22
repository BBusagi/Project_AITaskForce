const { providers } = require("./config");

const ollamaBaseUrl = providers.ollama.baseUrl;

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
  return providers.ollama.models[0] || "";
}

async function generate(model, prompt) {
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

function flattenMessages(messages) {
  return messages
    .map((message) => {
      const role = message.role || "user";
      const content = message.content || "";
      return `${role.toUpperCase()}:\n${content}`;
    })
    .join("\n\n");
}

async function generateConversation(model, messages, instruction) {
  const prompt = [
    instruction,
    "",
    "Conversation history:",
    flattenMessages(messages),
    "",
    "Respond with the next assistant message only.",
  ].join("\n");

  return generate(model, prompt);
}

module.exports = {
  checkOllama,
  listModels,
  generate,
  generateConversation,
  resolveModel,
};
