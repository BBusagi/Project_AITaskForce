const { providers } = require("./config");

const ollamaBaseUrl = providers.ollama.baseUrl;
const ollamaRequestTimeoutMs = providers.ollama.requestTimeoutMs;

async function postJson(path, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ollamaRequestTimeoutMs);
  let response;

  try {
    response = await fetch(`${ollamaBaseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`Ollama request timed out after ${ollamaRequestTimeoutMs}ms: ${path}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

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

function normalizeChatMessages(messages, instruction) {
  const chatMessages = [
    {
      role: "system",
      content: instruction,
    },
  ];

  for (const message of messages) {
    const content = (message.content || "").trim();
    if (!content) continue;

    chatMessages.push({
      role: message.role === "assistant" ? "assistant" : "user",
      content,
    });
  }

  return chatMessages;
}

async function generateConversation(model, messages, instruction) {
  const payload = {
    model,
    messages: normalizeChatMessages(messages, instruction),
    stream: false,
    options: {
      temperature: 0.2,
    },
  };

  const result = await postJson("/api/chat", payload);
  return {
    provider: "ollama",
    model,
    text: (result.message?.content || result.response || "").trim(),
  };
}

module.exports = {
  checkOllama,
  listModels,
  generate,
  generateConversation,
  resolveModel,
};
