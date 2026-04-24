# AI Task Force

AI Task Force 是一个面向有界执行任务的结构化 AI 团队工作区。

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
  浏览器端 workspace 客户端，用于任务输入、agent 结构展示、timeline 和 task history。
- `Clients/Desktop`
  Electron 风格桌面端，包含外侧 rail 导航、中间 sidebar、右侧主工作区，以及 `Chat`、`Team`、`Task`、`Projects`、`Usage`、`Settings`。
- `Server`
  最小 ATF 后端，包含 JSON 持久化任务 API、固定多智能体 orchestrator、model gateway、direct chat 接口、Ollama 接入以及 API 模型候选。
- `Agents.md`
  产品规格、workflow 规则、agent 架构、roadmap 与实现约束。

## 当前状态

目前已经实现：

- 共享 task / event 模型下的静态 Web workspace shell。
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
- Review contract 基础能力，包括：
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
- 面向 tasks、subtasks、events、messages、archived state、task numbering 的 JSON 持久化基线。
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

AI Task Force 把反复试错视为产品问题，而不只是模型质量问题。当前系统主要聚焦两个问题。

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

当前实现形态：

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

- 把当前 JSON 持久化基线升级成 schema-backed runtime store

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

### 开发原则
核心规则是：
- 只优先做能证明产品核心理念的最小执行框架
- 不把次级客户端或扩展型产品面放进当前主线
- 非阻塞扩展项统一下放到 TODO，而不是占用当前 roadmap 主体

对这个项目来说，真正定义产品的最小闭环是：
```text
Leader -> Planner -> Writer -> Reviewer -> Final
```

### 当前所处位置

当前项目已经有：

- 可用的 Desktop shell
- 可切换的模型路由
- Leader 任务发布入口
- 能跑通的固定 workflow slice

当前主缺口已经不是界面外壳，而是执行内核的加固。

### 当前 MVP 目标

#### MVP 1：PPT 生成系统

输入：
- 主题
- 目标受众
- 页数
- 风格
- 语言

期望输出：
- PPT 大纲
- 每页文案
- 演讲稿
- 最终 `.pptx`
- review 报告

验收标准：
- 结构完整
- 页数正确
- 语气符合要求
- 内容无明显矛盾
- 系统能够导出 `.pptx`

当前判断：
- 这是当前主 MVP
- 现有系统已经覆盖 intake、planning、writing、review 和报告型输出
- 当前主要缺口在真实交付物层：slide schema、`.pptx` 生成、文件级 review

#### MVP 2：WebApp 生成系统

输入：
- 一个符合明确要求的 WebApp 请求

期望输出：
- 需求整理
- 技术方案
- 代码
- 构建结果
- 错误修复
- 最终可运行项目

验收标准：
- `npm install` 成功
- `npm build` 成功
- 页面可打开
- 功能符合需求
- Reviewer pass

当前判断：
- 这不是当前的主 MVP
- 它依赖比当前更强的执行闭环
- 更适合作为 PPT 生成系统跑通后的下一阶段 MVP

### 核心 Roadmap

#### R1 最小执行内核

目标：
- 让固定多智能体链路更像真正的 bounded execution system，而不是外面套了 UI 的 prompt chain
- 提供 MVP 1 所需的最小执行保证

优先级：
- `P0 当前立即做`

所需模块：
- `P0 Runtime State Machine`
- `P1 Role Contract System`

验收标准：
- 合法 task-state transition 被严格约束
- role output 与 failure 都有稳定 contract
- reviewer 拒绝后会可预测地回到 writer 修订
- 常见文本任务可以不依赖临时补丁稳定跑通

仍然缺少：
- 正式的 state machine，而不是分散的 orchestrator 分支逻辑
- planner、writer、reviewer、leader 之间更强的 failure contract
- 更紧密的 Leader publication 到 Planner execution 的输入连接

#### R2 可观察任务运行时

目标：
- 让任务进展、失败、重试、恢复都可以被检查，而不是依赖聊天猜测或终端日志猜测
- 让 PPT 生成在文本层和交付物层的失败都可观察

优先级：
- `P0 当前立即做`

所需模块：
- `P2 Evaluation Engine`
- `P3 Convergence Engine`
- `P5 Runtime Trace Model`

验收标准：
- task trace 能解释 runtime 为什么进入下一步
- retry reason 和 reviewer outcome 对用户可见
- failed-step retry 与有界 revision 行为可预测
- 用户能看懂任务卡在哪，以及多轮尝试之间发生了什么变化

仍然缺少：
- 可持久化、可查询的 trace model，而不是主要依赖终端 debug 输出
- 更清楚的 blocked / warning / human-confirmation 状态解释
- 更好的多轮 retry / revision 对比能力

#### R3 面向单用户的持久运行时

目标：
- 在扩展更多客户端和更多产品表面之前，先让系统对一个主要用户在重启后仍然可用
- 保留生成真实交付物所需的上下文和运行状态

优先级：
- `P0 下一阶段`

所需模块：
- `P5 Runtime Trace Model`
- `P6 Persistence Schema Upgrade`

验收标准：
- runtime state 在重启后可恢复
- tasks、task runs、evaluator outputs、route history 可以恢复
- direct chats 和核心 settings 不再只存在于临时 client memory

仍然缺少：
- 超越当前 JSON baseline 的 schema-backed persistence
- direct chats、settings、route selections 的完整恢复
- storage shape 演进后的 migration support

### TODO / Later
这些事情依然有价值，但不属于当前单人开发的关键路径：
- Web 后端接入
- mobile-friendly 状态查看
- live usage telemetry 与更丰富的 analytics
- 超出当前 task core 的 project-memory 扩展
- Leader-controlled document editing
- 完整的 WebApp 生成执行闭环
- 更完整的 benchmark harness
- 更深的 shell polish、keyboard shortcuts 与 power-user 交互
