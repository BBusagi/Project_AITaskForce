# AI Task Force

AI Task Force 是一个面向文本任务的多 Agent 协作工作系统。

系统目标不是做一个泛化的自治 Agent 平台，而是先把一条固定且可观察的协作流做扎实：

`User → Leader → Planner → Writer → Reviewer → Leader Final Response`

当前仓库已经按客户端类型拆分，分别承载不同的 MVP 验证目标。

## 仓库结构

- [Agents.md](/mnt/d/GitProject/Project_AITaskForce/Agents.md)
  共享产品规范、Agent 角色设计、数据模型、API 和前端约定。
- [Clients/Web](/mnt/d/GitProject/Project_AITaskForce/Clients/Web)
  浏览器端 MVP，用来验证多 Agent 工作台的信息架构、任务流展示、时间线和历史视图。
- [Clients/Desktop](/mnt/d/GitProject/Project_AITaskForce/Clients/Desktop)
  Electron 桌面端，用来验证“启动即对话”的本地桌面体验，核心入口是 `Leader` 会话窗口。

## 客户端定位

### Web

Web 端负责验证工作台式体验，重点是：

- 任务输入
- Agent 面板
- 子任务拆解
- Timeline / Event Log
- Task History
- Task Detail

入口文件：

- [Clients/Web/index.html](/mnt/d/GitProject/Project_AITaskForce/Clients/Web/index.html)
- [Clients/Web/app.js](/mnt/d/GitProject/Project_AITaskForce/Clients/Web/app.js)
- [Clients/Web/styles.css](/mnt/d/GitProject/Project_AITaskForce/Clients/Web/styles.css)

### Desktop

Desktop 端负责验证对话优先的桌面形态，重点是：

- 启动即进入 `User ↔ Leader` 对话区域
- 右侧固定 `Team / Task / Chat` 三个子面板
- `Team` 展示 agent 职责、当前任务、状态和 skills
- `Task` 展示当前任务和执行阶段
- `Chat` 用于继续发任务或询问现状

入口文件：

- [Clients/Desktop/index.html](/mnt/d/GitProject/Project_AITaskForce/Clients/Desktop/index.html)
- [Clients/Desktop/app.js](/mnt/d/GitProject/Project_AITaskForce/Clients/Desktop/app.js)
- [Clients/Desktop/styles.css](/mnt/d/GitProject/Project_AITaskForce/Clients/Desktop/styles.css)
- [Clients/Desktop/package.json](/mnt/d/GitProject/Project_AITaskForce/Clients/Desktop/package.json)

## 启动方式

### Web MVP

直接打开 [Clients/Web/index.html](/mnt/d/GitProject/Project_AITaskForce/Clients/Web/index.html) 即可预览。

如果需要本地静态服务：

```bash
python3 -m http.server 8000
```

然后访问 `http://localhost:8000/Clients/Web/`

### Desktop Electron

进入 `Clients/Desktop` 后执行：

```bash
npm install
npm start
```

## 当前实现状态

- 已完成 Web 和 Desktop 的目录拆分
- 已完成 Web 端静态 MVP 原型
- 已完成 Desktop 端 Electron-ready 原型
- 两端目前都基于 mock 数据和前端本地状态推进任务流
- 真实 orchestrator、API、存储和模型网关尚未接入

## 开发约定

- 共享产品规则、Agent 流程和数据模型统一以 [Agents.md](/mnt/d/GitProject/Project_AITaskForce/Agents.md) 为准
- Web 和 Desktop 保持独立入口，不共用单一 HTML 启动文件
- Web 优先验证工作台结构，Desktop 优先验证对话入口体验
- 接真实后端后，两端应共享任务状态语义，但各自维护独立 UI 状态层
