const {
  createTask,
  updateTask,
  addSubtask,
  updateSubtask,
  addEvent,
  addMessage,
  getTask,
  state,
} = require("./store");
const { generate, resolveRoute } = require("./model-gateway");
const { providers } = require("./config");

const MAX_REVIEW_ATTEMPTS = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function summarizeTitle(text) {
  const clean = text.trim();
  return clean.length > 72 ? `${clean.slice(0, 72)}...` : clean;
}

function describeRoute(role) {
  const route = resolveRoute(role);
  if (!route) return "fallback";
  return `${route.provider}:${route.model}`;
}

function compactLogText(value, maxLength = 220) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

function logTaskEvent(taskId, stage, message, metadata = {}) {
  const metadataText = Object.entries(metadata)
    .map(([key, value]) => `${key}=${JSON.stringify(compactLogText(value))}`)
    .join(" ");
  console.log(`TASK EVENT task=${taskId} stage=${stage} message=${JSON.stringify(compactLogText(message))}${metadataText ? ` ${metadataText}` : ""}`);
}

function textLength(value) {
  return String(value || "").length;
}

function nowIso() {
  return new Date().toISOString();
}

function getRouteTimeoutMs(route) {
  if (route?.provider === "ollama") return providers.ollama.requestTimeoutMs;
  return null;
}

function buildRunningInvocation(route, startedAt, timeoutMs) {
  return {
    status: "running",
    provider: route.provider,
    model: route.model,
    route: `${route.provider}:${route.model}`,
    startedAt,
    completedAt: null,
    durationMs: null,
    timeoutMs,
    textChars: null,
    errorMessage: null,
  };
}

async function generateRequired(taskId, role, prompt) {
  const route = resolveRoute(role);
  const startedAtMs = Date.now();
  const startedAt = nowIso();
  const timeoutMs = getRouteTimeoutMs(route);

  console.log(`MODEL REQUEST START role=${role} provider=${route.provider} model=${route.model} timeoutMs=${timeoutMs ?? "none"}`);

  try {
    const result = await generate(role, prompt);
    const durationMs = Date.now() - startedAtMs;

    if (!String(result.text || "").trim()) {
      throw new Error(`Model returned empty response for role=${role}`);
    }

    console.log(
      `MODEL REQUEST DONE role=${role} provider=${result.provider} model=${result.model} durationMs=${durationMs} textChars=${textLength(result.text)}`
    );

    return {
      ...result,
      invocation: {
        status: "completed",
        provider: result.provider,
        model: result.model,
        route: `${result.provider}:${result.model}`,
        startedAt,
        completedAt: nowIso(),
        durationMs,
        timeoutMs,
        textChars: textLength(result.text),
        errorMessage: null,
      },
    };
  } catch (error) {
    const durationMs = Date.now() - startedAtMs;
    const timedOut = /timed out|abort/i.test(error.message);
    const status = timedOut ? "timeout" : "failed";

    console.error(
      `MODEL REQUEST ${timedOut ? "TIMEOUT" : "ERROR"} role=${role} provider=${route.provider} model=${route.model} durationMs=${durationMs} error=${JSON.stringify(compactLogText(error.message))}`
    );
    logTaskEvent(taskId, "model_error", "Model generation failed.", {
      role,
      route: describeRoute(role),
      status,
      durationMs,
      error: error.message,
    });
    error.modelInvocation = {
      status,
      provider: route.provider,
      model: route.model,
      route: `${route.provider}:${route.model}`,
      startedAt,
      completedAt: nowIso(),
      durationMs,
      timeoutMs,
      textChars: null,
      errorMessage: error.message,
    };
    throw error;
  }
}

async function runModelForSubtask(taskId, subtaskId, role, prompt) {
  const route = resolveRoute(role);
  const startedAt = nowIso();
  const timeoutMs = getRouteTimeoutMs(route);

  updateSubtask(taskId, subtaskId, {
    status: "running",
    modelInvocation: buildRunningInvocation(route, startedAt, timeoutMs),
  });

  try {
    const result = await generateRequired(taskId, role, prompt);
    updateSubtask(taskId, subtaskId, {
      modelInvocation: result.invocation,
    });
    return result;
  } catch (error) {
    updateSubtask(taskId, subtaskId, {
      status: "failed",
      modelInvocation:
        error.modelInvocation || {
          ...buildRunningInvocation(route, startedAt, timeoutMs),
          status: "failed",
          completedAt: nowIso(),
          errorMessage: error.message,
        },
    });
    throw error;
  }
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
    "Produce the actual user-requested deliverable.",
    "Do not summarize the task metadata.",
    "Do not write placeholder bullets such as task focus, proposed output, backend route, or workflow status.",
    "Use the original user input as the source content and the Planner output as execution guidance.",
    "If the user requested summarization, translation, rewriting, formatting, or multi-language output, perform that work directly.",
    "Respect every requested language, heading, structure, and output format.",
    "Return only the draft content that should be reviewed.",
    "Do not include hidden reasoning or thinking tags.",
    "",
    `Task title: ${task.title}`,
    "Original user input:",
    task.userInput,
    "",
    "Planner output:",
    planText,
  ].join("\n");
}

function buildReviewerPrompt(task, planText, draftText) {
  return [
    "You are the Reviewer agent in AI Task Force.",
    "You are a quality gate, not a second writer.",
    "Check whether the Writer output satisfies the original user request and the Planner constraints.",
    "Fail the draft if any requested language, format, scope, key constraint, or deliverable is missing.",
    "Do not approve just because the draft is fluent.",
    "Return exactly these fields:",
    "result: pass | fail",
    "issues found: concise bullet list",
    "revision guidance: concise bullet list",
    "rationale: one sentence",
    "",
    `Task title: ${task.title}`,
    `User input: ${task.userInput}`,
    "",
    "Planner output:",
    planText,
    "",
    "Writer draft:",
    draftText,
  ].join("\n");
}

function buildWriterRevisionPrompt(task, planText, previousDraft, reviewText, attemptNumber) {
  return [
    "You are the Writer agent in AI Task Force.",
    "Revise the previous draft using the Reviewer feedback.",
    "Produce the corrected user-facing deliverable only.",
    "Do not explain the revision process.",
    "Do not include hidden reasoning or thinking tags.",
    "Respect every requested language, heading, structure, and output format.",
    "",
    `Task title: ${task.title}`,
    `Revision attempt: ${attemptNumber}`,
    "",
    "Original user input:",
    task.userInput,
    "",
    "Planner output:",
    planText,
    "",
    "Previous Writer draft:",
    previousDraft,
    "",
    "Reviewer feedback to address:",
    reviewText,
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

    logTaskEvent(taskId, "leader_published", "Leader published task and started fixed workflow.", {
      title: task.title,
      inputChars: textLength(task.userInput),
    });

    updateTask(taskId, { status: "planning", stageOwnerId: "planner" });
    addEvent(taskId, {
      actorType: "system",
      actorId: "planner",
      eventType: "planning_started",
      message: "Planner started decomposing the task.",
    });
    addLifecycleMessage(taskId, "leader", `Planner has started on route ${describeRoute("planner")}. Building a structured task plan.`);
    logTaskEvent(taskId, "planner_started", "Planner started decomposing the task.", {
      route: describeRoute("planner"),
    });

    const planSubtask = addSubtask(taskId, {
      type: "plan",
      assignedAgentId: "planner",
      inputText: task.userInput,
      status: "running",
    });
    const planResult = await runModelForSubtask(taskId, planSubtask.id, "planner", buildPlannerPrompt(task));
    updateSubtask(taskId, planSubtask.id, {
      outputText: planResult.text,
      status: "completed",
    });
    addEvent(taskId, {
      actorType: "agent",
      actorId: "planner",
      eventType: "planning_completed",
      message: "Planner completed the structured task plan.",
      subtaskId: planSubtask.id,
      metadata: {
        provider: planResult.provider,
        model: planResult.model,
      },
    });
    logTaskEvent(taskId, "planner_completed", "Planner completed structured plan.", {
      provider: planResult.provider,
      model: planResult.model,
      outputChars: textLength(planResult.text),
    });

    await sleep(500);

    let draftResult = null;
    let reviewResult = null;
    let reviewPassed = false;

    for (let attempt = 1; attempt <= MAX_REVIEW_ATTEMPTS; attempt += 1) {
      const isRevision = attempt > 1;

      updateTask(taskId, { status: isRevision ? "revising" : "writing", stageOwnerId: "writer" });
      addEvent(taskId, {
        actorType: "system",
        actorId: "writer",
        eventType: isRevision ? "revision_started" : "writing_started",
        message: isRevision ? `Writer started revision attempt ${attempt}.` : "Writer started the first draft.",
      });
      addLifecycleMessage(
        taskId,
        "leader",
        isRevision
          ? `Writer is revising attempt ${attempt} using Reviewer feedback through route ${describeRoute("writer")}.`
          : `Writer is generating the first draft through route ${describeRoute("writer")}.`
      );
      logTaskEvent(taskId, isRevision ? "writer_revision_started" : "writer_started", isRevision ? "Writer received reviewer feedback and started revision." : "Writer received task and started draft.", {
        attempt,
        route: describeRoute("writer"),
      });

      const draftSubtask = addSubtask(taskId, {
        type: isRevision ? "revise" : "draft",
        assignedAgentId: "writer",
        inputText: isRevision ? reviewResult.text : planResult.text,
        status: "running",
      });
      const writerPrompt = isRevision
        ? buildWriterRevisionPrompt(task, planResult.text, draftResult.text, reviewResult.text, attempt)
        : buildWriterPrompt(task, planResult.text);
      draftResult = await runModelForSubtask(taskId, draftSubtask.id, "writer", writerPrompt);
      updateSubtask(taskId, draftSubtask.id, {
        outputText: draftResult.text,
        status: "completed",
      });
      addEvent(taskId, {
        actorType: "agent",
        actorId: "writer",
        eventType: isRevision ? "revision_completed" : "writing_completed",
        message: isRevision ? `Writer completed revision attempt ${attempt}.` : "Writer completed the first draft.",
        subtaskId: draftSubtask.id,
        metadata: {
          attempt,
          provider: draftResult.provider,
          model: draftResult.model,
        },
      });
      logTaskEvent(taskId, isRevision ? "writer_revision_completed" : "writer_completed", isRevision ? "Writer completed revision." : "Writer completed draft.", {
        attempt,
        provider: draftResult.provider,
        model: draftResult.model,
        outputChars: textLength(draftResult.text),
      });

      await sleep(500);

      updateTask(taskId, { status: "reviewing", stageOwnerId: "reviewer" });
      addEvent(taskId, {
        actorType: "system",
        actorId: "reviewer",
        eventType: "review_started",
        message: `Reviewer started quality check attempt ${attempt}.`,
      });
      addLifecycleMessage(taskId, "leader", `Reviewer is checking attempt ${attempt} through route ${describeRoute("reviewer")}.`);
      logTaskEvent(taskId, "reviewer_started", "Reviewer started quality check.", {
        attempt,
        route: describeRoute("reviewer"),
      });

      const reviewSubtask = addSubtask(taskId, {
        type: "review",
        assignedAgentId: "reviewer",
        inputText: draftResult.text,
        status: "running",
      });
      reviewResult = await runModelForSubtask(taskId, reviewSubtask.id, "reviewer", buildReviewerPrompt(task, planResult.text, draftResult.text));

      reviewPassed = /\bresult:\s*pass\b/i.test(reviewResult.text) && !/\bresult:\s*fail\b/i.test(reviewResult.text);
      updateSubtask(taskId, reviewSubtask.id, {
        outputText: reviewResult.text,
        status: reviewPassed ? "completed" : "rejected",
        reviewComment: reviewPassed ? null : reviewResult.text,
      });

      addEvent(taskId, {
        actorType: "agent",
        actorId: "reviewer",
        eventType: reviewPassed ? "review_passed" : "review_failed",
        message: reviewPassed ? `Reviewer approved attempt ${attempt}.` : `Reviewer rejected attempt ${attempt}.`,
        subtaskId: reviewSubtask.id,
        metadata: {
          attempt,
          provider: reviewResult.provider,
          model: reviewResult.model,
        },
      });
      logTaskEvent(taskId, reviewPassed ? "reviewer_passed" : "reviewer_failed", reviewPassed ? "Reviewer approved draft." : "Reviewer rejected draft.", {
        attempt,
        provider: reviewResult.provider,
        model: reviewResult.model,
        outputChars: textLength(reviewResult.text),
      });

      if (reviewPassed) break;
      if (attempt < MAX_REVIEW_ATTEMPTS) {
        addLifecycleMessage(taskId, "leader", `Reviewer rejected attempt ${attempt}. Feedback has been returned to Writer for revision.`);
        logTaskEvent(taskId, "revision_requested", "Reviewer feedback returned to Writer.", {
          nextAttempt: attempt + 1,
          reviewChars: textLength(reviewResult.text),
        });
        await sleep(500);
      }
    }

    if (!reviewPassed) {
      updateTask(taskId, {
        status: "failed",
        stageOwnerId: "leader",
        errorMessage: `Review failed after ${MAX_REVIEW_ATTEMPTS} attempts.`,
      });
      addEvent(taskId, {
        actorType: "system",
        actorId: "leader",
        eventType: "task_failed",
        message: `Task stopped after ${MAX_REVIEW_ATTEMPTS} failed review attempts.`,
      });
      addLifecycleMessage(taskId, "leader", `The workflow stopped after ${MAX_REVIEW_ATTEMPTS} failed review attempts.`);
      logTaskEvent(taskId, "task_failed", "Task stopped after max review attempts.", {
        attempts: MAX_REVIEW_ATTEMPTS,
        reviewChars: textLength(reviewResult?.text),
      });
      return;
    }

    addLifecycleMessage(taskId, "leader", `Leader is synthesizing the final response through route ${describeRoute("leader")}.`);
    logTaskEvent(taskId, "leader_started", "Leader started final synthesis.", {
      route: describeRoute("leader"),
    });

    const finalSubtask = addSubtask(taskId, {
      type: "summary",
      assignedAgentId: "leader",
      inputText: reviewResult.text,
      status: "running",
    });
    const finalResult = await runModelForSubtask(
      taskId,
      finalSubtask.id,
      "leader",
      buildLeaderPrompt(task, planResult.text, draftResult.text, reviewResult.text)
    );
    updateSubtask(taskId, finalSubtask.id, {
      outputText: finalResult.text,
      status: "completed",
    });

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
      subtaskId: finalSubtask.id,
      metadata: {
        provider: finalResult.provider,
        model: finalResult.model,
      },
    });
    addLifecycleMessage(taskId, "leader", "Final output is ready.");
    logTaskEvent(taskId, "leader_completed", "Leader completed final output.", {
      provider: finalResult.provider,
      model: finalResult.model,
      outputChars: textLength(finalResult.text),
    });
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
    logTaskEvent(taskId, "task_failed", "Workflow failed with exception.", {
      error: error.message,
    });
  } finally {
    state.taskRuns.delete(taskId);
  }
}

function createAndStartTask(input) {
  const task = createTask({
    title: input.title?.trim(),
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
  logTaskEvent(task.id, "task_created", "Task created from publication confirmation.", {
    title: task.title,
    detailApi: `/api/tasks/${task.id}`,
    snapshotApi: `/api/tasks/${task.id}/snapshot`,
  });
  void runTask(task.id);
  return task;
}

module.exports = {
  createAndStartTask,
};
