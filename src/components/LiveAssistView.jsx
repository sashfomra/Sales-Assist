import { useEffect, useMemo, useRef, useState } from "react";
import { generateLiveAssistInsights, transcribeAudioBlob } from "../services/gemini";
import styles from "./LiveAssistView.module.css";

const CAPTURE_SLICE_MS = 3500;
const ROLLING_WINDOW_SECONDS = 30;
const MIN_ANALYSIS_INTERVAL_MS = 2500;
const ANALYSIS_TICK_MS = 3000;
const MIN_TRANSCRIBE_BLOB_BYTES = 3000;
const MIN_ANALYSIS_WORDS = 5;

function clipSegments(segments, maxAgeMs = 8 * 60 * 1000) {
  const minTs = Date.now() - maxAgeMs;
  return segments.filter(s => s.ts >= minTs);
}

function rollingTranscript(segments, seconds) {
  const minTs = Date.now() - seconds * 1000;
  return segments
    .filter(s => s.ts >= minTs)
    .map(s => s.text)
    .join(" ")
    .trim();
}

function transcriptTail(segments, maxItems = 12) {
  return segments.slice(-maxItems).map(s => s.text).join(" ").trim();
}

function countWords(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function estimateRunningStats(segments) {
  const allText = segments.map(s => s.text).join(" ").toLowerCase();
  const words = countWords(allText);

  const repSignals = (allText.match(/\b(our|we|platform|pricing|plan|roi|solution|contract|implementation)\b/g) || []).length;
  const customerSignals = (allText.match(/\b(price|cost|budget|competitor|concern|not sure|hesitant|need approval|risk)\b/g) || []).length;

  const totalSignals = repSignals + customerSignals;
  const repRatio = totalSignals > 0 ? Math.round((repSignals / totalSignals) * 100) : 50;
  const customerRatio = 100 - repRatio;

  const interruptions = (allText.match(/\b(wait|sorry|hold on|let me finish|one second)\b/g) || []).length;
  const durationMin = Math.max(1, (Date.now() - (segments[0]?.ts || Date.now())) / 60000);
  const wpm = Math.round(words / durationMin);

  return {
    totalWords: words,
    wordsPerMinute: wpm,
    estimatedTalkRatioRep: repRatio,
    estimatedTalkRatioCustomer: customerRatio,
    interruptionMarkers: interruptions,
    segmentCount: segments.length
  };
}

const DEFAULT_INSIGHTS = {
  headline: "Waiting for enough live context…",
  intentSignals: [],
  riskSignals: [],
  conversationAnalysis: {
    talkRatioRep: null,
    talkRatioCustomer: null,
    interruptions: null,
    pace: null
  },
  suggestedResponses: [],
  strategicTips: [],
  alerts: [],
  transcriptWindow: "",
  nextBestAction: "Start the call and share the browser tab audio to activate live coaching."
};

/**
 * Smart merge: only overwrite array fields if the new data is non-empty.
 * This prevents an LLM response with missing/empty fields from wiping out
 * previous good insights.
 */
function mergeInsights(prev, incoming) {
  const arrayKeys = ["intentSignals", "riskSignals", "suggestedResponses", "strategicTips", "alerts"];
  const merged = { ...prev };

  for (const [key, value] of Object.entries(incoming)) {
    if (key === "conversationAnalysis") {
      // Merge conversation analysis field-by-field, keep previous if new is null
      const prevConv = prev.conversationAnalysis || {};
      const newConv = value || {};
      merged.conversationAnalysis = {
        talkRatioRep: newConv.talkRatioRep ?? prevConv.talkRatioRep,
        talkRatioCustomer: newConv.talkRatioCustomer ?? prevConv.talkRatioCustomer,
        interruptions: newConv.interruptions ?? prevConv.interruptions,
        pace: newConv.pace ?? prevConv.pace
      };
    } else if (arrayKeys.includes(key)) {
      // Only overwrite arrays if new data has content
      if (Array.isArray(value) && value.length > 0) {
        merged[key] = value;
      }
      // else: keep prev[key]
    } else {
      // Scalar fields: overwrite if truthy
      if (value !== undefined && value !== null && value !== "") {
        merged[key] = value;
      }
    }
  }

  return merged;
}

export default function LiveAssistView({ apiKey, deals }) {
  const [selectedDealId, setSelectedDealId] = useState(() => deals[0]?.id || "");
  const [isCapturing, setIsCapturing] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [error, setError] = useState("");
  const [segments, setSegments] = useState([]);
  const [insights, setInsights] = useState(DEFAULT_INSIGHTS);
  const [analysisAt, setAnalysisAt] = useState(null);

  const streamRef = useRef(null);
  const recorderStreamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunkQueueRef = useRef([]);
  const carryChunkRef = useRef(null);
  const carrySinceRef = useRef(0);
  const containerSeedRef = useRef(null);
  const processingRef = useRef(false);
  const analyzeTimerRef = useRef(null);
  const analysisIntervalRef = useRef(null);
  const lastAnalysisRef = useRef(0);
  const lastAnalyzedContextRef = useRef("");
  const isCapturingRef = useRef(false);
  const isAnalyzingRef = useRef(false);
  const segmentsRef = useRef([]);
  const runningStatsRef = useRef(estimateRunningStats([]));
  const selectedDealRef = useRef(null);

  const selectedDeal = useMemo(
    () => deals.find(d => d.id === selectedDealId) || null,
    [deals, selectedDealId]
  );

  const recentContext = useMemo(
    () => rollingTranscript(segments, ROLLING_WINDOW_SECONDS),
    [segments]
  );

  const runningStats = useMemo(() => estimateRunningStats(segments), [segments]);

  useEffect(() => {
    runningStatsRef.current = runningStats;
  }, [runningStats]);

  useEffect(() => {
    selectedDealRef.current = selectedDeal;
  }, [selectedDeal]);

  function cleanupCapture() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }

    if (recorderStreamRef.current) {
      recorderStreamRef.current.getTracks().forEach(track => track.stop());
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    recorderRef.current = null;
    recorderStreamRef.current = null;
    streamRef.current = null;
    chunkQueueRef.current = [];
    carryChunkRef.current = null;
    carrySinceRef.current = 0;
    containerSeedRef.current = null;
  }

  function mergeBlobs(left, right) {
    if (!left) return right;
    return new Blob([left, right], { type: right?.type || left.type || "audio/webm" });
  }

  function createRecorderWithFallback(targetStream) {
    const options = [
      { mimeType: "audio/webm;codecs=opus" },
      { mimeType: "audio/webm" },
      undefined
    ];

    for (const opt of options) {
      try {
        if (!opt || !opt.mimeType || MediaRecorder.isTypeSupported(opt.mimeType)) {
          return opt ? new MediaRecorder(targetStream, opt) : new MediaRecorder(targetStream);
        }
      } catch {
        // Try the next fallback option.
      }
    }

    throw new Error("This browser cannot start MediaRecorder for captured tab audio.");
  }

  function stopCapture() {
    isCapturingRef.current = false;
    cleanupCapture();
    setIsCapturing(false);
    setStatus("Capture stopped");
  }

  async function runAnalysis() {
    if (!apiKey) {
      console.log("[LiveAssist] runAnalysis skipped: no apiKey");
      return;
    }
    if (!segmentsRef.current.length) {
      console.log("[LiveAssist] runAnalysis skipped: no segments");
      return;
    }
    if (isAnalyzingRef.current) {
      console.log("[LiveAssist] runAnalysis skipped: already analyzing");
      return;
    }

    const now = Date.now();
    if (now - lastAnalysisRef.current < MIN_ANALYSIS_INTERVAL_MS) return;
    lastAnalysisRef.current = now;

    const liveSegments = segmentsRef.current;
    const rolling = rollingTranscript(liveSegments, ROLLING_WINDOW_SECONDS);
    if (countWords(rolling) < MIN_ANALYSIS_WORDS) {
      console.log("[LiveAssist] runAnalysis skipped: not enough words", countWords(rolling));
      return;
    }
    if (rolling === lastAnalyzedContextRef.current) {
      console.log("[LiveAssist] runAnalysis skipped: same rolling context");
      return;
    }
    lastAnalyzedContextRef.current = rolling;

    isAnalyzingRef.current = true;
    setStatus("Analyzing context…");
    console.log("[LiveAssist] runAnalysis STARTING, rolling:", rolling.slice(0, 80));
    try {
      const data = await generateLiveAssistInsights(apiKey, {
        recentTranscript: rolling,
        fullTranscriptTail: transcriptTail(liveSegments),
        dealContext: selectedDealRef.current,
        runningStats: runningStatsRef.current
      });
      console.log("[LiveAssist] runAnalysis GOT DATA:", data);
      setInsights(prev => {
        const merged = mergeInsights(prev, data);
        console.log("[LiveAssist] MERGED insights:", {
          headline: merged.headline,
          suggestedResponses: merged.suggestedResponses?.length,
          strategicTips: merged.strategicTips?.length,
          alerts: merged.alerts?.length,
          intentSignals: merged.intentSignals?.length,
          riskSignals: merged.riskSignals?.length,
          convAnalysis: merged.conversationAnalysis
        });
        return merged;
      });
      setAnalysisAt(new Date());
      setStatus("Live coaching updated");
    } catch (err) {
      console.error("[LiveAssist] runAnalysis ERROR:", err);
      setStatus("Live transcript active (analysis degraded)");
      setError(err.message || "Live analysis failed");
    } finally {
      isAnalyzingRef.current = false;
    }
  }

  function scheduleAnalysis() {
    if (analyzeTimerRef.current) return;
    analyzeTimerRef.current = setTimeout(async () => {
      analyzeTimerRef.current = null;
      await runAnalysisRef.current();
    }, 1200);
  }

  async function drainQueue() {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      while (chunkQueueRef.current.length > 0) {
        const chunk = chunkQueueRef.current.shift();
        if (!chunk || !isCapturingRef.current) continue;

        const merged = mergeBlobs(carryChunkRef.current, chunk);
        const shouldForceFlush = carrySinceRef.current > 0 && (Date.now() - carrySinceRef.current > 12000);
        if (!merged || (merged.size < MIN_TRANSCRIBE_BLOB_BYTES && !shouldForceFlush)) {
          carryChunkRef.current = merged;
          if (!carrySinceRef.current) carrySinceRef.current = Date.now();
          continue;
        }

        // MediaRecorder timeslices can emit partial container fragments after the first chunk.
        // Keep a valid seed chunk and prepend it so each upload is a decodable media file.
        const transcribeBlob = containerSeedRef.current
          ? mergeBlobs(containerSeedRef.current, merged)
          : merged;

        try {
          const result = await transcribeAudioBlob(apiKey, transcribeBlob);
          if (!result.text) continue;

          if (!containerSeedRef.current) {
            containerSeedRef.current = merged;
          }

          carryChunkRef.current = null;
          carrySinceRef.current = 0;

          const segment = {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            ts: Date.now(),
            text: result.text
          };

          setSegments(prev => clipSegments([
            ...prev,
            segment
          ]));

          // Keep refs hot so live analysis uses latest transcript immediately.
          segmentsRef.current = clipSegments([
            ...segmentsRef.current,
            segment
          ]);
          runningStatsRef.current = estimateRunningStats(segmentsRef.current);

          setStatus("Listening and transcribing…");
          setError("");
          scheduleAnalysis();
        } catch (err) {
          const msg = err.message || "Transcription failed";
          const invalidMedia = /valid media file|could not process file|invalid/i.test(msg);
          if (invalidMedia) {
            // Accumulate raw chunks and retry; keep seed separate to avoid runaway blob growth.
            carryChunkRef.current = merged;
            if (!carrySinceRef.current) carrySinceRef.current = Date.now();
            setStatus("Listening (buffering audio…)");
            continue;
          }

          setStatus("Listening (transcription retrying)");
          setError(msg);
        }
      }
    } finally {
      processingRef.current = false;
      if (chunkQueueRef.current.length > 0 && isCapturingRef.current) {
        // Avoid a queue race where chunks arrive during processing and never get picked up.
        drainQueue();
      }
    }
  }

  async function startCapture() {
    setError("");

    if (!apiKey) {
      setError("Add your API key first using the settings button in the top bar.");
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError("This browser does not support tab audio capture.");
      return;
    }

    try {
      setStatus("Requesting browser tab audio…");
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      const audioTracks = stream.getAudioTracks();
      if (!audioTracks.length) {
        stream.getTracks().forEach(t => t.stop());
        throw new Error("No tab audio track detected. When sharing, select a browser tab and enable Share tab audio.");
      }

      const audioOnlyStream = new MediaStream(audioTracks);
      const recorder = createRecorderWithFallback(audioOnlyStream);

      recorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) {
          chunkQueueRef.current.push(event.data);
          drainQueue();
        }
      };

      recorder.onerror = event => {
        setError(event.error?.message || "Capture error");
        stopCapture();
      };

      stream.getVideoTracks().forEach(track => {
        track.onended = () => {
          stopCapture();
        };
      });

      stream.getAudioTracks().forEach(track => {
        track.onended = () => {
          stopCapture();
        };
      });

      streamRef.current = stream;
      recorderStreamRef.current = audioOnlyStream;
      recorderRef.current = recorder;

      isCapturingRef.current = true;
      recorder.start(CAPTURE_SLICE_MS);
      setIsCapturing(true);
      setStatus("Listening and transcribing…");
    } catch (err) {
      setError(err.message || "Could not start capture");
      setStatus("Idle");
      isCapturingRef.current = false;
      cleanupCapture();
    }
  }

  // Keep segmentsRef hot whenever segments state changes.
  // This effect intentionally does NOT manage timers so that scheduleAnalysis()
  // timeouts are never cleared mid-flight by a routine transcript update.
  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  // Always call the latest runAnalysis from the interval AND scheduleAnalysis
  // so the closure over apiKey (and anything else that might change) stays current.
  const runAnalysisRef = useRef(runAnalysis);
  useEffect(() => {
    runAnalysisRef.current = runAnalysis;
  });

  // Manage the analysis interval based solely on isCapturing.
  // This effect is NOT re-run on every transcript segment, so it never
  // accidentally wipes out the scheduleAnalysis() timeout.
  useEffect(() => {
    if (!isCapturing) {
      if (analyzeTimerRef.current) {
        clearTimeout(analyzeTimerRef.current);
        analyzeTimerRef.current = null;
      }
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
        analysisIntervalRef.current = null;
      }
      return;
    }

    analysisIntervalRef.current = setInterval(() => {
      runAnalysisRef.current();
    }, ANALYSIS_TICK_MS);

    return () => {
      if (analyzeTimerRef.current) {
        clearTimeout(analyzeTimerRef.current);
        analyzeTimerRef.current = null;
      }
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    };
  }, [isCapturing]);

  useEffect(() => {
    return () => {
      cleanupCapture();
    };
  }, []);

  return (
    <div className={styles.view}>
      <div className={styles.topRow}>
        <div>
          <h1 className={styles.title}>Live AI Sales Co-Pilot</h1>
          <p className={styles.subtitle}>
            Capture browser tab audio from Google Meet or web calls and get real-time guidance.
          </p>
        </div>
        <div className={styles.controls}>
          <select
            className={styles.select}
            value={selectedDealId}
            onChange={e => setSelectedDealId(e.target.value)}
          >
            {deals.map(deal => (
              <option key={deal.id} value={deal.id}>
                {deal.company} · {deal.stage} · ${deal.value.toLocaleString()}
              </option>
            ))}
          </select>

          {!isCapturing ? (
            <button className={styles.startBtn} onClick={startCapture}>Start Live Assist</button>
          ) : (
            <button className={styles.stopBtn} onClick={stopCapture}>Stop</button>
          )}
        </div>
      </div>

      <div className={styles.statusBar}>
        <span className={`${styles.dot} ${isCapturing ? styles.dotLive : ""}`} />
        <span>{status}</span>
        <span className={styles.windowBadge}>Rolling context: {ROLLING_WINDOW_SECONDS}s</span>
        {analysisAt && <span className={styles.time}>Updated {analysisAt.toLocaleTimeString()}</span>}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.grid}>
        <section className={styles.panel}>
          <p className={styles.kicker}>Live guidance</p>
          <h2 className={styles.headline}>{insights.headline}</h2>
          <p className={styles.nextAction}>{insights.nextBestAction}</p>

          <div className={styles.cardGroup}>
            <div className={styles.card}>
              <p className={styles.cardTitle}>Suggested responses</p>
              {insights.suggestedResponses.length ? (
                insights.suggestedResponses.map((item, i) => (
                  <p className={styles.item} key={i}>{item}</p>
                ))
              ) : (
                <p className={styles.empty}>Suggestions will appear as context accumulates.</p>
              )}
            </div>

            <div className={styles.card}>
              <p className={styles.cardTitle}>Strategic tips</p>
              {insights.strategicTips.length ? (
                insights.strategicTips.map((item, i) => (
                  <p className={styles.item} key={i}>{item}</p>
                ))
              ) : (
                <p className={styles.empty}>No tactical tips yet.</p>
              )}
            </div>

            <div className={styles.card}>
              <p className={styles.cardTitle}>Alerts</p>
              {insights.alerts.length ? (
                insights.alerts.map((item, i) => (
                  <p className={`${styles.item} ${styles.alert}`} key={i}>{item}</p>
                ))
              ) : (
                <p className={styles.empty}>No active alerts.</p>
              )}
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <p className={styles.kicker}>Intent and risk</p>
          <div className={styles.signalGrid}>
            <div className={styles.signalCard}>
              <p className={styles.cardTitle}>Intent signals</p>
              {insights.intentSignals.length ? (
                insights.intentSignals.map((signal, i) => (
                  <p className={styles.signal} key={i}>
                    <span>{signal.label}</span>
                    <span>{signal.confidence}%</span>
                  </p>
                ))
              ) : (
                <p className={styles.empty}>No intent signal yet.</p>
              )}
            </div>

            <div className={styles.signalCard}>
              <p className={styles.cardTitle}>Risk signals</p>
              {insights.riskSignals.length ? (
                insights.riskSignals.map((signal, i) => (
                  <p className={styles.signal} key={i}>
                    <span>{signal.label}</span>
                    <span className={styles[`sev_${signal.severity || "low"}`]}>{signal.severity || "low"}</span>
                  </p>
                ))
              ) : (
                <p className={styles.empty}>No risk signal yet.</p>
              )}
            </div>
          </div>

          <div className={styles.metrics}>
            <div className={styles.metricBox}>
              <span className={styles.metricLabel}>Rep talk ratio</span>
              <strong>{insights.conversationAnalysis.talkRatioRep ?? runningStats.estimatedTalkRatioRep}%</strong>
            </div>
            <div className={styles.metricBox}>
              <span className={styles.metricLabel}>Customer talk ratio</span>
              <strong>{insights.conversationAnalysis.talkRatioCustomer ?? runningStats.estimatedTalkRatioCustomer}%</strong>
            </div>
            <div className={styles.metricBox}>
              <span className={styles.metricLabel}>Interruptions</span>
              <strong>{insights.conversationAnalysis.interruptions ?? (runningStats.interruptionMarkers > 4 ? "high" : runningStats.interruptionMarkers > 2 ? "moderate" : "low")}</strong>
            </div>
            <div className={styles.metricBox}>
              <span className={styles.metricLabel}>Pace</span>
              <strong>{insights.conversationAnalysis.pace ?? (runningStats.wordsPerMinute > 170 ? "fast" : runningStats.wordsPerMinute < 100 ? "slow" : "balanced")}</strong>
            </div>
            <div className={styles.metricBox}>
              <span className={styles.metricLabel}>Words/min</span>
              <strong>{runningStats.wordsPerMinute}</strong>
            </div>
            <div className={styles.metricBox}>
              <span className={styles.metricLabel}>Segments</span>
              <strong>{runningStats.segmentCount}</strong>
            </div>
          </div>

          <div className={styles.transcriptWrap}>
            <p className={styles.cardTitle}>LLM transcript context ({ROLLING_WINDOW_SECONDS}s)</p>
            <p className={styles.transcriptNow}>{insights.transcriptWindow || recentContext || "No speech captured yet."}</p>

            <div className={styles.transcriptList}>
              {segments.slice(-8).reverse().map(segment => (
                <div className={styles.segment} key={segment.id}>
                  <span className={styles.segmentTime}>{new Date(segment.ts).toLocaleTimeString()}</span>
                  <span>{segment.text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}