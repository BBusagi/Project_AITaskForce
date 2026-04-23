const phases = ["pending", "planning", "writing", "reviewing", "revising", "human_confirmation", "completed"];
const ROUTABLE_AGENT_IDS = new Set(["leader", "planner", "writer", "reviewer"]);
const PHASE_START_EVENTS = {
  task_created: "pending",
  planning_started: "planning",
  writing_started: "writing",
  revision_started: "revising",
  review_started: "reviewing",
  human_confirmation_required: "human_confirmation",
  final_output_ready: "completed",
};

const THEME_STORAGE_KEY = "atf-desktop-theme";
const LANGUAGE_STORAGE_KEY = "atf-desktop-language";
const API_BASE_URL = "http://127.0.0.1:8787/api";
const TASK_POLL_INTERVAL_MS = 1500;

const PROVIDER_LABELS = {
  ollama: "Ollama Local",
  openai: "GPT API",
  anthropic: "Claude API",
};

function createDefaultProviders() {
  return {
    ollama: {
      id: "ollama",
      label: PROVIDER_LABELS.ollama,
      configured: true,
      available: false,
    },
    openai: {
      id: "openai",
      label: PROVIDER_LABELS.openai,
      configured: false,
      available: false,
    },
    anthropic: {
      id: "anthropic",
      label: PROVIDER_LABELS.anthropic,
      configured: false,
      available: false,
    },
  };
}

function createDefaultRoutes() {
  return {
    leader: null,
    planner: null,
    writer: null,
    reviewer: null,
  };
}

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
      projects: "Projects",
      usage: "Usage",
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
        projects: "Projects workspace",
        usage: "Usage workspace",
        settings: "Settings workspace",
      },
    },
    groups: {
      threads: "Threads",
      actions: "Actions",
      views: "Views",
      agents: "Agents",
      current: "Current",
      portfolio: "Portfolio",
      modules: "Modules",
      breakdown: "Breakdown",
      tasks: "Tasks",
      appearance: "Appearance",
      localization: "Localization",
      modelRouting: "Model Routing",
    },
    entries: {
      thread: "Leader Thread",
      checkins: "Check-ins",
      directChats: "Chats",
      overview: "Overview",
      stages: "Stage Flow",
      timeline: "Timeline",
      portfolio: "Portfolio Overview",
      teamUsage: "By Team",
      projectUsage: "By Project",
      budget: "Budget",
      llm: "LLM",
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
      off: "Off",
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
      revising: "Revising",
      human_confirmation: "Human Confirm",
      completed: "Completed",
    },
    events: {
      task_created: "Task Created",
      task_started: "Task Started",
      retry_started: "Retry Started",
      planning_started: "Planning Started",
      planning_completed: "Planning Completed",
      writing_started: "Writing Started",
      writing_completed: "Writing Completed",
      review_started: "Review Started",
      review_passed: "Review Passed",
      review_failed: "Review Failed",
      revision_started: "Revision Started",
      revision_completed: "Revision Completed",
      human_confirmation_required: "Human Confirmation Required",
      final_output_ready: "Final Output Ready",
      task_failed: "Task Failed",
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
      moduleBreakdown: "Module Breakdown",
      workspaceSurface: "Workspace Surfaces",
      chooseTheme: "Choose how the desktop shell should look.",
      chooseLanguage: "Choose the interface language for the desktop shell.",
      list: "List",
      grid: "Grid",
      progress: "Progress",
      finalOutput: "Final Output",
      intermediateOutputs: "Intermediate Outputs",
      outputPending: "Output will appear here after Leader completes final synthesis.",
      modelRequest: "Model Request",
      requestRunning: "Running",
      requestCompleted: "Completed",
      requestTimeout: "Timeout",
      requestFailed: "Failed",
      requestUnknown: "Unknown",
      duration: "Duration",
      responseSize: "Response",
      timeout: "Timeout",
      model: "Model",
      modelRoute: "Model Route",
      llmFilters: "LLM Filters",
      llmFiltersNote: "Enable the model candidates that are allowed to appear in agent routing menus.",
      localModels: "Local LLM",
      localModelsNote: "List every detected local model and choose which ones can be assigned to agents.",
      apiModels: "API LLM",
      apiModelsNote: "List every remote API model and choose which ones can be assigned to agents.",
      enabled: "Enabled",
      disabled: "Disabled",
      default: "Default",
      connected: "Ollama Connected",
      disconnected: "Ollama Unavailable",
      noModels: "No models found",
      syncFailed: "Model update failed",
    },
    projectsPanel: {
      portfolioIntro: "Track the main project and each delivery module from one desktop shell.",
      totalSurfaces: "Project Surfaces",
      moduleCount: "Module Workspaces",
      openBugs: "Open Bugs",
      avgProgress: "Average Progress",
      bugs: "Bugs",
      owner: "Owner",
      workspaces: "Workspaces",
      highlights: "Highlights",
      status: "Stage",
      progress: "Progress",
    },
    usagePanel: {
      teamIntro: "Visualize token burn by individual team roles.",
      projectIntro: "Compare token consumption across projects and modules.",
      budgetIntro: "Track current monthly usage, projected burn, and routing mix.",
      totalTokens: "Total Tokens",
      estimatedCost: "Estimated Cost",
      topConsumer: "Top Consumer",
      remoteShare: "Remote Share",
      localShare: "Local Share",
      monthlyBudget: "Monthly Budget",
      projectedUsage: "Projected Usage",
      routingMix: "Routing Mix",
      requests: "Requests",
      tokens: "Tokens",
      cost: "Cost",
      byRole: "By Role",
      byProject: "By Project",
    },
    buttons: {
      askProgress: "Ask Current Progress",
      askOwner: "Ask Current Owner",
      publishTask: "Publish Task",
      askStatus: "Ask Status",
      openChat: "Open Chat",
      sendMessage: "Send Message",
      taskCreation: "Task Creation",
      confirmPublish: "Confirm Publish",
      continueNegotiation: "Continue Negotiation",
      retryTask: "Retry Task",
      retryFailedStep: "Retry Failed Step",
      archiveTask: "Archive",
      deleteTask: "Delete",
    },
    chatPanel: {
      leaderThreadIntro: "Requirement negotiation",
      leaderIntro: "Leader conversation",
      directIntro: "Direct conversation",
      inputLabel: "Message",
      inputPlaceholder: "Discuss scope, missing details, and acceptance boundaries with Leader...",
      publishReady: "Task publication review",
      publishReadyNote: "Leader has prepared a task draft. Confirm to publish it into the workflow.",
      noDirectChats: "No direct agent chats yet. Open one from the Team workspace.",
    },
    placeholder:
      "Example: Translate this paragraph into English and Japanese, then review whether the wording is natural.",
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
      noActiveTask: "No active task",
      designerStub: "stub: reserved for future design integration",
      programmerStub: "stub: reserved for future development",
    },
    summary: {
      empty: "No task has been published yet. Open a Leader chat and use Task Creation when a request is ready to run.",
      pending: "Leader has received the task and is preparing the fixed workflow.",
      planning: "Planner is turning the confirmed request into execution steps, constraints, and agent handoffs.",
      writing: "Writer is producing the requested draft or transformation from the planner output.",
      reviewing: "Reviewer is checking completeness, clarity, consistency, and instruction adherence.",
      revising: "Writer is applying Reviewer feedback before the next quality check.",
      human_confirmation: "Automated review reached its retry limit and needs manual confirmation.",
      completed: "The current task is complete and ready for inspection.",
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
        "Task received. Leader has published the request into the fixed workflow.",
      planning:
        "Planner has started work and is defining the execution boundary and output format.",
      writing:
        "Planner has completed the breakdown. Writer is now producing the requested output.",
      reviewing:
        "Reviewer is checking whether the output follows the original request and quality boundary.",
      completed:
        "The current task is complete. Open the Task workspace to inspect the final output and intermediate stages.",
    },
    timelineText: {
      taskCreated: "A new task was added to the system.",
      planningStarted: "Planner started decomposing the request.",
      writingStarted: "Writer started producing workspace content.",
      reviewStarted: "Reviewer started checking the output.",
      finalReady: "Leader delivered the final response.",
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
      projects: "项目",
      usage: "用量",
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
        projects: "项目工作区",
        usage: "用量工作区",
        settings: "设置工作区",
      },
    },
    groups: {
      threads: "会话",
      actions: "操作",
      views: "视图",
      agents: "成员",
      current: "当前",
      portfolio: "项目总览",
      modules: "模块",
      breakdown: "拆分",
      tasks: "任务",
      appearance: "外观",
      localization: "语言",
    },
    entries: {
      thread: "Leader 会话",
      checkins: "进度检查",
      directChats: "会话",
      overview: "概览",
      stages: "阶段流转",
      timeline: "时间线",
      portfolio: "项目总览",
      teamUsage: "按团队",
      projectUsage: "按项目",
      budget: "预算",
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
      revising: "修订中",
      human_confirmation: "人工确认",
      completed: "已完成",
    },
    events: {
      task_created: "任务已创建",
      planning_started: "开始规划",
      writing_started: "开始生成",
      review_started: "开始审核",
      revision_started: "开始修订",
      revision_completed: "修订完成",
      human_confirmation_required: "需要人工确认",
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
      moduleBreakdown: "模块拆分",
      workspaceSurface: "工作区表面",
      chooseTheme: "选择桌面壳层的显示主题。",
      chooseLanguage: "选择桌面壳层的界面语言。",
      list: "列表",
      grid: "网格",
      progress: "进度",
      finalOutput: "最终输出",
      intermediateOutputs: "中间输出",
      outputPending: "Leader 完成最终整合后，输出结果会显示在这里。",
      modelRequest: "模型请求",
      requestRunning: "运行中",
      requestCompleted: "已完成",
      requestTimeout: "已超时",
      requestFailed: "失败",
      requestUnknown: "未知",
      duration: "耗时",
      responseSize: "响应",
      timeout: "超时",
      model: "模型",
      modelRoute: "模型路由",
      connected: "Ollama 已连接",
      disconnected: "Ollama 不可用",
      noModels: "未发现可用模型",
      syncFailed: "模型切换失败",
    },
    projectsPanel: {
      portfolioIntro: "在同一个桌面壳层里追踪主项目和各个交付模块。",
      totalSurfaces: "项目面板数",
      moduleCount: "模块工作区",
      openBugs: "未关闭 Bug",
      avgProgress: "平均进度",
      bugs: "Bug 数",
      owner: "负责人",
      workspaces: "工作区",
      highlights: "关键点",
      status: "开发阶段",
      progress: "进度",
    },
    usagePanel: {
      teamIntro: "按团队成员角色可视化 token 消耗。",
      projectIntro: "对比不同项目和模块的 token 消耗。",
      budgetIntro: "跟踪当前月度消耗、预测用量和模型路由占比。",
      totalTokens: "总 Tokens",
      estimatedCost: "预估成本",
      topConsumer: "最高消耗者",
      remoteShare: "远程模型占比",
      localShare: "本地模型占比",
      monthlyBudget: "月度预算",
      projectedUsage: "预测用量",
      routingMix: "路由占比",
      requests: "请求数",
      tokens: "Tokens",
      cost: "成本",
      byRole: "按角色",
      byProject: "按项目",
    },
    buttons: {
      askProgress: "询问当前进度",
      askOwner: "询问当前负责人",
      publishTask: "发布任务",
      askStatus: "询问状态",
      openChat: "打开会话",
      sendMessage: "发送消息",
      taskCreation: "任务创建",
      confirmPublish: "确认发布",
      continueNegotiation: "继续协商",
      retryTask: "重新尝试任务",
      retryFailedStep: "重试失败环节",
      archiveTask: "归档",
      deleteTask: "删除",
    },
    chatPanel: {
      leaderThreadIntro: "需求协商",
      leaderIntro: "Leader 会话",
      directIntro: "直接会话",
      inputLabel: "消息内容",
      inputPlaceholder: "和 Leader 协商范围、不明确点和验收边界...",
      publishReady: "任务发布确认",
      publishReadyNote: "Leader 已经准备好任务草案。确认后会正式发布到工作流。",
      noDirectChats: "还没有 agent 直接会话，请先从 Team 工作区创建。",
    },
    placeholder:
      "例如：把这段文字翻译为英文和日文，并检查表达是否自然。",
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
      noActiveTask: "暂无当前任务",
      designerStub: "stub: 预留给后续设计能力接入",
      programmerStub: "stub: 预留给后续开发能力接入",
    },
    summary: {
      empty: "当前还没有发布任务。请打开 Leader 会话，并在需求明确后使用 Task Creation 发布。",
      pending: "Leader 已接收任务，正在准备进入固定工作流。",
      planning: "Planner 正在把已确认需求拆解为执行步骤、约束和 agent 分工。",
      writing: "Writer 正在根据规划输出生成本次任务需要的内容。",
      reviewing: "Reviewer 正在检查完整性、清晰度、一致性和指令遵循情况。",
      revising: "Writer 正在根据 Reviewer 的反馈修订输出，然后进入下一轮审核。",
      human_confirmation: "自动审核已达到重试上限，需要人工确认。",
      completed: "当前任务已完成，可以查看最终输出。",
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
      taskReceived: "任务已接收。Leader 已将需求发布到固定工作流。",
      planning: "Planner 已开始工作，正在定义执行边界和输出格式。",
      writing: "Planner 已完成拆解，Writer 正在生成本次任务需要的输出。",
      reviewing: "Reviewer 正在检查输出是否符合原始需求和质量边界。",
      completed: "当前任务已完成。请进入 Task 工作区查看最终输出和中间阶段。",
    },
    timelineText: {
      taskCreated: "新任务已加入系统。",
      planningStarted: "Planner 开始拆解需求。",
      writingStarted: "Writer 开始生成工作区内容。",
      reviewStarted: "Reviewer 开始检查输出。",
      finalReady: "Leader 已完成最终交付。",
    },
  },
};

const state = {
  activeWorkspace: "chat",
  activeEntry: {
    chat: "checkins",
    team: "overview",
    task: "overview",
    projects: "portfolio",
    usage: "teamUsage",
    settings: "llm",
  },
  teamOverviewLayout: "list",
  sidebarCollapsed: false,
  theme: "default",
  language: "en",
  scrollPositions: {},
  tasks: [],
  nextLocalTaskNumber: 1,
  currentTask: {
    id: "--",
    status: "pending",
    titleKey: "agentTasks.noActiveTask",
    descriptionKey: "summary.empty",
    phase: "pending",
    owner: "leader",
    progress: 0,
    lastUpdate: "--",
    updatedAt: null,
    finalOutput: null,
    errorMessage: null,
    subtasks: [],
    events: [],
    isEmpty: true,
  },
  agents: [
    {
      id: "leader",
      status: "idle",
      taskKey: "agentTasks.leaderNext",
      skills: ["routing", "planning-handoff", "final-response"],
    },
    {
      id: "planner",
      status: "idle",
      taskKey: "agentTasks.plannerWait",
      skills: ["task-breakdown", "constraints", "output-schema"],
    },
    {
      id: "writer",
      status: "idle",
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
  messages: [],
  chatConversations: [],
  timeline: [],
  connection: {
    apiBaseUrl: API_BASE_URL,
    backendAvailable: false,
    activeTaskId: null,
    providers: createDefaultProviders(),
    models: [],
    allModels: [],
    defaultRouteId: "openai::gpt-5.4-2026-03-05",
    enabledRouteIds: [],
    configuredRoutes: createDefaultRoutes(),
  },
  projects: {
    records: [
      {
        id: "project-atf",
        kind: "project",
        name: {
          en: "AI Task Force",
          "zh-CN": "AI Task Force",
        },
        summary: {
          en: "Shared product model across Web and Desktop clients with a dialogue-first workspace shell.",
          "zh-CN": "Web 与 Desktop 共用产品模型，并统一为对话优先的工作区壳层。",
        },
        stage: {
          en: "Integration",
          "zh-CN": "集成中",
        },
        owner: "leader",
        bugs: 14,
        progress: 72,
        workspaces: ["Desktop", "Web", "Gateway", "Models"],
        highlights: [
          {
            en: "Desktop shell now uses an outer rail with a collapsible middle sidebar.",
            "zh-CN": "Desktop 壳层已经改为最外层 rail 加可收起中栏。",
          },
          {
            en: "Shared task semantics remain aligned across both clients.",
            "zh-CN": "两个客户端仍共享同一套任务语义和状态模型。",
          },
        ],
        childIds: ["desktop-client", "web-client", "model-gateway"],
      },
      {
        id: "desktop-client",
        kind: "module",
        parentId: "project-atf",
        name: {
          en: "Desktop Client",
          "zh-CN": "Desktop 客户端",
        },
        summary: {
          en: "Electron dialogue-first shell with Team, Projects, Usage, Task, and Settings workspaces.",
          "zh-CN": "Electron 对话优先壳层，包含 Team、Projects、Usage、Task 和 Settings 工作区。",
        },
        stage: {
          en: "Polish",
          "zh-CN": "打磨中",
        },
        owner: "programmer",
        bugs: 3,
        progress: 82,
        workspaces: ["Shell", "Team", "Projects", "Usage"],
        highlights: [
          {
            en: "Language settings now switch between English and Simplified Chinese.",
            "zh-CN": "语言设置已经支持英文和简体中文切换。",
          },
          {
            en: "Middle sidebar behavior mirrors Slack / VS Code style collapsing.",
            "zh-CN": "中栏交互已经接近 Slack / VS Code 的收起逻辑。",
          },
        ],
      },
      {
        id: "web-client",
        kind: "module",
        parentId: "project-atf",
        name: {
          en: "Web Client",
          "zh-CN": "Web 客户端",
        },
        summary: {
          en: "Browser workspace MVP focused on the shared task model and timeline rendering.",
          "zh-CN": "浏览器端 MVP，重点在共享任务模型和时间线展示。",
        },
        stage: {
          en: "Iteration",
          "zh-CN": "迭代中",
        },
        owner: "writer",
        bugs: 5,
        progress: 64,
        workspaces: ["Workspace", "Agents", "Timeline"],
        highlights: [
          {
            en: "Needs tighter project-level navigation to match the Desktop shell.",
            "zh-CN": "还需要补齐更强的项目级导航，和 Desktop 壳层保持一致。",
          },
          {
            en: "Timeline and task detail views are already aligned with the shared data model.",
            "zh-CN": "时间线和任务详情视图已经对齐共享数据模型。",
          },
        ],
      },
      {
        id: "model-gateway",
        kind: "module",
        parentId: "project-atf",
        name: {
          en: "Model Gateway",
          "zh-CN": "模型网关",
        },
        summary: {
          en: "Routing layer for GPT and local Ollama workloads, with review-focused remote usage.",
          "zh-CN": "为 GPT 和本地 Ollama 提供统一路由，审核与最终输出偏向远程模型。",
        },
        stage: {
          en: "Validation",
          "zh-CN": "验证中",
        },
        owner: "reviewer",
        bugs: 2,
        progress: 58,
        workspaces: ["Planner", "Writer", "Reviewer"],
        highlights: [
          {
            en: "Remote and local routing split is stable but still needs cost controls.",
            "zh-CN": "远程和本地模型的路由策略已经稳定，但还需要成本控制。",
          },
          {
            en: "Usage reporting is now exposed in the new Usage workspace.",
            "zh-CN": "新的 Usage 工作区已经开始暴露消耗统计信息。",
          },
        ],
      },
    ],
  },
  usage: {
    team: [
      { id: "leader", tokens: 124000, cost: 4.86, requests: 96, share: 29 },
      { id: "planner", tokens: 98000, cost: 3.94, requests: 72, share: 23 },
      { id: "writer", tokens: 76000, cost: 1.12, requests: 148, share: 18 },
      { id: "reviewer", tokens: 82000, cost: 3.28, requests: 64, share: 19 },
      { id: "designer", tokens: 24000, cost: 0.42, requests: 18, share: 6 },
      { id: "programmer", tokens: 18000, cost: 0.31, requests: 14, share: 5 },
    ],
    projects: [
      { id: "project-atf", tokens: 176000, cost: 6.48, requests: 132, share: 41 },
      { id: "desktop-client", tokens: 112000, cost: 3.84, requests: 104, share: 26 },
      { id: "web-client", tokens: 86000, cost: 1.74, requests: 92, share: 20 },
      { id: "model-gateway", tokens: 54000, cost: 1.87, requests: 84, share: 13 },
    ],
    budget: {
      cap: 480000,
      used: 428000,
      projected: 452000,
      remoteShare: 67,
      localShare: 33,
    },
  },
};

let simulationTimer = null;
let taskPollTimer = null;

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
  const label = t(`events.${type}`);
  if (label !== `events.${type}`) return label;
  return String(type || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function roleLabel(roleId) {
  return t(`roles.${roleId}`);
}

function roleDuty(roleId) {
  return t(`duties.${roleId}`);
}

function pickText(value) {
  if (typeof value === "string") return value;
  if (!value) return "";
  return value[state.language] || value.en || Object.values(value)[0] || "";
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat(getLocale(), {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercent(value) {
  return `${value}%`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTimestamp(value) {
  if (!value) return formatTime();
  return formatTime(new Date(value));
}

function formatDurationMs(value) {
  const ms = Number(value);
  if (!Number.isFinite(ms) || ms < 0) return "--";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function normalizeEventType(event) {
  return event.eventType || event.type;
}

function normalizeEventTime(event) {
  return event.createdAt || event.timestamp || event.time;
}

function taskTimelineLabel(event) {
  const title = event.taskTitle || event.taskId || getCurrentTaskTitle();
  const id = event.taskId && title !== event.taskId ? ` · ${event.taskId}` : "";
  return `${title}${id}`;
}

function buildStageFlowRows() {
  const events = (state.currentTask.events || [])
    .map((event) => ({
      type: normalizeEventType(event),
      time: new Date(normalizeEventTime(event)).getTime(),
    }))
    .filter((event) => event.type && Number.isFinite(event.time))
    .sort((left, right) => left.time - right.time);
  const rows = phases.map((phase) => ({
    phase,
    durationMs: 0,
    startTime: null,
    status: "pending",
    isRunning: false,
  }));
  const rowByPhase = new Map(rows.map((row) => [row.phase, row]));
  let activePhase = null;
  let activeStart = null;

  for (const event of events) {
    const nextPhase = PHASE_START_EVENTS[event.type];
    if (!nextPhase) continue;

    if (activePhase && activeStart != null && event.time >= activeStart) {
      rowByPhase.get(activePhase).durationMs += event.time - activeStart;
    }

    activePhase = nextPhase;
    activeStart = event.time;
    const row = rowByPhase.get(nextPhase);
    row.startTime = row.startTime ?? event.time;
  }

  const currentStatus = state.currentTask.status || state.currentTask.phase;
  const currentPhase = state.currentTask.phase;
  const terminalStatuses = new Set(["completed", "failed"]);
  if (activePhase && activeStart != null) {
    const endTime =
      terminalStatuses.has(currentStatus) && state.currentTask.updatedAt
        ? new Date(state.currentTask.updatedAt).getTime()
        : Date.now();
    if (Number.isFinite(endTime) && endTime >= activeStart && activePhase !== "completed") {
      rowByPhase.get(activePhase).durationMs += endTime - activeStart;
    }
  }

  const currentIndex = phases.indexOf(currentPhase);
  return rows.map((row, index) => {
    if (currentStatus === "failed" && row.phase === currentPhase) {
      return { ...row, status: "failed" };
    }
    if (currentStatus === "human_confirmation" && row.phase === "human_confirmation") {
      return { ...row, status: "warning" };
    }
    if (currentStatus === "completed" && index <= currentIndex) {
      return { ...row, status: "done" };
    }
    if (index < currentIndex) {
      return { ...row, status: "done" };
    }
    if (row.phase === currentPhase && !terminalStatuses.has(currentStatus) && currentStatus !== "human_confirmation") {
      return { ...row, status: "active", isRunning: true };
    }
    return row;
  });
}

function getInvocationDuration(invocation) {
  if (!invocation) return null;
  if (Number.isFinite(Number(invocation.durationMs))) return Number(invocation.durationMs);
  if (invocation.startedAt && invocation.status === "running") {
    const startedAt = new Date(invocation.startedAt).getTime();
    if (Number.isFinite(startedAt)) return Date.now() - startedAt;
  }
  return null;
}

function formatInvocationStatus(status) {
  const map = {
    running: "stage.requestRunning",
    completed: "stage.requestCompleted",
    timeout: "stage.requestTimeout",
    failed: "stage.requestFailed",
  };
  return t(map[status] || "stage.requestUnknown");
}

function taskProgressByStatus(status) {
  const map = {
    pending: 8,
    planning: 32,
    writing: 68,
    reviewing: 86,
    revising: 78,
    human_confirmation: 96,
    completed: 100,
    failed: 100,
  };
  return map[status] ?? 0;
}

function normalizeTaskPhase(status) {
  if (status === "failed") return "reviewing";
  if (status === "revising") return "revising";
  if (status === "human_confirmation") return "human_confirmation";
  if (phases.includes(status)) return status;
  return "pending";
}

function getCurrentTaskTitle() {
  return state.currentTask.titleKey ? t(state.currentTask.titleKey) : state.currentTask.title;
}

function getCurrentTaskDescription() {
  return state.currentTask.descriptionKey ? t(state.currentTask.descriptionKey) : state.currentTask.description;
}

function resetCurrentTaskView() {
  state.connection.activeTaskId = null;
  state.currentTask = {
    id: "--",
    status: "pending",
    titleKey: "agentTasks.noActiveTask",
    descriptionKey: "summary.empty",
    phase: "pending",
    owner: "leader",
    progress: 0,
    lastUpdate: "--",
    updatedAt: null,
    finalOutput: null,
    errorMessage: null,
    subtasks: [],
    events: [],
    isEmpty: true,
  };
  state.messages = [];
  state.timeline = [];
  state.activeEntry.task = "overview";
}

function getAgentById(id) {
  return state.agents.find((agent) => agent.id === id);
}

function getProjectRecord(id) {
  return state.projects.records.find((record) => record.id === id);
}

function isTaskEntry(entryId) {
  return typeof entryId === "string" && entryId.startsWith("task_");
}

function isAgentChatEntry(entryId) {
  return typeof entryId === "string" && entryId.startsWith("chat-agent-");
}

function buildAgentChatId(agentId) {
  return `chat-agent-${agentId}`;
}

function getConversationById(conversationId) {
  return state.chatConversations.find((conversation) => conversation.id === conversationId) || null;
}

function getAgentConversation(agentId) {
  return getConversationById(buildAgentChatId(agentId));
}

function buildAgentGreeting(agentId) {
  return (
    {
    leader: "Open a direct thread with the Leader to discuss routing, synthesis, and final delivery.",
    planner: "Open a direct thread with the Planner to discuss task structure, constraints, and sequencing.",
    writer: "Open a direct thread with the Writer to request drafts, rewrites, and formatting changes.",
    reviewer: "Open a direct thread with the Reviewer to inspect quality, issues, and approval logic.",
    designer: "Designer is still a stub, but this thread can be used as the future entry point for visual direction.",
    programmer: "Programmer is still a stub, but this thread can be used as the future entry point for implementation work.",
    }[agentId] || "Direct agent thread created."
  );
}

function createAgentConversation(agentId) {
  const existingConversation = getAgentConversation(agentId);
  if (existingConversation) return existingConversation;

  const conversation = {
    id: buildAgentChatId(agentId),
    agentId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [
      {
        id: `chat-${Date.now()}-${agentId}`,
        sender: agentId,
        time: formatTime(),
        text: buildAgentGreeting(agentId),
        isLocal: true,
      },
    ],
  };

  state.chatConversations.unshift(conversation);
  return conversation;
}

function openAgentConversation(agentId) {
  const conversation = createAgentConversation(agentId);
  state.activeWorkspace = "chat";
  state.activeEntry.chat = conversation.id;
  state.sidebarCollapsed = false;
  renderApp();
}

function appendConversationMessage(conversationId, sender, text, metadata = {}) {
  const conversation = getConversationById(conversationId);
  if (!conversation) return;

  conversation.messages.push({
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sender,
    time: formatTime(),
    text,
    ...metadata,
  });
  conversation.updatedAt = Date.now();
}

function buildModelContextMessages(messages) {
  return messages
    .filter((message) => !message.isLocal && !message.isError)
    .map((message) => ({
      role: message.sender === "user" ? "user" : "assistant",
      content: resolveMessageText(message),
    }))
    .filter((message) => message.content.trim().length > 0)
    .slice(-10);
}

async function requestRoleReply(role, messages) {
  const modelMessages = buildModelContextMessages(messages);

  const result = await apiFetch("/chat", {
    method: "POST",
    body: JSON.stringify({
      role,
      messages: modelMessages,
    }),
  });

  return result;
}

async function requestAgentReply(conversation) {
  return requestRoleReply(conversation.agentId, conversation.messages);
}

function formatModelRequestError(error) {
  const message = error?.message || String(error);
  const jsonMatch = message.match(/\{.*\}$/);

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.error || message;
    } catch {}
  }

  return message;
}

function buildLeaderTaskDraft(taskInput) {
  const normalizedInput = taskInput.trim();
  const latestInput = normalizedInput || getCurrentTaskTitle();
  const title = latestInput.length > 48 ? `${latestInput.slice(0, 48)}...` : latestInput;

  return {
    title,
    input: normalizedInput || latestInput,
    milestones: [
      "Planner defines objective, constraints, and output format.",
      "Planner assigns the required specialist agents.",
      "Writer produces the requested draft or transformation.",
      "Reviewer checks completeness, clarity, and instruction adherence.",
      "Leader delivers the final response after review.",
    ],
  };
}

function formatLeaderTaskDraft(draft) {
  return [
    `Task draft: ${draft.title}`,
    "",
    "Scope:",
    draft.input,
    "",
    "Milestones:",
    ...draft.milestones.map((milestone, index) => `${index + 1}. ${milestone}`),
  ].join("\n");
}

function createLeaderTaskDraft(conversationId, taskInput) {
  const conversation = getConversationById(conversationId);
  if (!conversation || conversation.agentId !== "leader") return;

  const draft = buildLeaderTaskDraft(taskInput);
  appendConversationMessage(conversationId, "user", taskInput, { taskIntent: true });
  conversation.taskCreation = {
    status: "awaiting_publish_confirmation",
    draft,
  };
  appendConversationMessage(conversationId, "leader", `${formatLeaderTaskDraft(draft)}\n\nPlease review the publication card below and confirm to publish.`);
  renderApp();
}

function publishLeaderTaskDraft(conversationId) {
  const conversation = getConversationById(conversationId);
  const draft = conversation?.taskCreation?.draft;
  if (!conversation || !draft) return;

  conversation.taskCreation = {
    status: "published",
    draft: null,
  };
  appendConversationMessage(
    conversationId,
    "leader",
    `Task published.\n\n${formatLeaderTaskDraft(draft)}\n\nPlanner is now responsible for subtask breakdown and agent assignment.`
  );
  void runTaskLifecycle(draft.input);
  renderApp();
}

function cancelLeaderTaskDraft(conversationId) {
  const conversation = getConversationById(conversationId);
  if (!conversation) return;

  conversation.taskCreation = {
    status: "paused",
    draft: null,
  };
  appendConversationMessage(conversationId, "leader", "Task publication paused. Continue the natural conversation or use Task Creation again.");
  renderApp();
}

async function sendConversationMessage(conversationId, text) {
  const conversation = getConversationById(conversationId);
  if (!conversation) return;

  appendConversationMessage(conversationId, "user", text);
  renderApp();

  try {
    await refreshBackendAvailability();
    if (state.connection.backendAvailable) {
      const reply = await requestAgentReply(conversation);
      appendConversationMessage(
        conversationId,
        conversation.agentId,
        reply.text || "Model returned an empty response.",
        {
          provider: reply.provider,
          model: reply.model,
        }
      );
      renderApp();
      return;
    }
  } catch (error) {
    appendConversationMessage(
      conversationId,
      conversation.agentId,
      `Model request failed: ${formatModelRequestError(error)}`,
      { isError: true }
    );
    renderApp();
    return;
  }

  appendConversationMessage(
    conversationId,
    conversation.agentId,
    "Model request failed: backend is unavailable. Restart the ATF server and try again.",
    { isError: true }
  );
  renderApp();
}

function getProjectName(record) {
  return pickText(record?.name);
}

function getProjectSummary(record) {
  return pickText(record?.summary);
}

function getProjectStage(record) {
  return pickText(record?.stage);
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
          items: [{ id: "checkins", label: t("entries.checkins"), meta: t("meta.count2") }],
        },
        {
          label: t("entries.directChats"),
          items: [
            ...[...state.chatConversations]
              .sort((left, right) => right.updatedAt - left.updatedAt)
              .map((conversation) => ({
                id: conversation.id,
                label: roleLabel(conversation.agentId),
                meta: metaFromStatus(getAgentById(conversation.agentId)?.status || "idle"),
              })),
          ],
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
            { id: "stages", label: t("entries.stages"), meta: String(phases.length) },
            { id: "timeline", label: t("entries.timeline"), meta: t("meta.log") },
          ],
        },
        {
          label: t("groups.tasks"),
          items: state.tasks.map((task) => ({
            id: task.id,
            label: task.title,
            meta: formatPhase(normalizeTaskPhase(task.status)),
          })),
        },
      ],
    },
    projects: {
      title: t("rail.projects"),
      groups: [
        {
          label: t("groups.portfolio"),
          items: [{ id: "portfolio", label: t("entries.portfolio"), meta: formatCompactNumber(state.projects.records.length) }],
        },
        {
          label: t("groups.modules"),
          items: state.projects.records.map((record) => ({
            id: record.id,
            label: getProjectName(record),
            meta: formatPercent(record.progress),
          })),
        },
      ],
    },
    usage: {
      title: t("rail.usage"),
      groups: [
        {
          label: t("groups.breakdown"),
          items: [
            { id: "teamUsage", label: t("entries.teamUsage"), meta: formatCompactNumber(state.usage.team.length) },
            { id: "projectUsage", label: t("entries.projectUsage"), meta: formatCompactNumber(state.usage.projects.length) },
            { id: "budget", label: t("entries.budget"), meta: formatPercent(Math.round((state.usage.budget.used / state.usage.budget.cap) * 100)) },
          ],
        },
      ],
    },
    settings: {
      title: t("rail.settings"),
      groups: [
        {
          label: t("groups.modelRouting"),
          items: [{ id: "llm", label: t("entries.llm"), meta: formatCompactNumber(state.connection.enabledRouteIds.length) }],
        },
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
  if (state.currentTask.isEmpty) return t("summary.empty");
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

  const baseRuntime = window.desktopBridge?.runtime || t("rail.browserPreview");
  runtimeBadgeEl.textContent = state.connection.backendAvailable ? `${baseRuntime} + API` : baseRuntime;
}

function setActiveWorkspace(workspace) {
  if (state.activeWorkspace === workspace) {
    state.sidebarCollapsed = !state.sidebarCollapsed;
  } else {
    state.activeWorkspace = workspace;
    state.sidebarCollapsed = false;
  }

  renderApp();
  syncRuntimeModelsForActiveAgent();

  if (workspace === "task") {
    void Promise.all([refreshTaskList(), refreshTeamTimeline()]).then(() => {
      renderApp();
    });
  }
}

function setActiveEntry(entryId) {
  state.activeEntry[state.activeWorkspace] = entryId;
  renderApp();
  syncRuntimeModelsForActiveAgent();

  if (state.activeWorkspace === "task" && isTaskEntry(entryId)) {
    void loadTaskSnapshot(entryId).catch((error) => {
      console.error(error);
      state.connection.backendAvailable = false;
      renderApp();
    });
  }

  if (state.activeWorkspace === "task" && entryId === "timeline") {
    void refreshTeamTimeline().then(() => {
      renderApp();
    });
  }
}

function pushMessage(sender, text, metadata = {}) {
  state.messages.push({
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sender,
    time: formatTime(),
    text,
    ...metadata,
  });
}

function pushTimeline(type, text) {
  const createdAt = new Date().toISOString();
  state.timeline.push({
    type,
    time: formatTime(),
    text,
    taskId: state.currentTask.id,
    taskTitle: getCurrentTaskTitle(),
  });
  state.currentTask.events = [
    ...(state.currentTask.events || []),
    {
      eventType: type,
      message: text,
      createdAt,
      taskId: state.currentTask.id,
      taskTitle: getCurrentTaskTitle(),
    },
  ];
}

function upsertTaskSummary(task) {
  const summary = {
    id: task.id,
    title: task.title,
    status: task.status,
    updatedAt: task.updatedAt || new Date().toISOString(),
  };
  const existingIndex = state.tasks.findIndex((item) => item.id === task.id);

  if (existingIndex >= 0) {
    state.tasks[existingIndex] = summary;
  } else {
    state.tasks.unshift(summary);
  }

  state.tasks.sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));
}

function tagScrollContainers() {
  const workspace = state.activeWorkspace;
  const entry = getActiveEntryId();
  const sidebarScroller = workspaceSidebarContentEl.querySelector(".sidebar-top");
  const stageScrollers = [
    workspaceStageContentEl.querySelector(".chat-thread-stream"),
    workspaceStageContentEl.querySelector(".stage-layout"),
    workspaceStageContentEl.querySelector(".timeline-list"),
    workspaceStageContentEl.querySelector(".agent-grid"),
  ].filter(Boolean);

  if (sidebarScroller) {
    sidebarScroller.dataset.scrollKey = `sidebar:${workspace}`;
  }

  stageScrollers.forEach((stageScroller, index) => {
    stageScroller.dataset.scrollKey = `stage:${workspace}:${entry}:${index}`;
  });

  workspaceStageContentEl.querySelectorAll("[data-output-scroll-key]").forEach((element) => {
    element.dataset.scrollKey = `output:${workspace}:${entry}:${element.dataset.outputScrollKey}`;
  });
}

function captureScrollPositions() {
  document.querySelectorAll("[data-scroll-key]").forEach((element) => {
    const key = element.dataset.scrollKey;
    if (!key) return;

    state.scrollPositions[key] = {
      left: element.scrollLeft,
      top: element.scrollTop,
      atBottom: element.scrollHeight - element.scrollTop - element.clientHeight < 8,
    };
  });
}

function restoreScrollPositions() {
  document.querySelectorAll("[data-scroll-key]").forEach((element) => {
    const key = element.dataset.scrollKey;
    const position = key ? state.scrollPositions[key] : null;
    if (!position) return;

    element.scrollLeft = position.left;
    element.scrollTop = position.atBottom ? element.scrollHeight : position.top;
  });
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${state.connection.apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

function getAgentConfiguredRoute(agentId) {
  return state.connection.configuredRoutes[agentId] || null;
}

function getAgentModelValue(agentId) {
  return getAgentConfiguredRoute(agentId)?.id || "";
}

function supportsRuntimeModel(agentId) {
  return ROUTABLE_AGENT_IDS.has(agentId);
}

function getAgentModelOptions(agentId) {
  return [...state.connection.models];
}

function isRouteEnabled(routeId) {
  return state.connection.enabledRouteIds.includes(routeId);
}

function isLocalRoute(route) {
  return route.provider === "ollama";
}

function getLLMFilterModels(kind) {
  const models = state.connection.allModels.filter((model) => (kind === "local" ? isLocalRoute(model) : !isLocalRoute(model)));
  return kind === "api" ? [...models].reverse() : models;
}

function getProviderStatusMeta(agentId) {
  const route = getAgentConfiguredRoute(agentId);
  if (!route) {
    return {
      className: "connection-chip",
      label: "Model Route Missing",
    };
  }

  const providerState = state.connection.providers[route.provider];
  const providerLabel = providerState?.label || route.provider;

  if (!providerState?.configured && route.provider !== "ollama") {
    return {
      className: "connection-chip",
      label: `${providerLabel} Key Missing`,
    };
  }

  if (!providerState?.available) {
    return {
      className: "connection-chip",
      label: `${providerLabel} Unavailable`,
    };
  }

  return {
    className: "connection-chip is-connected",
    label: `${providerLabel} Ready`,
  };
}

function getAgentModelSummary(agentId) {
  if (!supportsRuntimeModel(agentId)) {
    return {
      providerLabel: "Stub",
      modelName: "No runtime model",
      routeId: "not-connected",
      enabledLabel: "Future",
      statusMeta: {
        className: "connection-chip",
        label: "Stub",
      },
    };
  }

  const route = getAgentConfiguredRoute(agentId);
  if (!route) {
    return {
      providerLabel: "Missing",
      modelName: "No model selected",
      routeId: "missing",
      enabledLabel: t("stage.disabled"),
      statusMeta: getProviderStatusMeta(agentId),
    };
  }

  const providerState = state.connection.providers[route.provider];
  return {
    providerLabel: providerState?.label || PROVIDER_LABELS[route.provider] || route.provider,
    modelName: route.model,
    routeId: route.id,
    enabledLabel: isRouteEnabled(route.id) ? t("stage.enabled") : t("stage.disabled"),
    statusMeta: getProviderStatusMeta(agentId),
  };
}

function renderAgentModelStrip(agentId) {
  const model = getAgentModelSummary(agentId);

  return `
    <div class="agent-model-strip" aria-label="${escapeHtml(t("stage.modelRoute"))}">
      <span class="agent-model-pill">${escapeHtml(model.providerLabel)}</span>
      <span class="agent-model-name">${escapeHtml(model.modelName)}</span>
      <span class="${model.statusMeta.className} is-compact">${escapeHtml(model.statusMeta.label)}</span>
    </div>
  `;
}

function renderAgentModelDetail(agentId) {
  const model = getAgentModelSummary(agentId);

  return `
    <div class="agent-model-detail">
      <div class="agent-model-fact">
        <span>${escapeHtml(t("stage.model"))}</span>
        <strong>${escapeHtml(model.modelName)}</strong>
      </div>
      <div class="agent-model-fact">
        <span>Provider</span>
        <strong>${escapeHtml(model.providerLabel)}</strong>
      </div>
      <div class="agent-model-fact">
        <span>Route</span>
        <strong>${escapeHtml(model.routeId)}</strong>
      </div>
      <div class="agent-model-fact">
        <span>${escapeHtml(t("stage.enabled"))}</span>
        <strong>${escapeHtml(model.enabledLabel)}</strong>
      </div>
    </div>
  `;
}

function renderAgentModelControls(agentId) {
  if (!supportsRuntimeModel(agentId)) return "";

  const options = getAgentModelOptions(agentId);
  const currentModel = getAgentModelValue(agentId);
  const statusMeta = getProviderStatusMeta(agentId);

  return `
    <div class="stage-header-meta stage-header-actions model-actions">
      <span class="${statusMeta.className}">${escapeHtml(statusMeta.label)}</span>
      <label class="model-select-group">
        <span>${escapeHtml(t("stage.model"))}</span>
        <select
          class="model-select"
          data-model-role="${escapeHtml(agentId)}"
          ${options.length === 0 ? "disabled" : ""}
        >
          ${
            options.length === 0
              ? `<option value="">${escapeHtml(t("stage.noModels"))}</option>`
              : options
                  .map(
                    (option) => `
                      <option value="${escapeHtml(option.id)}" ${option.id === currentModel ? "selected" : ""}>
                        ${escapeHtml(option.label || option.name)}
                      </option>
                    `
                  )
                  .join("")
          }
        </select>
      </label>
    </div>
  `;
}

function stopTaskPolling() {
  if (taskPollTimer) {
    clearInterval(taskPollTimer);
    taskPollTimer = null;
  }
}

function applyBackendSnapshot(snapshot) {
  const task = snapshot.task;
  upsertTaskSummary(task);
  state.currentTask = {
    id: task.id,
    status: task.status,
    title: task.title,
    description: task.userInput,
    phase: normalizeTaskPhase(task.status),
    owner: task.stageOwnerId || "leader",
    progress: taskProgressByStatus(task.status),
    lastUpdate: formatTimestamp(task.updatedAt),
    updatedAt: task.updatedAt,
    finalOutput: task.finalOutput || null,
    errorMessage: task.errorMessage || null,
    subtasks: snapshot.subtasks || [],
    events: snapshot.events || [],
  };

  state.messages = snapshot.messages.map((message) => ({
    id: message.id,
    sender: message.senderType === "user" ? "user" : "leader",
    time: formatTimestamp(message.createdAt),
    text: message.content,
  }));

  const backendAgents = new Map(snapshot.agents.map((agent) => [agent.id, agent]));
  state.agents = state.agents.map((agent) => {
    const backendAgent = backendAgents.get(agent.id);
    if (!backendAgent) return agent;

    return {
      ...agent,
      status: backendAgent.status,
      taskMode: "text",
      taskKey: null,
      currentTask: backendAgent.currentTaskTitle || (backendAgent.currentTaskId ? state.currentTask.title : agent.currentTask),
    };
  });
}

async function pollTaskSnapshot(taskId) {
  const snapshot = await apiFetch(`/tasks/${taskId}/snapshot`);
  applyBackendSnapshot(snapshot);
  if (state.activeWorkspace === "task" && state.activeEntry.task === "timeline") {
    await refreshTeamTimeline();
  }
  renderApp();

  if (snapshot.task.status === "completed" || snapshot.task.status === "failed" || snapshot.task.status === "human_confirmation") {
    stopTaskPolling();
  }
}

async function loadTaskSnapshot(taskId) {
  stopTaskPolling();
  const snapshot = await apiFetch(`/tasks/${taskId}/snapshot`);
  state.connection.activeTaskId = taskId;
  applyBackendSnapshot(snapshot);
  renderApp();
}

function activatePendingTask(result, description) {
  const taskTitle = result.title || result.taskId;
  state.connection.activeTaskId = result.taskId;
  upsertTaskSummary({
    id: result.taskId,
    title: taskTitle,
    status: result.status,
    updatedAt: new Date().toISOString(),
  });
  state.currentTask = {
    id: result.taskId,
    status: result.status,
    title: taskTitle,
    description,
    phase: normalizeTaskPhase(result.status),
    owner: "leader",
    progress: taskProgressByStatus(result.status),
    lastUpdate: formatTime(),
    updatedAt: new Date().toISOString(),
    finalOutput: null,
    errorMessage: null,
    subtasks: [],
    events: [],
  };
  state.activeWorkspace = "task";
  state.activeEntry.task = result.taskId;
  state.sidebarCollapsed = false;
  renderApp();
}

async function watchTask(taskId) {
  await pollTaskSnapshot(taskId);
  stopTaskPolling();
  taskPollTimer = setInterval(() => {
    void pollTaskSnapshot(taskId).catch(() => {
      stopTaskPolling();
      state.connection.backendAvailable = false;
      renderApp();
    });
  }, TASK_POLL_INTERVAL_MS);
}

async function startBackendTask(taskInput) {
  const result = await apiFetch("/tasks", {
    method: "POST",
    body: JSON.stringify({
      userInput: taskInput,
      priority: "medium",
    }),
  });

  activatePendingTask(result, taskInput);
  await watchTask(result.taskId);
}

async function retryCurrentTask() {
  if (!state.currentTask.id || state.currentTask.id === "--") return;

  const result = await apiFetch(`/tasks/${state.currentTask.id}/retry`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  activatePendingTask(result, state.currentTask.description);
  await watchTask(result.taskId);
}

async function retryCurrentFailedStep() {
  if (!state.currentTask.id || state.currentTask.id === "--") return;

  const result = await apiFetch(`/tasks/${state.currentTask.id}/retry-step`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  state.connection.activeTaskId = result.taskId;
  await watchTask(result.taskId);
}

async function archiveCurrentTask() {
  if (!state.currentTask.id || state.currentTask.id === "--") return;

  await apiFetch(`/tasks/${state.currentTask.id}/archive`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  state.tasks = state.tasks.filter((task) => task.id !== state.currentTask.id);
  resetCurrentTaskView();
  renderApp();
}

async function deleteCurrentTask() {
  if (!state.currentTask.id || state.currentTask.id === "--") return;

  await apiFetch(`/tasks/${state.currentTask.id}`, {
    method: "DELETE",
  });
  state.tasks = state.tasks.filter((task) => task.id !== state.currentTask.id);
  resetCurrentTaskView();
  renderApp();
}

async function refreshBackendAvailability() {
  try {
    await apiFetch("/health");
    state.connection.backendAvailable = true;
  } catch {
    state.connection.backendAvailable = false;
    state.connection.models = [];
    state.connection.allModels = [];
    state.connection.defaultRouteId = "openai::gpt-5.4-2026-03-05";
    state.connection.enabledRouteIds = [];
    state.connection.providers = createDefaultProviders();
    state.connection.configuredRoutes = createDefaultRoutes();
  }
}

async function refreshBackendModels() {
  if (!state.connection.backendAvailable) return;

  try {
    const runtime = await apiFetch("/models");
    state.connection.providers = {
      ...createDefaultProviders(),
      ...(runtime.providers || {}),
    };
    state.connection.models = runtime.models || [];
    state.connection.allModels = runtime.allModels || runtime.models || [];
    state.connection.defaultRouteId = runtime.defaultRouteId || state.connection.defaultRouteId;
    state.connection.enabledRouteIds = runtime.enabledRouteIds || [];
    state.connection.configuredRoutes = {
      ...createDefaultRoutes(),
      ...(runtime.routes || {}),
    };
  } catch {
    state.connection.models = [];
    state.connection.allModels = [];
    state.connection.defaultRouteId = "openai::gpt-5.4-2026-03-05";
    state.connection.enabledRouteIds = [];
  }
}

async function refreshTaskList() {
  if (!state.connection.backendAvailable) return;

  try {
    const tasks = await apiFetch("/tasks");
    state.tasks = (tasks || []).map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      updatedAt: task.updatedAt || task.createdAt || new Date().toISOString(),
    }));
  } catch (error) {
    console.error(error);
  }
}

async function refreshTeamTimeline() {
  if (!state.connection.backendAvailable) return;

  try {
    const events = await apiFetch("/timeline");
    state.timeline = (events || []).map((event) => ({
      id: event.id,
      type: event.eventType,
      time: formatTimestamp(event.createdAt),
      text: event.message,
      taskId: event.taskId,
      taskTitle: event.taskTitle,
      taskNumber: event.taskNumber,
      taskStatus: event.taskStatus,
    }));
  } catch (error) {
    console.error(error);
  }
}

async function updateAgentRuntimeModel(agentId, routeId) {
  const runtime = await apiFetch("/models", {
    method: "POST",
    body: JSON.stringify({
      role: agentId,
      routeId,
    }),
  });

  state.connection.providers = {
    ...createDefaultProviders(),
    ...(runtime.providers || {}),
  };
  state.connection.models = runtime.models || [];
  state.connection.allModels = runtime.allModels || runtime.models || [];
  state.connection.defaultRouteId = runtime.defaultRouteId || state.connection.defaultRouteId;
  state.connection.enabledRouteIds = runtime.enabledRouteIds || [];
  state.connection.configuredRoutes = {
    ...createDefaultRoutes(),
    ...(runtime.routes || {}),
  };
}

async function updateRouteEnabled(routeId, enabled) {
  const runtime = await apiFetch("/models", {
    method: "POST",
    body: JSON.stringify({
      routeId,
      enabled,
    }),
  });

  state.connection.providers = {
    ...createDefaultProviders(),
    ...(runtime.providers || {}),
  };
  state.connection.models = runtime.models || [];
  state.connection.allModels = runtime.allModels || runtime.models || [];
  state.connection.defaultRouteId = runtime.defaultRouteId || state.connection.defaultRouteId;
  state.connection.enabledRouteIds = runtime.enabledRouteIds || [];
  state.connection.configuredRoutes = {
    ...createDefaultRoutes(),
    ...(runtime.routes || {}),
  };
}

async function syncRuntimeModels() {
  await refreshBackendAvailability();
  if (state.connection.backendAvailable) {
    await refreshBackendModels();
  }
}

async function syncBackendState() {
  await syncRuntimeModels();
  await refreshTaskList();
  await refreshTeamTimeline();
}

function syncRuntimeModelsForActiveAgent() {
  const activeEntryId = getActiveEntryId();
  if (state.activeWorkspace !== "team" || !supportsRuntimeModel(activeEntryId)) return;

  void syncRuntimeModels().then(() => {
    renderApp();
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

function renderChatMessages(messages) {
  return `
    <div class="chat-thread-stream">
      ${messages
        .map((message) => {
          const isSelf = message.sender === "user";
          const routeLabel =
            !isSelf && message.provider && message.model
              ? `${PROVIDER_LABELS[message.provider] || message.provider} · ${message.model}`
              : "";
          return `
            <article class="message-card ${isSelf ? "self" : "peer"} ${message.isError ? "is-error" : ""}">
              <div class="message-head">
                <span>${escapeHtml(roleLabel(message.sender))}</span>
                <span>${escapeHtml(message.time)}</span>
              </div>
              ${routeLabel ? `<div class="message-route">${escapeHtml(routeLabel)}</div>` : ""}
              <div class="message-body">${escapeHtml(resolveMessageText(message))}</div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderChatComposer(formId, textareaId, placeholder, submitLabel, conversationId = "", options = {}) {
  return `
    <div class="chat-thread-composer">
      <form id="${escapeHtml(formId)}" class="chat-form" ${conversationId ? `data-chat-conversation-form="${escapeHtml(conversationId)}"` : ""}>
        <label for="${escapeHtml(textareaId)}">${escapeHtml(t("chatPanel.inputLabel"))}</label>
        <textarea
          id="${escapeHtml(textareaId)}"
          name="chat"
          rows="4"
          placeholder="${escapeHtml(placeholder)}"
          required
        ></textarea>
        <div class="chat-actions">
          <button type="submit" class="btn-primary">${escapeHtml(submitLabel)}</button>
          ${
            options.showTaskCreation
              ? `<button type="submit" class="btn-secondary" data-task-creation-submit>${escapeHtml(t("buttons.taskCreation"))}</button>`
              : ""
          }
        </div>
      </form>
    </div>
  `;
}

function renderLeaderPublishConfirmation(conversation) {
  const draft = conversation?.taskCreation?.draft;
  if (!draft || conversation?.taskCreation?.status !== "awaiting_publish_confirmation") return "";

  return `
    <section class="publish-card">
      <div>
        <p class="eyebrow">${escapeHtml(t("chatPanel.publishReady"))}</p>
        <h3>${escapeHtml(draft.title)}</h3>
        <p>${escapeHtml(t("chatPanel.publishReadyNote"))}</p>
      </div>
      <div class="publish-scope">
        <span>${escapeHtml(draft.input)}</span>
      </div>
      <div class="publish-milestones">
        ${draft.milestones.map((milestone, index) => `<span>${index + 1}. ${escapeHtml(milestone)}</span>`).join("")}
      </div>
      <div class="chat-actions">
        <button class="btn-primary" type="button" data-confirm-leader-publish="${escapeHtml(conversation.id)}">${escapeHtml(t("buttons.confirmPublish"))}</button>
        <button class="btn-secondary" type="button" data-cancel-leader-publish="${escapeHtml(conversation.id)}">${escapeHtml(t("buttons.continueNegotiation"))}</button>
      </div>
    </section>
  `;
}

function renderDirectChatContent(conversationId) {
  const conversation = getConversationById(conversationId);
  if (!conversation) {
    return `
      <div class="stage-layout">
        <div class="info-block">
          <p>${escapeHtml(t("chatPanel.noDirectChats"))}</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="chat-thread-layout">
      <div class="chat-thread-header">
        <div>
          <p class="eyebrow">${escapeHtml(t("chatPanel.directIntro"))}</p>
          <h3>${escapeHtml(roleLabel(conversation.agentId))}</h3>
        </div>
        <span class="${badgeClass(getAgentById(conversation.agentId)?.status || "idle")}">
          ${escapeHtml(formatStatus(getAgentById(conversation.agentId)?.status || "idle"))}
        </span>
      </div>

      ${renderChatMessages(conversation.messages)}
      ${conversation.agentId === "leader" ? renderLeaderPublishConfirmation(conversation) : ""}
      ${renderChatComposer(
        `agent-chat-form-${escapeHtml(conversation.agentId)}`,
        `agent-chat-input-${escapeHtml(conversation.agentId)}`,
        t("chatPanel.inputPlaceholder"),
        t("buttons.sendMessage"),
        conversation.id,
        { showTaskCreation: conversation.agentId === "leader" }
      )}
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
                <div class="agent-inline-actions">
                  <button class="btn-secondary agent-chat-btn" type="button" data-open-agent-chat="${escapeHtml(agent.id)}">
                    ${escapeHtml(t("buttons.openChat"))}
                  </button>
                </div>
                ${renderAgentModelStrip(agent.id)}
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
        <div class="agent-inline-actions">
          <button class="btn-secondary agent-chat-btn" type="button" data-open-agent-chat="${escapeHtml(agent.id)}">
            ${escapeHtml(t("buttons.openChat"))}
          </button>
        </div>
        <p>${escapeHtml(roleDuty(agent.id))}</p>
      </div>

      <div class="info-block">
        <p class="eyebrow">${escapeHtml(t("stage.modelRoute"))}</p>
        ${renderAgentModelStrip(agent.id)}
        ${renderAgentModelDetail(agent.id)}
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

function renderModelInvocation(invocation) {
  if (!invocation) {
    return `
      <div class="subtask-invocation">
        <span class="invocation-status is-unknown">${escapeHtml(t("stage.requestUnknown"))}</span>
      </div>
    `;
  }

  const status = invocation.status || "unknown";
  const duration = getInvocationDuration(invocation);
  const timeout = invocation.timeoutMs ? formatDurationMs(invocation.timeoutMs) : "--";
  const responseSize = Number.isFinite(Number(invocation.textChars)) ? `${invocation.textChars} chars` : "--";
  const route = [invocation.provider, invocation.model].filter(Boolean).join(" / ") || invocation.route || "--";

  return `
    <div class="subtask-invocation">
      <span class="invocation-status is-${escapeHtml(status)}">${escapeHtml(formatInvocationStatus(status))}</span>
      <span>${escapeHtml(t("stage.modelRequest"))}: ${escapeHtml(route)}</span>
      <span>${escapeHtml(t("stage.duration"))}: ${escapeHtml(formatDurationMs(duration))}</span>
      <span>${escapeHtml(t("stage.timeout"))}: ${escapeHtml(timeout)}</span>
      <span>${escapeHtml(t("stage.responseSize"))}: ${escapeHtml(responseSize)}</span>
    </div>
    ${
      invocation.errorMessage
        ? `<p class="subtask-error">${escapeHtml(invocation.errorMessage)}</p>`
        : ""
    }
  `;
}

function renderTaskOverviewContent() {
  const finalOutput = state.currentTask.finalOutput;
  const errorMessage = state.currentTask.errorMessage;
  const subtasks = state.currentTask.subtasks || [];
  const currentStatus = state.currentTask.status || state.currentTask.phase;
  const canRetryTask =
    !state.currentTask.isEmpty &&
    state.currentTask.id !== "--" &&
    (Boolean(errorMessage) || ["failed", "human_confirmation"].includes(currentStatus));
  const canArchiveOrDeleteTask =
    !state.currentTask.isEmpty &&
    state.currentTask.id !== "--" &&
    ["completed", "failed", "human_confirmation"].includes(currentStatus);

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
        ${
          canRetryTask || canArchiveOrDeleteTask
            ? `
              <div class="agent-inline-actions">
                ${
                  canRetryTask
                    ? `
                      <button class="btn-secondary" type="button" data-retry-task>
                        ${escapeHtml(t("buttons.retryTask"))}
                      </button>
                      <button class="btn-secondary" type="button" data-retry-failed-step>
                        ${escapeHtml(t("buttons.retryFailedStep"))}
                      </button>
                    `
                    : ""
                }
                ${
                  canArchiveOrDeleteTask
                    ? `
                      <button class="btn-secondary" type="button" data-archive-task>
                        ${escapeHtml(t("buttons.archiveTask"))}
                      </button>
                      <button class="btn-secondary danger-btn" type="button" data-delete-task>
                        ${escapeHtml(t("buttons.deleteTask"))}
                      </button>
                    `
                    : ""
                }
              </div>
            `
            : ""
        }
      </div>

      <div class="info-block">
        <p class="eyebrow">${escapeHtml(t("stage.intermediateOutputs"))}</p>
        ${
          subtasks.length
            ? `
              <div class="subtask-output-list">
                ${subtasks
                  .map(
                    (subtask) => `
                      <details class="subtask-output">
                        <summary>
                          <span>${escapeHtml(roleLabel(subtask.assignedAgentId))} / ${escapeHtml(subtask.type)}</span>
                          <span>${escapeHtml(subtask.status)}</span>
                        </summary>
                        ${renderModelInvocation(subtask.modelInvocation)}
                        <pre data-output-scroll-key="${escapeHtml(subtask.id)}">${escapeHtml(subtask.outputText || subtask.reviewComment || "No output yet.")}</pre>
                      </details>
                    `
                  )
                  .join("")}
              </div>
            `
            : `<p>${escapeHtml(t("stage.outputPending"))}</p>`
        }
      </div>

      <div class="info-block output-block">
        <p class="eyebrow">${escapeHtml(t("stage.finalOutput"))}</p>
        ${
          errorMessage
            ? `<pre class="output-text is-error" data-output-scroll-key="final">${escapeHtml(errorMessage)}</pre>`
            : finalOutput
              ? `<pre class="output-text" data-output-scroll-key="final">${escapeHtml(finalOutput)}</pre>`
              : `<p>${escapeHtml(t("stage.outputPending"))}</p>`
        }
      </div>
    </div>
  `;
}

function renderStageFlowContent() {
  const rows = buildStageFlowRows();
  return `
    <div class="stage-layout">
      <div class="info-block">
        <p class="eyebrow">${escapeHtml(t("stage.stageFlow"))}</p>
        <div class="task-stage-map is-detailed">
          ${rows
            .map((row, index) => {
              const durationLabel = row.durationMs > 0 ? formatDurationMs(row.durationMs) : "--";
              return `
                <div class="task-stage-node is-${escapeHtml(row.status)}">
                  <span>${index + 1}</span>
                  <strong>${escapeHtml(formatPhase(row.phase))}</strong>
                  <small>${escapeHtml(durationLabel)}${row.isRunning ? " +" : ""}</small>
                  ${
                    row.isRunning
                      ? `<i class="stage-spinner" aria-label="${escapeHtml(t("stage.requestRunning"))}"></i>`
                      : ""
                  }
                </div>
              `;
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
        ${
          state.timeline.length
            ? state.timeline
                .map(
                  (event) => `
                    <article class="timeline-item">
                      <div class="timeline-head">
                        <span>${escapeHtml(formatEventType(event.type))}</span>
                        <span>${escapeHtml(event.time)}</span>
                      </div>
                      <div class="timeline-task">${escapeHtml(taskTimelineLabel(event))}</div>
                      <p>${escapeHtml(resolveTimelineText(event))}</p>
                    </article>
                  `
                )
                .join("")
            : `<p>${escapeHtml(t("stage.outputPending"))}</p>`
        }
      </div>
    </div>
  `;
}

function renderStatsGrid(items) {
  return `
    <div class="card-grid stats-grid">
      ${items
        .map(
          (item) => `
            <article class="stat-card">
              <span class="eyebrow">${escapeHtml(item.label)}</span>
              <strong class="stat-value">${escapeHtml(item.value)}</strong>
              <p>${escapeHtml(item.note)}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderProjectCard(record) {
  return `
    <article class="project-card">
      <div class="project-card-head">
        <div>
          <h3>${escapeHtml(getProjectName(record))}</h3>
          <p>${escapeHtml(getProjectSummary(record))}</p>
        </div>
        <span class="tag accent">${escapeHtml(getProjectStage(record))}</span>
      </div>

      <div class="project-card-meta">
        <span class="tag">${escapeHtml(t("projectsPanel.owner"))}: ${escapeHtml(roleLabel(record.owner))}</span>
        <span class="tag">${escapeHtml(t("projectsPanel.bugs"))}: ${escapeHtml(String(record.bugs))}</span>
        <span class="tag">${escapeHtml(t("projectsPanel.progress"))}: ${escapeHtml(formatPercent(record.progress))}</span>
      </div>

      <div class="progress-line">
        <div class="progress-value" style="width: ${record.progress}%"></div>
      </div>

      <div class="skill-list">
        ${record.workspaces.map((workspace) => `<span class="skill">${escapeHtml(workspace)}</span>`).join("")}
      </div>
    </article>
  `;
}

function renderProjectsOverviewContent() {
  const records = state.projects.records;
  const totalBugs = records.reduce((sum, record) => sum + record.bugs, 0);
  const avgProgress = Math.round(records.reduce((sum, record) => sum + record.progress, 0) / records.length);

  return `
    <div class="stage-layout">
      <div class="info-block">
        <p class="eyebrow">${escapeHtml(t("entries.portfolio"))}</p>
        <h3>${escapeHtml(t("rail.projects"))}</h3>
        <p>${escapeHtml(t("projectsPanel.portfolioIntro"))}</p>
      </div>

      ${renderStatsGrid([
        {
          label: t("projectsPanel.totalSurfaces"),
          value: String(records.length),
          note: getProjectName(records[0]),
        },
        {
          label: t("projectsPanel.moduleCount"),
          value: String(records.filter((record) => record.kind === "module").length),
          note: t("entries.workspaceSurface"),
        },
        {
          label: t("projectsPanel.openBugs"),
          value: String(totalBugs),
          note: roleLabel("reviewer"),
        },
        {
          label: t("projectsPanel.avgProgress"),
          value: formatPercent(avgProgress),
          note: t("entries.stages"),
        },
      ])}

      <div class="info-block">
        <p class="eyebrow">${escapeHtml(t("rail.projects"))}</p>
        <div class="project-stack">
          ${records.map((record) => renderProjectCard(record)).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderProjectDetailContent(recordId) {
  const record = getProjectRecord(recordId);
  if (!record) return "";

  const childRecords = state.projects.records.filter((entry) => entry.parentId === record.id);

  return `
    <div class="stage-layout">
      <div class="info-block">
        <p class="eyebrow">${escapeHtml(record.kind === "project" ? t("entries.portfolio") : t("entries.workspaceSurface"))}</p>
        <h3>${escapeHtml(getProjectName(record))}</h3>
        <p>${escapeHtml(getProjectSummary(record))}</p>
        <div class="task-meta">
          <span class="tag accent">${escapeHtml(getProjectStage(record))}</span>
          <span class="tag">${escapeHtml(t("projectsPanel.owner"))}: ${escapeHtml(roleLabel(record.owner))}</span>
          <span class="tag">${escapeHtml(t("projectsPanel.bugs"))}: ${escapeHtml(String(record.bugs))}</span>
          <span class="tag">${escapeHtml(t("projectsPanel.progress"))}: ${escapeHtml(formatPercent(record.progress))}</span>
        </div>
        <div class="progress-line">
          <div class="progress-value" style="width: ${record.progress}%"></div>
        </div>
      </div>

      <div class="info-block">
        <p class="eyebrow">${escapeHtml(t("projectsPanel.workspaces"))}</p>
        <div class="skill-list">
          ${record.workspaces.map((workspace) => `<span class="skill">${escapeHtml(workspace)}</span>`).join("")}
        </div>
      </div>

      <div class="info-block">
        <p class="eyebrow">${escapeHtml(t("projectsPanel.highlights"))}</p>
        <div class="project-notes">
          ${record.highlights
            .map(
              (note) => `
                <article class="project-note">
                  <p>${escapeHtml(pickText(note))}</p>
                </article>
              `
            )
            .join("")}
        </div>
      </div>

      ${
        childRecords.length
          ? `
            <div class="info-block">
              <p class="eyebrow">${escapeHtml(t("stage.moduleBreakdown"))}</p>
              <div class="project-stack">
                ${childRecords.map((child) => renderProjectCard(child)).join("")}
              </div>
            </div>
          `
          : ""
      }
    </div>
  `;
}

function renderUsageRows(rows, resolveName) {
  const maxTokens = Math.max(...rows.map((row) => row.tokens));

  return `
    <div class="usage-stack">
      ${rows
        .map(
          (row) => `
            <article class="usage-row">
              <div class="usage-row-head">
                <strong>${escapeHtml(resolveName(row))}</strong>
                <span>${escapeHtml(formatCompactNumber(row.tokens))} ${escapeHtml(t("usagePanel.tokens"))}</span>
              </div>
              <div class="usage-bar-track">
                <div class="usage-bar-fill" style="width: ${(row.tokens / maxTokens) * 100}%"></div>
              </div>
              <div class="project-card-meta">
                <span class="tag">${escapeHtml(t("usagePanel.cost"))}: ${escapeHtml(formatCurrency(row.cost))}</span>
                <span class="tag">${escapeHtml(t("usagePanel.requests"))}: ${escapeHtml(String(row.requests))}</span>
                <span class="tag">${escapeHtml(formatPercent(row.share))}</span>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderUsageTeamContent() {
  const teamRows = state.usage.team;
  const totalTokens = teamRows.reduce((sum, row) => sum + row.tokens, 0);
  const totalCost = teamRows.reduce((sum, row) => sum + row.cost, 0);
  const topRow = [...teamRows].sort((a, b) => b.tokens - a.tokens)[0];

  return `
    <div class="stage-layout">
      <div class="info-block">
        <p class="eyebrow">${escapeHtml(t("entries.teamUsage"))}</p>
        <h3>${escapeHtml(t("usagePanel.byRole"))}</h3>
        <p>${escapeHtml(t("usagePanel.teamIntro"))}</p>
      </div>

      ${renderStatsGrid([
        {
          label: t("usagePanel.totalTokens"),
          value: formatCompactNumber(totalTokens),
          note: t("usagePanel.byRole"),
        },
        {
          label: t("usagePanel.estimatedCost"),
          value: formatCurrency(totalCost),
          note: t("rail.usage"),
        },
        {
          label: t("usagePanel.topConsumer"),
          value: roleLabel(topRow.id),
          note: formatCompactNumber(topRow.tokens),
        },
        {
          label: t("usagePanel.remoteShare"),
          value: formatPercent(state.usage.budget.remoteShare),
          note: t("usagePanel.routingMix"),
        },
      ])}

      <div class="info-block">
        <p class="eyebrow">${escapeHtml(t("usagePanel.byRole"))}</p>
        ${renderUsageRows(teamRows, (row) => roleLabel(row.id))}
      </div>
    </div>
  `;
}

function renderUsageProjectContent() {
  const projectRows = state.usage.projects;
  const totalTokens = projectRows.reduce((sum, row) => sum + row.tokens, 0);
  const totalCost = projectRows.reduce((sum, row) => sum + row.cost, 0);
  const topRow = [...projectRows].sort((a, b) => b.tokens - a.tokens)[0];

  return `
    <div class="stage-layout">
      <div class="info-block">
        <p class="eyebrow">${escapeHtml(t("entries.projectUsage"))}</p>
        <h3>${escapeHtml(t("usagePanel.byProject"))}</h3>
        <p>${escapeHtml(t("usagePanel.projectIntro"))}</p>
      </div>

      ${renderStatsGrid([
        {
          label: t("usagePanel.totalTokens"),
          value: formatCompactNumber(totalTokens),
          note: t("usagePanel.byProject"),
        },
        {
          label: t("usagePanel.estimatedCost"),
          value: formatCurrency(totalCost),
          note: t("rail.projects"),
        },
        {
          label: t("usagePanel.topConsumer"),
          value: getProjectName(getProjectRecord(topRow.id)),
          note: formatCompactNumber(topRow.tokens),
        },
        {
          label: t("usagePanel.localShare"),
          value: formatPercent(state.usage.budget.localShare),
          note: t("usagePanel.routingMix"),
        },
      ])}

      <div class="info-block">
        <p class="eyebrow">${escapeHtml(t("usagePanel.byProject"))}</p>
        ${renderUsageRows(projectRows, (row) => getProjectName(getProjectRecord(row.id)))}
      </div>
    </div>
  `;
}

function renderUsageBudgetContent() {
  const budget = state.usage.budget;
  const usedPercent = Math.round((budget.used / budget.cap) * 100);
  const projectedPercent = Math.round((budget.projected / budget.cap) * 100);

  return `
    <div class="stage-layout">
      <div class="info-block">
        <p class="eyebrow">${escapeHtml(t("entries.budget"))}</p>
        <h3>${escapeHtml(t("usagePanel.monthlyBudget"))}</h3>
        <p>${escapeHtml(t("usagePanel.budgetIntro"))}</p>
      </div>

      ${renderStatsGrid([
        {
          label: t("usagePanel.monthlyBudget"),
          value: formatCompactNumber(budget.cap),
          note: t("usagePanel.tokens"),
        },
        {
          label: t("usagePanel.totalTokens"),
          value: formatCompactNumber(budget.used),
          note: formatPercent(usedPercent),
        },
        {
          label: t("usagePanel.projectedUsage"),
          value: formatCompactNumber(budget.projected),
          note: formatPercent(projectedPercent),
        },
        {
          label: t("usagePanel.routingMix"),
          value: `${formatPercent(budget.remoteShare)} / ${formatPercent(budget.localShare)}`,
          note: `${t("usagePanel.remoteShare")} / ${t("usagePanel.localShare")}`,
        },
      ])}

      <div class="info-block">
        <p class="eyebrow">${escapeHtml(t("usagePanel.monthlyBudget"))}</p>
        <div class="usage-budget-block">
          <div class="usage-budget-line">
            <div class="usage-row-head">
              <strong>${escapeHtml(t("usagePanel.totalTokens"))}</strong>
              <span>${escapeHtml(formatPercent(usedPercent))}</span>
            </div>
            <div class="usage-bar-track">
              <div class="usage-bar-fill" style="width: ${usedPercent}%"></div>
            </div>
          </div>
          <div class="usage-budget-line">
            <div class="usage-row-head">
              <strong>${escapeHtml(t("usagePanel.projectedUsage"))}</strong>
              <span>${escapeHtml(formatPercent(projectedPercent))}</span>
            </div>
            <div class="usage-bar-track">
              <div class="usage-bar-fill usage-bar-fill-warn" style="width: ${projectedPercent}%"></div>
            </div>
          </div>
          <div class="project-card-meta">
            <span class="tag">${escapeHtml(t("usagePanel.remoteShare"))}: ${escapeHtml(formatPercent(budget.remoteShare))}</span>
            <span class="tag">${escapeHtml(t("usagePanel.localShare"))}: ${escapeHtml(formatPercent(budget.localShare))}</span>
          </div>
        </div>
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

function renderLLMFilterRows(kind) {
  const models = getLLMFilterModels(kind);

  if (models.length === 0) {
    return `
      <div class="info-block">
        <p>${escapeHtml(t("stage.noModels"))}</p>
      </div>
    `;
  }

  return `
    <div class="model-filter-list">
      ${models
        .map((model) => {
          const providerState = state.connection.providers[model.provider];
          const providerReady = providerState?.available || false;
          const providerConfigured = providerState?.configured || model.provider === "ollama";
          const providerStatus = !providerConfigured
            ? "Key Missing"
            : providerReady
              ? t("stage.enabled")
              : t("stage.disabled");
          const isDefaultModel = model.id === state.connection.defaultRouteId;

          return `
            <label class="model-filter-row">
              <div class="model-filter-copy">
                <strong>
                  ${escapeHtml(model.label || model.name)}
                  ${isDefaultModel ? `<span class="tag accent default-tag">${escapeHtml(t("stage.default"))}</span>` : ""}
                </strong>
                <span>${escapeHtml(providerStatus)}</span>
              </div>
              <input
                type="checkbox"
                class="model-filter-toggle"
                data-route-toggle="${escapeHtml(model.id)}"
                ${isRouteEnabled(model.id) ? "checked" : ""}
              />
            </label>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderLLMSettingsContent() {
  return `
    <div class="stage-layout">
      <div class="info-block">
        <p class="eyebrow">${escapeHtml(t("stage.llmFilters"))}</p>
        <h3>${escapeHtml(t("entries.llm"))}</h3>
        <p>${escapeHtml(t("stage.llmFiltersNote"))}</p>
      </div>

      <div class="info-block">
        <p class="eyebrow">${escapeHtml(t("stage.localModels"))}</p>
        <h3>${escapeHtml(t("stage.localModels"))}</h3>
        <p>${escapeHtml(t("stage.localModelsNote"))}</p>
        ${renderLLMFilterRows("local")}
      </div>

      <div class="info-block">
        <p class="eyebrow">${escapeHtml(t("stage.apiModels"))}</p>
        <h3>${escapeHtml(t("stage.apiModels"))}</h3>
        <p>${escapeHtml(t("stage.apiModelsNote"))}</p>
        ${renderLLMFilterRows("api")}
      </div>
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

  if (workspace === "chat" && isAgentChatEntry(entry)) return renderDirectChatContent(entry);
  if (workspace === "chat" && entry === "checkins") return renderCheckinsContent();
  if (workspace === "team" && entry === "overview") return renderTeamOverviewContent();
  if (workspace === "team") return renderAgentDetailContent(entry);
  if (workspace === "task" && isTaskEntry(entry)) return renderTaskOverviewContent();
  if (workspace === "task" && entry === "overview") return renderTaskOverviewContent();
  if (workspace === "task" && entry === "stages") return renderStageFlowContent();
  if (workspace === "task" && entry === "timeline") return renderTimelineContent();
  if (workspace === "projects" && entry === "portfolio") return renderProjectsOverviewContent();
  if (workspace === "projects") return renderProjectDetailContent(entry);
  if (workspace === "usage" && entry === "teamUsage") return renderUsageTeamContent();
  if (workspace === "usage" && entry === "projectUsage") return renderUsageProjectContent();
  if (workspace === "usage" && entry === "budget") return renderUsageBudgetContent();
  if (workspace === "settings" && entry === "llm") return renderLLMSettingsContent();
  if (workspace === "settings" && entry === "theme") return renderThemeSettingsContent();
  if (workspace === "settings" && entry === "language") return renderLanguageSettingsContent();

  return "";
}

function renderStage() {
  const workspace = getActiveWorkspace();
  const entry = getActiveEntry();
  const showTeamLayoutSwitch = state.activeWorkspace === "team" && getActiveEntryId() === "overview";
  const showTeamModelControls =
    state.activeWorkspace === "team" &&
    getActiveEntryId() !== "overview" &&
    supportsRuntimeModel(getActiveEntryId());
  const showTaskMeta =
    !showTeamLayoutSwitch &&
    state.activeWorkspace !== "team" &&
    !["settings", "projects", "usage"].includes(state.activeWorkspace);

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
            : showTeamModelControls
              ? renderAgentModelControls(getActiveEntryId())
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

function runLocalTaskLifecycle(userInput) {
  if (simulationTimer) {
    clearTimeout(simulationTimer);
  }

  const localTaskTitle = `Task${String(state.nextLocalTaskNumber).padStart(3, "0")}`;
  state.nextLocalTaskNumber += 1;
  state.currentTask = {
    id: `task-${String(Math.floor(Math.random() * 900) + 100)}`,
    status: "pending",
    title: localTaskTitle,
    description: userInput,
    phase: "pending",
    owner: "leader",
    progress: 8,
    lastUpdate: formatTime(),
    updatedAt: new Date().toISOString(),
    finalOutput: null,
    errorMessage: null,
    subtasks: [],
    events: [],
  };
  upsertTaskSummary({
    id: state.currentTask.id,
    title: state.currentTask.title,
    status: state.currentTask.phase,
    updatedAt: new Date().toISOString(),
  });
  state.activeWorkspace = "task";
  state.activeEntry.task = state.currentTask.id;
  state.sidebarCollapsed = false;

  pushMessage("leader", t("responses.taskReceived"));
  pushTimeline("task_created", t("timelineText.taskCreated"));
  setAgentStatusesByPhase("pending");
  renderApp();

  const steps = [
    {
      delay: 1000,
      run() {
        state.currentTask.phase = "planning";
        state.currentTask.status = "planning";
        state.currentTask.owner = "planner";
        state.currentTask.progress = 32;
        state.currentTask.lastUpdate = formatTime();
        state.currentTask.updatedAt = new Date().toISOString();

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
        state.currentTask.status = "writing";
        state.currentTask.owner = "writer";
        state.currentTask.progress = 68;
        state.currentTask.lastUpdate = formatTime();
        state.currentTask.updatedAt = new Date().toISOString();

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
        state.currentTask.status = "reviewing";
        state.currentTask.owner = "reviewer";
        state.currentTask.progress = 86;
        state.currentTask.lastUpdate = formatTime();
        state.currentTask.updatedAt = new Date().toISOString();

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
        state.currentTask.status = "completed";
        state.currentTask.owner = "leader";
        state.currentTask.progress = 100;
        state.currentTask.lastUpdate = formatTime();
        state.currentTask.updatedAt = new Date().toISOString();

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

async function runTaskLifecycle(userInput) {
  stopTaskPolling();

  try {
    await refreshBackendAvailability();
    if (state.connection.backendAvailable) {
      await startBackendTask(userInput);
      return;
    }
  } catch {}

  runLocalTaskLifecycle(userInput);
}

function bindStageActions() {
  const quickButtons = [...document.querySelectorAll(".quick-btn")];
  const treeItems = [...document.querySelectorAll(".tree-item")];
  const themeButtons = [...document.querySelectorAll("[data-theme-option]")];
  const languageButtons = [...document.querySelectorAll("[data-language-option]")];
  const teamLayoutButtons = [...document.querySelectorAll("[data-team-layout]")];
  const modelSelects = [...document.querySelectorAll("[data-model-role]")];
  const routeToggles = [...document.querySelectorAll("[data-route-toggle]")];
  const agentChatButtons = [...document.querySelectorAll("[data-open-agent-chat]")];
  const directChatForms = [...document.querySelectorAll("[data-chat-conversation-form]")];
  const confirmLeaderPublishButtons = [...document.querySelectorAll("[data-confirm-leader-publish]")];
  const cancelLeaderPublishButtons = [...document.querySelectorAll("[data-cancel-leader-publish]")];
  const retryTaskButtons = [...document.querySelectorAll("[data-retry-task]")];
  const retryFailedStepButtons = [...document.querySelectorAll("[data-retry-failed-step]")];
  const archiveTaskButtons = [...document.querySelectorAll("[data-archive-task]")];
  const deleteTaskButtons = [...document.querySelectorAll("[data-delete-task]")];

  treeItems.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveEntry(button.dataset.entry);
    });
  });

  confirmLeaderPublishButtons.forEach((button) => {
    button.addEventListener("click", () => publishLeaderTaskDraft(button.dataset.confirmLeaderPublish));
  });

  cancelLeaderPublishButtons.forEach((button) => {
    button.addEventListener("click", () => cancelLeaderTaskDraft(button.dataset.cancelLeaderPublish));
  });

  retryTaskButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;

      try {
        await retryCurrentTask();
      } catch (error) {
        console.error(error);
        window.alert(formatModelRequestError(error));
        renderApp();
      }
    });
  });

  retryFailedStepButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;

      try {
        await retryCurrentFailedStep();
      } catch (error) {
        console.error(error);
        window.alert(formatModelRequestError(error));
        renderApp();
      }
    });
  });

  archiveTaskButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;

      try {
        await archiveCurrentTask();
      } catch (error) {
        console.error(error);
        window.alert(formatModelRequestError(error));
        renderApp();
      }
    });
  });

  deleteTaskButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      if (!window.confirm(`${t("buttons.deleteTask")} ${state.currentTask.id}?`)) return;
      button.disabled = true;

      try {
        await deleteCurrentTask();
      } catch (error) {
        console.error(error);
        window.alert(formatModelRequestError(error));
        renderApp();
      }
    });
  });

  agentChatButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const agentId = button.dataset.openAgentChat;
      if (!agentId) return;
      openAgentConversation(agentId);
    });
  });

  directChatForms.forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const conversationId = form.dataset.chatConversationForm;
      const textarea = form.querySelector("textarea");
      const value = textarea?.value.trim();

      if (!conversationId || !value) return;

      const conversation = getConversationById(conversationId);
      if (event.submitter?.dataset.taskCreationSubmit != null && conversation?.agentId === "leader") {
        createLeaderTaskDraft(conversationId, value);
      } else {
        sendConversationMessage(conversationId, value);
      }
      textarea.value = "";
    });
  });

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

  modelSelects.forEach((select) => {
    select.addEventListener("change", async () => {
      const role = select.dataset.modelRole;
      const routeId = select.value;

      if (!role || !routeId) return;

      select.disabled = true;

      try {
        await updateAgentRuntimeModel(role, routeId);
      } catch (error) {
        console.error(error);
        window.alert(t("stage.syncFailed"));
      } finally {
        renderApp();
      }
    });
  });

  routeToggles.forEach((toggle) => {
    toggle.addEventListener("change", async () => {
      const routeId = toggle.dataset.routeToggle;
      if (!routeId) return;

      toggle.disabled = true;

      try {
        await updateRouteEnabled(routeId, toggle.checked);
      } catch (error) {
        console.error(error);
        window.alert(t("stage.syncFailed"));
      } finally {
        renderApp();
      }
    });
  });
}

function renderApp() {
  captureScrollPositions();

  desktopLayoutEl.classList.toggle("sidebar-collapsed", state.sidebarCollapsed);

  railButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.workspace === state.activeWorkspace);
  });

  updateShellChrome();
  renderSidebar();
  renderStage();
  tagScrollContainers();
  restoreScrollPositions();
  bindStageActions();

  window.requestAnimationFrame(restoreScrollPositions);
}

railButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveWorkspace(button.dataset.workspace);
  });
});

loadLanguage();
loadTheme();
if (!state.currentTask.isEmpty) {
  setAgentStatusesByPhase(state.currentTask.phase);
}
renderApp();
void syncBackendState().then(() => {
  renderApp();
});
