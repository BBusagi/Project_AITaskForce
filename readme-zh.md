# AI Task Force

AI Task Force 是一个面向文本任务的多智能体工作区 MVP。

它当前不是要先做成通用 autonomous agent platform，而是先把一个固定、可检查、可验证的协作流程做成真实可用的产品体验：

```text
User -> Leader -> Planner -> Writer -> Reviewer -> Leader Final Response
```

## 文档职责

- `README.md` 是英文项目入口，说明项目是什么、如何启动、当前实现了什么，以及接下来的开发方向。
- `readme-zh.md` 是中文项目入口，职责与英文 README 一致。
- `Agents.md` 是产品规格与实现规则的权威文档，包含 workflow、agent 职责、模型路由原则、UI 约束、实施说明和 roadmap。

如果 `README.md`、`readme-zh.md` 和 `Agents.md` 之间存在冲突，以 `Agents.md` 为产品行为与 AI coding-agent 指令的最终依据。

## 仓库结构

- `Clients/Web`
  浏览器端 workspace MVP，用于任务输入、agent 结构展示、timeline 和 task history。
- `Clients/Desktop`
  Electron 风格桌面端，包含外侧 rail 导航、中间 sidebar、右侧主工作区，以及 `Chat`、`Team`、`Task`、`Projects`、`Usage`、`Settings`。
- `Server`
  最小 ATF 后端，包含 JSON 持久化任务 API、固定多智能体 orchestrator、model gateway、direct chat 接口、Ollama 接入以及 API 模型候选。
- `Agents.md`
  产品规格、workflow 规则、agent 架构、roadmap 与实现约束。

## 当前状态

目前已经实现：

- 共享产品模型下的静态 Web MVP。
- 全窗口 Desktop shell，采用外侧 rail、中栏树结构、右侧工作区的桌面应用布局。
- Desktop 中的 `Chat`、`Team`、`Task`、`Projects`、`Usage`、`Settings` 工作区。
- Leader-first 的聊天入口，支持自然协商和独立的任务发布动作。
- 通过 `POST /api/chat` 进行 direct agent chat，并跟随各 agent 当前选择的模型路由。
- 固定后端 workflow：
  `Leader -> Planner -> Writer -> Reviewer -> Leader Final Response`
- 跨 provider 的真实模型路由：
  OpenAI、Anthropic、Ollama。
- 默认角色路由：
  Leader / Planner / Reviewer -> `GPT API / gpt-5.4-2026-03-05`
  Writer -> `Ollama Local / qwen3:8b`
- Settings 中的主题、语言和 LLM 启用过滤。
- Team overview 与单个 agent drilldown，可查看当前 route、provider、model 和状态。
- 从 Leader chat 将任务正式发布到后端 workflow。
- Task workspace 当前包含：
  `Overview`
  `Timeline`
  各个具体 task 的详情视图
- 单个 task 详情视图当前展示：
  task summary
  per-task stage flow
  intermediate outputs
  final output
- Team timeline 接口与 UI，可聚合所有任务事件，并为每条事件标注所属 task。
- Task 操作：
  full retry
  retry only the failed step
  archive
  delete
- Review contract MVP，包括：
  固定 rubric
  结构化 Writer submission
  machine-readable Reviewer output
  有界自动 review 次数
  `human_confirmation` 升级路径
- Task subtask 中的模型调用可观测性：
  provider
  model
  duration
  timeout
  response size
  request status
- 后端终端中的 chat 请求与关键 task lifecycle 日志输出。
- 面向 tasks、subtasks、events、messages、archived state、task numbering 的 JSON persistence MVP。
- 当前仍为 mock 的 Projects 与 Usage workspace。

尚未实现：

- SQLite persistence 与 migration tooling。
- 当前 Desktop client 之外的完整 direct-chat history 持久化。
- 覆盖整个产品表面的 Settings 与 route-selection state 持久化。
- 实时 token telemetry 与 usage accounting。
- Web client 的完整后端接入。
- 移动端或 Web 状态 companion client。
- 安全的、由 Leader 控制的轻量文档编辑 workflow。
- streaming response 与 websocket live update。

## 产品问题总结

AI Task Force 把反复试错视为产品问题，而不只是模型质量问题。当前 MVP 主要聚焦两个问题。

### Problem 1: 执行环不可见

AI 辅助开发之所以容易变成反复尝试、反复出错，是因为执行环不透明：信息不完整、执行过程难以检查、验证较弱、模型推理具有概率性。

工作区需要在任务进行中持续暴露这些信息：

- 谁在负责
- 当前模型路由是什么
- 任务处于哪个状态
- 项目上下文是什么
- 验证信号和失败原因是什么

### Problem 2: Review 标准没有被制式化

Reviewer 反馈不能长期停留在纯自然语言层面。如果标准模糊，Writer 在修复被拒问题时，很容易把原本正确的内容改坏，导致每一轮都修一处、坏一处，最终 workflow 虽然在推进，但永远无法稳定通过。

Review 层需要一个更正式的 contract：

- 固定 Reviewer rubric：`completeness`、`correctness`、`format`、`consistency`、`regression`
- 结构化 Writer submission：`changed`、`unchanged`、`why`、`draft_text`
- revision review 只检查未解决问题、当前修改区域和由修改引入的 regression
- preservation rule：未被 Reviewer 明确点名的正确部分不应被重写
- 稳定的 issue ID，使 Writer 可以针对缺陷而不是整篇重写
- machine-readable reject reason，包括 blocking issues、minor issues、resolved issue IDs、rubric status、next action
- 只因 blocking defect 拒绝，而不是因为细枝末节的风格偏好
- 有界重试：最多 2 次 automated review，之后升级到 `human_confirmation`

当前 MVP 的实现形态：

```text
Writer submission
  -> { changed, unchanged, why, draft_text }

Reviewer decision
  -> {
       result,
       rubric,
       blocking_issues,
       minor_issues,
       resolved_issue_ids,
       next_action
     }

Attempt 1: full review
Attempt 2: prior issues + changed regions + regression only
After attempt 2: human_confirmation
```

## 协作框架

当前项目已经可以被描述为一个结构化 AI 协作 workflow，但还不是一个真正的 fully autonomous multi-agent society。

目前形成的有价值协作框架是：

```text
1. Intake
   用户先与 Leader 自然对话

2. Task Contract
   Leader 将需求收敛为明确任务

3. Planning
   Planner 定义 objective、constraints、output format 和 handoff 逻辑

4. Execution
   专门角色生成结构化 submission

5. Quality Gate
   Reviewer 使用固定 rubric 和 machine-readable issue contract 进行判断

6. Scoped Revision
   Writer 只修改 blocking issues 和相关变更区域

7. Escalation
   在自动 review 次数用尽后升级为 human confirmation

8. Finalization
   Leader 合成最终交付

9. Observability
   每个阶段都记录 events、model route、invocation status、intermediate outputs 和 review decisions
```

这是一种基于角色的多智能体协作框架：

- agents 目前是 workflow roles，而不是完全自治的长期进程
- 不同角色可以路由到不同模型 provider
- 系统价值来自有界执行、可检查状态、质量门和可恢复失败处理

## Execution Runtime 方向

AI Task Force 正在逐步从一个多智能体 workflow 产品，走向一个 execution runtime 候选系统。

可以用一句话概括这个方向：

> AI Execution Runtime = deterministic shell for probabilistic compute

在这个定义下：

- 模型是 compute unit
- workflow step 是 bounded search operation
- runtime 负责 control、evaluation、convergence 和 observability

这意味着项目的核心不再只是“更多 prompt”或“更多 agent”，而是 runtime system 本身。

### 已经对齐的部分

当前架构已经覆盖了正确的顶层支柱：

- Generation
- Control
- Evaluation
- Convergence
- Observability

### 仍然缺少的部分

当前真正的缺口不是理念，而是 execution-grade 的工程闭环，主要还差三层。

#### 更硬的 Control Layer

runtime 还需要：

- typed role IO，而不只是 prompt 形态的松散 payload
- 每个角色明确的 input / output / failure contract
- 更严格的 context slicing，让每个角色只看到最小必要上下文

#### 可执行的 Evaluation Layer

只有 Reviewer 打分还不够，系统还需要：

- 能直接驱动 runtime 行为的 evaluation output
- LLM judgement 之外的 rule-based / programmatic validation
- LLM reviewer + rule validator + regression checker 这样的 multi-evaluator 组合

#### 更强的 Convergence Layer

retry 不能只是泛化循环，runtime 还需要：

- 基于上一次失败结果的 state-aware retry
- 只重跑失败片段的 partial rerun
- 用于探索与收敛候选结果的显式 search policy

### “最小可运行执行系统”到底是什么意思

当前项目其实已经有能跑通的 vertical slice。比如多语言总结这种任务，已经可以通过 Leader -> Planner -> Writer -> Reviewer 这条链路跑完。

但这还不等于一个可复用的 execution runtime。

这里缺少的，是一个更小但更硬的执行核心，包括：

- 明确合法状态与状态转移的 state machine
- 能根据评估结果决定下一步动作的 eval loop

也就是说：

- 现在的系统已经能把某些具体任务跑通
- 未来的 runtime 则要把这种流程变成可复用、可约束、可扩展的执行引擎

### 具体待开发模块列表

#### P0 Runtime State Machine

作用：

- 把当前隐含在 orchestrator 里的流程，提炼成显式状态转移系统

要做什么：

- 定义 task state 与合法转移
- 定义转移触发条件与失败出口
- 在每次状态变化时输出稳定的 runtime event

#### P1 Role Contract System

作用：

- 正式定义每个角色收到什么、产出什么、失败时怎么表示

要做什么：

- typed input contract
- typed output contract
- per-role failure contract

#### P2 Evaluation Engine

作用：

- 让 evaluation 成为正式 runtime 子系统，而不只是 Reviewer prompt

要做什么：

- LLM reviewer
- rule validator
- regression checker
- machine-readable evaluator output

#### P3 Convergence Engine

作用：

- 让 retry 变成 state-aware 的收敛过程

要做什么：

- retry budget
- partial rerun
- 基于失败原因修改下一次输入
- 显式的 search / refinement policy

#### P4 Context Slicing Layer

作用：

- 严格控制每个角色能看到哪些上下文

要做什么：

- 按角色裁剪 context
- 只下发最小必要上下文
- 降低角色之间的 context leakage

#### P5 Runtime Trace Model

作用：

- 把执行记录成结构化 trace，而不是只停留在终端日志

要做什么：

- run id
- state transition record
- evaluator output
- retry reason
- route / duration metadata

#### P6 Persistence Schema Upgrade

作用：

- 把 JSON MVP persistence 升级成 schema-backed runtime store

要做什么：

- tasks
- task runs
- task states
- evaluator results
- runtime events
- route history

#### P7 Benchmark Harness

作用：

- 证明 runtime 是否真的优于单次生成 baseline

要做什么：

- 选择一个 benchmark task domain
- 对比 baseline generation 与 AES runtime execution
- 跟踪 quality、retry、cost、latency

更完整的产品问题定义、workflow 模型和 roadmap 请查看 `Agents.md`。

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

默认 Ollama 地址：

```text
http://127.0.0.1:11434
```

默认可编辑后端配置：

```text
Server/atf.config.js
```

可选本地覆盖配置：

```text
Server/atf.config.local.js
```

API key 可以通过环境变量或本地 secret 文件提供：

```text
Server/openai.key
Server/anthropic.key
Server/claude.key
```

默认 JSON persistence 路径：

```text
Server/.atf-data/store.json
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

然后访问：

```text
http://localhost:8000/Clients/Web/
```

## Roadmap

### 当前所处位置

当前项目大致位于：

- `M3 Leader Task Publication`
- `M4 Fixed Multi-Agent Workflow`
- `M5 Task Observability And Recovery`

`M1` 和 `M2` 的大部分内容已经完成。`M6` 目前只有 JSON-based MVP。`M7` 和 `M8` 仍是后续阶段。

### Milestone 结构

从现在开始，milestone 不应该再和工程模块分成两套平行结构。

更合理的结构应该是：

```text
Milestone
-> Objective
-> Priority
-> Required Modules
-> Acceptance
-> Still Missing
```

也就是说：

- milestone 定义产品目标
- priority 定义当前推进优先级
- module 定义为达成目标所需的工程能力
- acceptance 定义什么时候可以认为该 milestone 已达到

### 什么叫“MVP 层面已可用”

当 roadmap 里写某个 milestone “MVP 层面已可用”时，并不代表这一块已经完全完成。

它表示：

- 主用户路径已经存在
- 功能可以端到端跑通
- 已经适合 demo 和小范围真实测试

它不表示：

- production-grade persistence 已完成
- failure handling 已完全加固
- cross-client state 已完整打通
- 每个边界情况都已经有稳定 runtime contract

### Milestone Map

#### M0 Product Definition

- 把 AI Task Force 定义为结构化的 AI team workspace，而不是通用 autonomous agent platform。
- 固定 Desktop、Web、Server 和 `Agents.md` 之间共享的产品语言。

状态：

- 基本完成

优先级：

- `P0 基础`

所需模块：

- 统一产品词汇
- 统一 task / event 模型
- 统一 routing 语义

验收标准：

- Desktop、Web、Server 和文档描述的是同一个有边界的系统
- 项目被明确表述为 AI workspace / runtime，而不是自由形态 autonomous platform

仍然缺少：

- 清理仍带有早期 MVP 口径的过时描述
- 随执行模型演进持续同步 Desktop、Web 与文档

#### M1 Desktop Shell

- 构建全窗口 Desktop shell，形成 outer rail、collapsible middle sidebar 和 right workspace stage。
- 将 `Chat`、`Team`、`Task`、`Projects`、`Usage`、`Settings` 作为主工作区。

状态：

- 基本完成

优先级：

- `P1 维护`

所需模块：

- Desktop shell layout
- workspace rail
- collapsible middle sidebar
- right-stage workspace renderer

验收标准：

- Desktop 表现为真正的 full-window client shell
- 导航不再依赖居中的 dashboard-card 布局
- 各栏位滚动发生在各自内部，而不是整页滚动

仍然缺少：

- spacing、overflow、cross-panel consistency 的剩余打磨
- 各 workspace 更清晰的 loading / empty / error 状态
- 后续的键盘导航和 power-user 交互

#### M2 Model Connectivity

- 接入 Ollama、OpenAI、Anthropic 路由。
- 支持按 agent 选择 route、启用过滤，并在 UI 中明确显示 provider / model 身份。

状态：

- MVP 层面已可用

优先级：

- `P1 稳定化`

所需模块：

- model gateway
- route selection UI
- enabled-model filter

验收标准：

- 可路由的 agent 能绑定到明确可见的 provider / model route
- 本地模型与 API 模型可以在同一套 routing surface 下共存
- enabled-model filtering 能控制 agent 下拉中的候选模型

仍然缺少：

- route-selection history 的持久化
- 更强的 provider health 与 fallback 行为
- 与 route / model activity 绑定的 usage telemetry
- 更明确的 provider failure runtime contract

#### M3 Leader Task Publication

- 保持 Leader 为主要 intake surface。
- 区分自然对话与正式任务发布。
- 在任务进入 workflow 前提供明确的 publication confirmation。

状态：

- MVP 层面已完成

优先级：

- `P1 稳定化`

所需模块：

- Leader direct chat
- task publication draft
- publication confirmation flow

验收标准：

- 主任务必须来自显式的 Leader publication，而不是普通聊天文本
- publication 会稳定创建 task record 并启动 workflow
- 用户能明确区分普通对话和任务创建

仍然缺少：

- 超越当前 publication card flow 的正式 task-contract schema
- 持久化到后端 task model 的 milestone-aware publication data
- publication output 与后续 Planner execution state 之间更强的结构连接

#### M4 Fixed Multi-Agent Workflow

- 跑通固定流程：
  `Leader -> Planner -> Writer -> Reviewer -> Leader Final Response`
- 保持 workflow 可检查、确定性强。
- 稳定 retry、review 和 human-confirmation 在常见文本任务下的行为。
- 让执行从 prompt chaining 进一步升级为 contract-based runtime behavior。

状态：

- 已实现，但还在继续加固

优先级：

- `P0 当前核心`

所需模块：

- `P0 Runtime State Machine`
- `P1 Role Contract System`

验收标准：

- 合法 task-state transition 被严格约束
- role output 结构稳定并符合 contract
- review、revise、human-confirmation 路径可预测
- 常见文本任务可以不依赖临时补丁稳定跑通

仍然缺少：

- 正式的 state machine，而不是分散在 orchestrator 分支里的流程逻辑
- planner、writer、reviewer、leader 之间更强的 failure contract
- milestone-aware planning 还没有真正接入执行链路

#### M5 Task Observability And Recovery

- 让 task state、owner、intermediate outputs、final output、model route、invocation status、timeline events 可见。
- 支持 full retry、failed-step retry、archive、delete。
- 在不回退成 dashboard UI 的前提下提升每个 task 的执行可读性。
- 让失败能够被当作 runtime event 调试，而不是只能从 chat 文本中猜测。

状态：

- 正在持续开发中

优先级：

- `P0 当前核心`

所需模块：

- `P2 Evaluation Engine`
- `P3 Convergence Engine`
- `P5 Runtime Trace Model`

验收标准：

- evaluator output 可见且可驱动动作
- retry reason 可见
- 主任务流支持 partial rerun
- execution trace 足以支持 debug，而不需要从聊天文本反推

仍然缺少：

- 可持久化、可查询的 trace model，而不是主要依赖终端 debug 输出
- 更清楚的 blocked / warning / human-confirmation 状态解释
- 更好的多轮 retry / revision 对比能力

#### M6 Persistence And Project Memory

- 从 JSON MVP persistence 升级到稳定的 schema-backed store。
- 一致地持久化 direct chats、settings、route history、project state，以及未来的 milestone state。

状态：

- 目前只有 JSON MVP

优先级：

- `P0 下一阶段`

所需模块：

- `P5 Runtime Trace Model`
- `P6 Persistence Schema Upgrade`

验收标准：

- runtime state 在重启后可恢复
- task run、evaluator output、route history 可以恢复
- persistence 不再局限于单一路径的 JSON MVP

仍然缺少：

- SQLite 或 Postgres-backed schema storage
- direct chats、settings、route selections 的完整恢复
- project-level memory 与 migration support

#### M7 Multi-Client Access

- 让 Web 接入共享后端。
- 添加轻量只读或轻操作的 Web / mobile-friendly 访问层。

状态：

- 除 prototype 外尚未开始

优先级：

- `P2 后续`

所需模块：

- backend-connected Web client
- shared state restoration
- lightweight mobile-friendly status access

验收标准：

- Web 能从与 Desktop 相同的 backend 查看共享 task / agent state
- 未来 mobile-friendly access 可以复用同一套 runtime state

仍然缺少：

- Web client 目前仍是 prototype 级别
- 还没有 mobile check-in surface
- 还没有多端同步打磨与 auth boundary

#### M8 AI Execution System

- 从 “task generation” 进一步走向真正的执行系统。
- 让系统作用于 project objects、documents、modules 和未来的 workspace targets。
- 让输出可追踪、可恢复、可审计。

状态：

- 未来方向

优先级：

- `P1 战略方向`

所需模块：

- `P0 Runtime State Machine`
- `P1 Role Contract System`
- `P2 Evaluation Engine`
- `P3 Convergence Engine`
- `P4 Context Slicing Layer`
- `P5 Runtime Trace Model`
- `P6 Persistence Schema Upgrade`
- `P7 Benchmark Harness`

验收标准：

- runtime 可以作为系统来评估，而不只是作为 prompt chain 展示
- baseline single-pass generation 可以与 runtime execution 正式比较
- execution cost、retry、trace、output quality 可以一起被测量

仍然缺少：

- 真实 execution targets 还没有建模
- benchmark task 还没有证明 runtime 相比 single-pass generation 的优势
- control、evaluation、convergence 还不够完整，暂时不能称为完整 execution runtime

### 当前下一阶段重点

#### Phase A: Runtime Hardening

- 增加 typed role IO 与 contract-based execution boundary。
- 为每个角色定义 failure contract，而不仅仅是 success payload。
- 为 Leader、Planner、Writer、Reviewer 引入更严格的 context slicing。

#### Phase B: Executable Evaluation Loop

- 将 LLM review 与 programmatic validation 结合。
- 让 evaluator output 直接驱动 runtime 的 next action。
- 强化 state-aware retry 与 partial rerun。

#### Phase C: Benchmark And Trace

- 选择一个 benchmark task domain，例如 document generation。
- 对比 baseline single-pass generation 与 AES runtime execution。
- 增加 cost tracking 与 execution trace UI，把 runtime 当作系统来评估。
