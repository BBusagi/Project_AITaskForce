const { randomUUID } = require("node:crypto");
const { getConfiguredRoutes } = require("./model-gateway");

const agentDefinitions = [
  {
    id: "leader",
    name: "Leader",
    role: "leader",
    description: "Receives tasks, orchestrates the workflow, and delivers the final response.",
    modelProvider: "ollama",
    modelName: "default",
  },
  {
    id: "planner",
    name: "Planner",
    role: "planner",
    description: "Breaks user requests into structured steps, constraints, and expected outputs.",
    modelProvider: "ollama",
    modelName: "default",
  },
  {
    id: "writer",
    name: "Writer",
    role: "writer",
    description: "Produces the first draft and structured task output.",
    modelProvider: "ollama",
    modelName: "default",
  },
  {
    id: "reviewer",
    name: "Reviewer",
    role: "reviewer",
    description: "Checks output quality, clarity, and instruction adherence.",
    modelProvider: "ollama",
    modelName: "default",
  },
];

const state = {
  tasks: new Map(),
  subtasks: new Map(),
  events: new Map(),
  messages: new Map(),
  taskRuns: new Map(),
  nextTaskNumber: 1,
};

function nowIso() {
  return new Date().toISOString();
}

function newTaskId() {
  return `task_${randomUUID().slice(0, 8)}`;
}

function newSubtaskId() {
  return `subtask_${randomUUID().slice(0, 8)}`;
}

function newMessageId() {
  return `msg_${randomUUID().slice(0, 8)}`;
}

function newEventId() {
  return `evt_${randomUUID().slice(0, 8)}`;
}

function getStatusOwner(status) {
  if (status === "planning") return "planner";
  if (status === "writing" || status === "revising") return "writer";
  if (status === "reviewing") return "reviewer";
  return "leader";
}

function createTask({ title, userInput, priority = "medium", createdBy = "user" }) {
  const timestamp = nowIso();
  const taskId = newTaskId();
  const taskNumber = state.nextTaskNumber;
  state.nextTaskNumber += 1;
  const task = {
    id: taskId,
    number: taskNumber,
    title: title?.trim() || `Task${String(taskNumber).padStart(3, "0")}`,
    userInput,
    status: "pending",
    priority,
    createdBy,
    assignedLeaderId: "leader",
    finalOutput: null,
    errorMessage: null,
    retryCount: 0,
    stageOwnerId: "leader",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  state.tasks.set(taskId, task);
  state.subtasks.set(taskId, []);
  state.events.set(taskId, []);
  state.messages.set(taskId, []);
  return task;
}

function updateTask(taskId, patch) {
  const task = state.tasks.get(taskId);
  if (!task) return null;
  Object.assign(task, patch, { updatedAt: nowIso() });
  if (patch.status) {
    task.stageOwnerId = patch.stageOwnerId || getStatusOwner(patch.status);
  }
  return task;
}

function addSubtask(taskId, data) {
  const subtask = {
    id: newSubtaskId(),
    taskId,
    type: data.type,
    assignedAgentId: data.assignedAgentId,
    inputText: data.inputText,
    outputText: data.outputText ?? null,
    reviewComment: data.reviewComment ?? null,
    status: data.status,
    sequence: state.subtasks.get(taskId).length + 1,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  state.subtasks.get(taskId).push(subtask);
  return subtask;
}

function addEvent(taskId, data) {
  const event = {
    id: newEventId(),
    taskId,
    subtaskId: data.subtaskId ?? null,
    actorType: data.actorType,
    actorId: data.actorId ?? null,
    eventType: data.eventType,
    message: data.message,
    metadata: data.metadata ?? {},
    createdAt: nowIso(),
  };

  state.events.get(taskId).push(event);
  return event;
}

function addMessage(taskId, data) {
  const message = {
    id: newMessageId(),
    taskId,
    senderType: data.senderType,
    senderId: data.senderId ?? null,
    content: data.content,
    createdAt: nowIso(),
  };

  state.messages.get(taskId).push(message);
  return message;
}

function getTask(taskId) {
  return state.tasks.get(taskId) || null;
}

function listTasks() {
  return [...state.tasks.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function getTaskSubtasks(taskId) {
  return state.subtasks.get(taskId) || [];
}

function getTaskEvents(taskId) {
  return state.events.get(taskId) || [];
}

function getTaskMessages(taskId) {
  return state.messages.get(taskId) || [];
}

function buildAgentsView() {
  const configuredRoutes = getConfiguredRoutes();

  return agentDefinitions.map((agent) => {
    const activeTask = [...state.tasks.values()].find((task) => task.stageOwnerId === agent.id && task.status !== "completed" && task.status !== "failed");
    const idleLikeStatus = agent.id === "writer" ? "waiting" : "idle";
    const route = configuredRoutes[agent.id];

    return {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      description: agent.description,
      modelProvider: route?.provider || agent.modelProvider,
      modelName: route?.model || agent.modelName,
      status: activeTask ? "working" : idleLikeStatus,
      currentTaskId: activeTask?.id ?? null,
      currentTaskTitle: activeTask?.title ?? null,
      createdAt: activeTask?.createdAt ?? null,
      updatedAt: activeTask?.updatedAt ?? null,
    };
  });
}

function buildSnapshot(taskId) {
  const task = getTask(taskId);
  if (!task) return null;

  return {
    task,
    subtasks: getTaskSubtasks(taskId),
    events: getTaskEvents(taskId),
    messages: getTaskMessages(taskId),
    agents: buildAgentsView(),
  };
}

module.exports = {
  state,
  agentDefinitions,
  createTask,
  updateTask,
  addSubtask,
  addEvent,
  addMessage,
  getTask,
  listTasks,
  getTaskSubtasks,
  getTaskEvents,
  getTaskMessages,
  buildAgentsView,
  buildSnapshot,
};
