const phases = ["pending", "planning", "writing", "reviewing", "completed"];

const THEME_STORAGE_KEY = "atf-desktop-theme";
const LANGUAGE_STORAGE_KEY = "atf-desktop-language";

const dictionaries = {
  en: {
    app: {
      title: "AI Task Force Desktop",
      workspace: "Workspace",
      open: "Open",
      closed: "Closed",
      active: "Active",
    },
    rail: {
      chat: "Chat",
      team: "Team",
      task: "Task",
      settings: "Settings",
      runtime: "Runtime",
      browserPreview: "Browser Preview",
    },
    aria: {
      home: "AI Task Force home",
      workspace: {
        chat: "Chat workspace",
        team: "Team workspace",
        task: "Task workspace",
        settings: "Settings workspace",
      },
    },
    groups: {
      threads: "Threads",
      actions: "Actions",
      views: "Views",
      agents: "Agents",
      current: "Current",
      appearance: "Appearance",
      localization: "Localization",
    },
    entries: {
      thread: "Leader Thread",
      checkins: "Check-ins",
      compose: "Compose",
      overview: "Overview",
      stages: "Stage Flow",
      timeline: "Timeline",
      theme: "Theme",
      language: "Language",
      leader: "Leader",
      planner: "Planner",
      writer: "Writer",
      reviewer: "Reviewer",
      designer: "Designer",
      programmer: "Programmer",
    },
    meta: {
      live: "Live",
      plus: "+",
      count2: "2",
      count5: "5",
      count6: "6",
      now: "Now",
      log: "Log",
      on: "On",
      wait: "Wait",
      idle: "Idle",
      stub: "Stub",
      done: "Done",
      themeCount: "3",
      languageCount: "2",
    },
    roles: {
      user: "User",
      leader: "Leader",
      planner: "Planner",
      writer: "Writer",
      reviewer: "Reviewer",
      designer: "Designer",
      programmer: "Programmer",
    },
    statuses: {
      working: "Working",
      waiting: "Waiting",
      idle: "Idle",
      reviewing: "Reviewing",
      completed: "Completed",
      stub: "Stub",
    },
    phases: {
      pending: "Pending",
      planning: "Planning",
      writing: "Writing",
      reviewing: "Reviewing",
      completed: "Completed",
    },
    events: {
      task_created: "Task Created",
      planning_started: "Planning Started",
      writing_started: "Writing Started",
      review_started: "Review Started",
      final_output_ready: "Final Output Ready",
    },
    stage: {
      stageSummary: "Stage Summary",
      quickActions: "Quick Actions",
      compose: "Compose",
      sendToLeader: "Send To Leader",
      taskContent: "Task Content",
      currentStatus: "Current Status",
      owner: "Owner",
      team: "Team",
      agent: "Agent",
      currentTask: "Current Task",
      stageFlow: "Stage Flow",
      appearance: "Appearance",
      language: "Language",
      teamOverview: "Team Overview",
      chooseTheme: "Choose how the desktop shell should look.",
      chooseLanguage: "Choose the interface language for the desktop shell.",
      list: "List",
      grid: "Grid",
      progress: "Progress",
    },
    buttons: {
      askProgress: "Ask Current Progress",
      askOwner: "Ask Current Owner",
      loadDemo: "Load Demo Task",
      publishTask: "Publish Task",
      askStatus: "Ask Status",
    },
    placeholder:
      "Example: Refactor the desktop shell into an outer icon rail, a collapsible resource sidebar, and a full workspace stage.",
    themes: {
      default: {
        label: "Default",
        note: "Follow system appearance",
      },
      dark: {
        label: "Dark",
        note: "Use a dark shell all the time",
      },
      light: {
        label: "Light",
        note: "Use a light shell all the time",
      },
    },
    languages: {
      en: {
        label: "English",
        note: "Use English across the workspace",
      },
      "zh-CN": {
        label: "简体中文",
        note: "Use Simplified Chinese across the workspace",
      },
    },
    duties: {
      leader: "Receives tasks, orchestrates the flow, and delivers the final response.",
      planner: "Breaks user requests into structured execution steps and constraints.",
      writer: "Produces workspace copy, first drafts, and presentable content.",
      reviewer: "Checks clarity, completeness, and instruction adherence before handoff.",
      designer: "Reserved for future visual system and interaction polish work.",
      programmer: "Reserved for future implementation and desktop integration work.",
    },
    agentTasks: {
      leaderReceived: "New task intake",
      leaderNext: "Ready for the next task",
      plannerWait: "Waiting for the next task",
      plannerStructuring: "Structuring shell flow and content boundaries",
      writerWait: "Waiting for planner output",
      writerWorking: "Building workspace content",
      writerSubmitted: "Draft submitted",
      reviewerWait: "Waiting for draft",
      reviewerReviewing: "Reviewing structure and delivery",
      designerStub: "stub: reserved for future design integration",
      programmerStub: "stub: reserved for future development",
    },
    summary: {
      pending: "Leader has received the task and is preparing the fixed workflow.",
      planning: "Planner is aligning the outer rail, resource tree, and workspace stage.",
      writing: "Writer is filling the selected workspace content and shell copy.",
      reviewing: "Reviewer is checking whether the shell reads like a real desktop client.",
      completed: "The current shell pass is complete and ready for another task.",
    },
    notes: {
      leader:
        "The current task is in {{phase}} and owned by {{owner}}. Click the active rail icon again to collapse or reopen the middle sidebar.",
    },
    responses: {
      statusQuestion: "Which stage is the task in right now? Who is handling it?",
      statusAnswer:
        "The current task is in {{phase}} and owned by {{owner}}. Open the Task workspace to inspect the full stage summary.",
      handoffQuestion: "Who owns the task right now? What is the rest of the team doing?",
      handoffAnswer: "Current team state: {{agents}}.",
      taskReceived:
        "Task received. The current shell uses an outer product rail, a collapsible resource sidebar, and a full workspace stage.",
      planning:
        "Planner has started work and is defining the shell structure and output boundaries.",
      writing:
        "Planner has completed the breakdown. Writer is now building the workspace content.",
      reviewing:
        "Reviewer is checking whether the shell now reads like a real desktop client.",
      completed:
        "The current task is complete. Click the active rail icon again to collapse or reopen the middle sidebar.",
    },
    timelineText: {
      taskCreated: "A new task was added to the system.",
      planningStarted: "Planner started decomposing the request.",
      writingStarted: "Writer started producing workspace content.",
      reviewStarted: "Reviewer started checking the output.",
      finalReady: "Leader delivered the final response.",
    },
    demo: {
      taskTitle: "Rebuild the desktop shell into a Slack / VS Code style layout",
      taskDescription:
        "Use an outer icon rail, a collapsible resource sidebar, and a full workspace stage instead of an internal dashboard layout.",
      messageWelcome:
        "Welcome to AI Task Force. Use the outer rail to switch workspaces, the middle sidebar to select resources, and the stage to inspect full content.",
      messageRequest:
        "I need a Slack / VS Code style shell where the left icon rail controls the middle sidebar, and the right side stays as the full workspace stage.",
      messageAck:
        "Received. This pass tightens the shell hierarchy, removes explanatory dashboard copy, and keeps the middle sidebar collapsible.",
      timelineCreated: "Task created and assigned to Leader.",
      timelinePlanning: "Planner started defining the shell and switching model.",
      timelineWriting: "Writer is waiting to fill the stage content after planning.",
      demoPrompt:
        "Refactor the desktop shell into a product-grade outer rail with a collapsible resource sidebar, and remove explanatory dashboard copy.",
    },
  },
  "zh-CN": {
    app: {
      title: "AI Task Force Desktop",
      workspace: "工作区",
      open: "展开",
      closed: "收起",
      active: "当前",
    },
    rail: {
      chat: "聊天",
      team: "团队",
      task: "任务",
      settings: "设置",
      runtime: "运行环境",
      browserPreview: "浏览器预览",
    },
    aria: {
      home: "AI Task Force 首页",
      workspace: {
        chat: "聊天工作区",
        team: "团队工作区",
        task: "任务工作区",
        settings: "设置工作区",
      },
    },
    groups: {
      threads: "会话",
      actions: "操作",
      views: "视图",
      agents: "成员",
      current: "当前",
      appearance: "外观",
      localization: "语言",
    },
    entries: {
      thread: "Leader 会话",
      checkins: "进度检查",
      compose: "发布任务",
      overview: "概览",
      stages: "阶段流转",
      timeline: "时间线",
      theme: "主题",
      language: "语言",
      leader: "Leader",
      planner: "Planner",
      writer: "Writer",
      reviewer: "Reviewer",
      designer: "Designer",
      programmer: "Programmer",
    },
    meta: {
      live: "在线",
      plus: "+",
      count2: "2",
      count5: "5",
      count6: "6",
      now: "当前",
      log: "日志",
      on: "运行中",
      wait: "等待",
      idle: "空闲",
      stub: "占位",
      done: "完成",
      themeCount: "3",
      languageCount: "2",
    },
    roles: {
      user: "用户",
      leader: "Leader",
      planner: "Planner",
      writer: "Writer",
      reviewer: "Reviewer",
      designer: "Designer",
      programmer: "Programmer",
    },
    statuses: {
      working: "工作中",
      waiting: "等待中",
      idle: "空闲",
      reviewing: "审核中",
      completed: "已完成",
      stub: "占位",
    },
    phases: {
      pending: "待开始",
      planning: "规划中",
      writing: "生成中",
      reviewing: "审核中",
      completed: "已完成",
    },
    events: {
      task_created: "任务已创建",
      planning_started: "开始规划",
      writing_started: "开始生成",
      review_started: "开始审核",
      final_output_ready: "最终输出已完成",
    },
    stage: {
      stageSummary: "阶段摘要",
      quickActions: "快捷操作",
      compose: "发布",
      sendToLeader: "发送给 Leader",
      taskContent: "任务内容",
      currentStatus: "当前状态",
      owner: "负责人",
      team: "团队状态",
      agent: "成员",
      currentTask: "当前任务",
      stageFlow: "阶段流转",
      appearance: "外观",
      language: "语言",
      teamOverview: "团队概览",
      chooseTheme: "选择桌面壳层的显示主题。",
      chooseLanguage: "选择桌面壳层的界面语言。",
      list: "列表",
      grid: "网格",
      progress: "进度",
    },
    buttons: {
      askProgress: "询问当前进度",
      askOwner: "询问当前负责人",
      loadDemo: "载入演示任务",
      publishTask: "发布任务",
      askStatus: "询问状态",
    },
    placeholder:
      "例如：把桌面端重构为外层 icon rail、可收起的资源中栏，以及完整右侧工作区。",
    themes: {
      default: {
        label: "默认",
        note: "跟随系统外观",
      },
      dark: {
        label: "深色",
        note: "始终使用深色壳层",
      },
      light: {
        label: "浅色",
        note: "始终使用浅色壳层",
      },
    },
    languages: {
      en: {
        label: "English",
        note: "整个工作区使用英文",
      },
      "zh-CN": {
        label: "简体中文",
        note: "整个工作区使用简体中文",
      },
    },
    duties: {
      leader: "负责接收任务、编排流程，并输出最终答复。",
      planner: "把用户需求拆成结构化执行步骤和约束。",
      writer: "负责生成工作区文案、草稿和展示内容。",
      reviewer: "在交付前检查清晰度、完整度和指令遵循情况。",
      designer: "预留给后续视觉系统和交互精修能力。",
      programmer: "预留给后续工程实现和桌面端接入能力。",
    },
    agentTasks: {
      leaderReceived: "接收新任务",
      leaderNext: "准备接收下一项任务",
      plannerWait: "等待下一项任务",
      plannerStructuring: "梳理壳层结构与内容边界",
      writerWait: "等待 Planner 输出",
      writerWorking: "生成工作区内容",
      writerSubmitted: "草稿已提交",
      reviewerWait: "等待草稿",
      reviewerReviewing: "检查结构与交付质量",
      designerStub: "stub: 预留给后续设计能力接入",
      programmerStub: "stub: 预留给后续开发能力接入",
    },
    summary: {
      pending: "Leader 已接收任务，正在准备进入固定工作流。",
      planning: "Planner 正在对齐外层 rail、资源树和主工作区的关系。",
      writing: "Writer 正在补齐选中工作区的内容与交互文案。",
      reviewing: "Reviewer 正在检查当前壳层是否更像真实桌面客户端。",
      completed: "当前壳层迭代已完成，可以继续处理下一项任务。",
    },
    notes: {
      leader:
        "当前任务处于 {{phase}}，负责人是 {{owner}}。再次点击当前左侧图标，可以收起或重新展开中栏。",
    },
    responses: {
      statusQuestion: "现在任务进行到哪个阶段了？谁在负责？",
      statusAnswer: "当前任务处于 {{phase}}，负责人是 {{owner}}。可以进入 Task 工作区查看完整阶段摘要。",
      handoffQuestion: "现在是谁在负责？团队其他成员在做什么？",
      handoffAnswer: "当前团队状态如下：{{agents}}。",
      taskReceived: "任务已接收。当前壳层采用外层产品 rail、可收起资源中栏和完整右侧工作区。",
      planning: "Planner 已开始工作，正在定义壳层结构和输出边界。",
      writing: "Planner 已完成拆解，Writer 正在生成工作区内容。",
      reviewing: "Reviewer 正在检查现在的界面是否更像真正的桌面客户端。",
      completed: "当前任务已完成。再次点击当前 rail 图标，可以收起或重新展开中栏。",
    },
    timelineText: {
      taskCreated: "新任务已加入系统。",
      planningStarted: "Planner 开始拆解需求。",
      writingStarted: "Writer 开始生成工作区内容。",
      reviewStarted: "Reviewer 开始检查输出。",
      finalReady: "Leader 已完成最终交付。",
    },
    demo: {
      taskTitle: "把桌面端重构成 Slack / VS Code 风格的壳层",
      taskDescription: "使用外层 icon rail、可收起资源中栏，以及完整右侧工作区，替代页面内 dashboard 布局。",
      messageWelcome:
        "欢迎进入 AI Task Force。使用最外层 rail 切换工作区，中栏选择资源，右侧查看完整内容。",
      messageRequest:
        "我需要类似 Slack / VS Code 的壳层，左侧 icon rail 控制中栏，右侧保持为完整工作区。",
      messageAck:
        "已收到。本轮会继续收紧壳层层级，删除说明型 dashboard 文案，并保留中栏收起能力。",
      timelineCreated: "任务已创建并交给 Leader。",
      timelinePlanning: "Planner 开始定义壳层结构和切换方式。",
      timelineWriting: "Writer 正等待规划完成后补齐工作区内容。",
      demoPrompt:
        "把桌面端重构为产品级的外层 rail + 可收起资源中栏，并删除说明感太强的 dashboard 文案。",
    },
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
  teamOverviewLayout: "list",
  sidebarCollapsed: false,
  theme: "default",
  language: "en",
  currentTask: {
    id: "task-001",
    titleKey: "demo.taskTitle",
    descriptionKey: "demo.taskDescription",
    phase: "planning",
    owner: "planner",
    progress: 36,
    lastUpdate: "09:46",
  },
  agents: [
    {
      id: "leader",
      status: "working",
      taskMode: "title",
      skills: ["routing", "planning-handoff", "final-response"],
    },
    {
      id: "planner",
      status: "working",
      taskKey: "agentTasks.plannerStructuring",
      skills: ["task-breakdown", "constraints", "output-schema"],
    },
    {
      id: "writer",
      status: "waiting",
      taskKey: "agentTasks.writerWait",
      skills: ["drafting", "rewrite", "formatting"],
    },
    {
      id: "reviewer",
      status: "idle",
      taskKey: "agentTasks.reviewerWait",
      skills: ["quality-gate", "consistency", "instruction-check"],
    },
    {
      id: "designer",
      status: "stub",
      taskKey: "agentTasks.designerStub",
      skills: ["visual-system", "interaction-polish", "art-direction"],
    },
    {
      id: "programmer",
      status: "stub",
      taskKey: "agentTasks.programmerStub",
      skills: ["implementation", "electron-integration", "component-logic"],
    },
  ],
  messages: [
    {
      id: "msg-001",
      sender: "leader",
      time: "09:42",
      textKey: "demo.messageWelcome",
    },
    {
      id: "msg-002",
      sender: "user",
      time: "09:44",
      textKey: "demo.messageRequest",
    },
    {
      id: "msg-003",
      sender: "leader",
      time: "09:46",
      textKey: "demo.messageAck",
    },
  ],
  timeline: [
    {
      type: "task_created",
      time: "09:12",
      textKey: "demo.timelineCreated",
    },
    {
      type: "planning_started",
      time: "09:18",
      textKey: "demo.timelinePlanning",
    },
    {
      type: "writing_started",
      time: "09:24",
      textKey: "demo.timelineWriting",
    },
  ],
};

let simulationTimer = null;

const desktopLayoutEl = document.getElementById("desktop-layout");
const workspaceSidebarContentEl = document.getElementById("workspace-sidebar-content");
const workspaceStageContentEl = document.getElementById("workspace-stage-content");
const railButtons = [...document.querySelectorAll(".rail-item[data-workspace]")];
const runtimeBadgeEl = document.getElementById("runtime-badge");
const railBrandEl = document.querySelector(".rail-brand");
const runtimeLabelEl = document.querySelector(".rail-runtime .eyebrow");

function getDictionary() {
  return dictionaries[state.language] || dictionaries.en;
}

function getByPath(target, path) {
  return path.split(".").reduce((value, segment) => (value ? value[segment] : undefined), target);
}

function t(path, params = {}) {
  const template = getByPath(getDictionary(), path) ?? getByPath(dictionaries.en, path) ?? path;
  if (typeof template !== "string") return String(template ?? path);

  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = params[key];
    return value == null ? "" : String(value);
  });
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getLocale() {
  return state.language === "zh-CN" ? "zh-CN" : "en-US";
}

function formatTime(date = new Date()) {
  return date.toLocaleTimeString(getLocale(), {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPhase(phase) {
  return t(`phases.${phase}`);
}

function formatStatus(status) {
  return t(`statuses.${status}`);
}

function formatEventType(type) {
  return t(`events.${type}`);
}

function roleLabel(roleId) {
  return t(`roles.${roleId}`);
}

function roleDuty(roleId) {
  return t(`duties.${roleId}`);
}

function getCurrentTaskTitle() {
  return state.currentTask.titleKey ? t(state.currentTask.titleKey) : state.currentTask.title;
}

function getCurrentTaskDescription() {
  return state.currentTask.descriptionKey ? t(state.currentTask.descriptionKey) : state.currentTask.description;
}

function getAgentById(id) {
  return state.agents.find((agent) => agent.id === id);
}

function getAgentTaskText(agent) {
  if (agent.taskMode === "title") return getCurrentTaskTitle();
  if (agent.taskKey) return t(agent.taskKey);
  return agent.currentTask || "";
}

function resolveMessageText(message) {
  if (message.textKey) return t(message.textKey, message.params || {});
  return message.text || "";
}

function resolveTimelineText(event) {
  if (event.textKey) return t(event.textKey, event.params || {});
  return event.text || "";
}

function badgeClass(status) {
  if (status === "completed" || status === "idle") return "status-chip ok";
  if (status === "working" || status === "reviewing") return "status-chip active";
  return "status-chip warn";
}

function metaFromStatus(status) {
  if (status === "working" || status === "reviewing") return t("meta.on");
  if (status === "waiting") return t("meta.wait");
  if (status === "completed") return t("meta.done");
  if (status === "idle") return t("meta.idle");
  return t("meta.stub");
}

function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute("data-theme", theme);
}

function saveTheme(theme) {
  applyTheme(theme);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
}

function loadTheme() {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "default" || stored === "dark" || stored === "light") {
      applyTheme(stored);
      return;
    }
  } catch {}

  applyTheme("default");
}

function applyLanguage(language) {
  state.language = language;
  document.documentElement.lang = language === "zh-CN" ? "zh-CN" : "en";
  document.title = t("app.title");
}

function saveLanguage(language) {
  applyLanguage(language);
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {}
}

function loadLanguage() {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === "en" || stored === "zh-CN") {
      applyLanguage(stored);
      return;
    }
  } catch {}

  applyLanguage("en");
}

function buildWorkspaceMeta() {
  return {
    chat: {
      title: t("rail.chat"),
      groups: [
        {
          label: t("groups.threads"),
          items: [
            { id: "thread", label: t("entries.thread"), meta: t("meta.live") },
            { id: "checkins", label: t("entries.checkins"), meta: t("meta.count2") },
          ],
        },
        {
          label: t("groups.actions"),
          items: [{ id: "compose", label: t("entries.compose"), meta: t("meta.plus") }],
        },
      ],
    },
    team: {
      title: t("rail.team"),
      groups: [
        {
          label: t("groups.views"),
          items: [{ id: "overview", label: t("entries.overview"), meta: t("meta.count6") }],
        },
        {
          label: t("groups.agents"),
          items: state.agents.map((agent) => ({
            id: agent.id,
            label: t(`entries.${agent.id}`),
            meta: metaFromStatus(agent.status),
          })),
        },
      ],
    },
    task: {
      title: t("rail.task"),
      groups: [
        {
          label: t("groups.current"),
          items: [
            { id: "overview", label: t("entries.overview"), meta: t("meta.now") },
            { id: "stages", label: t("entries.stages"), meta: t("meta.count5") },
            { id: "timeline", label: t("entries.timeline"), meta: t("meta.log") },
          ],
        },
      ],
    },
    settings: {
      title: t("rail.settings"),
      groups: [
        {
          label: t("groups.appearance"),
          items: [{ id: "theme", label: t("entries.theme"), meta: t("meta.themeCount") }],
        },
        {
          label: t("groups.localization"),
          items: [{ id: "language", label: t("entries.language"), meta: t("meta.languageCount") }],
        },
      ],
    },
  };
}

function flattenItems(workspaceKey) {
  return buildWorkspaceMeta()[workspaceKey].groups.flatMap((group) => group.items);
}

function getActiveWorkspace() {
  return buildWorkspaceMeta()[state.activeWorkspace];
}

function getActiveEntryId() {
  return state.activeEntry[state.activeWorkspace];
}

function getActiveEntry() {
  return flattenItems(state.activeWorkspace).find((item) => item.id === getActiveEntryId());
}

function buildTaskSummary() {
  return t(`summary.${state.currentTask.phase}`);
}

function buildLeaderNote() {
  return t("notes.leader", {
    phase: formatPhase(state.currentTask.phase),
    owner: roleLabel(state.currentTask.owner),
  });
}

function updateShellChrome() {
  if (railBrandEl) {
    railBrandEl.setAttribute("aria-label", t("aria.home"));
  }

  if (runtimeLabelEl) {
    runtimeLabelEl.textContent = t("rail.runtime");
  }

  railButtons.forEach((button) => {
    const workspace = button.dataset.workspace;
    const label = t(`rail.${workspace}`);
    const labelEl = button.querySelector(".rail-label");

    if (labelEl) labelEl.textContent = label;
    button.setAttribute("aria-label", t(`aria.workspace.${workspace}`));
  });

  if (window.desktopBridge?.runtime) {
    runtimeBadgeEl.textContent = window.desktopBridge.runtime;
  } else {
    runtimeBadgeEl.textContent = t("rail.browserPreview");
  }
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

function pushMessage(sender, text) {
  state.messages.push({
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sender,
    time: formatTime(),
    text,
  });
}

function pushTimeline(type, text) {
  state.timeline.push({
    type,
    time: formatTime(),
    text,
  });
}

function setAgentStatusesByPhase(phase) {
  const config = {
    pending: {
      leader: { status: "working", taskKey: "agentTasks.leaderReceived" },
      planner: { status: "idle", taskKey: "agentTasks.plannerWait" },
      writer: { status: "idle", taskKey: "agentTasks.writerWait" },
      reviewer: { status: "idle", taskKey: "agentTasks.reviewerWait" },
      designer: { status: "stub", taskKey: "agentTasks.designerStub" },
      programmer: { status: "stub", taskKey: "agentTasks.programmerStub" },
    },
    planning: {
      leader: { status: "working", taskMode: "title" },
      planner: { status: "working", taskKey: "agentTasks.plannerStructuring" },
      writer: { status: "waiting", taskKey: "agentTasks.writerWait" },
      reviewer: { status: "idle", taskKey: "agentTasks.reviewerWait" },
      designer: { status: "stub", taskKey: "agentTasks.designerStub" },
      programmer: { status: "stub", taskKey: "agentTasks.programmerStub" },
    },
    writing: {
      leader: { status: "working", taskMode: "title" },
      planner: { status: "completed", taskKey: "agentTasks.plannerStructuring" },
      writer: { status: "working", taskKey: "agentTasks.writerWorking" },
      reviewer: { status: "waiting", taskKey: "agentTasks.reviewerWait" },
      designer: { status: "stub", taskKey: "agentTasks.designerStub" },
      programmer: { status: "stub", taskKey: "agentTasks.programmerStub" },
    },
    reviewing: {
      leader: { status: "working", taskMode: "title" },
      planner: { status: "idle", taskKey: "agentTasks.plannerWait" },
      writer: { status: "completed", taskKey: "agentTasks.writerSubmitted" },
      reviewer: { status: "reviewing", taskKey: "agentTasks.reviewerReviewing" },
      designer: { status: "stub", taskKey: "agentTasks.designerStub" },
      programmer: { status: "stub", taskKey: "agentTasks.programmerStub" },
    },
    completed: {
      leader: { status: "working", taskKey: "agentTasks.leaderNext" },
      planner: { status: "idle", taskKey: "agentTasks.plannerWait" },
      writer: { status: "idle", taskKey: "agentTasks.writerWait" },
      reviewer: { status: "idle", taskKey: "agentTasks.reviewerWait" },
      designer: { status: "stub", taskKey: "agentTasks.designerStub" },
      programmer: { status: "stub", taskKey: "agentTasks.programmerStub" },
    },
  };

  state.agents.forEach((agent) => {
    const entry = config[phase][agent.id];
    if (!entry) return;

    agent.status = entry.status;
    agent.taskMode = entry.taskMode || "key";
    agent.taskKey = entry.taskKey || null;
  });
}

function renderAgentIcon(agentId) {
  const icons = {
    leader: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 9a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" fill="none" stroke="currentColor" stroke-width="1.7"/>
        <path d="M6 21v-1.5a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v1.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M8 4.5l2.1 1.8l1.9 -2.1l2 2.1l1.9 -1.8l.6 3.5h-9z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
      </svg>
    `,
    planner: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7.5 8a3.5 3.5 0 1 0 7 0a3.5 3.5 0 0 0 -7 0" fill="none" stroke="currentColor" stroke-width="1.7"/>
        <path d="M5.5 20.5v-1.2a3.8 3.8 0 0 1 3.8 -3.8h2.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M15.5 6.5h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-5a1 1 0 0 1 -1 -1v-7.5z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M16 10h3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M16 13h2.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M16 16h2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    `,
    writer: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7.5 8a3.5 3.5 0 1 0 7 0a3.5 3.5 0 0 0 -7 0" fill="none" stroke="currentColor" stroke-width="1.7"/>
        <path d="M5.5 20.5v-1.2a3.8 3.8 0 0 1 3.8 -3.8h2.7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M16.9 13.6l2.5 2.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M14.8 19.7l.6 -3.3l4.5 -4.4a1.2 1.2 0 0 1 1.7 1.7l-4.5 4.4z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
      </svg>
    `,
    reviewer: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7.5 8a3.5 3.5 0 1 0 7 0a3.5 3.5 0 0 0 -7 0" fill="none" stroke="currentColor" stroke-width="1.7"/>
        <path d="M5.5 20.5v-1.2a3.8 3.8 0 0 1 3.8 -3.8h2.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M16.5 14.5l1.6 1.6l3 -3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M15 11.5h4.5a1 1 0 0 1 1 1v5a1 1 0 0 1 -1 1h-5a1 1 0 0 1 -1 -1v-5a1 1 0 0 1 1 -1z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
      </svg>
    `,
    designer: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7.5 8a3.5 3.5 0 1 0 7 0a3.5 3.5 0 0 0 -7 0" fill="none" stroke="currentColor" stroke-width="1.7"/>
        <path d="M5.5 20.5v-1.2a3.8 3.8 0 0 1 3.8 -3.8h2.3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M18.8 12.2c1.7 0 3.2 1.4 3.2 3.1c0 2.7 -2.6 3.6 -4.8 5.5c-2.2 -1.9 -4.7 -2.8 -4.7 -5.5c0 -1.7 1.4 -3.1 3.1 -3.1c.8 0 1.6 .3 2.1 .9c.5 -.6 1.3 -.9 2.1 -.9z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M15.8 15.5h.01" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M18.2 14.4h.01" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M18.9 17.1h.01" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
      </svg>
    `,
    programmer: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7.5 8a3.5 3.5 0 1 0 7 0a3.5 3.5 0 0 0 -7 0" fill="none" stroke="currentColor" stroke-width="1.7"/>
        <path d="M5.5 20.5v-1.2a3.8 3.8 0 0 1 3.8 -3.8h2.7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M16.2 14.4l-2.2 2.1l2.2 2.1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M20.8 14.4l2.2 2.1l-2.2 2.1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M18.9 13.6l-.8 5.8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    `,
  };

  return icons[agentId] || `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="1.7"/>
    </svg>
  `;
}

function renderSidebar() {
  const workspace = getActiveWorkspace();
  const activeEntryId = getActiveEntryId();

  workspaceSidebarContentEl.innerHTML = `
    <div class="sidebar-shell">
      <div class="sidebar-top">
        <header class="sidebar-header">
          <div class="sidebar-title">
            <p class="eyebrow">${escapeHtml(t("app.workspace"))}</p>
            <h2>${escapeHtml(workspace.title)}</h2>
          </div>
          <span class="sidebar-toggle-hint">${escapeHtml(state.sidebarCollapsed ? t("app.closed") : t("app.open"))}</span>
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
                <article class="message-card ${escapeHtml(message.sender)}">
                  <div class="message-head">
                    <span>${escapeHtml(roleLabel(message.sender))}</span>
                    <span>${escapeHtml(message.time)}</span>
                  </div>
                  <div class="message-body">${escapeHtml(resolveMessageText(message))}</div>
                </article>
              `
            )
            .join("")}
        </div>
      </div>

      <div class="info-block">
        <p class="eyebrow">${escapeHtml(t("stage.stageSummary"))}</p>
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
        <p class="eyebrow">${escapeHtml(t("stage.quickActions"))}</p>
        <div class="quick-actions">
          <button class="quick-btn" type="button" data-prompt="status">${escapeHtml(t("buttons.askProgress"))}</button>
          <button class="quick-btn" type="button" data-prompt="handoff">${escapeHtml(t("buttons.askOwner"))}</button>
          <button class="quick-btn" type="button" data-prompt="demo">${escapeHtml(t("buttons.loadDemo"))}</button>
        </div>
      </div>

      <div class="info-block">
        <p class="eyebrow">${escapeHtml(t("stage.compose"))}</p>
        <h3>${escapeHtml(t("stage.sendToLeader"))}</h3>
        <form id="chat-form" class="chat-form">
          <label for="chat-input">${escapeHtml(t("stage.taskContent"))}</label>
          <textarea
            id="chat-input"
            name="chat"
            rows="5"
            placeholder="${escapeHtml(t("placeholder"))}"
            required
          ></textarea>
          <div class="chat-actions">
            <button type="submit" class="btn-primary">${escapeHtml(t("buttons.publishTask"))}</button>
            <button type="button" id="ask-status" class="btn-secondary">${escapeHtml(t("buttons.askStatus"))}</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderCheckinsContent() {
  const teamLine = state.agents
    .map((agent) => `${roleLabel(agent.id)}: ${getAgentTaskText(agent)}`)
    .join(" · ");

  return `
    <div class="stage-layout">
      <div class="info-block">
        <p class="eyebrow">${escapeHtml(t("stage.currentStatus"))}</p>
        <h3>${escapeHtml(formatPhase(state.currentTask.phase))}</h3>
        <div class="stage-meta">
          <span class="tag accent">${escapeHtml(roleLabel(state.currentTask.owner))}</span>
          <span class="tag">${escapeHtml(state.currentTask.id)}</span>
          <span class="tag">${escapeHtml(t("stage.progress"))} ${escapeHtml(String(state.currentTask.progress))}%</span>
        </div>
        <p>${escapeHtml(buildTaskSummary())}</p>
      </div>

      <div class="card-grid">
        <div class="info-block">
          <p class="eyebrow">${escapeHtml(t("stage.owner"))}</p>
          <h4>${escapeHtml(roleLabel(state.currentTask.owner))}</h4>
          <p>${escapeHtml(getCurrentTaskTitle())}</p>
        </div>
        <div class="info-block">
          <p class="eyebrow">${escapeHtml(t("stage.team"))}</p>
          <h4>${escapeHtml(t("stage.teamOverview"))}</h4>
          <p>${escapeHtml(teamLine)}</p>
        </div>
      </div>
    </div>
  `;
}

function renderTeamOverviewContent() {
  const layoutClass = state.teamOverviewLayout === "grid" ? "agent-grid is-grid" : "agent-grid is-list";

  return `
    <div class="${layoutClass}">
      ${state.agents
        .map(
          (agent) => `
            <article class="agent-card agent-card-${state.teamOverviewLayout}">
              <div class="agent-thumb" aria-hidden="true">${renderAgentIcon(agent.id)}</div>

              <div class="agent-card-body">
                <div class="agent-head">
                  <strong>${escapeHtml(roleLabel(agent.id))}</strong>
                  <span class="${badgeClass(agent.status)}">${escapeHtml(formatStatus(agent.status))}</span>
                </div>
                <p>${escapeHtml(roleDuty(agent.id))}</p>
                <p>${escapeHtml(getAgentTaskText(agent))}</p>
                <div class="skill-list">
                  ${agent.skills.map((skill) => `<span class="skill">${escapeHtml(skill)}</span>`).join("")}
                </div>
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
        <p class="eyebrow">${escapeHtml(t("stage.agent"))}</p>
        <div class="agent-head">
          <h3>${escapeHtml(roleLabel(agent.id))}</h3>
          <span class="${badgeClass(agent.status)}">${escapeHtml(formatStatus(agent.status))}</span>
        </div>
        <p>${escapeHtml(roleDuty(agent.id))}</p>
      </div>

      <div class="info-block">
        <p class="eyebrow">${escapeHtml(t("stage.currentTask"))}</p>
        <p>${escapeHtml(getAgentTaskText(agent))}</p>
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
        <p class="eyebrow">${escapeHtml(t("stage.currentTask"))}</p>
        <h3>${escapeHtml(getCurrentTaskTitle())}</h3>
        <p>${escapeHtml(getCurrentTaskDescription())}</p>
        <div class="task-meta">
          <span class="tag accent">${escapeHtml(formatPhase(state.currentTask.phase))}</span>
          <span class="tag">${escapeHtml(roleLabel(state.currentTask.owner))}</span>
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
        <p class="eyebrow">${escapeHtml(t("stage.stageFlow"))}</p>
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
                  <span>${escapeHtml(formatEventType(event.type))}</span>
                  <span>${escapeHtml(event.time)}</span>
                </div>
                <p>${escapeHtml(resolveTimelineText(event))}</p>
              </article>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderOptionGroup(options, activeId, dataAttribute) {
  return `
    <div class="theme-switcher">
      ${options
        .map(
          (option) => `
            <button
              class="theme-option ${activeId === option.id ? "is-active" : ""}"
              type="button"
              ${dataAttribute}="${escapeHtml(option.id)}"
            >
              <span class="theme-option-title">
                <strong>${escapeHtml(option.label)}</strong>
                <span>${activeId === option.id ? escapeHtml(t("app.active")) : ""}</span>
              </span>
              <span>${escapeHtml(option.note)}</span>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderThemeSettingsContent() {
  const options = ["default", "dark", "light"].map((id) => ({
    id,
    label: t(`themes.${id}.label`),
    note: t(`themes.${id}.note`),
  }));

  return `
    <div class="stage-layout">
      <div class="info-block">
        <p class="eyebrow">${escapeHtml(t("stage.appearance"))}</p>
        <h3>${escapeHtml(t("entries.theme"))}</h3>
        <p>${escapeHtml(t("stage.chooseTheme"))}</p>
        ${renderOptionGroup(options, state.theme, "data-theme-option")}
      </div>
    </div>
  `;
}

function renderLanguageSettingsContent() {
  const options = ["en", "zh-CN"].map((id) => ({
    id,
    label: t(`languages.${id}.label`),
    note: t(`languages.${id}.note`),
  }));

  return `
    <div class="stage-layout">
      <div class="info-block">
        <p class="eyebrow">${escapeHtml(t("stage.language"))}</p>
        <h3>${escapeHtml(t("entries.language"))}</h3>
        <p>${escapeHtml(t("stage.chooseLanguage"))}</p>
        ${renderOptionGroup(options, state.language, "data-language-option")}
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
  if (workspace === "settings" && entry === "language") return renderLanguageSettingsContent();

  return "";
}

function renderStage() {
  const workspace = getActiveWorkspace();
  const entry = getActiveEntry();
  const showTeamLayoutSwitch = state.activeWorkspace === "team" && getActiveEntryId() === "overview";
  const showTaskMeta = !showTeamLayoutSwitch && state.activeWorkspace !== "settings";

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

        ${
          showTeamLayoutSwitch
            ? `
              <div class="stage-header-meta stage-header-actions">
                <button
                  class="view-switch ${state.teamOverviewLayout === "list" ? "is-active" : ""}"
                  type="button"
                  data-team-layout="list"
                >
                  ${escapeHtml(t("stage.list"))}
                </button>
                <button
                  class="view-switch ${state.teamOverviewLayout === "grid" ? "is-active" : ""}"
                  type="button"
                  data-team-layout="grid"
                >
                  ${escapeHtml(t("stage.grid"))}
                </button>
              </div>
            `
            : showTaskMeta
              ? `
                <div class="stage-header-meta">
                  <span class="tag accent">${escapeHtml(formatPhase(state.currentTask.phase))}</span>
                  <span class="tag">${escapeHtml(roleLabel(state.currentTask.owner))}</span>
                  <span class="tag">${escapeHtml(state.currentTask.id)}</span>
                </div>
              `
              : ""
        }
      </header>

      ${renderStageContentBody()}
    </div>
  `;
}

function handleStatusQuestion() {
  pushMessage("user", t("responses.statusQuestion"));
  pushMessage(
    "leader",
    t("responses.statusAnswer", {
      phase: formatPhase(state.currentTask.phase),
      owner: roleLabel(state.currentTask.owner),
    })
  );
  renderApp();
}

function handleHandoffQuestion() {
  pushMessage("user", t("responses.handoffQuestion"));

  const activeAgents = state.agents
    .map((agent) => `${roleLabel(agent.id)}: ${formatStatus(agent.status)} / ${getAgentTaskText(agent)}`)
    .join(" · ");

  pushMessage("leader", t("responses.handoffAnswer", { agents: activeAgents }));
  renderApp();
}

function runTaskLifecycle(userInput) {
  if (simulationTimer) {
    clearTimeout(simulationTimer);
  }

  state.currentTask = {
    id: `task-${String(Math.floor(Math.random() * 900) + 100)}`,
    title: userInput.length > 64 ? `${userInput.slice(0, 64)}...` : userInput,
    description: userInput,
    phase: "pending",
    owner: "leader",
    progress: 8,
    lastUpdate: formatTime(),
  };

  pushMessage("leader", t("responses.taskReceived"));
  pushTimeline("task_created", t("timelineText.taskCreated"));
  setAgentStatusesByPhase("pending");
  renderApp();

  const steps = [
    {
      delay: 1000,
      run() {
        state.currentTask.phase = "planning";
        state.currentTask.owner = "planner";
        state.currentTask.progress = 32;
        state.currentTask.lastUpdate = formatTime();

        pushMessage("leader", t("responses.planning"));
        pushTimeline("planning_started", t("timelineText.planningStarted"));
        setAgentStatusesByPhase("planning");
        renderApp();
      },
    },
    {
      delay: 1400,
      run() {
        state.currentTask.phase = "writing";
        state.currentTask.owner = "writer";
        state.currentTask.progress = 68;
        state.currentTask.lastUpdate = formatTime();

        pushMessage("leader", t("responses.writing"));
        pushTimeline("writing_started", t("timelineText.writingStarted"));
        setAgentStatusesByPhase("writing");
        renderApp();
      },
    },
    {
      delay: 1400,
      run() {
        state.currentTask.phase = "reviewing";
        state.currentTask.owner = "reviewer";
        state.currentTask.progress = 86;
        state.currentTask.lastUpdate = formatTime();

        pushMessage("leader", t("responses.reviewing"));
        pushTimeline("review_started", t("timelineText.reviewStarted"));
        setAgentStatusesByPhase("reviewing");
        renderApp();
      },
    },
    {
      delay: 1400,
      run() {
        state.currentTask.phase = "completed";
        state.currentTask.owner = "leader";
        state.currentTask.progress = 100;
        state.currentTask.lastUpdate = formatTime();

        pushMessage("leader", t("responses.completed"));
        pushTimeline("final_output_ready", t("timelineText.finalReady"));
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

function bindStageActions() {
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const askStatusBtn = document.getElementById("ask-status");
  const quickButtons = [...document.querySelectorAll(".quick-btn")];
  const treeItems = [...document.querySelectorAll(".tree-item")];
  const themeButtons = [...document.querySelectorAll("[data-theme-option]")];
  const languageButtons = [...document.querySelectorAll("[data-language-option]")];
  const teamLayoutButtons = [...document.querySelectorAll("[data-team-layout]")];

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

      pushMessage("user", value);
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
          input.value = t("demo.demoPrompt");
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

  languageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      saveLanguage(button.dataset.languageOption);
      renderApp();
    });
  });

  teamLayoutButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.teamOverviewLayout = button.dataset.teamLayout;
      renderApp();
    });
  });
}

function renderApp() {
  desktopLayoutEl.classList.toggle("sidebar-collapsed", state.sidebarCollapsed);

  railButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.workspace === state.activeWorkspace);
  });

  updateShellChrome();
  renderSidebar();
  renderStage();
  bindStageActions();
}

railButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveWorkspace(button.dataset.workspace);
  });
});

loadLanguage();
loadTheme();
setAgentStatusesByPhase(state.currentTask.phase);
renderApp();
