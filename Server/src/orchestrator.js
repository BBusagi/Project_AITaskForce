const {
  createTask,
  updateTask,
  addSubtask,
  updateSubtask,
  addEvent,
  addMessage,
  getTask,
  getTaskSubtasks,
  getCapabilityPool,
  recordCapabilityEvidence,
  state,
} = require("./store");
const { buildTaskContract, evaluateFeasibility } = require("./capabilities");
const { generate, resolveRoute } = require("./model-gateway");
const { providers } = require("./config");

const MAX_REVIEW_ATTEMPTS = 2;
const MAX_FAILED_STEP_REVIEW_ATTEMPTS = 3;
const REVIEW_RUBRIC = ["completeness", "correctness", "format", "consistency", "regression"];

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

function stripCodeFence(text) {
  return String(text || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractJsonObject(text) {
  const stripped = stripCodeFence(text);
  try {
    return JSON.parse(stripped);
  } catch {}

  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(stripped.slice(start, end + 1));
    } catch {}
  }

  return null;
}

function normalizeWriterSubmission(text) {
  const parsed = extractJsonObject(text);
  const submission = parsed && typeof parsed === "object" ? parsed : {};
  return {
    changed: Array.isArray(submission.changed) ? submission.changed.map(String) : [],
    unchanged: Array.isArray(submission.unchanged) ? submission.unchanged.map(String) : [],
    why: typeof submission.why === "string" ? submission.why : "",
    draft_text: typeof submission.draft_text === "string" && submission.draft_text.trim() ? submission.draft_text : String(text || "").trim(),
    raw: text,
    parseOk: Boolean(parsed),
  };
}

function normalizeReviewDecision(text, attempt) {
  const parsed = extractJsonObject(text);
  const decision = parsed && typeof parsed === "object" ? parsed : {};
  const result = String(decision.result || "").toLowerCase() === "pass" ? "pass" : "fail";
  const rubric = REVIEW_RUBRIC.reduce((acc, key) => {
    const entry = decision.rubric && typeof decision.rubric === "object" ? decision.rubric[key] : null;
    acc[key] = {
      status: entry?.status === "pass" ? "pass" : entry?.status === "fail" ? "fail" : "unknown",
      severity: entry?.severity || "unknown",
      issues: Array.isArray(entry?.issues) ? entry.issues.map(String) : [],
    };
    return acc;
  }, {});

  const blockingIssues = Array.isArray(decision.blocking_issues) ? decision.blocking_issues : [];
  if (!parsed) {
    blockingIssues.push({
      id: "R_PARSE",
      category: "format",
      severity: "blocking",
      affected_area: "review_output",
      description: "Reviewer did not return valid machine-readable JSON.",
      required_change: "Reviewer must return the required JSON schema.",
    });
  } else if (result === "fail" && blockingIssues.length === 0) {
    blockingIssues.push({
      id: "R_UNSPECIFIED",
      category: "correctness",
      severity: "blocking",
      affected_area: "draft_text",
      description: decision.rationale || "Reviewer failed the draft without a structured blocking issue.",
      required_change: "Resolve the failed rubric items and return a structured revision.",
    });
  }

  return {
    result,
    attempt: Number(decision.attempt) || attempt,
    scope: decision.scope || (attempt === 1 ? "full" : "prior_issues_and_changed_regions"),
    rubric,
    blocking_issues: blockingIssues,
    minor_issues: Array.isArray(decision.minor_issues) ? decision.minor_issues : [],
    resolved_issue_ids: Array.isArray(decision.resolved_issue_ids) ? decision.resolved_issue_ids.map(String) : [],
    next_action: decision.next_action || (result === "pass" ? "approve" : "revise"),
    rationale: typeof decision.rationale === "string" ? decision.rationale : String(text || "").trim(),
    raw: text,
    parseOk: Boolean(parsed),
  };
}

function isReviewPassed(decision) {
  if (!decision || decision.result !== "pass") return false;
  if ((decision.blocking_issues || []).length > 0) return false;
  return !Object.values(decision.rubric || {}).some((entry) => entry.severity === "blocking");
}

function publicWriterSubmission(submission) {
  return {
    changed: submission.changed,
    unchanged: submission.unchanged,
    why: submission.why,
    draft_text: submission.draft_text,
  };
}

function formatJson(value) {
  return JSON.stringify(value, null, 2);
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

async function generateRequired(taskId, role, prompt, options = {}) {
  const route = resolveRoute(role);
  const startedAtMs = Date.now();
  const startedAt = nowIso();
  const timeoutMs = getRouteTimeoutMs(route);

  console.log(`MODEL REQUEST START role=${role} provider=${route.provider} model=${route.model} timeoutMs=${timeoutMs ?? "none"}`);

  try {
    const result = await generate(role, prompt, options);
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
        thinkingText: result.thinking || null,
        thinkingChars: textLength(result.thinking),
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
  let lastProgressPersistedAt = 0;

  updateSubtask(taskId, subtaskId, {
    status: "running",
    modelInvocation: buildRunningInvocation(route, startedAt, timeoutMs),
  });

  try {
    const result = await generateRequired(taskId, role, prompt, {
      onProgress: (progress) => {
        const now = Date.now();
        if (!progress.done && now - lastProgressPersistedAt < 1000) return;
        lastProgressPersistedAt = now;
        updateSubtask(taskId, subtaskId, {
          modelInvocation: {
            ...buildRunningInvocation(route, startedAt, timeoutMs),
            status: progress.done ? "completed" : "running",
            durationMs: progress.durationMs,
            textChars: textLength(progress.text),
            partialText: progress.text || null,
            thinkingText: progress.thinking || null,
            thinkingChars: textLength(progress.thinking),
          },
        });
      },
    });
    updateSubtask(taskId, subtaskId, {
      modelInvocation: result.invocation,
    });
    return result;
  } catch (error) {
    const existingInvocation = getTaskSubtasks(taskId).find((subtask) => subtask.id === subtaskId)?.modelInvocation || null;
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
    if (existingInvocation && (existingInvocation.partialText || existingInvocation.thinkingText)) {
      updateSubtask(taskId, subtaskId, {
        modelInvocation: {
          ...(error.modelInvocation || existingInvocation),
          partialText: existingInvocation.partialText || null,
          thinkingText: existingInvocation.thinkingText || null,
          thinkingChars: existingInvocation.thinkingChars || 0,
          errorMessage: error.message,
        },
      });
    }
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
    "Use the original user input as the source content and the Planner output as execution guidance.",
    "If the user requested summarization, translation, rewriting, formatting, or multi-language output, perform that work directly.",
    "Respect every requested language, heading, structure, and output format.",
    "Do not include hidden reasoning or thinking tags.",
    "Return only valid JSON with exactly this schema:",
    JSON.stringify(
      {
        changed: ["Initial draft created from the user request and planner constraints."],
        unchanged: [],
        why: "Brief reason for the drafting choices.",
        draft_text: "The actual user-facing draft content to review.",
      },
      null,
      2
    ),
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
    "Use only this fixed rubric: completeness, correctness, format, consistency, regression.",
    "Do not invent additional review categories.",
    "Review the full draft only because this is the first review attempt.",
    "Separate blocking issues from minor issues. Reject only for blocking issues.",
    "Use stable issue IDs such as R1, R2, R3.",
    "Return only valid JSON with exactly this schema:",
    JSON.stringify(
      {
        result: "pass | fail",
        attempt: 1,
        scope: "full",
        rubric: {
          completeness: { status: "pass | fail", severity: "none | minor | blocking", issues: [] },
          correctness: { status: "pass | fail", severity: "none | minor | blocking", issues: [] },
          format: { status: "pass | fail", severity: "none | minor | blocking", issues: [] },
          consistency: { status: "pass | fail", severity: "none | minor | blocking", issues: [] },
          regression: { status: "pass | fail", severity: "none | minor | blocking", issues: [] },
        },
        blocking_issues: [{ id: "R1", category: "format", severity: "blocking", affected_area: "section name", description: "specific defect", required_change: "specific fix" }],
        minor_issues: [],
        resolved_issue_ids: [],
        next_action: "approve | revise | human_confirm",
        rationale: "One concise sentence.",
      },
      null,
      2
    ),
    "",
    `Task title: ${task.title}`,
    `User input: ${task.userInput}`,
    "",
    "Planner output:",
    planText,
    "",
    "Writer draft_text:",
    draftText,
  ].join("\n");
}

function buildWriterRevisionPrompt(task, planText, previousSubmission, reviewDecision, attemptNumber) {
  return [
    "You are the Writer agent in AI Task Force.",
    "Revise the previous draft using only the machine-readable Reviewer feedback.",
    "Produce the corrected user-facing deliverable only.",
    "Preserve previously correct content unless the Reviewer explicitly marks it as affected.",
    "Only change areas required by blocking issues or directly related consistency fixes.",
    "Do not include hidden reasoning or thinking tags.",
    "Respect every requested language, heading, structure, and output format.",
    "Return only valid JSON with exactly this schema:",
    JSON.stringify(
      {
        changed: ["Specific changed area and linked issue ID, e.g. R1."],
        unchanged: ["Specific correct areas intentionally preserved."],
        why: "Brief reason connecting changes to Reviewer issue IDs.",
        draft_text: "The revised user-facing draft content to review.",
      },
      null,
      2
    ),
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
    "Previous Writer submission JSON:",
    formatJson(previousSubmission),
    "",
    "Reviewer decision JSON:",
    formatJson(reviewDecision),
  ].join("\n");
}

function buildReviewerRevisionPrompt(task, planText, previousSubmission, currentSubmission, priorReviewDecision, attemptNumber) {
  return [
    "You are the Reviewer agent in AI Task Force.",
    "Use only this fixed rubric: completeness, correctness, format, consistency, regression.",
    "This is a revision review. Do not perform a fresh full free-form review.",
    "Review only: unresolved prior blocking issues, current changed areas, and regressions caused by those changes.",
    "Do not reject for unrelated new preferences. Minor non-blocking issues must not fail the task.",
    "Use existing issue IDs when the same issue remains. Create new issue IDs only for regressions caused by changed areas.",
    "Return only valid JSON with exactly this schema:",
    JSON.stringify(
      {
        result: "pass | fail",
        attempt: attemptNumber,
        scope: "prior_issues_and_changed_regions",
        rubric: {
          completeness: { status: "pass | fail", severity: "none | minor | blocking", issues: [] },
          correctness: { status: "pass | fail", severity: "none | minor | blocking", issues: [] },
          format: { status: "pass | fail", severity: "none | minor | blocking", issues: [] },
          consistency: { status: "pass | fail", severity: "none | minor | blocking", issues: [] },
          regression: { status: "pass | fail", severity: "none | minor | blocking", issues: [] },
        },
        blocking_issues: [{ id: "R1", category: "format", severity: "blocking", affected_area: "section name", description: "specific defect", required_change: "specific fix" }],
        minor_issues: [],
        resolved_issue_ids: [],
        next_action: "approve | revise | human_confirm",
        rationale: "One concise sentence.",
      },
      null,
      2
    ),
    "",
    `Task title: ${task.title}`,
    "Original user input:",
    task.userInput,
    "",
    "Planner output:",
    planText,
    "",
    "Prior Writer submission JSON:",
    formatJson(previousSubmission),
    "",
    "Current Writer submission JSON:",
    formatJson(currentSubmission),
    "",
    "Prior Reviewer decision JSON:",
    formatJson(priorReviewDecision),
  ].join("\n");
}

function buildFinalOutput(task, planText, draftText, reviewDecision) {
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
    formatJson(reviewDecision),
  ].join("\n");
}

function buildLeaderPrompt(task, planText, draftText, reviewDecision) {
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
    "Reviewer decision JSON:",
    formatJson(reviewDecision),
  ].join("\n");
}

function addLifecycleMessage(taskId, senderId, content) {
  addMessage(taskId, {
    senderType: senderId === "user" ? "user" : "leader",
    senderId: senderId === "user" ? null : senderId,
    content,
  });
}

function getLatestCompletedPlan(taskId) {
  return [...getTaskSubtasks(taskId)].reverse().find((subtask) => subtask.type === "plan" && subtask.status === "completed" && subtask.outputText);
}

function getLatestWriterSubmission(taskId) {
  const subtask = [...getTaskSubtasks(taskId)]
    .reverse()
    .find((item) => ["draft", "revise"].includes(item.type) && item.status === "completed" && (item.writerSubmission || item.outputText));
  if (!subtask) return null;
  return subtask.writerSubmission || publicWriterSubmission(normalizeWriterSubmission(subtask.outputText));
}

function getLatestReviewDecision(taskId) {
  const subtask = [...getTaskSubtasks(taskId)]
    .reverse()
    .find((item) => item.type === "review" && (item.reviewDecision || item.outputText));
  if (!subtask) return null;
  return subtask.reviewDecision || normalizeReviewDecision(subtask.outputText, 1);
}

function getLastErroredSubtask(taskId) {
  return [...getTaskSubtasks(taskId)]
    .reverse()
    .find((subtask) => ["failed", "rejected"].includes(subtask.status) || ["failed", "timeout"].includes(subtask.modelInvocation?.status));
}

async function runLeaderFinal(taskId, task, planText, writerSubmission, reviewDecision) {
  addLifecycleMessage(taskId, "leader", `Leader is synthesizing the final response through route ${describeRoute("leader")}.`);
  logTaskEvent(taskId, "leader_started", "Leader started final synthesis.", {
    route: describeRoute("leader"),
  });

  const finalSubtask = addSubtask(taskId, {
    type: "summary",
    assignedAgentId: "leader",
    inputText: formatJson(reviewDecision),
    status: "running",
  });
  const finalResult = await runModelForSubtask(
    taskId,
    finalSubtask.id,
    "leader",
    buildLeaderPrompt(task, planText, writerSubmission.draft_text, reviewDecision)
  );
  updateSubtask(taskId, finalSubtask.id, {
    outputText: finalResult.text,
    status: "completed",
  });

  const completedTask = updateTask(taskId, {
    status: "completed",
    stageOwnerId: "leader",
    finalOutput: finalResult.text,
    errorMessage: null,
  });
  recordCapabilityEvidence(completedTask);
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
}

async function runWriterReviewFromState(taskId, task, planText, options = {}) {
  let writerSubmission = options.writerSubmission || null;
  let reviewDecision = options.reviewDecision || null;
  let reviewPassed = false;

  for (let attempt = 1; attempt <= MAX_FAILED_STEP_REVIEW_ATTEMPTS; attempt += 1) {
    const shouldStartWithReview = options.startWithReview && attempt === 1 && writerSubmission;
    let previousSubmissionForReview = null;

    if (!shouldStartWithReview) {
      previousSubmissionForReview = writerSubmission;
      const isRevision = Boolean(writerSubmission && reviewDecision);
      updateTask(taskId, { status: isRevision ? "revising" : "writing", stageOwnerId: "writer", errorMessage: null });
      addEvent(taskId, {
        actorType: "system",
        actorId: "writer",
        eventType: isRevision ? "revision_started" : "writing_started",
        message: isRevision ? `Writer started failed-step revision attempt ${attempt}.` : "Writer restarted the failed writing step.",
      });
      logTaskEvent(taskId, isRevision ? "writer_revision_retry_started" : "writer_step_retry_started", "Writer retry step started.", {
        attempt,
        route: describeRoute("writer"),
      });

      const draftSubtask = addSubtask(taskId, {
        type: isRevision ? "revise" : "draft",
        assignedAgentId: "writer",
        inputText: isRevision ? formatJson(reviewDecision) : planText,
        status: "running",
      });
      const writerPrompt = isRevision
        ? buildWriterRevisionPrompt(task, planText, writerSubmission, reviewDecision, attempt)
        : buildWriterPrompt(task, planText);
      const draftResult = await runModelForSubtask(taskId, draftSubtask.id, "writer", writerPrompt);
      writerSubmission = normalizeWriterSubmission(draftResult.text);
      updateSubtask(taskId, draftSubtask.id, {
        outputText: formatJson(publicWriterSubmission(writerSubmission)),
        writerSubmission: publicWriterSubmission(writerSubmission),
        status: "completed",
      });
      addEvent(taskId, {
        actorType: "agent",
        actorId: "writer",
        eventType: isRevision ? "revision_completed" : "writing_completed",
        message: isRevision ? `Writer completed failed-step revision attempt ${attempt}.` : "Writer completed failed-step retry draft.",
        subtaskId: draftSubtask.id,
      });
    }

    await sleep(500);
    updateTask(taskId, { status: "reviewing", stageOwnerId: "reviewer", errorMessage: null });
    addEvent(taskId, {
      actorType: "system",
      actorId: "reviewer",
      eventType: "review_started",
      message: `Reviewer started failed-step retry check attempt ${attempt}.`,
    });

    const reviewSubtask = addSubtask(taskId, {
      type: "review",
      assignedAgentId: "reviewer",
      inputText: writerSubmission.draft_text,
      status: "running",
    });
    const reviewPrompt =
      reviewDecision && !shouldStartWithReview
        ? buildReviewerRevisionPrompt(task, planText, previousSubmissionForReview, writerSubmission, reviewDecision, attempt)
        : buildReviewerPrompt(task, planText, writerSubmission.draft_text);
    const reviewResult = await runModelForSubtask(taskId, reviewSubtask.id, "reviewer", reviewPrompt);
    reviewDecision = normalizeReviewDecision(reviewResult.text, attempt);
    reviewPassed = isReviewPassed(reviewDecision);
    updateSubtask(taskId, reviewSubtask.id, {
      outputText: formatJson(reviewDecision),
      status: reviewPassed ? "completed" : "rejected",
      reviewComment: reviewPassed ? null : formatJson(reviewDecision),
      reviewDecision,
    });
    addEvent(taskId, {
      actorType: "agent",
      actorId: "reviewer",
      eventType: reviewPassed ? "review_passed" : "review_failed",
      message: reviewPassed ? `Reviewer approved failed-step retry attempt ${attempt}.` : `Reviewer rejected failed-step retry attempt ${attempt}.`,
      subtaskId: reviewSubtask.id,
    });

    if (reviewPassed) {
      await runLeaderFinal(taskId, task, planText, writerSubmission, reviewDecision);
      return;
    }
  }

  updateTask(taskId, {
    status: "human_confirmation",
    stageOwnerId: "leader",
    errorMessage: `Human confirmation required after ${MAX_FAILED_STEP_REVIEW_ATTEMPTS} failed step retry attempts.`,
  });
  addEvent(taskId, {
    actorType: "system",
    actorId: "leader",
    eventType: "human_confirmation_required",
    message: `Task escalated after failed-step retry reached ${MAX_FAILED_STEP_REVIEW_ATTEMPTS} attempts.`,
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
    let writerSubmission = null;
    let previousSubmissionForReview = null;
    let reviewDecision = null;
    let reviewPassed = false;

    for (let attempt = 1; attempt <= MAX_REVIEW_ATTEMPTS; attempt += 1) {
      const isRevision = attempt > 1;
      previousSubmissionForReview = writerSubmission;

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
        ? buildWriterRevisionPrompt(task, planResult.text, writerSubmission, reviewDecision, attempt)
        : buildWriterPrompt(task, planResult.text);
      draftResult = await runModelForSubtask(taskId, draftSubtask.id, "writer", writerPrompt);
      writerSubmission = normalizeWriterSubmission(draftResult.text);
      updateSubtask(taskId, draftSubtask.id, {
        outputText: formatJson(publicWriterSubmission(writerSubmission)),
        writerSubmission: publicWriterSubmission(writerSubmission),
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
      const reviewPrompt = isRevision
        ? buildReviewerRevisionPrompt(task, planResult.text, previousSubmissionForReview, writerSubmission, reviewDecision, attempt)
        : buildReviewerPrompt(task, planResult.text, writerSubmission.draft_text);
      reviewResult = await runModelForSubtask(taskId, reviewSubtask.id, "reviewer", reviewPrompt);
      reviewDecision = normalizeReviewDecision(reviewResult.text, attempt);
      reviewPassed = isReviewPassed(reviewDecision);
      updateSubtask(taskId, reviewSubtask.id, {
        outputText: formatJson(reviewDecision),
        status: reviewPassed ? "completed" : "rejected",
        reviewComment: reviewPassed ? null : formatJson(reviewDecision),
        reviewDecision,
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
          blockingIssues: reviewDecision.blocking_issues.length,
        });
        await sleep(500);
      }
    }

    if (!reviewPassed) {
      updateTask(taskId, {
        status: "human_confirmation",
        stageOwnerId: "leader",
        errorMessage: `Human confirmation required after ${MAX_REVIEW_ATTEMPTS} failed automated review attempts.`,
      });
      addEvent(taskId, {
        actorType: "system",
        actorId: "leader",
        eventType: "human_confirmation_required",
        message: `Task escalated to human confirmation after ${MAX_REVIEW_ATTEMPTS} failed automated review attempts.`,
      });
      addLifecycleMessage(taskId, "leader", `Human confirmation is required after ${MAX_REVIEW_ATTEMPTS} failed automated review attempts.`);
      logTaskEvent(taskId, "human_confirmation_required", "Task escalated after max automated review attempts.", {
        attempts: MAX_REVIEW_ATTEMPTS,
        blockingIssues: reviewDecision?.blocking_issues?.length || 0,
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
      inputText: formatJson(reviewDecision),
      status: "running",
    });
    const finalResult = await runModelForSubtask(
      taskId,
      finalSubtask.id,
      "leader",
      buildLeaderPrompt(task, planResult.text, writerSubmission.draft_text, reviewDecision)
    );
    updateSubtask(taskId, finalSubtask.id, {
      outputText: finalResult.text,
      status: "completed",
    });

    const completedTask = updateTask(taskId, {
      status: "completed",
      stageOwnerId: "leader",
      finalOutput: finalResult.text,
      errorMessage: null,
    });
    recordCapabilityEvidence(completedTask);
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
  const taskContract = input.taskContract || buildTaskContract(input);
  const feasibilityResult = input.feasibilityResult || evaluateFeasibility(taskContract, getCapabilityPool());
  const task = createTask({
    title: input.title?.trim(),
    userInput: input.userInput,
    priority: input.priority || "medium",
    taskContract,
    feasibilityResult,
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
    artifactKind: taskContract.artifactKind,
    feasibility: feasibilityResult.status,
    detailApi: `/api/tasks/${task.id}`,
    snapshotApi: `/api/tasks/${task.id}/snapshot`,
  });
  void runTask(task.id);
  return task;
}

function retryFailedStep(taskId) {
  if (state.taskRuns.get(taskId)) {
    throw new Error("Task is already running");
  }

  const task = getTask(taskId);
  if (!task) {
    throw new Error("Task not found");
  }

  const failedSubtask = getLastErroredSubtask(taskId);
  if (!failedSubtask) {
    throw new Error("No failed subtask found for step retry");
  }

  state.taskRuns.set(taskId, true);
  addLifecycleMessage(taskId, "leader", `Retrying failed step: ${failedSubtask.assignedAgentId} / ${failedSubtask.type}.`);
  addEvent(taskId, {
    actorType: "system",
    actorId: "leader",
    eventType: "retry_started",
    message: `Retrying failed step ${failedSubtask.assignedAgentId} / ${failedSubtask.type}.`,
    subtaskId: failedSubtask.id,
  });
  logTaskEvent(taskId, "retry_failed_step_started", "Retrying failed step.", {
    failedSubtaskId: failedSubtask.id,
    type: failedSubtask.type,
    agent: failedSubtask.assignedAgentId,
  });

  void (async () => {
    try {
      if (failedSubtask.type === "plan") {
        state.taskRuns.delete(taskId);
        await runTask(taskId);
        return;
      }

      const planSubtask = getLatestCompletedPlan(taskId);
      if (!planSubtask) {
        throw new Error("Cannot retry failed step without a completed Planner output");
      }

      if (failedSubtask.type === "summary") {
        const writerSubmission = getLatestWriterSubmission(taskId);
        const reviewDecision = getLatestReviewDecision(taskId);
        if (!writerSubmission || !reviewDecision) {
          throw new Error("Cannot retry Leader final without completed Writer and Reviewer outputs");
        }
        await runLeaderFinal(taskId, task, planSubtask.outputText, writerSubmission, reviewDecision);
        return;
      }

      const writerSubmission = getLatestWriterSubmission(taskId);
      const reviewDecision = getLatestReviewDecision(taskId);
      const startWithReview = failedSubtask.type === "review" && failedSubtask.status !== "rejected";
      await runWriterReviewFromState(taskId, task, planSubtask.outputText, {
        startWithReview,
        writerSubmission,
        reviewDecision,
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
      addLifecycleMessage(taskId, "leader", `Failed-step retry failed: ${error.message}`);
      logTaskEvent(taskId, "retry_failed_step_failed", "Failed-step retry failed.", {
        error: error.message,
      });
    } finally {
      state.taskRuns.delete(taskId);
    }
  })();

  return task;
}

module.exports = {
  createAndStartTask,
  retryFailedStep,
};
