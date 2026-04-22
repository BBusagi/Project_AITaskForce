const phases = ["pending", "planning", "writing", "reviewing", "completed"];

const workspaceMeta = {
  chat: {
    title: "Chat",
    groups: [
      {
        label: "Threads",
        items: [
          { id: "thread", label: "Leader Thread", meta: "Live" },
          { id: "checkins", label: "Check-ins", meta: "2" },
        ],
      },
      {
        label: "Actions",
        items: [{ id: "compose", label: "Compose", meta: "+" }],
      },
    ],
  },
  team: {
    title: "Team",
    groups: [
      {
        label: "Views",
        items: [{ id: "overview", label: "Overview", meta: "4" }],
      },
      {
        label: "Agents",
        items: [
          { id: "leader", label: "Leader", meta: "On" },
          { id: "planner", label: "Planner", meta: "On" },
          { id: "writer", label: "Writer", meta: "Wait" },
          { id: "reviewer", label: "Reviewer", meta: "Idle" },
        ],
      },
    ],
  },
  task: {
    title: "Task",
    groups: [
      {
        label: "Current",
        items: [
          { id: "overview", label: "Overview", meta: "Now" },
          { id: "stages", label: "Stage Flow", meta: "5" },
          { id: "timeline", label: "Timeline", meta: "Log" },
        ],
      },
    ],
  },
  settings: {
    title: "Settings",
    groups: [
      {
        label: "Appearance",
        items: [{ id: "theme", label: "Theme", meta: "3" }],
      },
    ],
  },
};

const state = {
  activeWorkspace: "chat",
  activeEntry: {
    chat: "thread",
    team: "overview",
    task: "overview",
    settings: "theme",
  },
  sidebarCollapsed: false,
  theme: "default",
  currentTask: {
    id: "task-001",
    title: "重构 Desktop 为 VS Code / Slack 式三层侧栏",
    description:
      "将 Desktop 改成最左侧 icon rail 切换 workspace，中间栏改为资源树式目录，右侧显示选中条目的完整内容，并允许再次点击当前 icon 收起中栏。",
    phase: "planning",
    owner: "Planner",
    progress: 36,
    lastUpdate: "09:46",
  },
  agents: [
    {
      id: "leader",
      name: "Leader",
      duty: "任务接收、编排调度和最终答复",
      currentTask: "重构 Desktop 为 VS Code / Slack 式三层侧栏",
      status: "working",
      skills: ["routing", "planning-handoff", "final-response"],
    },
    {
      id: "planner",
      name: "Planner",
      duty: "把用户要求转换成结构化执行步骤",
      currentTask: "收紧 shell 和资源树结构",
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
      content: "欢迎进入 AI Task Force。左侧 rail 切 workspace，中栏像频道栏，右侧显示完整内容。",
    },
    {
      id: "msg-002",
      role: "user",
      name: "User",
      time: "09:44",
      content: "我需要像 VS Code 或 Slack 那样，左侧点 icon 打开中栏，再从中栏选中具体工作区内容。",
    },
    {
      id: "msg-003",
      role: "leader",
      name: "Leader",
      time: "09:46",
      content: "已收到。当前版本会继续收紧 icon、标签和中栏层级，去掉多余说明文字。",
    },
  ],
  timeline: [
    { type: "task_created", time: "09:12", text: "任务创建并交给 Leader。" },
    { type: "planning_started", time: "09:18", text: "Planner 开始定义桌面端结构与切换方式。" },
    { type: "writing_started", time: "09:24", text: "Writer 等待规划完成后补齐内容。" },
  ],
};

let simulationTimer = null;

const desktopLayoutEl = document.getElementById("desktop-layout");
const workspaceSidebarContentEl = document.getElementById("workspace-sidebar-content");
const workspaceStageContentEl = document.getElementById("workspace-stage-content");
const railButtons = [...document.querySelectorAll(".rail-item")];
const runtimeBadgeEl = document.getElementById("runtime-badge");
const THEME_STORAGE_KEY = "atf-desktop-theme";

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
  };
  return map[phase] || phase;
}

function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute("data-theme", theme);
}

function loadTheme() {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "default" || storedTheme === "dark" || storedTheme === "light") {
      applyTheme(storedTheme);
      return;
    }
  } catch {}

  applyTheme("default");
}

function saveTheme(theme) {
  applyTheme(theme);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
}

function flattenItems(workspaceKey) {
  return workspaceMeta[workspaceKey].groups.flatMap((group) => group.items);
}

function getActiveWorkspace() {
  return workspaceMeta[state.activeWorkspace];
}

function getActiveEntryId() {
  return state.activeEntry[state.activeWorkspace];
}

function getActiveEntry() {
  return flattenItems(state.activeWorkspace).find((item) => item.id === getActiveEntryId());
}

function getAgentById(id) {
  return state.agents.find((agent) => agent.id === id);
}

function badgeClass(status) {
  if (status === "completed" || status === "idle") return "status-chip ok";
  if (status === "working" || status === "reviewing") return "status-chip active";
  return "status-chip warn";
}

function buildTaskSummary() {
  const summaryMap = {
    pending: "Leader 已接收任务，准备将需求送入固定工作流。",
    planning: "Planner 正在收紧左 rail、中栏资源树和主舞台之间的关系。",
    writing: "Writer 正在补齐条目内容和主工作区展示。",
    reviewing: "Reviewer 正在检查三层导航是否足够像桌面客户端。",
    completed: "当前任务已完成，可以继续在不同 workspace 之间切换。",
  };

  return summaryMap[state.currentTask.phase];
}

function buildLeaderNote() {
  return `当前任务处于 ${formatPhase(state.currentTask.phase)} 阶段，负责人是 ${state.currentTask.owner}。再次点击当前左侧图标会收起或展开中栏。`;
}

function setActiveWorkspace(workspace) {
  if (state.activeWorkspace === workspace) {
    state.sidebarCollapsed = !state.sidebarCollapsed;
  } else {
    state.activeWorkspace = workspace;
    state.sidebarCollapsed = false;
  }

  renderApp();
}

function setActiveEntry(entryId) {
  state.activeEntry[state.activeWorkspace] = entryId;
  renderApp();
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

function pushTimeline(type, text) {
  state.timeline.push({
    type,
    time: new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    text,
  });
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
      planner: ["working", "定义导航结构与约束"],
      writer: ["waiting", "等待 Planner 输出"],
      reviewer: ["idle", "等待初稿"],
    },
    writing: {
      leader: ["working", state.currentTask.title],
      planner: ["completed", "拆解完成"],
      writer: ["working", "生成工作区内容"],
      reviewer: ["waiting", "等待 Writer 交付"],
    },
    reviewing: {
      leader: ["working", state.currentTask.title],
      planner: ["idle", "等待新任务"],
      writer: ["completed", "草稿已提交"],
      reviewer: ["reviewing", "检查导航与交互"],
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

function renderSidebar() {
  const workspace = getActiveWorkspace();
  const activeEntryId = getActiveEntryId();

  workspaceSidebarContentEl.innerHTML = `
    <div class="sidebar-shell">
      <div class="sidebar-top">
        <header class="sidebar-header">
          <div class="sidebar-title">
            <p class="eyebrow">Workspace</p>
            <h2>${escapeHtml(workspace.title)}</h2>
          </div>
          <span class="sidebar-toggle-hint">${state.sidebarCollapsed ? "Closed" : "Open"}</span>
        </header>

        ${workspace.groups
          .map(
            (group) => `
              <section class="tree-section">
                <span class="tree-label">${escapeHtml(group.label)}</span>
                <div class="tree-list">
                  ${group.items
                    .map(
                      (item) => `
                        <button
                          class="tree-item ${item.id === activeEntryId ? "is-active" : ""}"
                          type="button"
                          data-entry="${escapeHtml(item.id)}"
                        >
                          <span class="tree-item-name">${escapeHtml(item.label)}</span>
                          <span class="tree-item-meta">${escapeHtml(item.meta)}</span>
                        </button>
                      `
                    )
                    .join("")}
                </div>
              </section>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderThreadContent() {
  return `
    <div class="stage-layout">
      <div class="dialog-card">
        <div class="dialog-stream">
          ${state.messages
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
            .join("")}
        </div>
      </div>

      <div class="info-block">
        <p class="eyebrow">Stage Summary</p>
        <div class="phase-strip">
          ${phases
            .map((phase) => {
              const phaseIndex = phases.indexOf(phase);
              const currentIndex = phases.indexOf(state.currentTask.phase);
              const className =
                phaseIndex < currentIndex
                  ? "phase-chip done"
                  : phaseIndex === currentIndex
                    ? "phase-chip active"
                    : "phase-chip";
              return `<span class="${className}">${escapeHtml(formatPhase(phase))}</span>`;
            })
            .join("")}
        </div>
        <p class="leader-note">${escapeHtml(buildLeaderNote())}</p>
      </div>
    </div>
  `;
}

function renderComposeContent() {
  return `
    <div class="stage-layout">
      <div class="info-block">
        <p class="eyebrow">Quick Actions</p>
        <div class="quick-actions">
          <button class="quick-btn" type="button" data-prompt="status">询问当前进度</button>
          <button class="quick-btn" type="button" data-prompt="handoff">询问当前由谁负责</button>
          <button class="quick-btn" type="button" data-prompt="demo">载入演示任务</button>
        </div>
      </div>

      <div class="info-block">
        <p class="eyebrow">Compose</p>
        <h3>发送给 Leader</h3>
        <form id="chat-form" class="chat-form">
          <label for="chat-input">任务内容</label>
          <textarea
            id="chat-input"
            name="chat"
            rows="5"
            placeholder="例如：请把 Desktop 改成最外层 icon rail + 资源树中栏 + 右侧完整工作区内容。"
            required
          ></textarea>
          <div class="chat-actions">
            <button type="submit" class="btn-primary">发布任务</button>
            <button type="button" id="ask-status" class="btn-secondary">询问现状</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderCheckinsContent() {
  return `
    <div class="stage-layout">
      <div class="info-block">
        <p class="eyebrow">Current Status</p>
        <h3>${escapeHtml(formatPhase(state.currentTask.phase))}</h3>
        <div class="stage-meta">
          <span class="tag accent">${escapeHtml(state.currentTask.owner)}</span>
          <span class="tag">${escapeHtml(state.currentTask.id)}</span>
          <span class="tag">Progress ${escapeHtml(String(state.currentTask.progress))}%</span>
        </div>
        <p>${escapeHtml(buildTaskSummary())}</p>
      </div>

      <div class="card-grid">
        <div class="info-block">
          <p class="eyebrow">Owner</p>
          <h4>当前负责人</h4>
          <p>${escapeHtml(state.currentTask.owner)}</p>
        </div>
        <div class="info-block">
          <p class="eyebrow">Team</p>
          <h4>团队状态</h4>
          <p>${escapeHtml(state.agents.map((agent) => `${agent.name}: ${agent.currentTask}`).join("；"))}</p>
        </div>
      </div>
    </div>
  `;
}

function renderTeamOverviewContent() {
  return `
    <div class="card-grid">
      ${state.agents
        .map(
          (agent) => `
            <article class="agent-card">
              <div class="agent-head">
                <strong>${escapeHtml(agent.name)}</strong>
                <span class="${badgeClass(agent.status)}">${escapeHtml(agent.status)}</span>
              </div>
              <p>${escapeHtml(agent.duty)}</p>
              <p>${escapeHtml(agent.currentTask)}</p>
              <div class="skill-list">
                ${agent.skills.map((skill) => `<span class="skill">${escapeHtml(skill)}</span>`).join("")}
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderAgentDetailContent(agentId) {
  const agent = getAgentById(agentId);
  if (!agent) return "";

  return `
    <div class="stage-layout">
      <div class="info-block">
        <p class="eyebrow">Agent</p>
        <div class="agent-head">
          <h3>${escapeHtml(agent.name)}</h3>
          <span class="${badgeClass(agent.status)}">${escapeHtml(agent.status)}</span>
        </div>
        <p>${escapeHtml(agent.duty)}</p>
      </div>

      <div class="info-block">
        <p class="eyebrow">Current Task</p>
        <p>${escapeHtml(agent.currentTask)}</p>
        <div class="skill-list">
          ${agent.skills.map((skill) => `<span class="skill">${escapeHtml(skill)}</span>`).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderTaskOverviewContent() {
  return `
    <div class="stage-layout">
      <div class="info-block">
        <p class="eyebrow">Current Task</p>
        <h3>${escapeHtml(state.currentTask.title)}</h3>
        <p>${escapeHtml(state.currentTask.description)}</p>
        <div class="task-meta">
          <span class="tag accent">${escapeHtml(formatPhase(state.currentTask.phase))}</span>
          <span class="tag">${escapeHtml(state.currentTask.owner)}</span>
          <span class="tag">${escapeHtml(state.currentTask.lastUpdate)}</span>
        </div>
      </div>
    </div>
  `;
}

function renderStageFlowContent() {
  return `
    <div class="stage-layout">
      <div class="info-block">
        <p class="eyebrow">Stage Flow</p>
        <div class="phase-strip">
          ${phases
            .map((phase) => {
              const phaseIndex = phases.indexOf(phase);
              const currentIndex = phases.indexOf(state.currentTask.phase);
              const className =
                phaseIndex < currentIndex
                  ? "phase-chip done"
                  : phaseIndex === currentIndex
                    ? "phase-chip active"
                    : "phase-chip";
              return `<span class="${className}">${escapeHtml(formatPhase(phase))}</span>`;
            })
            .join("")}
        </div>
        <div class="progress-line">
          <div class="progress-value" style="width: ${state.currentTask.progress}%"></div>
        </div>
        <p class="leader-note">${escapeHtml(buildLeaderNote())}</p>
      </div>
    </div>
  `;
}

function renderTimelineContent() {
  return `
    <div class="timeline-list">
      <div class="timeline-list-inner">
        ${state.timeline
          .map(
            (event) => `
              <article class="timeline-item">
                <div class="timeline-head">
                  <span>${escapeHtml(event.type)}</span>
                  <span>${escapeHtml(event.time)}</span>
                </div>
                <p>${escapeHtml(event.text)}</p>
              </article>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderThemeSettingsContent() {
  const options = [
    { id: "default", label: "Default", note: "Follow system appearance" },
    { id: "dark", label: "Dark", note: "Use dark shell all the time" },
    { id: "light", label: "Light", note: "Use light shell all the time" },
  ];

  return `
    <div class="stage-layout">
      <div class="info-block">
        <p class="eyebrow">Appearance</p>
        <h3>Theme</h3>
        <p>Choose how the desktop shell should look.</p>
        <div class="theme-switcher">
          ${options
            .map(
              (option) => `
                <button
                  class="theme-option ${state.theme === option.id ? "is-active" : ""}"
                  type="button"
                  data-theme-option="${escapeHtml(option.id)}"
                >
                  <span class="theme-option-title">
                    <strong>${escapeHtml(option.label)}</strong>
                    <span>${state.theme === option.id ? "Active" : ""}</span>
                  </span>
                  <span>${escapeHtml(option.note)}</span>
                </button>
              `
            )
            .join("")}
        </div>
      </div>
    </div>
  `;
}

function renderStageContentBody() {
  const workspace = state.activeWorkspace;
  const entry = getActiveEntryId();

  if (workspace === "chat" && entry === "thread") return renderThreadContent();
  if (workspace === "chat" && entry === "compose") return renderComposeContent();
  if (workspace === "chat" && entry === "checkins") return renderCheckinsContent();
  if (workspace === "team" && entry === "overview") return renderTeamOverviewContent();
  if (workspace === "team") return renderAgentDetailContent(entry);
  if (workspace === "task" && entry === "overview") return renderTaskOverviewContent();
  if (workspace === "task" && entry === "stages") return renderStageFlowContent();
  if (workspace === "task" && entry === "timeline") return renderTimelineContent();
  if (workspace === "settings" && entry === "theme") return renderThemeSettingsContent();

  return "";
}

function renderStage() {
  const workspace = getActiveWorkspace();
  const entry = getActiveEntry();

  workspaceStageContentEl.innerHTML = `
    <div class="stage-shell">
      <header class="stage-header">
        <div class="stage-header-main">
          <div class="stage-breadcrumb">
            <span>${escapeHtml(workspace.title)}</span>
            <span>/</span>
            <span>${escapeHtml(entry.label)}</span>
          </div>
          <h2 class="stage-title">${escapeHtml(entry.label)}</h2>
        </div>

        <div class="stage-header-meta">
          <span class="tag accent">${escapeHtml(formatPhase(state.currentTask.phase))}</span>
          <span class="tag">${escapeHtml(state.currentTask.owner)}</span>
          <span class="tag">${escapeHtml(state.currentTask.id)}</span>
        </div>
      </header>

      ${renderStageContentBody()}
    </div>
  `;
}

function bindStageActions() {
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const askStatusBtn = document.getElementById("ask-status");
  const quickButtons = [...document.querySelectorAll(".quick-btn")];
  const treeItems = [...document.querySelectorAll(".tree-item")];
  const themeButtons = [...document.querySelectorAll("[data-theme-option]")];

  treeItems.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveEntry(button.dataset.entry);
    });
  });

  if (chatForm && chatInput) {
    chatForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = chatInput.value.trim();
      if (!value) return;

      pushMessage("user", "User", value);
      runTaskLifecycle(value);
      chatInput.value = "";
    });
  }

  if (askStatusBtn) {
    askStatusBtn.addEventListener("click", handleStatusQuestion);
  }

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
        state.activeWorkspace = "chat";
        state.activeEntry.chat = "compose";
        state.sidebarCollapsed = false;
        renderApp();
        const input = document.getElementById("chat-input");
        if (input) {
          input.value =
            "请把左侧 rail 做成产品级图标+标签，中栏做成像 Slack / VS Code 一样的资源树，并去掉多余说明模块。";
        }
      }
    });
  });

  themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      saveTheme(button.dataset.themeOption);
      renderApp();
    });
  });
}

function renderApp() {
  desktopLayoutEl.classList.toggle("sidebar-collapsed", state.sidebarCollapsed);

  railButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.workspace === state.activeWorkspace);
  });

  renderSidebar();
  renderStage();
  bindStageActions();
}

function runTaskLifecycle(userInput) {
  if (simulationTimer) {
    clearTimeout(simulationTimer);
  }

  state.currentTask = {
    id: `task-${String(Math.floor(Math.random() * 900) + 100)}`,
    title: userInput.length > 28 ? `${userInput.slice(0, 28)}...` : userInput,
    description: userInput,
    phase: "pending",
    owner: "Leader",
    progress: 8,
    lastUpdate: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
  };

  pushMessage(
    "leader",
    "Leader",
    "任务已接入。当前 Desktop 使用产品级 icon rail、资源树中栏和完整主工作区。"
  );
  pushTimeline("task_created", "新任务已进入系统。");
  setAgentStatusesByPhase("pending");
  renderApp();

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
        pushMessage("leader", "Leader", "Planner 已开始工作，正在定义结构与输出边界。");
        pushTimeline("planning_started", "Planner 开始拆解任务。");
        setAgentStatusesByPhase("planning");
        renderApp();
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
        pushMessage("leader", "Leader", "Planner 已完成拆解，Writer 正在生成工作区内容。");
        pushTimeline("writing_started", "Writer 开始生成工作区内容。");
        setAgentStatusesByPhase("writing");
        renderApp();
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
        pushMessage("leader", "Leader", "Reviewer 正在检查是否真正收紧成桌面客户端式层级。");
        pushTimeline("review_started", "Reviewer 开始审查导航交互。");
        setAgentStatusesByPhase("reviewing");
        renderApp();
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
        pushMessage("leader", "Leader", "当前任务已完成。再次点击当前左侧图标即可收起或展开中栏。");
        pushTimeline("final_output_ready", "Leader 完成最终交付。");
        setAgentStatusesByPhase("completed");
        renderApp();
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
    `当前任务处于 ${formatPhase(state.currentTask.phase)} 阶段，负责人是 ${state.currentTask.owner}。你可以在 Task workspace 里查看更完整的阶段信息。`
  );
  renderApp();
}

function handleHandoffQuestion() {
  pushMessage("user", "User", "当前由谁负责？团队其他成员在做什么？");
  const activeAgents = state.agents.map((agent) => `${agent.name}: ${agent.status} / ${agent.currentTask}`).join("；");
  pushMessage("leader", "Leader", `当前团队状态如下：${activeAgents}。`);
  renderApp();
}

railButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveWorkspace(button.dataset.workspace);
  });
});

if (window.desktopBridge?.runtime) {
  runtimeBadgeEl.textContent = window.desktopBridge.runtime;
}

loadTheme();
setAgentStatusesByPhase(state.currentTask.phase);
renderApp();
