const webPhases = ["pending", "planning", "writing", "reviewing", "completed"];

const webState = {
  selectedTaskId: "task-001",
  agents: [
    {
      name: "Leader",
      role: "总控编排",
      status: "working",
      currentTask: "多 Agent 协作工作台 MVP",
      skills: ["routing", "synthesis", "task-control"],
    },
    {
      name: "Planner",
      role: "结构化拆解",
      status: "working",
      currentTask: "定义页面模块和任务流",
      skills: ["task-breakdown", "constraints", "output-schema"],
    },
    {
      name: "Writer",
      role: "内容起草",
      status: "waiting",
      currentTask: "等待 Planner 输出",
      skills: ["drafting", "rewrite", "formatting"],
    },
    {
      name: "Reviewer",
      role: "质量门禁",
      status: "idle",
      currentTask: "等待草稿",
      skills: ["quality-check", "clarity", "consistency"],
    },
  ],
  tasks: [
    {
      id: "task-001",
      title: "多 Agent 协作工作台 MVP",
      priority: "high",
      phase: "reviewing",
      thread: [
        { role: "user", name: "User", time: "09:12", text: "请整理多 Agent 协作系统的 MVP 前端结构。" },
        {
          role: "leader",
          name: "Leader",
          time: "09:14",
          text: "任务已收到。我会展示任务拆解、Agent 状态、执行时间线和历史记录。",
        },
      ],
      subtasks: [
        { title: "定义页面结构", owner: "Planner", status: "completed", text: "三栏布局，包含 Team、Workspace、Timeline。" },
        { title: "产出界面文案", owner: "Writer", status: "completed", text: "补齐 Hero、任务输入、Leader 对话流。" },
        { title: "检查 MVP 边界", owner: "Reviewer", status: "running", text: "确认不引入动态自治或复杂队列。" },
      ],
      timeline: [
        { label: "task_created", time: "09:12", text: "任务创建并分配给 Leader。" },
        { label: "planning_completed", time: "09:18", text: "Planner 完成结构化拆解。" },
        { label: "writing_completed", time: "09:24", text: "Writer 完成页面草稿。" },
        { label: "review_started", time: "09:27", text: "Reviewer 开始检查。" },
      ],
    },
    {
      id: "task-002",
      title: "会议纪要转行动项",
      priority: "medium",
      phase: "completed",
      thread: [
        { role: "user", name: "User", time: "08:24", text: "把会议纪要整理成负责人行动项清单。" },
        { role: "leader", name: "Leader", time: "08:33", text: "任务完成，最终结果已归档。" },
      ],
      subtasks: [
        { title: "抽取实体", owner: "Planner", status: "completed", text: "识别负责人和截止日期。" },
        { title: "生成清单", owner: "Writer", status: "completed", text: "输出行动项列表。" },
        { title: "结果审查", owner: "Reviewer", status: "completed", text: "结构通过。" },
      ],
      timeline: [
        { label: "task_created", time: "08:24", text: "任务进入系统。" },
        { label: "final_output_ready", time: "08:33", text: "Leader 完成交付。" },
      ],
    },
  ],
};

const webTeamListEl = document.getElementById("web-team-list");
const webMetricsEl = document.getElementById("web-metrics");
const webThreadEl = document.getElementById("web-thread");
const webSubtasksEl = document.getElementById("web-subtasks");
const webTaskNameEl = document.getElementById("web-task-name");
const webTaskPhaseEl = document.getElementById("web-task-phase");
const webStagesEl = document.getElementById("web-stages");
const webTimelineEl = document.getElementById("web-timeline");
const webHistoryEl = document.getElementById("web-history");
const webTaskForm = document.getElementById("web-task-form");
const webLoadDemoBtn = document.getElementById("web-load-demo");

function getWebTask() {
  return webState.tasks.find((task) => task.id === webState.selectedTaskId) || webState.tasks[0];
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatPhase(phase) {
  const map = {
    pending: "Pending",
    planning: "Planning",
    writing: "Writing",
    reviewing: "Reviewing",
    completed: "Completed",
    running: "Running",
  };
  return map[phase] || phase;
}

function badgeClass(status) {
  if (status === "completed" || status === "idle") return "badge ok";
  if (status === "working" || status === "running" || status === "reviewing") return "badge accent";
  return "badge warn";
}

function renderWebAgents() {
  webTeamListEl.innerHTML = webState.agents
    .map(
      (agent) => `
        <article class="agent-card">
          <div class="meta-row">
            <strong>${escapeHtml(agent.name)}</strong>
            <span class="${badgeClass(agent.status)}">${escapeHtml(agent.status)}</span>
          </div>
          <p>${escapeHtml(agent.role)}</p>
          <p>当前任务：${escapeHtml(agent.currentTask)}</p>
          <div class="skills">
            ${agent.skills.map((skill) => `<span class="skill">${escapeHtml(skill)}</span>`).join("")}
          </div>
        </article>
      `
    )
    .join("");
}

function renderWebMetrics() {
  const total = webState.tasks.length;
  const active = webState.tasks.filter((task) => task.phase !== "completed").length;
  const completed = webState.tasks.filter((task) => task.phase === "completed").length;

  webMetricsEl.innerHTML = [
    { label: "Total Tasks", value: total },
    { label: "Active Flow", value: active },
    { label: "Completed", value: completed },
  ]
    .map(
      (metric) => `
        <article class="metric-card">
          <span class="eyebrow">${escapeHtml(metric.label)}</span>
          <h3>${escapeHtml(String(metric.value))}</h3>
        </article>
      `
    )
    .join("");
}

function renderWebTask() {
  const task = getWebTask();
  webTaskNameEl.textContent = task.title;
  webTaskPhaseEl.textContent = formatPhase(task.phase);

  webThreadEl.innerHTML = task.thread
    .map(
      (message) => `
        <article class="message-card ${escapeHtml(message.role)}">
          <div class="message-head">
            <span>${escapeHtml(message.name)}</span>
            <span>${escapeHtml(message.time)}</span>
          </div>
          <p>${escapeHtml(message.text)}</p>
        </article>
      `
    )
    .join("");

  webSubtasksEl.innerHTML = task.subtasks
    .map(
      (subtask) => `
        <article class="subtask-card">
          <div class="meta-row">
            <strong>${escapeHtml(subtask.title)}</strong>
            <span class="${badgeClass(subtask.status)}">${escapeHtml(formatPhase(subtask.status))}</span>
          </div>
          <p>${escapeHtml(subtask.text)}</p>
          <div class="skills">
            <span class="skill">${escapeHtml(subtask.owner)}</span>
          </div>
        </article>
      `
    )
    .join("");

  webStagesEl.innerHTML = webPhases
    .map((phase) => {
      const active = webPhases.indexOf(phase) <= webPhases.indexOf(task.phase);
      return `<span class="stage-chip"${active ? ' style="background: rgba(98, 215, 255, 0.16); color: #a7edff;"' : ""}>${escapeHtml(formatPhase(phase))}</span>`;
    })
    .join("");

  webTimelineEl.innerHTML = task.timeline
    .map(
      (event) => `
        <article class="timeline-item">
          <div class="timeline-head">
            <span>${escapeHtml(event.label)}</span>
            <span>${escapeHtml(event.time)}</span>
          </div>
          <p>${escapeHtml(event.text)}</p>
        </article>
      `
    )
    .join("");
}

function renderWebHistory() {
  webHistoryEl.innerHTML = webState.tasks
    .map(
      (task) => `
        <article class="history-card" data-task-id="${escapeHtml(task.id)}">
          <div class="meta-row">
            <strong>${escapeHtml(task.title)}</strong>
            <span class="${badgeClass(task.phase)}">${escapeHtml(formatPhase(task.phase))}</span>
          </div>
          <p>${escapeHtml(task.id)} · ${escapeHtml(task.priority)}</p>
        </article>
      `
    )
    .join("");

  webHistoryEl.querySelectorAll("[data-task-id]").forEach((element) => {
    element.addEventListener("click", () => {
      webState.selectedTaskId = element.dataset.taskId;
      renderWebTask();
      renderWebHistory();
    });
  });
}

function syncAgentStates(task) {
  const phaseConfig = {
    pending: ["working", "working", "waiting", "idle"],
    planning: ["working", "working", "waiting", "idle"],
    writing: ["working", "completed", "working", "waiting"],
    reviewing: ["working", "completed", "completed", "working"],
    completed: ["working", "idle", "idle", "idle"],
  };
  const next = phaseConfig[task.phase];
  webState.agents[0].status = next[0];
  webState.agents[1].status = next[1];
  webState.agents[2].status = next[2];
  webState.agents[3].status = next[3];
}

function addWebTask(title, priority, input) {
  const id = `task-${String(webState.tasks.length + 1).padStart(3, "0")}`;
  const now = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

  const task = {
    id,
    title,
    priority,
    phase: "pending",
    thread: [
      { role: "user", name: "User", time: now, text: input },
      { role: "leader", name: "Leader", time: now, text: "任务已接收，正在启动固定协作流。" },
    ],
    subtasks: [],
    timeline: [{ label: "task_created", time: now, text: "任务刚刚创建。" }],
  };

  webState.tasks.unshift(task);
  webState.selectedTaskId = id;
  syncAgentStates(task);
  renderWebTask();
  renderWebHistory();
  renderWebAgents();
  renderWebMetrics();

  const steps = [
    () => {
      task.phase = "planning";
      task.subtasks = [{ title: "拆解任务", owner: "Planner", status: "running", text: "Planner 正在定义目标和约束。" }];
      task.thread.push({
        role: "leader",
        name: "Leader",
        time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
        text: "Planner 已接手，开始结构化拆解。",
      });
      task.timeline.push({
        label: "planning_started",
        time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
        text: "Planner 开始执行。",
      });
      syncAgentStates(task);
      renderWebTask();
      renderWebAgents();
      renderWebHistory();
    },
    () => {
      task.phase = "writing";
      task.subtasks[0].status = "completed";
      task.subtasks.push({ title: "生成初稿", owner: "Writer", status: "running", text: "Writer 正在生成可展示结果。" });
      task.timeline.push({
        label: "writing_started",
        time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
        text: "Writer 开始起草。",
      });
      syncAgentStates(task);
      renderWebTask();
      renderWebAgents();
      renderWebHistory();
    },
    () => {
      task.phase = "reviewing";
      task.subtasks[1].status = "completed";
      task.subtasks.push({ title: "质量检查", owner: "Reviewer", status: "running", text: "Reviewer 正在检查结构完整性。" });
      task.timeline.push({
        label: "review_started",
        time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
        text: "Reviewer 进入审核。",
      });
      syncAgentStates(task);
      renderWebTask();
      renderWebAgents();
      renderWebHistory();
    },
    () => {
      task.phase = "completed";
      task.subtasks[2].status = "completed";
      task.thread.push({
        role: "leader",
        name: "Leader",
        time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
        text: "任务完成，结果已归档到历史列表。",
      });
      task.timeline.push({
        label: "final_output_ready",
        time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
        text: "Leader 生成最终结果。",
      });
      syncAgentStates(task);
      renderWebTask();
      renderWebAgents();
      renderWebHistory();
      renderWebMetrics();
    },
  ];

  let index = 0;
  const stepForward = () => {
    if (index >= steps.length) return;
    setTimeout(() => {
      steps[index]();
      index += 1;
      stepForward();
    }, 1200);
  };

  stepForward();
}

webTaskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = document.getElementById("web-task-title").value.trim();
  const priority = document.getElementById("web-task-priority").value;
  const input = document.getElementById("web-task-input").value.trim();
  if (!title || !input) return;
  addWebTask(title, priority, input);
  webTaskForm.reset();
});

webLoadDemoBtn.addEventListener("click", () => {
  document.getElementById("web-task-title").value = "将需求文档整理成协作工作台方案";
  document.getElementById("web-task-priority").value = "high";
  document.getElementById("web-task-input").value =
    "请为多 Agent 协作系统设计一个前端 Web MVP，要求体现任务输入、Agent 状态、阶段流转、时间线和历史任务。";
});

renderWebAgents();
renderWebMetrics();
renderWebTask();
renderWebHistory();
