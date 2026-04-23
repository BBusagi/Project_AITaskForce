const STORE_SCHEMA_VERSION = 1;

const terminalTaskStatuses = new Set(["completed", "failed", "human_confirmation"]);

function isTerminalTaskStatus(status) {
  return terminalTaskStatuses.has(status);
}

function normalizeRestoredTask(task) {
  if (!task || typeof task !== "object") return null;

  const restored = {
    ...task,
    finalOutput: task.finalOutput ?? null,
    errorMessage: task.errorMessage ?? null,
    retryCount: Number.isFinite(Number(task.retryCount)) ? Number(task.retryCount) : 0,
    archivedAt: task.archivedAt ?? null,
  };

  if (!isTerminalTaskStatus(restored.status)) {
    restored.status = "failed";
    restored.stageOwnerId = "leader";
    restored.errorMessage = restored.errorMessage || "Server restarted before this task completed.";
  }

  return restored;
}

function validateStoreSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return {
      version: STORE_SCHEMA_VERSION,
      nextTaskNumber: 1,
      tasks: [],
      subtasks: {},
      events: {},
      messages: {},
    };
  }

  return {
    version: Number(snapshot.version) || STORE_SCHEMA_VERSION,
    nextTaskNumber: Math.max(1, Number(snapshot.nextTaskNumber) || 1),
    tasks: Array.isArray(snapshot.tasks) ? snapshot.tasks.map(normalizeRestoredTask).filter(Boolean) : [],
    subtasks: snapshot.subtasks && typeof snapshot.subtasks === "object" ? snapshot.subtasks : {},
    events: snapshot.events && typeof snapshot.events === "object" ? snapshot.events : {},
    messages: snapshot.messages && typeof snapshot.messages === "object" ? snapshot.messages : {},
  };
}

module.exports = {
  STORE_SCHEMA_VERSION,
  isTerminalTaskStatus,
  validateStoreSnapshot,
};
