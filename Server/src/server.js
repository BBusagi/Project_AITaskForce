const http = require("node:http");
const { URL } = require("node:url");
const { host, port, providers } = require("./config");
const { createAndStartTask } = require("./orchestrator");
const {
  getTask,
  listTasks,
  getTaskSubtasks,
  getTaskEvents,
  getTaskMessages,
  buildAgentsView,
  buildSnapshot,
} = require("./store");
const { buildRouteId, getProviderHealth, getRuntimeCatalog, setRoleRoute, setRouteEnabled } = require("./model-gateway");

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
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
        enabledRouteIds: runtimeCatalog.enabledRouteIds,
      });
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

    if (req.method === "POST" && pathname === "/api/tasks") {
      const body = await readJsonBody(req);
      if (!body.userInput || typeof body.userInput !== "string") {
        sendJson(res, 400, { error: "userInput is required" });
        return;
      }

      const task = createAndStartTask(body);
      sendJson(res, 201, {
        taskId: task.id,
        status: task.status,
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
