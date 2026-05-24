const CRISIS_PATTERNS = [
  /\bkill myself\b/i,
  /\bend my life\b/i,
  /\bsuicid/i,
  /\bself[- ]?harm\b/i,
  /\bhurt myself\b/i,
  /\bhurt someone\b/i,
  /\bhurt somebody\b/i,
  /\bhurt other(s)?\b/i,
  /\bhurt people\b/i,
  /\bharm someone\b/i,
  /\bharm somebody\b/i,
  /\bharm other(s)?\b/i,
  /\bkill someone\b/i,
  /\bkill somebody\b/i,
  /\bcan't go on\b/i,
  /\bimmediate danger\b/i
];

const GAMBLING_ADVICE_PATTERNS = [
  /\bodds?\b/i,
  /\bpicks?\b/i,
  /\bparlay\b/i,
  /\bspread\b/i,
  /\bhandicap\b/i,
  /\bbankroll\b/i,
  /\bwhich team\b/i,
  /\bwho should i bet\b/i,
  /\bbetting strategy\b/i,
  /\bsafe bet\b/i,
  /\bsmaller bet\b/i
];

const HIGH_RISK_PATTERNS = [
  /\bdeposit\b/i,
  /\bchasing\b/i,
  /\bloss(es)?\b/i,
  /\bpayday\b/i,
  /\bborrow\b/i,
  /\bloan\b/i,
  /\bdrunk\b/i,
  /\balcohol\b/i,
  /\bhigh\b/i,
  /\balone\b/i,
  /\bcasino\b/i,
  /\bsportsbook\b/i,
  /\bbetting app\b/i
];

const BLOCKED_REPLY = {
  message:
    "I cannot help with betting advice, picks, odds, predictions, bankroll strategy, or ways to gamble less. I can help you pause right now. Close the betting screen, start a 5 minute delay, and tell me: closed or still open?",
  riskLevel: "high",
  intervention: "delay_timer",
  timerSeconds: 300,
  quickReplies: ["Closed", "Still open", "Start the timer"],
  showResources: false,
  safetyFlags: ["gambling_advice_request"]
};

const CRISIS_REPLY = {
  message:
    "This sounds urgent. Your safety and other people's safety comes first right now. If you might hurt yourself or someone else, call emergency services now. If you are in the US and thinking about self-harm, call or text 988. Stay away from anything you could use to hurt yourself or another person while you contact real-time help.",
  riskLevel: "crisis",
  intervention: "crisis_resources",
  timerSeconds: 0,
  quickReplies: ["Call emergency help", "Call or text 988", "Move away from danger"],
  showResources: true,
  safetyFlags: ["crisis"]
};

function includesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function extractUserContext(message) {
  const text = String(message || "");
  const lower = text.toLowerCase();
  const amountMatch = text.match(/\$\s?[\d,]+(?:\.\d{1,2})?/);
  const urgeMatch = lower.match(/\b(10|[1-9])\s*(?:\/\s*10|out of 10)?\b/);
  const signals = [];

  if (lower.includes("deposit")) signals.push("deposit screen");
  if (lower.includes("chasing") || lower.includes("loss")) signals.push("chasing a loss");
  if (lower.includes("alone")) signals.push("being alone");
  if (lower.includes("stress") || lower.includes("stressed") || lower.includes("anxious")) signals.push("stress");
  if (lower.includes("bored")) signals.push("boredom");
  if (lower.includes("payday")) signals.push("payday risk");
  if (lower.includes("drunk") || lower.includes("alcohol") || lower.includes("high") || lower.includes("substance")) {
    signals.push("substance use");
  }
  if (lower.includes("closed")) signals.push("the app is closed");
  if (lower.includes("still open") || lower.includes("open")) signals.push("the app is still open");
  if (lower.includes("guilt") || lower.includes("ashamed") || lower.includes("shame")) signals.push("shame");
  if (lower.includes("angry") || lower.includes("mad")) signals.push("anger");
  if (lower.includes("tired") || lower.includes("sleep")) signals.push("tiredness");

  return {
    amount: amountMatch ? amountMatch[0].replace(/\s/g, "") : null,
    urgeScore: urgeMatch ? Number(urgeMatch[1]) : null,
    signals: [...new Set(signals)]
  };
}

function describeContext(context) {
  const parts = [];

  if (context.urgeScore) {
    parts.push(`an urge around ${context.urgeScore}/10`);
  }
  if (context.amount) {
    parts.push(`${context.amount} being at risk`);
  }
  parts.push(...context.signals.slice(0, 3));

  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

function buildTailoredResponse(message, classification) {
  const text = String(message || "").toLowerCase();
  const context = extractUserContext(message);
  const contextSummary = describeContext(context);
  const prefix = contextSummary
    ? `You named ${contextSummary}. That is specific enough to act on.`
    : "You named the urge before acting. That is enough to create a pause.";

  if (context.signals.includes("the app is closed")) {
    return guardCoachResponse({
      message:
        `${prefix} Protect that closed screen now: put the phone across the room, keep the timer running, and tell me if the urge went up, down, or stayed the same.`,
      riskLevel: classification.riskLevel,
      intervention: "grounding",
      timerSeconds: 300,
      quickReplies: ["Went down", "Stayed same", "Went up"],
      showResources: false
    }, classification.riskLevel);
  }

  if (context.signals.includes("the app is still open") || context.signals.includes("deposit screen")) {
    return guardCoachResponse({
      message:
        `${prefix} The next step is not a life decision; it is one protective click. Close the deposit or gambling screen now, then answer: closed or still open?`,
      riskLevel: "high",
      intervention: "delay_timer",
      timerSeconds: 300,
      quickReplies: ["Closed", "Still open", "Start timer"],
      showResources: false
    }, "high");
  }

  if (context.signals.includes("chasing a loss")) {
    return guardCoachResponse({
      message:
        `${prefix} This is the repair urge, not a money plan. For 5 minutes, do not try to fix pain with risk. Put the phone down and play the next hour forward honestly.`,
      riskLevel: "high",
      intervention: "play_forward",
      timerSeconds: 300,
      quickReplies: ["Phone down", "Still open", "Play it forward"],
      showResources: false
    }, "high");
  }

  if (context.signals.includes("substance use")) {
    return guardCoachResponse({
      message:
        `${prefix} Substance use makes money decisions less safe. For tonight, shrink the decision: no deposits, no gambling screens, and one grounding step before anything else.`,
      riskLevel: "high",
      intervention: "grounding",
      timerSeconds: 300,
      quickReplies: ["No deposits", "Grounding now", "Need support"],
      showResources: false
    }, "high");
  }

  if (context.signals.includes("being alone")) {
    return guardCoachResponse({
      message:
        `${prefix} Being alone can make the urge louder. Stay private if you need to, but add friction: move to a shared room, keep this chat open, or draft a simple support text.`,
      riskLevel: "high",
      intervention: "support_contact",
      timerSeconds: 300,
      quickReplies: ["Move rooms", "Draft message", "Stay here"],
      showResources: false
    }, "high");
  }

  if (context.signals.includes("stress") || context.signals.includes("boredom") || context.signals.includes("anger")) {
    const feeling = context.signals.includes("boredom") ? "boredom" : context.signals.includes("anger") ? "anger" : "stress";
    return guardCoachResponse({
      message:
        `${prefix} ${feeling[0].toUpperCase()}${feeling.slice(1)} is asking for a fast exit. Give your body one minute first: feet on the floor, inhale 4, hold 4, exhale 6.`,
      riskLevel: classification.riskLevel,
      intervention: "breathing",
      timerSeconds: 300,
      quickReplies: ["Breathing done", "Still strong", "Need another step"],
      showResources: false
    }, classification.riskLevel);
  }

  if (context.signals.includes("payday risk")) {
    return guardCoachResponse({
      message:
        `${prefix} Treat this like a protect-money moment. Before any risky screen opens, move safe money first or open your protection plan.`,
      riskLevel: "high",
      intervention: "blocking_prompt",
      timerSeconds: 300,
      quickReplies: ["Open plan", "Money moved", "Need timer"],
      showResources: false
    }, "high");
  }

  return guardCoachResponse({
    message:
      `${prefix} Stay with me for 60 seconds. Close any gambling screen if it is open, take one slow breath, and tell me whether the urge went up, down, or stayed the same.`,
    riskLevel: classification.riskLevel,
    intervention: "grounding",
    timerSeconds: 300,
    quickReplies: ["Went down", "Stayed same", "Went up"],
    showResources: false
  }, classification.riskLevel);
}

function classifyInput(text) {
  const value = String(text || "");

  if (includesAny(value, CRISIS_PATTERNS)) {
    return {
      riskLevel: "crisis",
      blocked: true,
      reason: "crisis",
      response: CRISIS_REPLY
    };
  }

  if (includesAny(value, GAMBLING_ADVICE_PATTERNS)) {
    return {
      riskLevel: "high",
      blocked: true,
      reason: "gambling_advice_request",
      response: BLOCKED_REPLY
    };
  }

  if (includesAny(value, HIGH_RISK_PATTERNS)) {
    return {
      riskLevel: "high",
      blocked: false,
      reason: "high_risk_urge"
    };
  }

  return {
    riskLevel: value.trim().length > 0 ? "medium" : "low",
    blocked: false,
    reason: "support_request"
  };
}

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeCoachResponse(candidate, fallbackRiskLevel = "medium") {
  const response = candidate && typeof candidate === "object" ? candidate : {};

  return {
    message: typeof response.message === "string" && response.message.trim()
      ? response.message.trim()
      : "I am glad you told me before acting. Stay with me for 60 seconds. Has the urge gone up, down, or stayed the same?",
    riskLevel: ["low", "medium", "high", "crisis"].includes(response.riskLevel)
      ? response.riskLevel
      : fallbackRiskLevel,
    intervention: [
      "delay_timer",
      "breathing",
      "grounding",
      "play_forward",
      "support_contact",
      "blocking_prompt",
      "crisis_resources"
    ].includes(response.intervention)
      ? response.intervention
      : "delay_timer",
    timerSeconds: Number.isFinite(response.timerSeconds) ? Math.max(0, Math.min(response.timerSeconds, 600)) : 300,
    quickReplies: Array.isArray(response.quickReplies)
      ? response.quickReplies.filter((item) => typeof item === "string").slice(0, 4)
      : ["Closed", "Still open", "Urge went down"],
    showResources: Boolean(response.showResources),
    safetyFlags: Array.isArray(response.safetyFlags) ? response.safetyFlags : []
  };
}

function guardCoachResponse(candidate, fallbackRiskLevel = "medium") {
  const normalized = normalizeCoachResponse(candidate, fallbackRiskLevel);
  const outputText = normalized.message;

  if (includesAny(outputText, GAMBLING_ADVICE_PATTERNS)) {
    return {
      ...BLOCKED_REPLY,
      safetyFlags: [...BLOCKED_REPLY.safetyFlags, "unsafe_output_blocked"]
    };
  }

  if (includesAny(outputText, CRISIS_PATTERNS)) {
    return {
      ...CRISIS_REPLY,
      safetyFlags: [...CRISIS_REPLY.safetyFlags, "crisis_output_detected"]
    };
  }

  return normalized;
}

function buildFallbackCoachResponse(message, classification = classifyInput(message)) {
  if (classification.blocked) {
    return classification.response;
  }

  return buildTailoredResponse(message, classification);
}

module.exports = {
  classifyInput,
  guardCoachResponse,
  buildFallbackCoachResponse,
  safeJsonParse
};
