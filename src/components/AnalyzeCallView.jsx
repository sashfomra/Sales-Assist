import { useState, useRef } from "react";
import { parseJsonFromText } from "../services/gemini";
import styles from "./AnalyzeCallView.module.css";

// ── Groq multimodal audio analysis with Whisper ─────────────────────
// Using Groq's fast Whisper-large-v3 for accurate speech-to-text
const AUDIO_MODEL = "whisper-large-v3";

function buildExtractionPrompt() {
  return `You are a Deal Intelligence Engine. Analyze this sales call audio recording.

Your job is to:
1. Generate a speaker-diarized transcript (Speaker 1 and Speaker 2)
2. Extract structured deal intelligence

Return ONLY valid JSON in this exact format (no markdown, no preamble):
{
  "transcript": [
    { "speaker": "Speaker 1", "time": "00:00", "text": "..." },
    { "speaker": "Speaker 2", "time": "00:12", "text": "..." }
  ],
  "deal_intelligence": {
    "transcript_confidence_score": number 0-100,
    "deal_value": "string or null",
    "timeline": "string or null",
    "client_name": "string or null",
    "decision_maker": "string or null",
    "competitors": ["string"],
    "pain_points": ["string"],
    "objections": ["string"],
    "next_steps": ["string"],
    "risks": ["string"],
    "key_insights": ["string"],
    "sentiment": "Positive | Neutral | Negative | Tense",
    "deal_score": number between 0-100,
    "summary": "2-3 sentence summary of the call"
  },
  "coaching": {
    "metrics": {
      "talk_ratio_rep": number 0-100,
      "talk_ratio_client": number 0-100,
      "talk_ratio_verdict": "string, e.g. 'You talked 72% of the time. Ideal is 40-60%. You dominated the conversation and left little room for the client to share their needs.'",
      "interruptions": number,
      "interruption_details": "string describing when/how interruptions happened",
      "listening_score": number 1-10
    },
    "questions": {
      "all_questions": ["extract EVERY question the sales rep asked, verbatim from transcript — do NOT classify them, just list them all"],
      "question_verdict": "string, detailed analysis of question quality and discovery depth"
    },
    "bant_compliance": {
      "budget": { "covered": boolean, "detail": "what was said or what should have been asked" },
      "authority": { "covered": boolean, "detail": "what was said or what should have been asked" },
      "need": { "covered": boolean, "detail": "what was said or what should have been asked" },
      "timeline": { "covered": boolean, "detail": "what was said or what should have been asked" },
      "coverage_percent": number 0-100,
      "verdict": "string, overall BANT assessment"
    },
    "mistakes": [
      {
        "timestamp": "approximate time in call",
        "what_happened": "describe exactly what rep said or did wrong",
        "why_its_wrong": "explain the impact on the deal",
        "what_to_do_instead": "give the exact corrected script/approach"
      }
    ],
    "objection_handling": [
      {
        "objection": "the exact objection from client",
        "rep_response": "what the rep actually said",
        "handled_well": boolean,
        "feedback": "detailed feedback on what was good or bad",
        "better_response": "if handled poorly, the ideal response script"
      }
    ],
    "next_best_actions": [
      {
        "action": "specific action title",
        "why": "why this matters for the deal",
        "how": "step-by-step instructions on exactly how to do it",
        "script": "exact words/email template the rep can use"
      }
    ],
    "engagement_score": number 1-10,
    "engagement_breakdown": "string explaining what contributed to the score",
    "overall_verdict": "2-3 sentence overall coaching summary of the rep performance"
  }
}

Rules:
- Speaker 1 is typically the sales rep, Speaker 2 is the prospect/client
- If you cannot determine a field, use null or empty array
- Extract ALL mentions of price, dates, company names, competitors
- Identify risks: budget hesitation, competitor mentions, timeline delays
- deal_score: 0=very cold, 50=neutral, 100=hot/ready to close
- transcript_confidence_score: 0-100 rating of how accurate you believe the Whisper transcript and speaker diarization is based on context clues and grammatical consistency.
- engagement_score MUST be between 1 and 10 (NOT 0-100)
- In the coaching.mistakes array, reference specific things the rep said from the transcript, explain why it was wrong, and give the EXACT corrected script they should use
- In next_best_actions, give very detailed step-by-step how-to instructions with example scripts/templates the rep can copy-paste
- In questions.all_questions, extract EVERY question the rep asked VERBATIM from the transcript. Do NOT classify them as open or closed — just list them all exactly as spoken. The client-side classifier will handle classification.
- Be brutally honest in feedback — this is a coaching tool, not a compliment machine`;
}

async function analyzeWithGroq(apiKey, file) {
  try {
    // Validate file size (Groq has ~25MB limit)
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 25MB. Please compress or trim your audio.`);
    }

    // First, transcribe the audio using Whisper
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', AUDIO_MODEL);

    const transcriptionResponse = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!transcriptionResponse.ok) {
      const err = await transcriptionResponse.json().catch(() => ({}));
      throw new Error(err.error?.message || `Transcription failed: ${transcriptionResponse.status}`);
    }

    const transcriptionData = await transcriptionResponse.json();
    const audioTranscript = transcriptionData.text;

    // Then analyze the transcript with llama to extract deal intelligence
    const analysisResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: buildExtractionPrompt()
          },
          {
            role: "user",
            content: `Analyze this sales call transcript and extract deal intelligence:\n\n${audioTranscript}`
          }
        ],
        temperature: 0.1,
        max_tokens: 4096
      })
    });

    if (!analysisResponse.ok) {
      const err = await analysisResponse.json().catch(() => ({}));
      throw new Error(err.error?.message || `Analysis failed: ${analysisResponse.status}`);
    }

    const analysisData = await analysisResponse.json();
    const responseText = analysisData.choices?.[0]?.message?.content;
    if (!responseText) throw new Error("Empty response from analysis");

    // Parse the JSON response even if the model wrapped it in markdown fences or extra text.
    const parsed = parseJsonFromText(responseText);
    if (!parsed) {
      throw new Error("Unable to parse analysis response as JSON");
    }

    // Add the transcript to the result
    return {
      ...parsed,
      transcript: parseTranscriptFromAudio(audioTranscript)
    };
  } catch (err) {
    throw err;
  }
}

function parseTranscriptFromAudio(transcript) {
  // Simple speaker diarization based on sentence breaks
  // Speaker 1 and Speaker 2 alternate
  const sentences = transcript.split(/(?<=[.!?])\s+/);
  const result = [];
  let time = 0;
  
  sentences.forEach((sentence, index) => {
    result.push({
      speaker: index % 2 === 0 ? "Speaker 1" : "Speaker 2",
      time: `00:${String(time).padStart(2, '0')}`,
      text: sentence.trim()
    });
    time += Math.floor(sentence.length / 10); // Estimate time based on text length
  });
  
  return result;
}

// ── Production-grade question classifier ────────────────────────────────
// Classifies questions as OPEN-ENDED or CLOSED-ENDED based on intent patterns
function classifyQuestion(questionText) {
  const q = questionText.toLowerCase().trim();

  // ── CLOSED-ENDED: factual / data-collection questions ──
  const closedFactualKeywords = [
    'phone', 'email', 'number', 'address', 'zip', 'postal',
    'name', 'title', 'department', 'extension', 'fax',
    'id', 'account number', 'order number', 'reference',
    'date of birth', 'social security', 'license',
    'website', 'url', 'domain', 'company name'
  ];

  // ── CLOSED-ENDED: yes/no starters ──
  const closedStartPatterns = [
    /^do you/, /^does /, /^did you/, /^did the/,
    /^is it/, /^is there/, /^is that/, /^is this/, /^is your/,
    /^are you/, /^are there/, /^are we/,
    /^have you/, /^has /, /^had /,
    /^will you/, /^will it/, /^will there/, /^will the/,
    /^would you/, /^would it/, /^would that/,
    /^can you/, /^can i/, /^can we/, /^can the/,
    /^could you/, /^could i/, /^could we/,
    /^should we/, /^should i/, /^should it/,
    /^shall /, /^may i/,
    /^was it/, /^was there/, /^was that/,
    /^were you/, /^were there/,
    /^which one/, /^which option/,
    /^how many/, /^how much/, /^how old/, /^how long ago/,
    /^when did/, /^when is/, /^when are/, /^when will/, /^when was/, /^when do/,
    /^where is/, /^where are/, /^where do/, /^where did/,
    /^who is/, /^who are/, /^who was/, /^who did/, /^who will/,
    /^what is your (name|email|phone|number|title|address|company)/,
    /^what's your (name|email|phone|number|title|address|company)/,
    /^what is the (name|date|time|price|cost|number|address)/,
    /^what's the (name|date|time|price|cost|number|address)/,
  ];

  // ── OPEN-ENDED: discovery / exploration starters ──
  const openStartPatterns = [
    /^why /, /^why do/, /^why did/, /^why are/, /^why is/,
    /^how do you/, /^how does/, /^how did/, /^how would/, /^how can/, /^how are/,
    /^how should/,
    /^what challenges/, /^what problems/, /^what issues/,
    /^what are your (thoughts|goals|priorities|concerns|challenges|needs|plans|expectations)/,
    /^what are the (challenges|problems|goals|main|key|biggest)/,
    /^what do you (think|feel|see|expect|need|want|envision|hope)/,
    /^what does .* look like/,
    /^what would .*(ideal|perfect|best|success)/,
    /^what kind of/, /^what type of/,
    /^what's (driving|motivating|causing|preventing|stopping|holding)/,
    /^what (drives|motivates|causes|prevents|stops)/,
    /^tell me (about|more|how)/,
    /^describe /, /^explain /,
    /^walk me through/, /^take me through/,
    /^help me understand/,
    /^what (happened|led|brought|made you)/,
    /^in what way/, /^in your (opinion|experience|view)/,
    /^could you (describe|explain|elaborate|tell|walk)/,
    /^can you (describe|explain|elaborate|tell|walk)/,
    /^would you (describe|explain|elaborate|tell|walk)/,
  ];

  // Step 1: Check factual keywords first (highest priority for closed)
  if (closedFactualKeywords.some(kw => q.includes(kw))) {
    // But check — is it asking ABOUT the topic (open) or FOR the data (closed)?
    if (openStartPatterns.some(p => p.test(q))) {
      return 'open'; // e.g. "Tell me about your email marketing strategy"
    }
    return 'closed'; // e.g. "What is your email?"
  }

  // Step 2: Check open-ended patterns
  if (openStartPatterns.some(p => p.test(q))) {
    return 'open';
  }

  // Step 3: Check closed-ended patterns
  if (closedStartPatterns.some(p => p.test(q))) {
    return 'closed';
  }

  // Step 4: Heuristic — if short (<8 words) and starts with "what", likely closed
  const wordCount = q.split(/\s+/).length;
  if (q.startsWith('what') && wordCount <= 7) {
    return 'closed';
  }

  // Step 5: Default — longer "what" questions are typically open
  if (q.startsWith('what') && wordCount > 7) {
    return 'open';
  }

  // Default to closed (conservative — don't inflate open-ended count)
  return 'closed';
}

// Post-process: reclassify all questions from LLM output
function reclassifyQuestions(coaching) {
  if (!coaching?.questions) return coaching;

  // Gather all questions from LLM (may come as all_questions or split)
  let allQuestions = [];
  if (coaching.questions.all_questions) {
    allQuestions = coaching.questions.all_questions;
  } else {
    // Fallback: merge old format if LLM still returns split
    allQuestions = [
      ...(coaching.questions.open_ended || []),
      ...(coaching.questions.closed_ended || [])
    ];
  }

  const open_ended = [];
  const closed_ended = [];

  allQuestions.forEach(q => {
    if (classifyQuestion(q) === 'open') {
      open_ended.push(q);
    } else {
      closed_ended.push(q);
    }
  });

  return {
    ...coaching,
    questions: {
      ...coaching.questions,
      open_ended,
      closed_ended,
      total: allQuestions.length,
      open_ratio: allQuestions.length > 0 ? Math.round((open_ended.length / allQuestions.length) * 100) : 0
    }
  };
}

const SCORE_COLOR = (score) => {
  if (score >= 70) return "#34d399";
  if (score >= 40) return "#fbbf24";
  return "#f87171";
};

const SENTIMENT_COLOR = {
  "Positive": "#34d399",
  "Neutral": "#fbbf24",
  "Tense": "#f87171",
  "Negative": "#f87171",
};

export default function AnalyzeCallView({ apiKey, onChatWithTranscript }) {
  const [file, setFile] = useState(null);
  const [stage, setStage] = useState("idle"); // idle | uploading | analyzing | done | error
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcriptFilter, setTranscriptFilter] = useState("all"); // all | speaker1 | speaker2
  const [showOpenQuestions, setShowOpenQuestions] = useState(false);
  const [showClosedQuestions, setShowClosedQuestions] = useState(false);
  const [expandedMistake, setExpandedMistake] = useState(null);
  const [expandedAction, setExpandedAction] = useState(null);
  const inputRef = useRef();
  const dropRef = useRef();

  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) selectFile(f);
  }

  function selectFile(f) {
    const allowed = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/mp4", "audio/webm", "audio/flac"];
    // Also allow by extension
    const ext = f.name.split(".").pop().toLowerCase();
    const allowedExt = ["mp3", "wav", "ogg", "m4a", "webm", "flac", "aac"];
    if (!allowed.includes(f.type) && !allowedExt.includes(ext)) {
      setError("Please upload an audio file (MP3, WAV, M4A, FLAC, etc.)");
      return;
    }
    setFile(f);
    setError("");
    setResult(null);
    setStage("idle");
  }

  async function handleAnalyze() {
    if (!file) return;
    if (!apiKey) {
      setError("No API key found. Please set your Groq API key first.");
      return;
    }

    setStage("analyzing");
    setError("");
    setProgress(0);

    // Simulate progress while waiting
    const progressTimer = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 8, 88));
    }, 800);

    try {
      const data = await analyzeWithGroq(apiKey, file);

      clearInterval(progressTimer);
      setProgress(100);
      setResult(data);
      setStage("done");
    } catch (err) {
      clearInterval(progressTimer);
      setError(err.message || "Analysis failed. Please try again.");
      setStage("error");
    }
  }

  const intel = result?.deal_intelligence;
  const coaching = result?.coaching ? reclassifyQuestions(result.coaching) : null;
  const transcript = result?.transcript || [];

  const filteredTranscript = transcript.filter(line => {
    if (transcriptFilter === "all") return true;
    if (transcriptFilter === "speaker1") return line.speaker === "Speaker 1";
    if (transcriptFilter === "speaker2") return line.speaker === "Speaker 2";
    return true;
  });

  return (
    <div className={styles.view}>
      {/* Left pane: upload */}
      <div className={styles.leftPane}>
        <div className={styles.paneHeader}>
          <h1 className={styles.title}>Analyze Call</h1>
          <p className={styles.subtitle}>Upload a sales call recording to extract deal intelligence</p>
        </div>

        {/* Pipeline diagram */}
        <div className={styles.pipeline}>
          {[
            { icon: "🎵", label: "Audio", sub: "MP3 / WAV" },
            { icon: "🗣️", label: "Diarize", sub: "Speaker split" },
            { icon: "📝", label: "Transcribe", sub: "Full text" },
            { icon: "🧠", label: "Extract", sub: "JSON schema" },
            { icon: "💡", label: "Insights", sub: "Deal intel" },
          ].map((step, i, arr) => (
            <div key={i} className={styles.pipelineRow}>
              <div className={styles.pipelineStep}>
                <div className={styles.pipelineIcon}>{step.icon}</div>
                <div>
                  <div className={styles.pipelineLabel}>{step.label}</div>
                  <div className={styles.pipelineSub}>{step.sub}</div>
                </div>
              </div>
              {i < arr.length - 1 && <div className={styles.pipelineArrow}>→</div>}
            </div>
          ))}
        </div>

        {/* Drop zone */}
        <div
          ref={dropRef}
          className={`${styles.dropZone} ${file ? styles.dropZoneHasFile : ""}`}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            style={{ display: "none" }}
            onChange={e => { if (e.target.files[0]) selectFile(e.target.files[0]); }}
          />
          {file ? (
            <>
              <div className={styles.fileIcon}>🎵</div>
              <p className={styles.fileName}>{file.name}</p>
              <p className={styles.fileSize}>{(file.size / (1024 * 1024)).toFixed(2)} MB · Click to change</p>
            </>
          ) : (
            <>
              <div className={styles.dropIcon}>📁</div>
              <p className={styles.dropText}>Drop audio file here</p>
              <p className={styles.dropSub}>MP3, WAV, M4A, FLAC, OGG supported</p>
            </>
          )}
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <span>⚠</span> {error}
          </div>
        )}

        {/* Analyze button */}
        {stage === "analyzing" ? (
          <div className={styles.progressWrap}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
            <p className={styles.progressLabel}>
              {progress < 30 ? "Transcribing audio..." :
               progress < 60 ? "Identifying speakers..." :
               progress < 85 ? "Extracting deal intelligence..." :
               "Finalizing insights..."}
            </p>
          </div>
        ) : (
          <button
            className={styles.analyzeBtn}
            disabled={!file || stage === "analyzing"}
            onClick={handleAnalyze}
          >
            {stage === "done" ? "🔁 Analyze Again" : "⚡ Analyze Call"}
          </button>
        )}

        {/* Schema preview */}
        <div className={styles.schemaBox}>
          <p className={styles.schemaTitle}>Extracted fields</p>
          <div className={styles.schemaFields}>
            {["deal_value", "timeline", "client_name", "decision_maker", "competitors", "pain_points", "objections", "next_steps", "risks", "key_insights", "sentiment", "deal_score"].map(f => (
              <span key={f} className={styles.schemaField}>{f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Right pane: results */}
      <div className={styles.rightPane}>
        {stage === "idle" && !result && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🎯</div>
            <h2 className={styles.emptyTitle}>Deal Intelligence Engine</h2>
            <p className={styles.emptyText}>
              Upload a sales call recording and get structured deal data — deal value,
              risks, objections, next steps, and a full diarized transcript.
            </p>
            <div className={styles.emptySteps}>
              <div className={styles.emptyStep}><span>1</span> Upload MP3 or any audio file</div>
              <div className={styles.emptyStep}><span>2</span> Click Analyze Call</div>
              <div className={styles.emptyStep}><span>3</span> Get deal intelligence instantly</div>
            </div>
          </div>
        )}

        {stage === "analyzing" && (
          <div className={styles.analyzingState}>
            <div className={styles.spinner} />
            <p className={styles.analyzingText}>Analyzing call recording...</p>
            <p className={styles.analyzingSubtext}>This may take 30–60 seconds depending on file size</p>
          </div>
        )}

        {stage === "done" && result && (
          <div className={styles.results}>
            {/* Header */}
            <div className={styles.resultsHeader}>
              <div>
                <h2 className={styles.resultsTitle}>📞 Call Analysis</h2>
                <p className={styles.resultsFile}>{file?.name}</p>
                <button 
                  style={{marginTop: "12px", padding: "8px 16px", background: "rgba(59, 130, 246, 0.2)", color: "#60a5fa", border: "1px solid rgba(96, 165, 250, 0.5)", borderRadius: "8px", cursor: "pointer", fontSize: "0.9rem", fontWeight: "500", display: "flex", alignItems: "center", gap: "8px", transition: "all 0.2s ease"}}
                  onClick={() => onChatWithTranscript(transcript.map(t => `${t.speaker}: ${t.text}`).join("\n"))}
                  onMouseOver={(e) => { e.currentTarget.style.background = "rgba(59, 130, 246, 0.3)"; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = "rgba(59, 130, 246, 0.2)"; }}
                >
                  <span style={{fontSize: "1.2rem"}}>💬</span> Discuss this Call with AI Assistant
                </button>
              </div>
              <div className={styles.scoreWrap}>
                <div
                  className={styles.scoreCircle}
                  style={{ borderColor: SCORE_COLOR(intel?.deal_score || 0), color: SCORE_COLOR(intel?.deal_score || 0) }}
                >
                  {intel?.deal_score ?? "—"}
                </div>
                <p className={styles.scoreLabel}>Deal Score</p>
              </div>
            </div>

            {/* Summary */}
            {intel?.summary && (
              <div className={styles.summaryCard}>
                <div className={styles.summaryIcon}>💬</div>
                <p>{intel.summary}</p>
              </div>
            )}

            {/* Key metrics row */}
            <div className={styles.metricsRow}>
              <MetricCard icon="💰" label="Deal Value" value={intel?.deal_value || "Not mentioned"} />
              <MetricCard icon="📅" label="Timeline" value={intel?.timeline || "Not mentioned"} />
              <MetricCard icon="🏢" label="Client" value={intel?.client_name || "Not identified"} />
              <MetricCard icon="👤" label="Decision Maker" value={intel?.decision_maker || "Not identified"} />
              {intel?.sentiment && (
                <MetricCard
                  icon="❤️"
                  label="Sentiment"
                  value={intel.sentiment}
                  valueColor={SENTIMENT_COLOR[intel.sentiment]}
                />
              )}
            </div>

            <div className={styles.grid}>
              {/* Risks */}
              {intel?.risks?.length > 0 && (
                <Section label="⚠️ Risks" color="#f87171">
                  {intel.risks.map((r, i) => (
                    <ListItem key={i} icon="🔴" text={r} />
                  ))}
                </Section>
              )}

              {/* Objections */}
              {intel?.objections?.length > 0 && (
                <Section label="🛑 Objections" color="#fbbf24">
                  {intel.objections.map((o, i) => (
                    <ListItem key={i} icon="⚠" text={o} />
                  ))}
                </Section>
              )}

              {/* Pain points */}
              {intel?.pain_points?.length > 0 && (
                <Section label="😟 Pain Points" color="#a78bfa">
                  {intel.pain_points.map((p, i) => (
                    <ListItem key={i} icon="•" text={p} />
                  ))}
                </Section>
              )}

              {/* Competitors */}
              {intel?.competitors?.length > 0 && (
                <Section label="⚔️ Competitors" color="#f87171">
                  {intel.competitors.map((c, i) => (
                    <ListItem key={i} icon="🆚" text={c} />
                  ))}
                </Section>
              )}

              {/* Next steps */}
              {intel?.next_steps?.length > 0 && (
                <Section label="✅ Next Steps" color="#34d399">
                  {intel.next_steps.map((n, i) => (
                    <ListItem key={i} icon="→" text={n} iconColor="#34d399" />
                  ))}
                </Section>
              )}

              {/* Key insights */}
              {intel?.key_insights?.length > 0 && (
                <Section label="💡 Key Insights" color="#4f8eff">
                  {intel.key_insights.map((k, i) => (
                    <ListItem key={i} icon="💡" text={k} />
                  ))}
                </Section>
              )}
            </div>

            {/* ═══════════════ AI SALES COACH ═══════════════ */}
            {coaching && (
              <div style={{marginTop: '28px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(30,27,75,0.5), rgba(30,41,59,0.5))', border: '1px solid rgba(139, 92, 246, 0.35)', overflow: 'hidden'}}>
                {/* Coach Header */}
                <div style={{padding: '20px 24px', background: 'rgba(139, 92, 246, 0.08)', borderBottom: '1px solid rgba(139, 92, 246, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div>
                    <h3 style={{color: '#c4b5fd', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.35rem', fontWeight: '700', margin: 0}}>
                      <span style={{fontSize: '1.5rem'}}>🧠</span> AI Sales Coach
                    </h3>
                    <p style={{color: '#94a3b8', fontSize: '0.85rem', margin: '4px 0 0 0'}}>Behavioral intelligence powered by transcript analysis</p>
                  </div>
                  <div style={{textAlign: 'center'}}>
                    <div style={{width: '56px', height: '56px', borderRadius: '50%', border: `3px solid ${(coaching.engagement_score || 0) >= 7 ? '#34d399' : (coaching.engagement_score || 0) >= 4 ? '#fbbf24' : '#f87171'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', fontWeight: 'bold', color: (coaching.engagement_score || 0) >= 7 ? '#34d399' : (coaching.engagement_score || 0) >= 4 ? '#fbbf24' : '#f87171'}}>
                      {coaching.engagement_score || '—'}
                    </div>
                    <p style={{color: '#94a3b8', fontSize: '0.7rem', margin: '4px 0 0 0'}}>Engagement<br/>/10</p>
                  </div>
                </div>

                <div style={{padding: '24px'}}>
                  {/* Overall Verdict */}
                  {coaching.overall_verdict && (
                    <div style={{padding: '16px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '10px', borderLeft: '4px solid #8b5cf6', marginBottom: '24px'}}>
                      <p style={{color: '#e2e8f0', margin: 0, fontSize: '0.95rem', lineHeight: '1.6'}}>{coaching.overall_verdict}</p>
                    </div>
                  )}

                  {/* ── SECTION 1: COMMUNICATION METRICS ── */}
                  <div style={{marginBottom: '28px'}}>
                    <h4 style={{color: '#c4b5fd', marginBottom: '14px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px'}}><span>📊</span> Communication Metrics</h4>
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '12px'}}>
                      <MetricCard icon="🗣️" label="Rep Talk Time" value={`${coaching.metrics?.talk_ratio_rep || '—'}%`} valueColor={coaching.metrics?.talk_ratio_rep > 65 ? '#f87171' : '#34d399'} />
                      <MetricCard icon="👂" label="Client Talk Time" value={`${coaching.metrics?.talk_ratio_client || '—'}%`} valueColor="#38bdf8" />
                      <MetricCard icon="✋" label="Interruptions" value={coaching.metrics?.interruptions ?? '—'} valueColor={coaching.metrics?.interruptions > 2 ? '#f87171' : '#34d399'} />
                      <MetricCard icon="👂" label="Listening Score" value={`${coaching.metrics?.listening_score || '—'}/10`} valueColor={(coaching.metrics?.listening_score || 0) >= 7 ? '#34d399' : '#fbbf24'} />
                    </div>
                    {coaching.metrics?.talk_ratio_verdict && (
                      <div style={{padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', color: '#cbd5e1', fontSize: '0.88rem', lineHeight: '1.5'}}>
                        {coaching.metrics.talk_ratio_verdict}
                      </div>
                    )}
                    {coaching.metrics?.interruption_details && (
                      <div style={{padding: '10px 14px', marginTop: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', color: '#cbd5e1', fontSize: '0.88rem', lineHeight: '1.5'}}>
                        <strong style={{color: '#f87171'}}>Interruptions:</strong> {coaching.metrics.interruption_details}
                      </div>
                    )}
                    {coaching.engagement_breakdown && (
                      <div style={{padding: '10px 14px', marginTop: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', color: '#cbd5e1', fontSize: '0.88rem', lineHeight: '1.5'}}>
                        <strong style={{color: '#8b5cf6'}}>Engagement Breakdown:</strong> {coaching.engagement_breakdown}
                      </div>
                    )}
                  </div>

                  {/* ── SECTION 2: QUESTION INTELLIGENCE ── */}
                  {coaching.questions && (
                    <div style={{marginBottom: '28px'}}>
                      <h4 style={{color: '#c4b5fd', marginBottom: '14px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <span>❓</span> Question Intelligence
                        {coaching.questions.total > 0 && (
                          <span style={{marginLeft: 'auto', background: coaching.questions.open_ratio >= 40 ? 'rgba(52, 211, 153, 0.15)' : coaching.questions.open_ratio >= 20 ? 'rgba(251, 191, 36, 0.15)' : 'rgba(248, 113, 113, 0.15)', color: coaching.questions.open_ratio >= 40 ? '#34d399' : coaching.questions.open_ratio >= 20 ? '#fbbf24' : '#f87171', padding: '3px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold'}}>
                            {coaching.questions.open_ratio}% Open-Ended
                          </span>
                        )}
                      </h4>
                      <div style={{display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '12px'}}>
                        <MetricCard icon="📊" label="Total Questions" value={coaching.questions.total || 0} valueColor="#e2e8f0" />
                        <MetricCard icon="💬" label="Open-Ended" value={coaching.questions.open_ended?.length || 0} valueColor={(coaching.questions.open_ended?.length || 0) >= 3 ? '#34d399' : '#f87171'} />
                        <MetricCard icon="📝" label="Closed-Ended" value={coaching.questions.closed_ended?.length || 0} valueColor="#fbbf24" />
                      </div>
                      {/* Auto-generated classification verdict */}
                      <div style={{padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', color: '#cbd5e1', fontSize: '0.88rem', lineHeight: '1.5', marginBottom: '12px'}}>
                        {(coaching.questions.open_ended?.length || 0) === 0
                          ? <><strong style={{color: '#f87171'}}>⚠ You asked 0 true open-ended questions.</strong> This severely limits your ability to discover client needs and pain points. Open-ended questions like "What challenges are you facing?" or "How does your current process work?" invite the client to share critical information that drives deals forward.</>
                          : (coaching.questions.open_ratio || 0) < 30
                            ? <><strong style={{color: '#fbbf24'}}>⚠ Only {coaching.questions.open_ratio}% of your questions were open-ended.</strong> You asked {coaching.questions.open_ended?.length} open-ended vs {coaching.questions.closed_ended?.length} closed-ended questions. For effective discovery, aim for at least 40-50% open-ended questions to uncover deeper insights.</>
                            : <><strong style={{color: '#34d399'}}>✓ Good question balance — {coaching.questions.open_ratio}% open-ended.</strong> You asked {coaching.questions.open_ended?.length} discovery questions that encourage the client to share more. Keep mixing strategic open-ended questions with targeted closed-ended ones.</>
                        }
                      </div>
                      {coaching.questions.question_verdict && (
                        <div style={{padding: '10px 14px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '12px', fontStyle: 'italic'}}>
                          💡 {coaching.questions.question_verdict}
                        </div>
                      )}
                      {/* Expandable Open Questions */}
                      <button
                        onClick={() => setShowOpenQuestions(v => !v)}
                        style={{width: '100%', padding: '10px 14px', background: 'rgba(52, 211, 153, 0.08)', border: '1px solid rgba(52, 211, 153, 0.3)', borderRadius: '8px', color: '#34d399', cursor: 'pointer', textAlign: 'left', fontSize: '0.88rem', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}
                      >
                        <span>💬 View Open-Ended Questions ({coaching.questions.open_ended?.length || 0})</span>
                        <span>{showOpenQuestions ? '▼' : '▶'}</span>
                      </button>
                      {showOpenQuestions && coaching.questions.open_ended?.length > 0 && (
                        <div style={{padding: '12px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', marginBottom: '8px'}}>
                          {coaching.questions.open_ended.map((q, i) => (
                            <div key={i} style={{padding: '8px 12px', marginBottom: '6px', background: 'rgba(52, 211, 153, 0.06)', borderLeft: '3px solid #34d399', borderRadius: '4px', color: '#e2e8f0', fontSize: '0.88rem'}}>"<em>{q}</em>"</div>
                          ))}
                        </div>
                      )}
                      {showOpenQuestions && (coaching.questions.open_ended?.length || 0) === 0 && (
                        <div style={{padding: '12px', background: 'rgba(248, 113, 113, 0.06)', borderRadius: '8px', marginBottom: '8px', color: '#f87171', fontSize: '0.88rem', textAlign: 'center'}}>
                          No open-ended questions detected. Try asking "Why…", "How…", "Tell me about…", "What challenges…"
                        </div>
                      )}
                      {/* Expandable Closed Questions */}
                      <button
                        onClick={() => setShowClosedQuestions(v => !v)}
                        style={{width: '100%', padding: '10px 14px', background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: '8px', color: '#fbbf24', cursor: 'pointer', textAlign: 'left', fontSize: '0.88rem', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}
                      >
                        <span>📝 View Closed-Ended Questions ({coaching.questions.closed_ended?.length || 0})</span>
                        <span>{showClosedQuestions ? '▼' : '▶'}</span>
                      </button>
                      {showClosedQuestions && coaching.questions.closed_ended?.length > 0 && (
                        <div style={{padding: '12px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', marginTop: '8px'}}>
                          {coaching.questions.closed_ended.map((q, i) => (
                            <div key={i} style={{padding: '8px 12px', marginBottom: '6px', background: 'rgba(251, 191, 36, 0.06)', borderLeft: '3px solid #fbbf24', borderRadius: '4px', color: '#e2e8f0', fontSize: '0.88rem'}}>"<em>{q}</em>"</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── SECTION 3: BANT COMPLIANCE ── */}
                  {coaching.bant_compliance && (
                    <div style={{marginBottom: '28px'}}>
                      <h4 style={{color: '#c4b5fd', marginBottom: '14px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <span>🎯</span> BANT Framework Compliance
                        <span style={{marginLeft: 'auto', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '3px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold'}}>{coaching.bant_compliance.coverage_percent ?? '—'}%</span>
                      </h4>
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px'}}>
                        {['budget', 'authority', 'need', 'timeline'].map(b => {
                          const item = coaching.bant_compliance[b];
                          const covered = typeof item === 'object' ? item?.covered : item;
                          const detail = typeof item === 'object' ? item?.detail : null;
                          return (
                            <div key={b} style={{padding: '12px', background: covered ? 'rgba(52, 211, 153, 0.08)' : 'rgba(248, 113, 113, 0.08)', border: `1px solid ${covered ? 'rgba(52, 211, 153, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`, borderRadius: '8px'}}>
                              <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px'}}>
                                <span style={{fontSize: '1.1rem'}}>{covered ? '✅' : '❌'}</span>
                                <span style={{color: covered ? '#34d399' : '#f87171', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.85rem'}}>{b}</span>
                              </div>
                              {detail && <p style={{color: '#94a3b8', fontSize: '0.82rem', margin: 0, lineHeight: '1.4'}}>{detail}</p>}
                            </div>
                          );
                        })}
                      </div>
                      {coaching.bant_compliance.verdict && (
                        <div style={{padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', color: '#cbd5e1', fontSize: '0.88rem', lineHeight: '1.5'}}>
                          {coaching.bant_compliance.verdict}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── SECTION 4: MISTAKES FROM TRANSCRIPT ── */}
                  {coaching.mistakes?.length > 0 && (
                    <div style={{marginBottom: '28px'}}>
                      <h4 style={{color: '#f87171', marginBottom: '14px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px'}}><span>💣</span> Mistakes Found ({coaching.mistakes.length})</h4>
                      {coaching.mistakes.map((m, i) => (
                        <div key={i} style={{marginBottom: '10px', borderRadius: '10px', border: '1px solid rgba(248, 113, 113, 0.25)', overflow: 'hidden'}}>
                          <button
                            onClick={() => setExpandedMistake(expandedMistake === i ? null : i)}
                            style={{width: '100%', padding: '12px 16px', background: 'rgba(248, 113, 113, 0.06)', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}
                          >
                            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                              <span style={{color: '#f87171', fontWeight: 'bold', fontSize: '0.85rem'}}>⏱ {m.timestamp || 'During call'}</span>
                              <span style={{color: '#e2e8f0', fontSize: '0.88rem'}}>{m.what_happened?.substring(0, 80)}{m.what_happened?.length > 80 ? '...' : ''}</span>
                            </div>
                            <span style={{color: '#94a3b8'}}>{expandedMistake === i ? '▼' : '▶'}</span>
                          </button>
                          {expandedMistake === i && (
                            <div style={{padding: '16px', background: 'rgba(0,0,0,0.2)'}}>
                              <div style={{marginBottom: '12px'}}>
                                <p style={{color: '#f87171', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px'}}>❌ WHAT HAPPENED</p>
                                <p style={{color: '#e2e8f0', fontSize: '0.88rem', margin: 0, lineHeight: '1.5'}}>{m.what_happened}</p>
                              </div>
                              <div style={{marginBottom: '12px'}}>
                                <p style={{color: '#fbbf24', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px'}}>⚠️ WHY IT'S WRONG</p>
                                <p style={{color: '#cbd5e1', fontSize: '0.88rem', margin: 0, lineHeight: '1.5'}}>{m.why_its_wrong}</p>
                              </div>
                              <div style={{padding: '12px', background: 'rgba(52, 211, 153, 0.08)', borderLeft: '3px solid #34d399', borderRadius: '4px'}}>
                                <p style={{color: '#34d399', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px'}}>✅ DO THIS INSTEAD</p>
                                <p style={{color: '#e2e8f0', fontSize: '0.88rem', margin: 0, lineHeight: '1.5'}}>{m.what_to_do_instead}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── SECTION 5: OBJECTION HANDLING ── */}
                  {coaching.objection_handling?.length > 0 && (
                    <div style={{marginBottom: '28px'}}>
                      <h4 style={{color: '#fbbf24', marginBottom: '14px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px'}}><span>🛡️</span> Objection Handling Review</h4>
                      {coaching.objection_handling.map((obj, i) => (
                        <div key={i} style={{marginBottom: '12px', padding: '14px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', border: `1px solid ${obj.handled_well ? 'rgba(52, 211, 153, 0.25)' : 'rgba(248, 113, 113, 0.25)'}`}}>
                          <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
                            <span style={{fontSize: '1.1rem'}}>{obj.handled_well ? '✅' : '❌'}</span>
                            <span style={{color: '#e2e8f0', fontWeight: 'bold', fontSize: '0.9rem'}}>Client: "{obj.objection}"</span>
                          </div>
                          {obj.rep_response && (
                            <div style={{padding: '8px 12px', background: 'rgba(79, 142, 255, 0.06)', borderLeft: '3px solid #4f8eff', borderRadius: '4px', marginBottom: '8px'}}>
                              <span style={{color: '#94a3b8', fontSize: '0.78rem'}}>Rep said:</span>
                              <p style={{color: '#cbd5e1', fontSize: '0.85rem', margin: '2px 0 0 0'}}>"<em>{obj.rep_response}</em>"</p>
                            </div>
                          )}
                          <p style={{color: '#cbd5e1', fontSize: '0.88rem', margin: '4px 0', lineHeight: '1.5'}}>{obj.feedback}</p>
                          {!obj.handled_well && obj.better_response && (
                            <div style={{padding: '10px 12px', background: 'rgba(52, 211, 153, 0.08)', borderLeft: '3px solid #34d399', borderRadius: '4px', marginTop: '8px'}}>
                              <p style={{color: '#34d399', fontSize: '0.78rem', fontWeight: 'bold', margin: '0 0 4px 0'}}>💡 BETTER RESPONSE</p>
                              <p style={{color: '#e2e8f0', fontSize: '0.88rem', margin: 0, lineHeight: '1.5', fontStyle: 'italic'}}>"{obj.better_response}"</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── SECTION 6: NEXT-BEST ACTIONS (DETAILED) ── */}
                  {coaching.next_best_actions?.length > 0 && (
                    <div style={{marginBottom: '8px'}}>
                      <h4 style={{color: '#34d399', marginBottom: '14px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px'}}><span>🔥</span> Next-Best Actions — Your Playbook</h4>
                      {coaching.next_best_actions.map((act, i) => (
                        <div key={i} style={{marginBottom: '10px', borderRadius: '10px', border: '1px solid rgba(52, 211, 153, 0.25)', overflow: 'hidden'}}>
                          <button
                            onClick={() => setExpandedAction(expandedAction === i ? null : i)}
                            style={{width: '100%', padding: '12px 16px', background: 'rgba(52, 211, 153, 0.06)', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}
                          >
                            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                              <span style={{color: '#34d399', fontSize: '1.1rem'}}>👉</span>
                              <span style={{color: '#e2e8f0', fontWeight: '600', fontSize: '0.9rem'}}>{act.action}</span>
                            </div>
                            <span style={{color: '#94a3b8'}}>{expandedAction === i ? '▼' : '▶'}</span>
                          </button>
                          {expandedAction === i && (
                            <div style={{padding: '16px', background: 'rgba(0,0,0,0.2)'}}>
                              <div style={{marginBottom: '12px'}}>
                                <p style={{color: '#38bdf8', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px'}}>📌 WHY THIS MATTERS</p>
                                <p style={{color: '#cbd5e1', fontSize: '0.88rem', margin: 0, lineHeight: '1.5'}}>{act.why}</p>
                              </div>
                              <div style={{marginBottom: '12px'}}>
                                <p style={{color: '#c4b5fd', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px'}}>📋 HOW TO DO IT</p>
                                <p style={{color: '#e2e8f0', fontSize: '0.88rem', margin: 0, lineHeight: '1.5', whiteSpace: 'pre-wrap'}}>{act.how}</p>
                              </div>
                              {act.script && (
                                <div style={{padding: '12px', background: 'rgba(52, 211, 153, 0.06)', borderLeft: '3px solid #34d399', borderRadius: '4px'}}>
                                  <p style={{color: '#34d399', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px'}}>📜 COPY-PASTE SCRIPT</p>
                                  <p style={{color: '#e2e8f0', fontSize: '0.88rem', margin: 0, lineHeight: '1.6', fontStyle: 'italic', whiteSpace: 'pre-wrap'}}>{act.script}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Transcript toggle */}
            <div className={styles.transcriptSection}>
              <button
                className={styles.transcriptToggle}
                onClick={() => setShowTranscript(v => !v)}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <span>{showTranscript ? "▼" : "▶"}</span>
                  <span style={{fontWeight: '600'}}>Full Transcript ({transcript.length} lines)</span>
                  {intel?.transcript_confidence_score !== undefined && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '10px', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Transcription Confidence:</span>
                      <span style={{ color: intel.transcript_confidence_score >= 85 ? "#34d399" : intel.transcript_confidence_score >= 60 ? "#fbbf24" : "#f87171", fontWeight: '800', fontSize: '0.9rem' }}>
                        {intel.transcript_confidence_score}%
                      </span>
                    </div>
                  )}
                </div>
                <div className={styles.speakerPills}>
                  <span className={styles.speakerPill} style={{ background: "rgba(79,142,255,0.15)", color: "#4f8eff" }}>
                    Speaker 1: {transcript.filter(l => l.speaker === "Speaker 1").length} lines
                  </span>
                  <span className={styles.speakerPill} style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>
                    Speaker 2: {transcript.filter(l => l.speaker === "Speaker 2").length} lines
                  </span>
                </div>
              </button>

              {showTranscript && (
                <div className={styles.transcriptPanel}>
                  <div className={styles.transcriptFilters}>
                    {["all", "speaker1", "speaker2"].map(f => (
                      <button
                        key={f}
                        className={`${styles.filterBtn} ${transcriptFilter === f ? styles.filterActive : ""}`}
                        onClick={() => setTranscriptFilter(f)}
                      >
                        {f === "all" ? "All" : f === "speaker1" ? "Speaker 1 (Rep)" : "Speaker 2 (Client)"}
                      </button>
                    ))}
                  </div>
                  <div className={styles.transcriptLines}>
                    {filteredTranscript.map((line, i) => (
                      <div
                        key={i}
                        className={`${styles.transcriptLine} ${line.speaker === "Speaker 1" ? styles.speaker1 : styles.speaker2}`}
                      >
                        <div className={styles.transcriptMeta}>
                          <span className={styles.transcriptSpeaker}>{line.speaker}</span>
                          {line.time && <span className={styles.transcriptTime}>{line.time}</span>}
                        </div>
                        <p className={styles.transcriptText}>{line.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {stage === "error" && (
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>⚠️</div>
            <h2>Analysis Failed</h2>
            <p>{error}</p>
            <button className={styles.retryBtn} onClick={handleAnalyze}>Retry</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ label, color, children }) {
  return (
    <div className={styles.section}>
      <p className={styles.sectionLabel} style={{ color }}>{label}</p>
      <div className={styles.sectionContent}>{children}</div>
    </div>
  );
}

function MetricCard({ icon, label, value, valueColor }) {
  return (
    <div className={styles.metricCard}>
      <span className={styles.metricIcon}>{icon}</span>
      <div>
        <p className={styles.metricLabel}>{label}</p>
        <p className={styles.metricValue} style={valueColor ? { color: valueColor } : {}}>{value}</p>
      </div>
    </div>
  );
}

function ListItem({ icon, text, iconColor }) {
  return (
    <div className={styles.listItem}>
      <span className={styles.listIcon} style={iconColor ? { color: iconColor } : {}}>{icon}</span>
      <span>{text}</span>
    </div>
  );
}
