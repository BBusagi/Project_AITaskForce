const { providers } = require("./config");
const { request } = require("./http-client");

function getConfig() {
  return providers.anthropic;
}

function isConfigured() {
  return Boolean(getConfig().apiKey);
}

async function anthropicRequest(path, options = {}) {
  const config = getConfig();
  if (!config.apiKey) {
    throw new Error("Anthropic API key is not configured");
  }

  const response = await request(`${config.baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": config.version,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic request failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

async function listModels() {
  const result = await anthropicRequest("/v1/models", { method: "GET" });
  return (result.data || [])
    .map((model) => ({
      id: model.id,
      displayName: model.display_name,
      createdAt: model.created_at,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function readOutputText(result) {
  return (result.content || [])
    .filter((entry) => entry.type === "text" && entry.text)
    .map((entry) => entry.text)
    .join("\n")
    .trim();
}

function toAnthropicMessages(messages) {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.content,
  }));
}

async function generate(model, prompt) {
  const result = await anthropicRequest("/v1/messages", {
    method: "POST",
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  return {
    provider: "anthropic",
    model,
    text: readOutputText(result),
  };
}

async function generateConversation(model, messages, instruction) {
  const result = await anthropicRequest("/v1/messages", {
    method: "POST",
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: instruction,
      messages: toAnthropicMessages(messages),
    }),
  });

  return {
    provider: "anthropic",
    model,
    text: readOutputText(result),
  };
}

module.exports = {
  isConfigured,
  listModels,
  generate,
  generateConversation,
};
