const phases = ["pending", "planning", "writing", "reviewing", "completed"];

const workspaceMeta = {
  chat: {
    title: "Chat Workspace",
    description: "Leader 接收任务，中栏列出对话与操作入口，右侧显示完整对话或输入面板。",
    items: [
      { id: "thread", label: "Leader Thread", description: "当前任务主对话流" },
      { id: "compose", label: "Compose", description: "向 Leader 发布新任务" },
      { id: "checkins", label: "Check-ins", description: "快速询问进度与责任人" },
    ],
  },
  team: {
    title: "Team Workspace",
    description: "中栏切换团队总览或具体角色，右侧展示选中成员的完整信息。",
    items: [
      { id: "overview", label: "Team Overview", description: "查看整支 AI 团队状态" },
      { id: "leader", label: "Leader", description: "编排与最终答复" },
      { id: "planner", label: "Planner", description: "任务拆解与约束定义" },
      { id: "writer", label: "Writer", description: "草稿生成与改写" },
      { id: "reviewer", label: "Reviewer", description: "质量审查与反馈" },
    ],
  },
  task: {
    title: "Task Workspace",
    description: "中栏切任务信息切片，右侧显示完整任务视图，而不是页面内部的小面板。",
    items: [
      { id: "overview", label: "Current Task", description: "当前任务概览与负责人" },
      { id: "stages", label: "Stage Flow", description: "查看阶段流转与进度" },
      { id: "timeline", label: "Timeline", description: "查看事件时间线" },
    ],
  },
};

const state = {
  activeWorkspace: "chat",
  activeEntry: {
    chat: "thread",
    team: "overview",
    task: "overview",
  },
  sidebarCollapsed: false,
  currentTask: {
    id: "task-001",
    title: "重构 Desktop 为 VS Code / Slack 式三层侧栏",
    description:
      "将 Desktop 改成最左侧 icon rail 切换 workspace，中间栏展示当前 workspace 的目录入口，右侧显示选中工作区的完整内容，并允许再次点击当前 icon 收起中间栏。",
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
      currentTask: "定义三层侧栏导航关系与折叠行为",
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
      content: "欢迎进入 AI Task Force。这里不再是单页内部切换，而是完整工作区切换。",
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
      content: "已收到。当前版本会改成 icon rail -> 中栏目录 -> 右侧完整内容 的三层结构。",
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

function getActiveWorkspace() {
  return workspaceMeta[state.activeWorkspace];
}

function getActiveEntryId() {
  return state.activeEntry[state.activeWorkspace];
}

function getActiveEntry() {
  return getActiveWorkspace().items.find((item) => item.id === getActiveEntryId());
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
    planning: "Planner 正在定义左 rail、中间栏和主舞台之间的关系。",
    writing: "Writer 正在补齐页面文案与选中内容区展示。",
    reviewing: "Reviewer 正在检查是否真正实现了三层导航，而非页面内部切换。",
    completed: "当前任务已完成，可以继续观察不同工作区与目录入口。",
  };

  return summaryMap[state.currentTask.phase];
}

function buildLeaderNote() {
  return `当前任务处于 ${formatPhase(state.currentTask.phase)} 阶段，负责人是 ${state.currentTask.owner}。再次点击当前左侧图标会收起或展开中间栏。`;
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
        <div class="brand-block">
          <div class="brand-mark">ATF</div>
          <div>
            <p class="eyebrow">Electron Workspace</p>
            <h1>AI Task Force</h1>
          </div>
        </div>

        <div class="sidebar-workspace-card">
          <div class="sidebar-toolbar">
            <div>
              <p class="eyebrow">Workspace</p>
              <h2>${escapeHtml(workspace.title)}</h2>
            </div>
            <span class="status-pill">${state.sidebarCollapsed ? "Closed" : "Open"}</span>
          </div>
          <p class="workspace-description">${escapeHtml(workspace.description)}</p>
        </div>

        <section class="sidebar-section">
          <p class="eyebrow">Entries</p>
          <div class="sidebar-nav">
            ${workspace.items
              .map(
                (item) => `
                  <button
                    class="sidebar-entry ${item.id === activeEntryId ? "is-active" : ""}"
                    type="button"
                    data-entry="${escapeHtml(item.id)}"
                  >
                    <strong>${escapeHtml(item.label)}</strong>
                    <small>${escapeHtml(item.description)}</small>
                  </button>
                `
              )
              .join("")}
          </div>
        </section>
      </div>

      <section class="sidebar-summary">
        <p class="eyebrow">Current Task</p>
        <h3>${escapeHtml(state.currentTask.title)}</h3>
        <div class="summary-meta">
          <span class="tag accent">${escapeHtml(formatPhase(state.currentTask.phase))}</span>
          <span class="tag">${escapeHtml(state.currentTask.owner)}</span>
        </div>
        <p class="summary-note">${escapeHtml(buildTaskSummary())}</p>
      </section>
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

      <div class="surface-card">
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
      <div class="surface-card">
        <p class="eyebrow">Quick Actions</p>
        <div class="quick-actions">
          <button class="quick-btn" type="button" data-prompt="status">询问当前进度</button>
          <button class="quick-btn" type="button" data-prompt="handoff">询问当前由谁负责</button>
          <button class="quick-btn" type="button" data-prompt="demo">载入演示任务</button>
        </div>
      </div>

      <div class="surface-card">
        <p class="eyebrow">Compose</p>
        <h3>发送给 Leader</h3>
        <p class="stage-caption">这里是完整输入区。左侧 icon 只决定打开哪个 workspace，中栏决定看哪个条目，真正的内容在这里编辑。</p>
        <form id="chat-form" class="chat-form">
          <label for="chat-input">任务内容</label>
          <textarea
            id="chat-input"
            name="chat"
            rows="5"
            placeholder="例如：请把 Desktop 改成最外层 icon rail + 可折叠中栏 + 右侧完整工作区内容。"
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
      <div class="surface-card">
        <p class="eyebrow">Current Status</p>
        <h3>${escapeHtml(formatPhase(state.currentTask.phase))}</h3>
        <div class="stage-meta">
          <span class="tag accent">${escapeHtml(state.currentTask.owner)}</span>
          <span class="tag">${escapeHtml(state.currentTask.id)}</span>
          <span class="tag">Progress ${escapeHtml(String(state.currentTask.progress))}%</span>
        </div>
        <p class="stage-caption">${escapeHtml(buildTaskSummary())}</p>
      </div>

      <div class="card-grid">
        <div class="mini-card">
          <p class="eyebrow">Ask</p>
          <h4>当前由谁负责</h4>
          <p>${escapeHtml(`当前负责人是 ${state.currentTask.owner}。`)}</p>
        </div>
        <div class="mini-card">
          <p class="eyebrow">Ask</p>
          <h4>团队在做什么</h4>
          <p>${escapeHtml(state.agents.map((agent) => `${agent.name}：${agent.currentTask}`).join("；"))}</p>
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
              <p><strong>职责：</strong>${escapeHtml(agent.duty)}</p>
              <p><strong>当前任务：</strong>${escapeHtml(agent.currentTask)}</p>
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
      <div class="surface-card">
        <p class="eyebrow">Agent</p>
        <div class="agent-head">
          <h3>${escapeHtml(agent.name)}</h3>
          <span class="${badgeClass(agent.status)}">${escapeHtml(agent.status)}</span>
        </div>
        <p>${escapeHtml(agent.duty)}</p>
        <div class="stage-meta">
          <span class="tag accent">${escapeHtml(agent.currentTask)}</span>
        </div>
      </div>

      <div class="surface-card">
        <p class="eyebrow">Skills</p>
        <div class="skill-list">
          ${agent.skills.map((skill) => `<span class="skill">${escapeHtml(skill)}</span>`).join("")}
        </div>
      </div>

      <div class="mini-card">
        <p class="eyebrow">Context</p>
        <p>${escapeHtml(`当前 ${agent.name} 正在参与 "${state.currentTask.title}"。`)}</p>
      </div>
    </div>
  `;
}

function renderTaskOverviewContent() {
  return `
    <div class="stage-layout">
      <div class="surface-card">
        <p class="eyebrow">Current Task</p>
        <h3>${escapeHtml(state.currentTask.title)}</h3>
        <p>${escapeHtml(state.currentTask.description)}</p>
        <div class="task-meta">
          <span class="tag accent">${escapeHtml(formatPhase(state.currentTask.phase))}</span>
          <span class="tag">${escapeHtml(state.currentTask.owner)}</span>
          <span class="tag">${escapeHtml(state.currentTask.lastUpdate)}</span>
        </div>
      </div>

      <div class="mini-card">
        <p class="eyebrow">Summary</p>
        <p>${escapeHtml(buildTaskSummary())}</p>
      </div>
    </div>
  `;
}

function renderStageFlowContent() {
  return `
    <div class="stage-layout">
      <div class="surface-card">
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
        <p class="stage-caption">${escapeHtml(buildLeaderNote())}</p>
      </div>
    </div>
  `;
}

function renderTimelineContent() {
  return `
    <div class="timeline-list">
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

  return "";
}

function renderStage() {
  const workspace = getActiveWorkspace();
  const entry = getActiveEntry();

  workspaceStageContentEl.innerHTML = `
    <div class="stage-shell">
      <header class="stage-header">
        <div class="stage-title-group">
          <div class="stage-breadcrumb">
            <span>${escapeHtml(workspace.title)}</span>
            <span>/</span>
            <span>${escapeHtml(entry.label)}</span>
          </div>
          <div>
            <p class="eyebrow">Selected View</p>
            <h2>${escapeHtml(entry.label)}</h2>
          </div>
        </div>
        <div class="stage-header-note">
          点击左侧 icon 切换或收起中间栏；点击中间栏条目后，这里显示该条目的完整内容。
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
  const sidebarEntries = [...document.querySelectorAll(".sidebar-entry")];

  sidebarEntries.forEach((button) => {
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
            "请把 Desktop 改成像 VS Code / Slack 那样，左侧 icon 打开中栏，中栏选择条目，右侧展示完整内容，并支持中栏折叠。";
        }
      }
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
    "任务已接入。当前 Desktop 采用三层结构：左 rail 切 workspace，中栏切条目，右侧显示完整内容。"
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
        pushMessage("leader", "Leader", "Planner 已完成拆解，Writer 正在生成界面内容。");
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
        pushMessage("leader", "Leader", "Reviewer 正在检查是否真正实现了三层侧栏与折叠交互。");
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
        pushMessage("leader", "Leader", "当前任务已完成。再次点击当前左侧图标即可收起或展开中间栏。");
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

setAgentStatusesByPhase(state.currentTask.phase);
renderApp();
