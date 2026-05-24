const http = require("http");
const fs = require("fs");
const path = require("path");
const {
  buildFallbackCoachResponse,
  classifyInput,
  guardCoachResponse,
  safeJsonParse
} = require("./safetyLayer");

loadEnvFile(path.resolve(__dirname, "..", ".env"));

const PORT = Number(process.env.PORT || 8788);
const HOST = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const MAX_BODY_BYTES = 64 * 1024;
const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = rawValue.replace(/^["']|["']$/g, "");
    }
  }
}

function getCorsOrigin(req) {
  if (ALLOWED_ORIGINS.includes("*")) return "*";

  const requestOrigin = req.headers.origin;
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    return requestOrigin;
  }

  return ALLOWED_ORIGINS[0] || "*";
}

function sendJson(req, res, status, payload) {
  const responseBody = status === 204 ? "" : JSON.stringify(payload);

  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": getCorsOrigin(req),
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
    "Cache-Control": "no-store"
  });
  res.end(responseBody);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let body = "";

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      body += chunk;
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      const parsed = safeJsonParse(body);
      if (!parsed) {
        reject(new Error("Invalid JSON"));
        return;
      }
      resolve(parsed);
    });

    req.on("error", reject);
  });
}

function buildCoachPrompt(message, conversation = []) {
  const recentConversation = conversation
    .slice(-8)
    .map((item) => `${item.role === "user" ? "User" : "Coach"}: ${String(item.text || "").slice(0, 500)}`)
    .join("\n");

  return [
    "You are the PAUSE Support Coach for gambling recovery.",
    "Your purpose is to create distance between urge and action.",
    "Do not provide betting advice, odds, picks, predictions, bankroll strategy, or safer-gambling tips.",
    "Do not shame the user. Do not diagnose. Do not claim to replace a therapist.",
    "If self-harm, suicide, harm to someone else, immediate danger, or severe crisis appears, return crisis_resources.",
    "For crisis responses, use a serious danger-first tone. Do not say 'I am glad you said this' or lead with warm validation. Tell the user safety comes first, to call emergency services now if anyone may be harmed, and to call/text 988 in the US for self-harm thoughts.",
    "Make the response feel tailored to the user's exact text.",
    "Reflect one or two concrete details the user actually shared, such as urge strength, deposit screen, chasing losses, being alone, boredom, stress, payday, substance use, or whether the app is closed.",
    "Do not invent details, identity, family context, debt, or consequences the user did not mention.",
    "Keep the message brief, calm, private, and action-oriented.",
    "Ask at most one direct question.",
    "Return only JSON with this shape:",
    '{"message":"string","riskLevel":"low|medium|high|crisis","intervention":"delay_timer|breathing|grounding|play_forward|support_contact|blocking_prompt|crisis_resources","timerSeconds":300,"quickReplies":["string"],"showResources":false,"safetyFlags":["string"]}',
    "",
    "Recent conversation:",
    recentConversation || "None",
    "",
    `Current user message: ${message}`
  ].join("\n");
}

async function callOpenAI({ message, conversation, classification }) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: buildCoachPrompt(message, conversation)
        },
        {
          role: "user",
          content: message
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errorText.slice(0, 200)}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  const parsed = safeJsonParse(content);
  return guardCoachResponse(parsed, classification.riskLevel);
}

async function handleCoachMessage(req, res) {
  try {
    const body = await readJsonBody(req);
    const message = String(body.message || "").trim();
    const conversation = Array.isArray(body.conversation) ? body.conversation : [];

    if (!message) {
      sendJson(req, res, 400, { error: "message is required" });
      return;
    }

    const classification = classifyInput(message);

    if (classification.blocked) {
      sendJson(req, res, 200, classification.response);
      return;
    }

    try {
      const modelResponse = await callOpenAI({ message, conversation, classification });
      if (modelResponse) {
        sendJson(req, res, 200, modelResponse);
        return;
      }
    } catch (error) {
      console.warn(error.message);
    }

    sendJson(req, res, 200, buildFallbackCoachResponse(message, classification));
  } catch (error) {
    sendJson(req, res, error.message === "Invalid JSON" ? 400 : 413, { error: error.message });
  }
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(req, res, 204, {});
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/") {
    sendJson(req, res, 200, {
      ok: true,
      service: "pause-coach",
      endpoints: ["/health", "/v1/coach/message"]
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(req, res, 200, {
      ok: true,
      service: "pause-coach",
      modelConfigured: Boolean(process.env.OPENAI_API_KEY),
      environment: process.env.NODE_ENV || "development"
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/v1/coach/message") {
    handleCoachMessage(req, res);
    return;
  }

  sendJson(req, res, 404, { error: "Not found" });
});

server.listen(PORT, HOST, () => {
  console.log(`PAUSE coach backend running at http://${HOST}:${PORT}`);
});
