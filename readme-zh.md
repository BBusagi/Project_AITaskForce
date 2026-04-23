# AI Task Force

AI Task Force 是一个面向文本任务的多智能体工作区 MVP。

它当前不是要先做成通用自治智能体平台，而是先把一个固定、可检查、可验证的协作流程做成真实可用的产品体验：

```text
User -> Leader -> Planner -> Writer -> Reviewer -> Leader Final Response
```

## 文档职责

- `README.md` 是英文项目入口，说明项目是什么、如何启动、当前完成情况和下一步方向。
- `readme-zh.md` 是中文项目入口，内容与 README 的职责一致。
- `Agents.md` 是产品和 agent 规格的唯一详细来源，包含工作流、agent 职责、模型路由原则、UI 约束、实施说明和 roadmap。

如果 README 与 `Agents.md` 出现冲突，以 `Agents.md` 中的产品行为和 AI coding-agent 指令为准。

## 仓库结构

- `Clients/Web`
  浏览器端工作区 MVP，用于任务输入、agent 结构展示、时间线和任务历史。
- `Clients/Desktop`
  Electron 风格桌面客户端，包含外侧 rail 导航、中间工作区树、右侧主工作区、直接 agent 对话、Team、Task、Projects、Usage 和 Settings。
- `Server`
  最小 ATF 后端，包含内存任务 API、模型网关、直接对话接口、Ollama 集成和 API 模型候选。
- `Agents.md`
  产品规格、工作流规则、agent 架构、roadmap 和实施约束。

## 当前状态

目前已经实现：

- 静态 Web MVP。
- Electron-ready Desktop shell 原型。
- 全窗口 Desktop 布局：左侧 rail、中间可折叠 sidebar、右侧 workspace stage。
- `Team` overview 与单个 agent drilldown。
- 通过 `POST /api/chat` 进行直接 agent 对话。
- Ollama 使用原生 `/api/chat` 进行对话。
- 模型网关中包含 OpenAI 和 Claude API 模型候选。
- Writer 默认路由为 `Ollama Local / qwen3:8b`。
- Team overview 和 agent detail 中显示每个 agent 的 provider/model route。
- Settings 中支持主题、语言和 LLM 启用控制。
- Projects 和 Usage 当前为 mock 工作区。

尚未实现：

- 任务、对话、事件和模型路由的持久化存储。
- 所有 agent 的真实端到端 orchestrator 执行。
- 实时 token telemetry。
- Web 客户端的完整后端接入。
- 移动端状态查看客户端。
- 由 Leader 控制的安全轻量文档编辑流程。

## 核心问题摘要

AI 辅助开发经常会变成反复试、反复错，原因不是单纯的模型不够强，而是工作环路不透明：

- agent 开始执行时信息不完整。
- 执行过程不可见，用户难以及时检查。
- 验证弱或滞后。
- 模型推理本身是概率性的，相似输入也可能产生不同结果。

AI Task Force 把这看作产品问题，而不只是模型质量问题。工作区应该在任务进行中持续展示 agent 负责人、模型路由、任务状态、项目上下文和验证信号。

完整的产品问题定义、工作流模型和 roadmap 请查看 `Agents.md`。

## 启动方式

### Server

在 `Server` 目录下运行：

```bash
npm start
```

默认后端地址：

```text
http://127.0.0.1:8787
```

预期 Ollama 地址：

```text
http://127.0.0.1:11434
```

默认可编辑后端配置：

```text
Server/atf.config.js
```

当前默认本地 Writer 模型：

```text
qwen3:8b
```

### Desktop

在 `Clients/Desktop` 目录下运行：

```bash
npm install
npm start
```

### Web

可以直接打开 `Clients/Web/index.html`，也可以在仓库根目录启动静态服务：

```bash
python3 -m http.server 8000
```

然后打开：

```text
http://localhost:8000/Clients/Web/
```

## 近期方向

下一阶段目标是从“可信的产品 shell”推进到“真正可用、可观察的工作流”：

- 持久化任务、子任务、事件、直接对话消息和模型路由历史。
- 让固定的 Leader -> Planner -> Writer -> Reviewer -> Leader 流程通过真实模型调用跑通。
- 增加验证界面，展示 reviewer 检查、retry 原因和最终 approval。
- 将 Web 接入共享后端，用于查看项目和 agent 状态。
- 增加轻量移动端或移动端友好的状态查看界面。
- 允许 Leader 执行受控的轻量文档编辑，例如状态笔记、README 更新和 roadmap 总结。
