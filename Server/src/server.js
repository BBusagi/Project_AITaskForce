const http = require("node:http");
const { URL } = require("node:url");
const { host, port, providers } = require("./config");
const { createAndStartTask, retryFailedStep } = require("./orchestrator");
const {
  state,
  getTask,
  listTasks,
  archiveTask,
  deleteTask,
  getTaskSubtasks,
  getTaskEvents,
  getTaskMessages,
  buildAgentsView,
  buildSnapshot,
  buildTeamTimeline,
} = require("./store");
const {
  buildRouteId,
  getProviderHealth,
  getRuntimeCatalog,
  resolveRoute,
  setRoleRoute,
  setRouteEnabled,
  generateConversation,
} = require("./model-gateway");

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload));
}

function notFound(res) {
  sendJson(res, 404, { error: "Not found" });
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function toTaskSummary(task) {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    stageOwnerId: task.stageOwnerId,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

function compactLogText(value, maxLength = 360) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    notFound(res);
    return;
  }

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || `${host}:${port}`}`);
  const { pathname } = url;

  try {
    if (req.method === "GET" && pathname === "/api/health") {
      const providerStates = await getProviderHealth();
      sendJson(res, 200, {
        status: "ok",
        service: "ai-task-force-server",
        providers: providerStates,
        ollama: {
          baseUrl: providers.ollama.baseUrl,
          available: providerStates.ollama?.available || false,
        },
      });
      return;
    }

    if (req.method === "GET" && pathname === "/api/models") {
      const runtimeCatalog = await getRuntimeCatalog();
      sendJson(res, 200, {
        providers: runtimeCatalog.providers,
        routes: runtimeCatalog.routes,
        models: runtimeCatalog.models,
        allModels: runtimeCatalog.allModels,
        defaultRouteId: runtimeCatalog.defaultRouteId,
        enabledRouteIds: runtimeCatalog.enabledRouteIds,
      });
      return;
    }

    if (req.method === "POST" && pathname === "/api/models") {
      const body = await readJsonBody(req);
      if (body.routeId && typeof body.enabled === "boolean" && !body.role) {
        setRouteEnabled(body.routeId, body.enabled);
        const runtimeCatalog = await getRuntimeCatalog();

        sendJson(res, 200, {
          providers: runtimeCatalog.providers,
          routes: runtimeCatalog.routes,
          models: runtimeCatalog.models,
          allModels: runtimeCatalog.allModels,
          defaultRouteId: runtimeCatalog.defaultRouteId,
          enabledRouteIds: runtimeCatalog.enabledRouteIds,
        });
        return;
      }

      if (!body.role || (!body.routeId && !body.model)) {
        sendJson(res, 400, { error: "role and routeId are required" });
        return;
      }

      const routeId =
        body.routeId ||
        (typeof body.model === "string" && body.model.includes("::")
          ? body.model
          : buildRouteId(body.provider || "ollama", body.model));
      setRoleRoute(body.role, routeId);
      const runtimeCatalog = await getRuntimeCatalog();

      sendJson(res, 200, {
        providers: runtimeCatalog.providers,
        routes: runtimeCatalog.routes,
        models: runtimeCatalog.models,
        allModels: runtimeCatalog.allModels,
        defaultRouteId: runtimeCatalog.defaultRouteId,
        enabledRouteIds: runtimeCatalog.enabledRouteIds,
      });
      return;
    }

    if (req.method === "POST" && pathname === "/api/chat") {
      const body = await readJsonBody(req);
      if (!body.role || !Array.isArray(body.messages) || body.messages.length === 0) {
        sendJson(res, 400, { error: "role and messages are required" });
        return;
      }

      const normalizedMessages = body.messages
        .map((message) => ({
          role: message.role === "assistant" ? "assistant" : "user",
          content: typeof message.content === "string" ? message.content.trim() : "",
        }))
        .filter((message) => message.content);

      if (normalizedMessages.length === 0) {
        sendJson(res, 400, { error: "messages must contain text content" });
        return;
      }

      const route = resolveRoute(body.role);
      const latestUserMessage = [...normalizedMessages].reverse().find((message) => message.role === "user");
      console.log(
        `CHAT REQUEST role=${body.role} provider=${route.provider} model=${route.model} user=${JSON.stringify(compactLogText(latestUserMessage?.content))}`
      );

      try {
        const result = await generateConversation(body.role, normalizedMessages);
        console.log(
          `CHAT RESPONSE role=${body.role} provider=${result.provider} model=${result.model} text=${JSON.stringify(compactLogText(result.text))}`
        );
        sendJson(res, 200, result);
      } catch (error) {
        console.error(
          `CHAT ERROR role=${body.role} provider=${route.provider} model=${route.model} error=${JSON.stringify(compactLogText(error.message))}`
        );
        sendJson(res, 500, {
          error: error.message,
          provider: route.provider,
          model: route.model,
        });
      }
      return;
    }

    if (req.method === "GET" && pathname === "/api/agents") {
      sendJson(res, 200, buildAgentsView());
      return;
    }

    if (req.method === "GET" && pathname === "/api/tasks") {
      sendJson(res, 200, listTasks().map(toTaskSummary));
      return;
    }

    if (req.method === "GET" && pathname === "/api/timeline") {
      sendJson(res, 200, buildTeamTimeline());
      return;
    }

    if (req.method === "POST" && pathname === "/api/tasks") {
      const body = await readJsonBody(req);
      if (!body.userInput || typeof body.userInput !== "string") {
        sendJson(res, 400, { error: "userInput is required" });
        return;
      }

      const task = createAndStartTask(body);
      sendJson(res, 201, {
        taskId: task.id,
        title: task.title,
        status: task.status,
      });
      return;
    }

    const taskRetryMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/retry$/);
    if (req.method === "POST" && taskRetryMatch) {
      const sourceTask = getTask(taskRetryMatch[1]);
      if (!sourceTask) {
        notFound(res);
        return;
      }

      if (!["failed", "human_confirmation"].includes(sourceTask.status)) {
        sendJson(res, 409, { error: "Only failed or human-confirmation tasks can be retried" });
        return;
      }

      const task = createAndStartTask({
        title: undefined,
        userInput: sourceTask.userInput,
        priority: sourceTask.priority,
      });
      console.log(`TASK RETRY source=${sourceTask.id} next=${task.id} title=${JSON.stringify(task.title)}`);
      sendJson(res, 201, {
        taskId: task.id,
        title: task.title,
        status: task.status,
        retryOf: sourceTask.id,
      });
      return;
    }

    const taskRetryStepMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/retry-step$/);
    if (req.method === "POST" && taskRetryStepMatch) {
      const task = getTask(taskRetryStepMatch[1]);
      if (!task) {
        notFound(res);
        return;
      }

      retryFailedStep(task.id);
      sendJson(res, 202, {
        taskId: task.id,
        title: task.title,
        status: task.status,
      });
      return;
    }

    const taskArchiveMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/archive$/);
    if (req.method === "POST" && taskArchiveMatch) {
      if (state.taskRuns.get(taskArchiveMatch[1])) {
        sendJson(res, 409, { error: "Cannot archive a running task" });
        return;
      }

      const task = archiveTask(taskArchiveMatch[1]);
      if (!task) {
        notFound(res);
        return;
      }

      console.log(`TASK ARCHIVE task=${task.id} title=${JSON.stringify(task.title)}`);
      sendJson(res, 200, {
        taskId: task.id,
        archivedAt: task.archivedAt,
      });
      return;
    }

    const taskDeleteMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/);
    if (req.method === "DELETE" && taskDeleteMatch) {
      if (state.taskRuns.get(taskDeleteMatch[1])) {
        sendJson(res, 409, { error: "Cannot delete a running task" });
        return;
      }

      const deleted = deleteTask(taskDeleteMatch[1]);
      if (!deleted) {
        notFound(res);
        return;
      }

      console.log(`TASK DELETE task=${taskDeleteMatch[1]}`);
      sendJson(res, 200, {
        taskId: taskDeleteMatch[1],
        deleted: true,
      });
      return;
    }

    const taskDetailMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/);
    if (req.method === "GET" && taskDetailMatch) {
      const task = getTask(taskDetailMatch[1]);
      if (!task) {
        notFound(res);
        return;
      }

      sendJson(res, 200, {
        task,
        subtasks: getTaskSubtasks(task.id),
      });
      return;
    }

    const taskEventsMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/events$/);
    if (req.method === "GET" && taskEventsMatch) {
      const task = getTask(taskEventsMatch[1]);
      if (!task) {
        notFound(res);
        return;
      }

      sendJson(res, 200, getTaskEvents(task.id));
      return;
    }

    const taskMessagesMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/messages$/);
    if (req.method === "GET" && taskMessagesMatch) {
      const task = getTask(taskMessagesMatch[1]);
      if (!task) {
        notFound(res);
        return;
      }

      sendJson(res, 200, getTaskMessages(task.id));
      return;
    }

    const taskSnapshotMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/snapshot$/);
    if (req.method === "GET" && taskSnapshotMatch) {
      const snapshot = buildSnapshot(taskSnapshotMatch[1]);
      if (!snapshot) {
        notFound(res);
        return;
      }

      sendJson(res, 200, snapshot);
      return;
    }

    notFound(res);
  } catch (error) {
    sendJson(res, 500, {
      error: error.message,
    });
  }
});

if (require.main === module) {
  server.listen(port, host, () => {
    console.log(`ATF server listening at http://${host}:${port}`);
  });
}

module.exports = {
  server,
};
