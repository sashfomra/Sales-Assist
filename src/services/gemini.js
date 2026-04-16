import Groq from "groq-sdk";

// ── Groq API Service ────────────────────────────────────────
// Using Groq's OpenAI-compatible API with high-speed inference.
// Models:
//   llama-3.1-8b-instant → Fast, efficient LLM for chat ✅
//   whisper-large-v3     → Audio transcription ✅

const CHAT_MODEL = "llama-3.1-8b-instant";
const TRANSCRIBE_MODEL = "whisper-large-v3";
let liveAssistSchemaMode = "unknown";
const groqClientByKey = new Map();

function normalizeApiKey(apiKey) {
  const raw = String(apiKey || "").trim();
  const unquoted = raw.replace(/^['"]|['"]$/g, "");
  return unquoted.replace(/^Bearer\s+/i, "").trim();
}

function getGroqClient(apiKey) {
  const normalizedKey = normalizeApiKey(apiKey);
  if (!normalizedKey) {
    throw new Error("Missing API key. Please provide a valid Groq API key.");
  }

  if (groqClientByKey.has(normalizedKey)) {
    return groqClientByKey.get(normalizedKey);
  }

  const client = new Groq({
    apiKey: normalizedKey,
    dangerouslyAllowBrowser: true
  });
  groqClientByKey.set(normalizedKey, client);
  return client;
}

function buildSystemPrompt(contextChunks, chartHint) {
  const contextStr = contextChunks.map(c => {
    if (c.type === "deal") {
      const d = c.data;
      return `DEAL: ${d.name} | Stage: ${d.stage} | Value: $${d.value.toLocaleString()} | Probability: ${d.probability}% | Owner: ${d.owner} | Days in Stage: ${d.daysInStage} | Close: ${d.closeDate} | Notes: ${d.notes} | Activities: ${d.activities.join(", ")} | Tags: ${d.tags.join(", ")}`;
    }
    if (c.type === "call") {
      const cl = c.data;
      return `CALL: ${cl.type} for Deal ${cl.deal} | Date: ${cl.date} | Duration: ${cl.duration} | Rep: ${cl.rep} | Sentiment: ${cl.sentiment} | Outcome: ${cl.outcome} | Summary: ${cl.summary} | Objections: ${cl.objections.join(", ")} | Next Steps: ${cl.nextSteps.join(", ")}`;
    }
    if (c.type === "metrics") {
      const m = c.data;
      return `METRICS: Total Pipeline: $${m.totalPipeline.toLocaleString()} | Closed Won: $${m.closedWon.toLocaleString()} | Win Rate: ${m.winRate}% | Avg Deal Size: $${m.avgDealSize.toLocaleString()} | Avg Sales Cycle: ${m.avgSalesCycle} days | Quota Attainment: ${m.quotaAttainment}%`;
    }
    if (c.type === "transcript") {
      return `CALL TRANSCRIPT TO ANALYZE:\n${c.data}\n`;
    }
    return "";
  }).join("\n");

  const chartInstruction = chartHint
    ? [
        "CHART REQUIRED: At the very end of your response, after all text, output the chart JSON in EXACTLY this format:",
        "```chart",
        '{"type":"bar","title":"My Chart","labels":["A","B","C"],"datasets":[{"label":"Value","data":[1,2,3]}]}',
        "```",
        "Replace the example with real data from the CRM. Valid types: bar, line, doughnut, pie.",
        "CRITICAL: The opening ``` must be on its own line. The JSON must be on its own line. The closing ``` must be on its own line.",
        "Do NOT inline the JSON on the same line as the backticks.",
      ].join("\n")
    : "Do NOT output any chart JSON or code blocks.";

  return `You are SalesIQ, an expert AI sales analyst embedded in a CRM. You help sales reps understand their pipeline, analyze call recordings, summarize deals, and provide strategic recommendations.

PERSONALITY: Concise, sharp, data-driven. You sound like a seasoned sales coach — direct but supportive. No filler words.

FORMATTING RULES:
- Use **bold** for deal names, companies, dollar amounts, and key metrics.
- Use bullet points for lists of recommendations or action items.
- Use numbered lists for ranked/ordered items.
- Keep responses focused and scannable — sales reps are busy.
- If asked for a summary, lead with the most critical insight.
- When you detect risk (stalled deals, negative sentiment, lost), flag it clearly.

CHART INSTRUCTIONS:
${chartInstruction}

RETRIEVED CRM DATA (use this as your knowledge base):
${contextStr || "No specific records matched. Use general sales knowledge and the overall context."}

OVERALL PIPELINE SUMMARY:
- 8 total deals, $746K total pipeline
- Win rate: 42%, Quota attainment: 68%
- Top reps: Priya S. (3 deals), Raj M. (2 deals), Amir K. (2 deals)
- At-risk deals: LogiChain (stalled 18 days), Acme (negotiation risk)

Always answer based on the retrieved data above. If data is insufficient, say so clearly.`;
}

export function parseJsonFromText(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fencedMatch) {
      try {
        return JSON.parse(fencedMatch[1].trim());
      } catch {
        return null;
      }
    }

    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const slice = trimmed.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(slice);
      } catch {
        return null;
      }
    }

    return null;
  }
}

function formatStructuredResponse(data) {
  if (!data || typeof data !== "object") return "";

  const lines = [];

  const addLine = (label, value) => {
    if (value === undefined || value === null || value === "") return;
    lines.push(`**${label}:** ${value}`);
  };

  addLine("Headline", data.headline);
  addLine("Summary", data.summary);
  addLine("Next Best Action", data.nextBestAction);
  addLine("Transcript Window", data.transcriptWindow);

  const coreFields = [
    ["Deal Value", data.deal_value],
    ["Timeline", data.timeline],
    ["Client Name", data.client_name],
    ["Decision Maker", data.decision_maker],
    ["Sentiment", data.sentiment],
    ["Deal Score", data.deal_score],
  ];

  const coreFieldLines = coreFields
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([label, value]) => `**${label}:** ${value}`);

  if (coreFieldLines.length) {
    lines.push(coreFieldLines.join("\n"));
  }

  if (Array.isArray(data.risks) && data.risks.length) {
    lines.push(`**Risks:** ${data.risks.join("; ")}`);
  }
  if (Array.isArray(data.next_steps) && data.next_steps.length) {
    lines.push(`**Next Steps:** ${data.next_steps.join("; ")}`);
  }
  if (Array.isArray(data.alerts) && data.alerts.length) {
    lines.push(`**Alerts:** ${data.alerts.join("; ")}`);
  }
  if (Array.isArray(data.strategicTips) && data.strategicTips.length) {
    lines.push(`**Strategic Tips:** ${data.strategicTips.join("; ")}`);
  }
  if (Array.isArray(data.suggestedResponses) && data.suggestedResponses.length) {
    lines.push(`**Suggested Responses:** ${data.suggestedResponses.join("; ")}`);
  }

  return lines.join("\n\n").trim();
}

async function tryModel(apiKey, messages, options = {}) {
  const client = getGroqClient(apiKey);

  try {
    const data = await client.chat.completions.create({
      model: CHAT_MODEL,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 1024,
      ...(options.response_format ? { response_format: options.response_format } : {})
    });

    console.log("Groq API raw response:", data.choices?.[0]?.message);
    const content = data.choices?.[0]?.message?.content;
    const text = Array.isArray(content)
      ? content
        .map(part => {
          if (typeof part === "string") return part;
          if (part && typeof part === "object") {
            if (typeof part.text === "string") return part.text;
            if (typeof part.content === "string") return part.content;
          }
          return "";
        })
        .join("\n")
        .trim()
      : content;
    if (!text) throw new Error("Empty response from model");
    return text;
  } catch (err) {
    const msg = err?.error?.message || err?.message || "Failed to call Groq chat completions";
    if (String(msg).toLowerCase().includes("unauthorized") || String(msg).includes("401")) {
      throw new Error("Unauthorized (401): invalid Groq API key. Paste only the raw key (do not include 'Bearer ').");
    }
    if (String(msg).toLowerCase().includes("quota")) {
      throw new Error(`QUOTA:${msg}`);
    }
    throw new Error(msg);
  }
}

export async function queryGemini(apiKey, userMessage, contextChunks, chatHistory, chartHint) {
  const systemPrompt = buildSystemPrompt(contextChunks, chartHint);

  // Convert to OpenAI format for Groq API
  const messages = [];
  messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "assistant", content: "Understood. I am SalesIQ, ready to analyze your pipeline." });

  chatHistory.forEach(msg => {
    messages.push({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content
    });
  });

  messages.push({ role: "user", content: userMessage });

  try {
    const rawText = await tryModel(apiKey, messages);
    const chart = parseChartFromResponse(rawText);
    const structured = parseJsonFromText(rawText);
    const content = structured && !chart ? formatStructuredResponse(structured) || rawText : stripChartBlock(rawText);

    return {
      rawText,
      content,
      chart,
      structured,
    };
  } catch (err) {
    throw new Error(err.message || "Failed to get response from Groq API");
  }
}

// ── Chart parsing — handles all Gemini output variations ──────
export function parseChartFromResponse(text) {
  // Strategy 1: ```chart\n{...}\n``` — correct format
  // Strategy 2: ```chart{...}```    — missing newlines
  // Strategy 3: ```json\n{...}\n``` — wrong tag but valid JSON with chart shape
  const patterns = [
    /```chart\s*([\s\S]*?)```/,
    /```json\s*([\s\S]*?)```/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const parsed = JSON.parse(match[1].trim());
        // Validate it's actually a chart config, not random JSON
        if (parsed.type && Array.isArray(parsed.labels) && Array.isArray(parsed.datasets)) {
          return parsed;
        }
      } catch { /* try next pattern */ }
    }
  }

  return null;
}

export function stripChartBlock(text) {
  return text
    .replace(/```chart[\s\S]*?```/g, "")
    .trim();
}

// ── Local Whisper server endpoint ─────────────────────────────
const LOCAL_WHISPER_URL = "http://127.0.0.1:8787/transcribe";
let useLocalWhisper = true; // Will flip to false if local server is unreachable

export async function transcribeAudioBlob(apiKey, audioBlob) {
  const fileName = `live-${Date.now()}.webm`;

  // ── Try local Whisper server first ──
  if (useLocalWhisper) {
    try {
      const formData = new FormData();
      formData.append("file", new File([audioBlob], fileName, { type: audioBlob.type || "audio/webm" }));

      const resp = await fetch(LOCAL_WHISPER_URL, {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) {
        throw new Error(`Local Whisper returned ${resp.status}`);
      }

      const data = await resp.json();
      const text = (data.text || "").trim();
      console.log("[Whisper] Local transcription:", text.slice(0, 60));
      return {
        text,
        duration: Number(data.duration || 0),
        segments: Array.isArray(data.segments) ? data.segments : []
      };
    } catch (err) {
      // If it's a network error (server not running), fall back to Groq
      if (err.message?.includes("Failed to fetch") || err.message?.includes("NetworkError") || err.message?.includes("ECONNREFUSED")) {
        console.warn("[Whisper] Local server unreachable, falling back to Groq. Start the local server: cd whisper_server && python server.py");
        useLocalWhisper = false;
      } else {
        // Server is up but returned an error — still try to use it next time
        console.warn("[Whisper] Local transcription error:", err.message);
        throw new Error(`Local transcription failed: ${err.message}`);
      }
    }
  }

  // ── Fallback: Groq cloud Whisper ──
  console.log("[Whisper] Using Groq cloud fallback");
  const client = getGroqClient(apiKey);
  const file = new File([audioBlob], fileName, { type: audioBlob.type || "audio/webm" });

  let data;
  try {
    data = await client.audio.transcriptions.create({
      file,
      model: TRANSCRIBE_MODEL,
      response_format: "verbose_json",
      language: "en",
      temperature: 0
    });
  } catch (err) {
    const msg = err?.error?.message || err?.message || "Transcription failed";
    const code = err?.error?.code ? ` (${err.error.code})` : "";
    if (String(msg).toLowerCase().includes("unauthorized") || String(msg).includes("401")) {
      throw new Error("Transcription failed: Unauthorized (401). Use a valid Groq API key and do not prefix it with 'Bearer '.");
    }
    throw new Error(`Transcription failed: ${msg}${code}`);
  }

  const text = (data.text || "").trim();
  return {
    text,
    duration: Number(data.duration || 0),
    segments: Array.isArray(data.segments) ? data.segments : []
  };
}

function safeJsonParse(text) {
  if (text && typeof text === "object") {
    return text;
  }

  const direct = String(text || "").trim();
  if (!direct) return null;

  try {
    return JSON.parse(direct);
  } catch {
    const blockMatch = direct.match(/```json\s*([\s\S]*?)```/i) || direct.match(/```\s*([\s\S]*?)```/);
    if (!blockMatch) return null;
    try {
      return JSON.parse(blockMatch[1].trim());
    } catch {
      return null;
    }
  }
}

function pickFirst(obj, keys, fallback = undefined) {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null) {
      return obj[key];
    }
  }
  return fallback;
}

function toStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const text = pickFirst(item, ["text", "label", "title", "value", "message"], "");
        return String(text || "").trim();
      }
      return "";
    })
    .filter(Boolean);
}

function normalizeIntentSignals(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => {
      if (typeof item === "string") {
        return { label: item.trim(), confidence: 65, evidence: "" };
      }
      if (!item || typeof item !== "object") return null;
      const label = String(pickFirst(item, ["label", "intent", "signal", "name"], "")).trim();
      const confidence = Number(pickFirst(item, ["confidence", "score", "probability"], 65));
      const evidence = String(pickFirst(item, ["evidence", "reason", "context", "quote"], "")).trim();
      if (!label) return null;
      return {
        label,
        confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(100, Math.round(confidence))) : 65,
        evidence,
      };
    })
    .filter(Boolean)
    .slice(0, 4);
}

function normalizeRiskSignals(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => {
      if (typeof item === "string") {
        return { label: item.trim(), severity: "medium", evidence: "" };
      }
      if (!item || typeof item !== "object") return null;
      const label = String(pickFirst(item, ["label", "risk", "signal", "name"], "")).trim();
      const severityRaw = String(pickFirst(item, ["severity", "level", "priority"], "medium")).toLowerCase();
      const severity = ["low", "medium", "high"].includes(severityRaw) ? severityRaw : "medium";
      const evidence = String(pickFirst(item, ["evidence", "reason", "context", "quote"], "")).trim();
      if (!label) return null;
      return { label, severity, evidence };
    })
    .filter(Boolean)
    .slice(0, 4);
}

const LIVE_ASSIST_JSON_SCHEMA = {
  name: "live_assist_payload",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      transcriptWindow: { type: "string" },
      headline: { type: "string" },
      intentSignals: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            label: { type: "string" },
            confidence: { type: "number" },
            evidence: { type: "string" }
          },
          required: ["label", "confidence", "evidence"]
        }
      },
      riskSignals: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            label: { type: "string" },
            severity: { type: "string", enum: ["low", "medium", "high"] },
            evidence: { type: "string" }
          },
          required: ["label", "severity", "evidence"]
        }
      },
      conversationAnalysis: {
        type: "object",
        additionalProperties: false,
        properties: {
          talkRatioRep: { type: "number" },
          talkRatioCustomer: { type: "number" },
          interruptions: { type: "string", enum: ["none", "low", "moderate", "high"] },
          pace: { type: "string", enum: ["slow", "balanced", "fast"] }
        },
        required: ["talkRatioRep", "talkRatioCustomer", "interruptions", "pace"]
      },
      suggestedResponses: {
        type: "array",
        items: { type: "string" }
      },
      strategicTips: {
        type: "array",
        items: { type: "string" }
      },
      alerts: {
        type: "array",
        items: { type: "string" }
      },
      nextBestAction: { type: "string" }
    },
    required: [
      "transcriptWindow",
      "headline",
      "intentSignals",
      "riskSignals",
      "conversationAnalysis",
      "suggestedResponses",
      "strategicTips",
      "alerts",
      "nextBestAction"
    ]
  }
};

/**
 * Recursively search an object tree for values matching a set of key names.
 * Returns the first non-null/non-undefined value found at any depth.
 */
function deepFind(obj, keys, maxDepth = 4) {
  if (!obj || typeof obj !== "object" || maxDepth <= 0) return undefined;
  // Check direct keys first
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  // Then recurse into nested objects
  for (const val of Object.values(obj)) {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const found = deepFind(val, keys, maxDepth - 1);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

/**
 * Unwrap a response that may be nested under various wrapper keys.
 * Groq's llama model returns wildly different structures each call, e.g.:
 *   { coachingOutput: { suggestion: "..." } }
 *   { output: { intentSignals: [...] } }
 *   { live_assist_payload: { ... } }
 * This flattens all nested object values into a single merged object so
 * field lookup works regardless of nesting.
 */
function unwrapResponse(raw) {
  if (!raw || typeof raw !== "object") return {};

  const wrapperKeys = [
    "live_assist_payload", "payload", "coachingOutput", "coaching_output",
    "output", "result", "data", "analysis", "response", "coaching",
    "liveAssist", "live_assist", "insights", "salesCoaching"
  ];

  let best = raw;
  for (const key of wrapperKeys) {
    if (raw[key] && typeof raw[key] === "object" && !Array.isArray(raw[key])) {
      best = raw[key];
      // Check one more level deep
      for (const key2 of wrapperKeys) {
        if (best[key2] && typeof best[key2] === "object" && !Array.isArray(best[key2])) {
          best = best[key2];
          break;
        }
      }
      break;
    }
  }

  // Merge the wrapper and the unwrapped so we catch fields at both levels
  const merged = { ...raw };
  if (best !== raw) {
    Object.assign(merged, best);
  }
  return merged;
}

/**
 * Coerce a value that might be a string, array, or nested object into an array of strings.
 * Handles cases like: "single suggestion" → ["single suggestion"]
 */
function coerceToArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (value && typeof value === "object") {
    // Might be { 0: "...", 1: "..." } or similar
    const vals = Object.values(value).filter(v => typeof v === "string" && v.trim());
    if (vals.length) return vals;
  }
  return [];
}

function normalizeLiveInsights(raw, transcriptFallback) {
  const safe = unwrapResponse(raw);

  console.log("[LiveAssist] normalizeLiveInsights unwrapped:", safe);

  const toPercent = (value, fallback) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.min(100, Math.round(n)));
  };

  // --- Transcript window ---
  const twRaw = deepFind(safe, ["transcriptWindow", "transcript_window", "window", "recentTranscript"]);
  const transcriptWindow = typeof twRaw === "string" ? twRaw.trim()
    : (transcriptFallback || "");

  // --- Headline ---
  const hlRaw = deepFind(safe, ["headline", "title", "summary", "mainInsight", "main_insight", "coaching_headline"]);
  const headline = (typeof hlRaw === "string" && hlRaw.trim()) ? hlRaw.trim() : "Live coaching update";

  // --- Next best action ---
  const nbaRaw = deepFind(safe, [
    "nextBestAction", "next_best_action", "recommendedAction", "next_action",
    "recommendation", "action", "suggested_action"
  ]);
  const nextBestAction = (typeof nbaRaw === "string" && nbaRaw.trim())
    ? nbaRaw.trim()
    : "Keep the customer engaged with one focused follow-up question.";

  // --- Suggested responses: search deep, coerce strings to arrays ---
  const sugRaw = deepFind(safe, [
    "suggestedResponses", "suggested_responses", "responses", "replySuggestions",
    "suggestions", "suggestion", "recommended_responses", "reply_suggestions"
  ]);
  const suggestedResponses = toStringArray(coerceToArray(sugRaw)).slice(0, 3);

  // --- Strategic tips ---
  const tipsRaw = deepFind(safe, [
    "strategicTips", "strategic_tips", "tips", "coachingTips", "coaching_tips",
    "tacticalTips", "tactical_tips", "advice", "coaching_advice"
  ]);
  const strategicTips = toStringArray(coerceToArray(tipsRaw)).slice(0, 3);

  // --- Alerts ---
  const alertsRaw = deepFind(safe, ["alerts", "warnings", "flags", "warning", "alert", "red_flags"]);
  const alerts = toStringArray(coerceToArray(alertsRaw)).slice(0, 3);

  // --- Intent signals ---
  const intentRaw = deepFind(safe, [
    "intentSignals", "intent_signals", "intent", "intentInsights",
    "buyer_intent", "buyerIntent", "intents"
  ]);
  const intentSignals = normalizeIntentSignals(coerceToArray(intentRaw));

  // --- Risk signals ---
  const riskRaw = deepFind(safe, [
    "riskSignals", "risk_signals", "risks", "riskInsights",
    "risk_factors", "riskFactors", "concerns"
  ]);
  const riskSignals = normalizeRiskSignals(coerceToArray(riskRaw));

  // --- Conversation analysis (search deep) ---
  const convRaw = deepFind(safe, [
    "conversationAnalysis", "conversation_analysis", "analysis", "metrics",
    "callAnalysis", "call_analysis", "conversation_metrics"
  ]);
  const conv = (convRaw && typeof convRaw === "object" && !Array.isArray(convRaw)) ? convRaw : {};

  const repRatio = deepFind(conv, ["talkRatioRep", "talk_ratio_rep", "repTalkRatio", "rep_ratio"]);
  const customerRatio = deepFind(conv, ["talkRatioCustomer", "talk_ratio_customer", "customerTalkRatio", "customer_ratio"]);
  const interruptionsVal = deepFind(conv, ["interruptions", "interruption_level", "interruption"]);
  const paceVal = deepFind(conv, ["pace", "speaking_pace", "speed"]);

  const interruptionsStr = String(interruptionsVal || "").toLowerCase();
  const paceStr = String(paceVal || "").toLowerCase();

  const result = {
    transcriptWindow,
    headline,
    intentSignals,
    riskSignals,
    conversationAnalysis: {
      talkRatioRep: repRatio !== undefined ? toPercent(repRatio, null) : null,
      talkRatioCustomer: customerRatio !== undefined ? toPercent(customerRatio, null) : null,
      interruptions: ["none", "low", "moderate", "high"].includes(interruptionsStr) ? interruptionsStr : null,
      pace: ["slow", "balanced", "fast"].includes(paceStr) ? paceStr : null
    },
    suggestedResponses,
    strategicTips,
    alerts,
    nextBestAction
  };

  console.log("[LiveAssist] normalizeLiveInsights result:", result);
  return result;
}

export async function generateLiveAssistInsights(apiKey, payload) {
  const { recentTranscript, dealContext, runningStats, fullTranscriptTail } = payload;

  const system = [
    "You are a real-time sales co-pilot for live web calls.",
    "",
    "CRITICAL RULES:",
    "1. Return ONLY valid JSON. No markdown, no code fences, no extra text before or after the JSON.",
    "2. You MUST use EXACTLY the field names shown below. Do NOT rename, nest, or wrap them.",
    "3. Every field is REQUIRED. Never omit any field.",
    "4. Keep all text content concise, tactical, and actionable for an in-call sales rep.",
    "5. Prioritize the most recent utterances in the transcript.",
    "6. Do not repeat stale guidance; refresh suggestions to match what was just said.",
    "7. When transcript evidence is thin, use low confidence values and avoid hallucination.",
    "",
    "STRICT RESPONSE FORMAT — you MUST return exactly this JSON structure every time:",
    "",
    "{",
    '  "transcriptWindow": "<the exact transcript snippet you analyzed>",',
    '  "headline": "<one-line coaching insight or observation>",',
    '  "intentSignals": [',
    '    {"label": "<signal name>", "confidence": <0-100>, "evidence": "<quote or reason>"}',
    "  ],",
    '  "riskSignals": [',
    '    {"label": "<risk name>", "severity": "<low|medium|high>", "evidence": "<quote or reason>"}',
    "  ],",
    '  "conversationAnalysis": {',
    '    "talkRatioRep": <0-100>,',
    '    "talkRatioCustomer": <0-100>,',
    '    "interruptions": "<none|low|moderate|high>",',
    '    "pace": "<slow|balanced|fast>"',
    "  },",
    '  "suggestedResponses": ["<response 1>", "<response 2>"],',
    '  "strategicTips": ["<tip 1>", "<tip 2>"],',
    '  "alerts": ["<alert 1>"],',
    '  "nextBestAction": "<single recommended next action>"',
    "}",
    "",
    "EXAMPLE RESPONSE:",
    '{',
    '  "transcriptWindow": "So the pricing for the enterprise plan is flexible based on seats.",',
    '  "headline": "Customer is evaluating pricing — anchor on ROI",',
    '  "intentSignals": [',
    '    {"label": "Pricing inquiry", "confidence": 85, "evidence": "Asked about enterprise plan pricing"},',
    '    {"label": "Buying signal", "confidence": 60, "evidence": "Mentioned team size and rollout timeline"}',
    '  ],',
    '  "riskSignals": [',
    '    {"label": "Budget concern", "severity": "medium", "evidence": "Mentioned needing approval from finance"}',
    '  ],',
    '  "conversationAnalysis": {',
    '    "talkRatioRep": 55,',
    '    "talkRatioCustomer": 45,',
    '    "interruptions": "low",',
    '    "pace": "balanced"',
    '  },',
    '  "suggestedResponses": [',
    '    "Based on similar teams, customers typically see 3x ROI within the first quarter.",',
    '    "Would it help if I shared a cost-comparison breakdown you could forward to your finance team?"',
    '  ],',
    '  "strategicTips": [',
    '    "Shift from price to value. Highlight case studies with measurable ROI.",',
    '    "Ask about their current solution costs to create a comparison anchor."',
    '  ],',
    '  "alerts": ["Customer may need internal buy-in — offer enablement materials."],',
    '  "nextBestAction": "Ask: What does your evaluation process look like from here?"',
    '}',
    "",
    "REMEMBER: Use EXACTLY these field names: transcriptWindow, headline, intentSignals, riskSignals, conversationAnalysis, suggestedResponses, strategicTips, alerts, nextBestAction.",
    "DO NOT wrap the response in any outer object like 'coachingOutput', 'output', 'payload', 'data', or 'result'.",
    "DO NOT use alternative field names like 'suggestions', 'tips', 'recommendation', etc.",
    "Return the flat JSON object directly."
  ].join("\n");

  const user = [
    "RECENT TRANSCRIPT (last rolling window):",
    recentTranscript || "(no transcript yet)",
    "",
    "TRANSCRIPT TAIL (longer context):",
    fullTranscriptTail || "(no transcript yet)",
    "",
    "DEAL CONTEXT:",
    JSON.stringify(dealContext || {}, null, 2),
    "",
    "RUNNING STATS:",
    JSON.stringify(runningStats || {}, null, 2),
    "",
    "Generate concise live coaching outputs for the sales rep now."
  ].join("\n");

  const messages = [
    { role: "system", content: system },
    { role: "user", content: user }
  ];

  if (liveAssistSchemaMode !== "disabled") {
    try {
      const raw = await tryModel(apiKey, messages, {
        temperature: 0.3,
        max_tokens: 900,
        response_format: {
          type: "json_schema",
          json_schema: LIVE_ASSIST_JSON_SCHEMA
        }
      });

      liveAssistSchemaMode = "enabled";
      const parsed = safeJsonParse(raw);
      if (!parsed) {
        throw new Error("Live analysis returned invalid JSON");
      }
      return normalizeLiveInsights(parsed, recentTranscript);
    } catch (err) {
      const msg = (err?.message || "").toLowerCase();
      const schemaUnsupported =
        msg.includes("response_format") ||
        msg.includes("json_schema") ||
        msg.includes("invalid_request_error") ||
        msg.includes("unsupported");

      if (schemaUnsupported) {
        liveAssistSchemaMode = "disabled";
      } else {
        liveAssistSchemaMode = "unknown";
      }
    }
  }

  // Compatible fallback path to avoid repeated 400s on runtimes that don't accept json_schema.
  const raw = await tryModel(apiKey, messages, {
    temperature: 0.3,
    max_tokens: 900,
    response_format: { type: "json_object" }
  });
  const parsed = safeJsonParse(raw);
  if (!parsed) {
    throw new Error("Live analysis returned invalid JSON");
  }
  return normalizeLiveInsights(parsed, recentTranscript);
}
