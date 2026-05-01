const { providers } = require("./config");
const { request } = require("./http-client");

function getConfig() {
  return providers.openai;
}

function isConfigured() {
  return Boolean(getConfig().apiKey);
}

async function openaiRequest(path, options = {}) {
  const config = getConfig();
  if (!config.apiKey) {
    throw new Error("OpenAI API key is not configured");
  }

  const response = await request(`${config.baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

function isChatModel(modelId) {
  return /^(gpt|o[1-9]|chatgpt)/i.test(modelId);
}

async function listModels() {
  const result = await openaiRequest("/models", { method: "GET" });
  return (result.data || [])
    .map((model) => ({
      id: model.id,
      ownedBy: model.owned_by,
      created: model.created,
    }))
    .filter((model) => isChatModel(model.id))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function readOutputText(result) {
  if (typeof result.output_text === "string" && result.output_text.trim()) {
    return result.output_text.trim();
  }

  const chunks = [];
  for (const output of result.output || []) {
    for (const content of output.content || []) {
      if (content.type === "output_text" && content.text) {
        chunks.push(content.text);
      }
    }
  }

  return chunks.join("\n").trim();
}

function toInputMessage(message) {
  return {
    type: "message",
    role: message.role,
    content: [
      {
        type: "input_text",
        text: message.content,
      },
    ],
  };
}

function messagesToTranscript(messages) {
  return messages
    .map((message) => `${message.role === "assistant" ? "Assistant" : "User"}: ${message.content}`)
    .join("\n\n");
}

async function generate(model, prompt) {
  const result = await openaiRequest("/responses", {
    method: "POST",
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt,
            },
          ],
        },
      ],
    }),
  });

  return {
    provider: "openai",
    model,
    text: readOutputText(result),
  };
}

async function generateConversation(model, messages, instruction) {
  const result = await openaiRequest("/responses", {
    method: "POST",
    body: JSON.stringify({
      model,
      instructions: instruction,
      input: `${messagesToTranscript(messages)}\n\nAssistant:`,
    }),
  });

  return {
    provider: "openai",
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
