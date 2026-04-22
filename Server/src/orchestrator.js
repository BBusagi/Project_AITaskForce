const {
  createTask,
  updateTask,
  addSubtask,
  addEvent,
  addMessage,
  getTask,
  state,
} = require("./store");
const { generate, resolveRoute } = require("./model-gateway");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function summarizeTitle(text) {
  const clean = text.trim();
  return clean.length > 72 ? `${clean.slice(0, 72)}...` : clean;
}

async function generateOrFallback(role, prompt, fallback) {
  try {
    return await generate(role, prompt);
  } catch {
    return {
      provider: "mock",
      model: "fallback",
      text: fallback,
    };
  }
}

function describeRoute(role) {
  const route = resolveRoute(role);
  if (!route) return "fallback";
  return `${route.provider}:${route.model}`;
}

function buildPlannerPrompt(task) {
  return [
    "You are the Planner agent in AI Task Force.",
    "Return a concise structured task plan.",
    "Include objective, constraints, output format, execution steps, and assigned role suggestions.",
    "",
    `Task title: ${task.title}`,
    `User input: ${task.userInput}`,
  ].join("\n");
}

function buildWriterPrompt(task, planText) {
  return [
    "You are the Writer agent in AI Task Force.",
    "Write a concise first draft based on the plan.",
    "Do not include hidden reasoning.",
    "",
    `Task title: ${task.title}`,
    `User input: ${task.userInput}`,
    "",
    "Plan:",
    planText,
  ].join("\n");
}

function buildReviewerPrompt(task, draftText) {
  return [
    "You are the Reviewer agent in AI Task Force.",
    "Return: result, issues found, revision guidance, rationale.",
    "Be concise.",
    "",
    `Task title: ${task.title}`,
    "",
    "Draft:",
    draftText,
  ].join("\n");
}

function buildFinalOutput(task, planText, draftText, reviewText) {
  return [
    `Task: ${task.title}`,
    "",
    "Plan Summary:",
    planText,
    "",
    "Draft Output:",
    draftText,
    "",
    "Review Summary:",
    reviewText,
  ].join("\n");
}

function buildLeaderPrompt(task, planText, draftText, reviewText) {
  return [
    "You are the Leader agent in AI Task Force.",
    "Deliver the final user-facing response for the completed workflow.",
    "Keep it concise, structured, and ready to send back to the user.",
    "",
    `Task title: ${task.title}`,
    `User input: ${task.userInput}`,
    "",
    "Planner output:",
    planText,
    "",
    "Writer draft:",
    draftText,
    "",
    "Reviewer result:",
    reviewText,
  ].join("\n");
}

function addLifecycleMessage(taskId, senderId, content) {
  addMessage(taskId, {
    senderType: senderId === "user" ? "user" : "leader",
    senderId: senderId === "user" ? null : senderId,
    content,
  });
}

async function runTask(taskId) {
  if (state.taskRuns.get(taskId)) return;
  state.taskRuns.set(taskId, true);

  try {
    const task = getTask(taskId);
    if (!task) return;

    updateTask(taskId, { status: "planning", stageOwnerId: "planner" });
    addEvent(taskId, {
      actorType: "system",
      actorId: "planner",
      eventType: "planning_started",
      message: "Planner started decomposing the task.",
    });
    addLifecycleMessage(taskId, "leader", `Planner has started on route ${describeRoute("planner")}. Building a structured task plan.`);

    const planResult = await generateOrFallback(
      "planner",
      buildPlannerPrompt(task),
      [
        "Objective: deliver a structured first-pass answer.",
        "Constraints: keep the workflow deterministic and easy to inspect.",
        "Output format: concise structured text.",
        "Execution steps: planning -> drafting -> review -> final response.",
        "Assigned roles: planner, writer, reviewer, leader.",
      ].join("\n")
    );

    addSubtask(taskId, {
      type: "plan",
      assignedAgentId: "planner",
      inputText: task.userInput,
      outputText: planResult.text,
      status: "completed",
    });
    addEvent(taskId, {
      actorType: "agent",
      actorId: "planner",
      eventType: "planning_completed",
      message: "Planner completed the structured task plan.",
      metadata: {
        provider: planResult.provider,
        model: planResult.model,
      },
    });

    await sleep(500);

    updateTask(taskId, { status: "writing", stageOwnerId: "writer" });
    addEvent(taskId, {
      actorType: "system",
      actorId: "writer",
      eventType: "writing_started",
      message: "Writer started the first draft.",
    });
    addLifecycleMessage(taskId, "leader", `Writer is generating the first draft through route ${describeRoute("writer")}.`);

    const draftResult = await generateOrFallback(
      "writer",
      buildWriterPrompt(task, planResult.text),
      [
        "Draft:",
        `- Task focus: ${task.title}`,
        "- Proposed output: concise structured answer",
        "- Current backend route: local Ollama writer with in-memory orchestration",
      ].join("\n")
    );

    const draftSubtask = addSubtask(taskId, {
      type: "draft",
      assignedAgentId: "writer",
      inputText: planResult.text,
      outputText: draftResult.text,
      status: "completed",
    });
    addEvent(taskId, {
      actorType: "agent",
      actorId: "writer",
      eventType: "writing_completed",
      message: "Writer completed the first draft.",
      subtaskId: draftSubtask.id,
      metadata: {
        provider: draftResult.provider,
        model: draftResult.model,
      },
    });

    await sleep(500);

    updateTask(taskId, { status: "reviewing", stageOwnerId: "reviewer" });
    addEvent(taskId, {
      actorType: "system",
      actorId: "reviewer",
      eventType: "review_started",
      message: "Reviewer started the quality check.",
    });
    addLifecycleMessage(taskId, "leader", `Reviewer is checking the draft through route ${describeRoute("reviewer")}.`);

    const reviewResult = await generateOrFallback(
      "reviewer",
      buildReviewerPrompt(task, draftResult.text),
      [
        "result: pass",
        "issues found: none blocking",
        "revision guidance: keep the response concise and structured",
        "rationale: the draft follows the requested ATF workflow",
      ].join("\n")
    );

    const passed = !/\bresult:\s*fail\b/i.test(reviewResult.text);
    const reviewSubtask = addSubtask(taskId, {
      type: "review",
      assignedAgentId: "reviewer",
      inputText: draftResult.text,
      outputText: reviewResult.text,
      status: passed ? "completed" : "rejected",
      reviewComment: passed ? null : reviewResult.text,
    });

    addEvent(taskId, {
      actorType: "agent",
      actorId: "reviewer",
      eventType: passed ? "review_passed" : "review_failed",
      message: passed ? "Reviewer approved the draft." : "Reviewer rejected the draft.",
      subtaskId: reviewSubtask.id,
      metadata: {
        provider: reviewResult.provider,
        model: reviewResult.model,
      },
    });

    if (!passed) {
      updateTask(taskId, {
        status: "failed",
        stageOwnerId: "leader",
        errorMessage: "Review failed in the current MVP flow.",
      });
      addEvent(taskId, {
        actorType: "system",
        actorId: "leader",
        eventType: "task_failed",
        message: "Task stopped after review failure.",
      });
      addLifecycleMessage(taskId, "leader", "The workflow stopped after review failure. Retry support can be added next.");
      return;
    }

    addLifecycleMessage(taskId, "leader", `Leader is synthesizing the final response through route ${describeRoute("leader")}.`);

    const finalResult = await generateOrFallback(
      "leader",
      buildLeaderPrompt(task, planResult.text, draftResult.text, reviewResult.text),
      buildFinalOutput(task, planResult.text, draftResult.text, reviewResult.text)
    );

    updateTask(taskId, {
      status: "completed",
      stageOwnerId: "leader",
      finalOutput: finalResult.text,
      errorMessage: null,
    });
    addEvent(taskId, {
      actorType: "agent",
      actorId: "leader",
      eventType: "final_output_ready",
      message: "Leader synthesized the final output.",
      metadata: {
        provider: finalResult.provider,
        model: finalResult.model,
      },
    });
    addLifecycleMessage(taskId, "leader", "Final output is ready.");
  } catch (error) {
    updateTask(taskId, {
      status: "failed",
      stageOwnerId: "leader",
      errorMessage: error.message,
    });
    addEvent(taskId, {
      actorType: "system",
      actorId: "leader",
      eventType: "task_failed",
      message: error.message,
    });
    addLifecycleMessage(taskId, "leader", `Workflow failed: ${error.message}`);
  } finally {
    state.taskRuns.delete(taskId);
  }
}

function createAndStartTask(input) {
  const task = createTask({
    title: input.title?.trim() || summarizeTitle(input.userInput),
    userInput: input.userInput,
    priority: input.priority || "medium",
  });

  addMessage(task.id, {
    senderType: "user",
    senderId: null,
    content: input.userInput,
  });

  addEvent(task.id, {
    actorType: "user",
    actorId: null,
    eventType: "task_created",
    message: "Task created from user input.",
  });

  addLifecycleMessage(task.id, "leader", "Leader received the task and started the ATF workflow.");
  void runTask(task.id);
  return task;
}

module.exports = {
  createAndStartTask,
};
