const phases = ["pending", "planning", "writing", "reviewing", "completed"];

const state = {
  currentView: "chat",
  currentTask: {
    id: "task-001",
    title: "整理多 Agent 协同系统前端需求",
    description:
      "把需求文档整理为一个对话式桌面工作台，启动后主区域是与 Leader 的对话框，左侧有清晰的侧边栏，且可以切换 Team、Task、Chat 三个子页面。",
    phase: "planning",
    owner: "Planner",
    progress: 36,
    lastUpdate: "09:46",
  },
  agents: [
    {
      id: "leader",
      name: "Leader",
      duty: "任务接收、编排和最终答复",
      currentTask: "整理多 Agent 协同系统前端需求",
      status: "working",
      skills: ["routing", "planning-handoff", "final-response"],
    },
    {
      id: "planner",
      name: "Planner",
      duty: "把用户要求转成结构化执行步骤",
      currentTask: "定义侧边栏导航和视图切换",
      status: "working",
      skills: ["task-breakdown", "constraints", "output-schema"],
    },
    {
      id: "writer",
      name: "Writer",
      duty: "生成界面文案、草稿和展示内容",
      currentTask: "等待 Planner 输出",
      status: "waiting",
      skills: ["drafting", "rewrite", "formatting"],
    },
    {
      id: "reviewer",
      name: "Reviewer",
      duty: "检查结构清晰度和指令遵循情况",
      currentTask: "等待初稿",
      status: "idle",
      skills: ["quality-gate", "consistency", "instruction-check"],
    },
  ],
  messages: [
    {
      id: "msg-001",
      role: "leader",
      name: "Leader",
      time: "09:42",
      content:
        "欢迎进入 AI Task Force。默认首页是 Chat，对话始终由 Leader 接收。左侧侧边栏可以切换到 Team 和 Task 子页面。",
    },
    {
      id: "msg-002",
      role: "user",
      name: "User",
      time: "09:44",
      content:
        "我希望 Desktop 不是一个统一页面，而是有明确侧边栏，并且能切到 Team、Task、Chat 三个子页面。",
    },
    {
      id: "msg-003",
      role: "leader",
      name: "Leader",
      time: "09:46",
      content:
        "已收到。当前版本会改成桌面应用导航形态：左侧固定 sidebar，主区域按 Team / Task / Chat 切换。",
    },
  ],
};

let simulationTimer = null;

const navButtons = [...document.querySelectorAll(".nav-item")];
const viewPanels = [...document.querySelectorAll("[data-view-panel]")];
const dialogStreamEl = document.getElementById("dialog-stream");
const teamPanelEl = document.getElementById("team-panel");
const taskPanelEl = document.getElementById("task-panel");
const taskBannerEl = document.getElementById("task-banner");
const taskStatusBadgeEl = document.getElementById("task-status-badge");
const phaseStripEl = document.getElementById("phase-strip");
const leaderNoteEl = document.getElementById("leader-note");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const askStatusBtn = document.getElementById("ask-status");
const runtimeBadgeEl = document.getElementById("runtime-badge");
const quickButtons = [...document.querySelectorAll(".quick-btn")];
const sidebarTaskTitleEl = document.getElementById("sidebar-task-title");
const sidebarTaskPhaseEl = document.getElementById("sidebar-task-phase");
const sidebarTaskOwnerEl = document.getElementById("sidebar-task-owner");
const sidebarTaskNoteEl = document.getElementById("sidebar-task-note");

function formatPhase(phase) {
  const map = {
    pending: "Pending",
    planning: "Planning",
    writing: "Writing",
    reviewing: "Reviewing",
    completed: "Completed",
  };
  return map[phase] || phase;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function switchView(view) {
  state.currentView = view;
  navButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });
  viewPanels.forEach((panel) => {
    panel.classList.toggle("is-visible", panel.dataset.viewPanel === view);
  });
}

function pushMessage(role, name, content) {
  const now = new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  state.messages.push({
    id: `msg-${Date.now()}`,
    role,
    name,
    time: now,
    content,
  });
}

function buildTaskSummary() {
  const task = state.currentTask;
  const summaryMap = {
    pending: "任务已接收，Leader 正在准备把用户输入转成可执行的团队流程。",
    planning: "Planner 正在定义侧边栏导航、页面职责和切换关系。",
    writing: "Writer 正在根据 Planner 方案生成页面内容和交互文案。",
    reviewing: "Reviewer 正在检查结构是否满足侧边栏 + 三个子页面的要求。",
    completed: "当前任务已完成，可以继续提问或发布下一个任务。",
  };
  return summaryMap[task.phase];
}

function buildLeaderNote() {
  const task = state.currentTask;
  return `当前任务处于 ${formatPhase(task.phase)} 阶段，负责人是 ${task.owner}。现在 Desktop 采用明确的侧边栏导航，Team、Task、Chat 是三个独立子页面，默认打开 Chat。`;
}

function renderSidebarSummary() {
  const task = state.currentTask;
  sidebarTaskTitleEl.textContent = task.title;
  sidebarTaskPhaseEl.textContent = formatPhase(task.phase);
  sidebarTaskOwnerEl.textContent = task.owner;
  sidebarTaskNoteEl.textContent = buildTaskSummary();
}

function renderDialog() {
  dialogStreamEl.innerHTML = state.messages
    .map(
      (message) => `
        <article class="message-card ${escapeHtml(message.role)}">
          <div class="message-head">
            <span>${escapeHtml(message.name)}</span>
            <span>${escapeHtml(message.time)}</span>
          </div>
          <div class="message-body">${escapeHtml(message.content)}</div>
        </article>
      `
    )
    .join("");

  dialogStreamEl.scrollTop = dialogStreamEl.scrollHeight;
}

function renderTeam() {
  teamPanelEl.innerHTML = state.agents
    .map(
      (agent) => `
        <article class="agent-card">
          <div class="agent-top">
            <h4>${escapeHtml(agent.name)}</h4>
            <span class="state ${escapeHtml(agent.status)}">${escapeHtml(agent.status)}</span>
          </div>
          <p><strong>职责：</strong>${escapeHtml(agent.duty)}</p>
          <p><strong>当前任务：</strong>${escapeHtml(agent.currentTask)}</p>
          <div class="skill-list">
            ${agent.skills.map((skill) => `<span class="skill">${escapeHtml(skill)}</span>`).join("")}
          </div>
        </article>
      `
    )
    .join("");
}

function renderTask() {
  const task = state.currentTask;

  taskBannerEl.innerHTML = `
    <span>${escapeHtml(task.id)}</span>
    <strong>${escapeHtml(task.title)}</strong>
  `;
  taskStatusBadgeEl.textContent = formatPhase(task.phase);
  taskStatusBadgeEl.className = `tag ${task.phase === "completed" ? "accent" : ""}`;

  taskPanelEl.innerHTML = `
    <article class="task-card">
      <h4>${escapeHtml(task.title)}</h4>
      <p>${escapeHtml(task.description)}</p>
      <div class="task-meta">
        <span class="skill">当前阶段: ${escapeHtml(formatPhase(task.phase))}</span>
        <span class="skill">负责人: ${escapeHtml(task.owner)}</span>
        <span class="skill">更新时间: ${escapeHtml(task.lastUpdate)}</span>
      </div>
      <div class="progress-line">
        <div class="progress-value" style="width: ${task.progress}%"></div>
      </div>
      <div class="flow-list">
        ${phases
          .map((phase) => {
            const phaseIndex = phases.indexOf(phase);
            const currentIndex = phases.indexOf(task.phase);
            const className = phaseIndex <= currentIndex ? "flow-item active" : "flow-item";
            return `<span class="${className}">${escapeHtml(formatPhase(phase))}</span>`;
          })
          .join("")}
      </div>
    </article>
    <article class="mini-card">
      <p><strong>当前执行说明</strong></p>
      <p>${escapeHtml(buildTaskSummary())}</p>
    </article>
  `;

  phaseStripEl.innerHTML = phases
    .map((phase) => {
      const phaseIndex = phases.indexOf(phase);
      const currentIndex = phases.indexOf(task.phase);
      const className =
        phaseIndex < currentIndex
          ? "phase-chip done"
          : phaseIndex === currentIndex
            ? "phase-chip active"
            : "phase-chip";
      return `<span class="${className}">${escapeHtml(formatPhase(phase))}</span>`;
    })
    .join("");

  leaderNoteEl.textContent = buildLeaderNote();
}

function renderAll() {
  renderSidebarSummary();
  renderDialog();
  renderTeam();
  renderTask();
}

function setAgentStatusesByPhase(phase) {
  const config = {
    pending: {
      leader: ["working", "新任务待编排"],
      planner: ["idle", "等待任务"],
      writer: ["idle", "等待 Planner 输出"],
      reviewer: ["idle", "等待草稿"],
    },
    planning: {
      leader: ["working", state.currentTask.title],
      planner: ["working", "定义结构和约束"],
      writer: ["waiting", "等待 Planner 输出"],
      reviewer: ["idle", "等待初稿"],
    },
    writing: {
      leader: ["working", state.currentTask.title],
      planner: ["completed", "拆解完成"],
      writer: ["working", "生成页面内容"],
      reviewer: ["waiting", "等待 Writer 交付"],
    },
    reviewing: {
      leader: ["working", state.currentTask.title],
      planner: ["idle", "等待新任务"],
      writer: ["completed", "草稿已提交"],
      reviewer: ["reviewing", "检查结构和文案"],
    },
    completed: {
      leader: ["working", "准备接收下一任务"],
      planner: ["idle", "等待新任务"],
      writer: ["idle", "等待新任务"],
      reviewer: ["idle", "等待新任务"],
    },
  };

  state.agents.forEach((agent) => {
    const entry = config[phase][agent.id];
    if (!entry) return;
    agent.status = entry[0];
    agent.currentTask = entry[1];
  });
}

function runTaskLifecycle(userInput) {
  if (simulationTimer) {
    clearTimeout(simulationTimer);
  }

  state.currentTask = {
    id: `task-${String(Math.floor(Math.random() * 900) + 100)}`,
    title: userInput.length > 26 ? `${userInput.slice(0, 26)}...` : userInput,
    description: userInput,
    phase: "pending",
    owner: "Leader",
    progress: 8,
    lastUpdate: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
  };

  setAgentStatusesByPhase("pending");
  pushMessage("leader", "Leader", "任务已接入。当前会从 Chat 页面进入协作流，你也可以随时切到 Team 或 Task 页面查看状态。");
  renderAll();
  switchView("chat");

  const steps = [
    {
      delay: 1000,
      run() {
        state.currentTask.phase = "planning";
        state.currentTask.owner = "Planner";
        state.currentTask.progress = 32;
        state.currentTask.lastUpdate = new Date().toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        });
        setAgentStatusesByPhase("planning");
        pushMessage("leader", "Leader", "Planner 已开始工作，正在拆解任务目标、约束和输出格式。");
        renderAll();
      },
    },
    {
      delay: 1400,
      run() {
        state.currentTask.phase = "writing";
        state.currentTask.owner = "Writer";
        state.currentTask.progress = 68;
        state.currentTask.lastUpdate = new Date().toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        });
        setAgentStatusesByPhase("writing");
        pushMessage("leader", "Leader", "Planner 已完成拆解，Writer 正在生成页面内容和交互文案。");
        renderAll();
      },
    },
    {
      delay: 1400,
      run() {
        state.currentTask.phase = "reviewing";
        state.currentTask.owner = "Reviewer";
        state.currentTask.progress = 86;
        state.currentTask.lastUpdate = new Date().toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        });
        setAgentStatusesByPhase("reviewing");
        pushMessage("leader", "Leader", "Writer 草稿已提交，Reviewer 正在检查是否满足侧边栏和三子页面要求。");
        renderAll();
      },
    },
    {
      delay: 1400,
      run() {
        state.currentTask.phase = "completed";
        state.currentTask.owner = "Leader";
        state.currentTask.progress = 100;
        state.currentTask.lastUpdate = new Date().toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        });
        setAgentStatusesByPhase("completed");
        pushMessage("leader", "Leader", "当前任务已完成。现在你可以通过左侧 sidebar 在 Chat、Team、Task 三个页面之间切换。");
        renderAll();
      },
    },
  ];

  let index = 0;
  const advance = () => {
    if (index >= steps.length) return;
    const step = steps[index];
    simulationTimer = setTimeout(() => {
      step.run();
      index += 1;
      advance();
    }, step.delay);
  };

  advance();
}

function handleStatusQuestion() {
  pushMessage("user", "User", "现在任务到哪个阶段了？谁在处理？");
  pushMessage(
    "leader",
    "Leader",
    `当前任务处于 ${formatPhase(state.currentTask.phase)} 阶段，负责人是 ${state.currentTask.owner}。你可以切到 Task 页面看进度，也可以切到 Team 页面看全部 agent 状态。`
  );
  renderAll();
  switchView("chat");
}

function handleHandoffQuestion() {
  pushMessage("user", "User", "当前由谁负责？团队其他成员在做什么？");
  const activeAgents = state.agents
    .map((agent) => `${agent.name}: ${agent.status} / ${agent.currentTask}`)
    .join("；");
  pushMessage("leader", "Leader", `当前团队状态如下：${activeAgents}。`);
  renderAll();
  switchView("chat");
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = chatInput.value.trim();
  if (!value) return;
  pushMessage("user", "User", value);
  runTaskLifecycle(value);
  chatInput.value = "";
});

askStatusBtn.addEventListener("click", handleStatusQuestion);

quickButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const type = button.dataset.prompt;
    if (type === "status") {
      handleStatusQuestion();
      return;
    }
    if (type === "handoff") {
      handleHandoffQuestion();
      return;
    }
    if (type === "demo") {
      chatInput.value = "请把 Desktop 改成有明确 sidebar，并可切换 Team、Task、Chat 三个子页面。";
    }
  });
});

if (window.desktopBridge?.runtime) {
  runtimeBadgeEl.textContent = window.desktopBridge.runtime;
}

setAgentStatusesByPhase(state.currentTask.phase);
renderAll();
switchView(state.currentView);
