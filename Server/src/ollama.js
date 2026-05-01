const { providers } = require("./config");
const http = require("node:http");
const https = require("node:https");
const { request } = require("./http-client");

const ollamaBaseUrl = providers.ollama.baseUrl;
const ollamaRequestTimeoutMs = providers.ollama.requestTimeoutMs;

async function postJson(path, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ollamaRequestTimeoutMs);
  let response;

  try {
    response = await request(`${ollamaBaseUrl}${path}`, {
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

function postJsonStream(path, body, onProgress) {
  return new Promise((resolve, reject) => {
    const target = new URL(`${ollamaBaseUrl}${path}`);
    const transport = target.protocol === "https:" ? https : http;
    const startedAt = Date.now();
    let text = "";
    let thinking = "";
    let buffered = "";
    let settled = false;
    let streamRequest;

    const timeout = setTimeout(() => {
      streamRequest?.destroy(Object.assign(new Error(`Ollama request timed out after ${ollamaRequestTimeoutMs}ms: ${path}`), { name: "AbortError" }));
    }, ollamaRequestTimeoutMs);

    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback(value);
    };

    const handleLine = (line) => {
      if (!line.trim()) return;
      const chunk = JSON.parse(line);
      text += chunk.response || chunk.message?.content || "";
      thinking += chunk.thinking || chunk.message?.thinking || "";
      if (onProgress) {
        onProgress({
          text,
          thinking,
          done: Boolean(chunk.done),
          durationMs: Date.now() - startedAt,
        });
      }
      if (chunk.done) {
        finish(resolve, {
          response: text,
          thinking,
          raw: chunk,
        });
      }
    };

    streamRequest = transport.request(
      target,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
      (response) => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          const chunks = [];
          response.on("data", (chunk) => chunks.push(chunk));
          response.on("end", () => {
            finish(reject, new Error(`Ollama request failed (${response.statusCode}): ${Buffer.concat(chunks).toString("utf8")}`));
          });
          return;
        }

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          buffered += chunk;
          const lines = buffered.split(/\r?\n/);
          buffered = lines.pop() || "";
          try {
            lines.forEach(handleLine);
          } catch (error) {
            finish(reject, error);
          }
        });
        response.on("end", () => {
          try {
            if (buffered.trim()) handleLine(buffered);
            finish(resolve, { response: text, thinking });
          } catch (error) {
            finish(reject, error);
          }
        });
      }
    );

    streamRequest.on("error", (error) => {
      if (error.name === "AbortError" || /timed out/i.test(error.message)) {
        finish(reject, new Error(`Ollama request timed out after ${ollamaRequestTimeoutMs}ms: ${path}`));
        return;
      }
      finish(reject, error);
    });

    streamRequest.write(JSON.stringify(body));
    streamRequest.end();
  });
}

async function checkOllama() {
  try {
    const response = await request(`${ollamaBaseUrl}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}

async function listModels() {
  const response = await request(`${ollamaBaseUrl}/api/tags`);
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

async function generate(model, prompt, options = {}) {
  const payload = {
    model,
    prompt,
    stream: true,
    options: {
      temperature: 0.2,
      num_predict: options.numPredict || 1200,
    },
  };

  const result = await postJsonStream("/api/generate", payload, options.onProgress);
  return {
    provider: "ollama",
    model,
    text: (result.response || "").trim(),
    thinking: (result.thinking || "").trim(),
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
    thinking: (result.message?.thinking || result.thinking || "").trim(),
  };
}

module.exports = {
  checkOllama,
  listModels,
  generate,
  generateConversation,
  resolveModel,
};
