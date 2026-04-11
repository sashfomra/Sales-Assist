// ── Groq API Service ────────────────────────────────────────
// Using Groq's OpenAI-compatible API with high-speed inference.
// Models:
//   llama-3.1-8b-instant → Fast, efficient LLM for chat ✅
//   whisper-large-v3     → Audio transcription ✅

const CHAT_MODEL = "llama-3.1-8b-instant";

function apiUrl(endpoint) {
  return `https://api.groq.com/openai/v1/${endpoint}`;
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

async function tryModel(apiKey, messages) {
  const response = await fetch(apiUrl("chat/completions"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: messages,
      temperature: 0.7,
      max_tokens: 1024
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.error?.message || `HTTP ${response.status}`;
    if (response.status === 429 || msg.toLowerCase().includes("quota")) {
      throw new Error(`QUOTA:${msg}`);
    }
    throw new Error(msg);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty response from model");
  return text;
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
    return await tryModel(apiKey, messages);
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
    .replace(/```json[\s\S]*?```/g, "")
    .trim();
}
