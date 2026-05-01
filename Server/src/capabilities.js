const capabilities = {
  outline_planning: { id: "outline_planning", label: "Outline planning", owner: "planner", status: "available" },
  content_writing: { id: "content_writing", label: "Content writing", owner: "writer", status: "available" },
  document_review: { id: "document_review", label: "Document review", owner: "reviewer", status: "available" },
  slide_copywriting: { id: "slide_copywriting", label: "Slide copywriting", owner: "writer", status: "available" },
  speaker_notes_generation: { id: "speaker_notes_generation", label: "Speaker notes generation", owner: "writer", status: "available" },
  presentation_review: { id: "presentation_review", label: "Presentation review", owner: "reviewer", status: "partial" },
  presentation_design: { id: "presentation_design", label: "Presentation design", owner: "designer", status: "missing" },
  pptx_export: { id: "pptx_export", label: "PPTX export", owner: "system", status: "missing" },
  tabular_data_generation: { id: "tabular_data_generation", label: "Tabular data generation", owner: "writer", status: "available" },
  spreadsheet_review: { id: "spreadsheet_review", label: "Spreadsheet review", owner: "reviewer", status: "partial" },
  spreadsheet_export: { id: "spreadsheet_export", label: "Spreadsheet export", owner: "system", status: "missing" },
  current_data_research: { id: "current_data_research", label: "Current data research", owner: "system", status: "missing" },
  image_prompting: { id: "image_prompting", label: "Image prompt writing", owner: "writer", status: "available" },
  image_generation: { id: "image_generation", label: "Image generation", owner: "system", status: "missing" },
  image_export: { id: "image_export", label: "Image export", owner: "system", status: "missing" },
  visual_prompting: { id: "visual_prompting", label: "Visual prompt writing", owner: "writer", status: "partial" },
  video_generation: { id: "video_generation", label: "Video generation", owner: "system", status: "missing" },
  video_export: { id: "video_export", label: "Video export", owner: "system", status: "missing" },
  duration_control: { id: "duration_control", label: "Duration control", owner: "system", status: "missing" },
  audio_generation: { id: "audio_generation", label: "Audio generation", owner: "system", status: "missing" },
  audio_export: { id: "audio_export", label: "Audio export", owner: "system", status: "missing" },
  code_planning: { id: "code_planning", label: "Code planning", owner: "planner", status: "partial" },
  code_generation: { id: "code_generation", label: "Code generation", owner: "programmer", status: "missing" },
  build_execution: { id: "build_execution", label: "Build execution", owner: "system", status: "missing" },
  runtime_verification: { id: "runtime_verification", label: "Runtime verification", owner: "reviewer", status: "missing" },
};

const artifactProfiles = {
  presentation: {
    defaultFormat: "pptx",
    requiredActions: ["outline_planning", "slide_copywriting", "speaker_notes_generation", "presentation_review", "pptx_export"],
    optionalActions: ["presentation_design"],
    degradedScope:
      "Deliver a presentation content package: outline, per-slide copy, speaker notes, and review report. Final .pptx export and visual design are excluded until the team is upgraded.",
  },
  presentation_content: {
    defaultFormat: "markdown",
    requiredActions: ["outline_planning", "slide_copywriting", "speaker_notes_generation", "presentation_review"],
    optionalActions: [],
    degradedScope: null,
  },
  spreadsheet: {
    defaultFormat: "xlsx",
    requiredActions: ["tabular_data_generation", "spreadsheet_review", "spreadsheet_export"],
    optionalActions: [],
    degradedScope:
      "Deliver a structured table draft with clearly marked unverified fields. Final .xlsx export and current data verification are excluded until the team is upgraded.",
  },
  video: {
    defaultFormat: "mp4",
    requiredActions: ["visual_prompting", "video_generation", "duration_control", "video_export"],
    optionalActions: [],
    degradedScope:
      "Deliver a video production package: concept, shot list, scene script, and prompts for an external video model. Actual video generation and mp4 export are excluded until the team is upgraded.",
  },
  image: {
    defaultFormat: "png",
    requiredActions: ["image_prompting", "image_generation", "image_export"],
    optionalActions: [],
    degradedScope:
      "Deliver image prompts, composition notes, and style directions. Actual image generation and export are excluded until the team is upgraded.",
  },
  audio: {
    defaultFormat: "mp3",
    requiredActions: ["content_writing", "audio_generation", "audio_export"],
    optionalActions: [],
    degradedScope:
      "Deliver an audio script and production notes. Actual audio generation and export are excluded until the team is upgraded.",
  },
  webapp: {
    defaultFormat: "project",
    requiredActions: ["code_planning", "code_generation", "build_execution", "runtime_verification"],
    optionalActions: [],
    degradedScope:
      "Deliver requirements and a technical plan only. Code generation, build execution, and runtime verification are excluded until the team is upgraded.",
  },
  report: {
    defaultFormat: "markdown",
    requiredActions: ["outline_planning", "content_writing", "document_review"],
    optionalActions: [],
    degradedScope: null,
  },
  memo: {
    defaultFormat: "markdown",
    requiredActions: ["content_writing", "document_review"],
    optionalActions: [],
    degradedScope: null,
  },
  summary: {
    defaultFormat: "markdown",
    requiredActions: ["content_writing", "document_review"],
    optionalActions: [],
    degradedScope: null,
  },
  unknown: {
    defaultFormat: "unspecified",
    requiredActions: [],
    optionalActions: [],
    degradedScope: null,
  },
};

function includesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function detectArtifactKind(input = "") {
  const text = String(input).toLowerCase();
  if (includesAny(text, [/\b(excel|excl|xlsx|spreadsheet|csv)\b/, /excel|excl|xlsx|\u8868\u683c|\u7535\u5b50\u8868/])) return "spreadsheet";
  if (includesAny(text, [/\b(ppt|pptx|powerpoint|slide|slides|deck)\b/, /ppt|\u6f14\u793a|\u5e7b\u706f|\u30b9\u30e9\u30a4\u30c9/])) return "presentation";
  if (includesAny(text, [/\b(video|mp4|movie|clip)\b/, /\u89c6\u9891|\u5f71\u50cf|\u52d5\u753b/])) return "video";
  if (includesAny(text, [/\b(image|picture|png|jpg|jpeg|poster|illustration)\b/, /\u56fe\u7247|\u56fe\u50cf|\u6d77\u62a5|\u63d2\u753b|\u753b\u50cf/])) return "image";
  if (includesAny(text, [/\b(audio|mp3|wav|voice|music|podcast)\b/, /\u97f3\u9891|\u58f0\u97f3|\u97f3\u4e50/])) return "audio";
  if (includesAny(text, [/\b(webapp|web app|website|frontend|react|vue|npm build)\b/, /\u7f51\u9875|\u5e94\u7528|\u524d\u7aef/])) return "webapp";
  if (includesAny(text, [/\b(report|proposal|document|docx|pdf)\b/, /\u62a5\u544a|\u6587\u6863|\u63d0\u6848|\u8cc7\u6599/])) return "report";
  if (includesAny(text, [/\b(memo|minutes|note|brief)\b/, /\u7eaa\u8981|\u5907\u5fd8|\u30e1\u30e2/])) return "memo";
  if (includesAny(text, [/\b(summary|summarize|summarise)\b/, /\u603b\u7ed3|\u8981\u7d04/])) return "summary";
  return "unknown";
}

function detectFormat(text, artifactKind) {
  const lower = String(text || "").toLowerCase();
  const explicitFormats = ["pptx", "ppt", "xlsx", "csv", "mp4", "mov", "png", "jpg", "jpeg", "mp3", "wav", "docx", "pdf", "html"];
  const matched = explicitFormats.find((format) => lower.includes(format));
  return matched || artifactProfiles[artifactKind]?.defaultFormat || "unspecified";
}

function detectDurationSeconds(text) {
  const source = String(text || "");
  const match = source.match(/(\d+(?:\.\d+)?)\s*(s|sec|secs|second|seconds|\u79d2)/i);
  if (match) return Number(match[1]);
  const minuteMatch = source.match(/(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes|\u5206\u949f)/i);
  if (minuteMatch) return Math.round(Number(minuteMatch[1]) * 60);
  return null;
}

function detectPageCount(text) {
  const source = String(text || "");
  const match = source.match(/(\d+)\s*(pages?|slides?|\u9875|\u5f20|\u9801)/i);
  return match ? Number(match[1]) : null;
}

function detectRowCount(text) {
  const source = String(text || "");
  const match = source.match(/(\d+)\s*(rows?|\u884c|\u6761)/i);
  return match ? Number(match[1]) : null;
}

function inferRequiredActions(artifactKind, text) {
  const profile = artifactProfiles[artifactKind] || artifactProfiles.unknown;
  const actions = new Set(profile.requiredActions);
  if (artifactKind === "spreadsheet" && /price|ticket|current|latest|\u4ef7\u683c|\u95e8\u7968|\u6700\u65b0|\u5f53\u524d/.test(String(text).toLowerCase())) {
    actions.add("current_data_research");
  }
  return [...actions];
}

function buildDeliverableSpec(inputText, artifactKind) {
  const format = detectFormat(inputText, artifactKind);
  const base = {
    type: artifactKind,
    format,
    filename: null,
    size: {
      durationSeconds: detectDurationSeconds(inputText),
      pageCount: detectPageCount(inputText),
      rowCount: detectRowCount(inputText),
    },
    contentDescription: String(inputText || "").trim(),
    qualityBar: "usable draft",
  };

  if (artifactKind === "spreadsheet") {
    base.columns = [];
    base.dataFreshness = /price|ticket|current|latest|\u4ef7\u683c|\u95e8\u7968|\u6700\u65b0|\u5f53\u524d/.test(String(inputText).toLowerCase())
      ? "current_or_cited"
      : "unspecified";
  }

  return base;
}

function buildTaskContract(input = {}) {
  const userInput = String(input.userInput || input.input || input.objective || "").trim();
  const artifactKind = input.artifactKind || detectArtifactKind(userInput);
  const deliverables = Array.isArray(input.deliverables) && input.deliverables.length > 0 ? input.deliverables : [buildDeliverableSpec(userInput, artifactKind)];
  const requiredActions =
    Array.isArray(input.requiredActions) && input.requiredActions.length > 0 ? input.requiredActions.map(String) : inferRequiredActions(artifactKind, userInput);

  return {
    intent: {
      raw: userInput,
      summary: userInput.length > 120 ? `${userInput.slice(0, 120)}...` : userInput,
      category: artifactKind,
      confidence: artifactKind === "unknown" ? 0.2 : 0.75,
      source: "heuristic_contract_extractor",
    },
    artifactKind,
    objective: userInput,
    deliverables,
    requiredActions,
    language: input.language || "unspecified",
    style: input.style || "unspecified",
    audience: input.audience || "unspecified",
    constraints: Array.isArray(input.constraints) ? input.constraints : [],
    acceptanceCriteria: Array.isArray(input.acceptanceCriteria) ? input.acceptanceCriteria : [],
  };
}

function normalizeCapabilityPool(pool = []) {
  return Array.isArray(pool)
    ? pool
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => ({
          capabilityId: String(entry.capabilityId || ""),
          status: entry.status === "available" || entry.status === "partial" ? entry.status : "available",
          evidenceTaskId: entry.evidenceTaskId || null,
          artifactKind: entry.artifactKind || null,
          deliverableType: entry.deliverableType || null,
          updatedAt: entry.updatedAt || null,
        }))
        .filter((entry) => entry.capabilityId)
    : [];
}

function resolveCapability(capabilityId, pool = []) {
  const base = capabilities[capabilityId] || {
    id: capabilityId,
    label: capabilityId.replaceAll("_", " "),
    owner: "unknown",
    status: "missing",
  };
  const learned = normalizeCapabilityPool(pool)
    .filter((entry) => entry.capabilityId === capabilityId)
    .sort((left, right) => String(right.updatedAt || "").localeCompare(String(left.updatedAt || "")))[0];

  if (!learned) return base;
  if (base.status === "available") return base;
  return {
    ...base,
    status: learned.status,
    learned: true,
    evidenceTaskId: learned.evidenceTaskId,
  };
}

function evaluateFeasibility(contract, capabilityPool = []) {
  const normalized = buildTaskContract(contract);
  const profile = artifactProfiles[normalized.artifactKind] || artifactProfiles.unknown;

  if (normalized.artifactKind === "unknown" || normalized.intent.confidence < 0.5) {
    return {
      status: "needs_clarification",
      taskSummary: normalized.objective,
      artifactKind: normalized.artifactKind,
      required: [],
      available: [],
      partial: [],
      missing: [],
      optionalMissing: [],
      deliverables: normalized.deliverables,
      requiredActions: normalized.requiredActions,
      capabilityEvidence: [],
      degradedPlan: null,
      blockedReason: "The system could not identify a concrete deliverable type with enough confidence.",
      nextAction: "clarify",
    };
  }

  const required = normalized.requiredActions.map((id) => resolveCapability(id, capabilityPool));
  const optional = profile.optionalActions.map((id) => resolveCapability(id, capabilityPool));
  const missing = required.filter((capability) => capability.status === "missing");
  const partial = required.filter((capability) => capability.status === "partial");
  const available = required.filter((capability) => capability.status === "available");
  const missingOptional = optional.filter((capability) => capability.status !== "available");
  const hasCriticalMissing = missing.some((capability) => capability.id.endsWith("_export") || capability.owner === "system");
  const status = hasCriticalMissing ? "blocked" : missing.length > 0 || partial.length > 0 || missingOptional.length > 0 ? "degraded" : "ready";

  return {
    status,
    taskSummary: normalized.objective,
    artifactKind: normalized.artifactKind,
    required: required.map((capability) => capability.id),
    available: available.map((capability) => capability.id),
    partial: partial.map((capability) => capability.id),
    missing: missing.map((capability) => capability.id),
    optionalMissing: missingOptional.map((capability) => capability.id),
    deliverables: normalized.deliverables,
    requiredActions: normalized.requiredActions,
    capabilityEvidence: required.filter((capability) => capability.learned).map((capability) => ({
      capabilityId: capability.id,
      evidenceTaskId: capability.evidenceTaskId,
    })),
    degradedPlan: status === "degraded" || status === "blocked" ? profile.degradedScope : null,
    blockedReason: status === "blocked" ? "The current team lacks a critical artifact action required by this task." : null,
    nextAction: status === "ready" ? "confirm" : status === "degraded" ? "degrade_or_discuss" : "update_team_or_discuss",
  };
}

function buildCapabilityCatalog(capabilityPool = []) {
  return {
    capabilities: Object.values(capabilities),
    artifactProfiles,
    capabilityPool: normalizeCapabilityPool(capabilityPool),
  };
}

module.exports = {
  buildCapabilityCatalog,
  buildTaskContract,
  detectArtifactKind,
  evaluateFeasibility,
  normalizeCapabilityPool,
};
