import { useState, useRef, useEffect } from "react";
import ChatMessage from "./ChatMessage";
import { queryGemini, parseChartFromResponse, stripChartBlock } from "../services/gemini";
import { retrieveContext, shouldShowChart } from "../data/crm";
import styles from "./ChatPanel.module.css";

const SUGGESTIONS = [
  "Give me a pipeline overview",
  "Which deals are at risk?",
  "Summarize the Acme Corp deal",
  "Show me a chart of pipeline by stage",
  "What happened in the last calls?",
  "Who's closest to quota?",
  "Show revenue trend as a line chart",
  "What objections came up in calls?",
];

export default function ChatPanel({ apiKey, prefillDeal, prefillTranscript }) {
  const initialMessages = [
    {
      id: "welcome",
      role: "assistant",
      content: "Hey 👋 I'm **SalesIQ**, your AI sales analyst.\n\nAsk me anything about your pipeline, deals, calls, or performance — I'll pull the data and give you real answers. I can also generate charts.\n\nWhat would you like to know?",
      chart: null
    }
  ];
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  function handleNewChat() {
    setMessages(initialMessages);
    setInput("");
    inputRef.current?.focus();
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (prefillDeal) {
      const q = `Summarize the ${prefillDeal.company} deal and give me next steps`;
      setInput(q);
      inputRef.current?.focus();
    }
  }, [prefillDeal]);

  useEffect(() => {
    if (prefillTranscript) {
      const q = "I just analyzed a call recording and have the transcript. What are the key takeaways from it?";
      setInput(q);
      inputRef.current?.focus();
    }
  }, [prefillTranscript]);

  async function send(text) {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    setInput("");
    const userMsg = { id: Date.now(), role: "user", content: userText };
    const loadingMsg = { id: Date.now() + 1, role: "assistant", content: "", isLoading: true };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setLoading(true);

    try {
      if (!apiKey) throw new Error("No API key set. Click ⚙ in the header to add your Gemini API key.");

      const context = retrieveContext(userText);
      if (prefillTranscript) {
        context.push({ type: "transcript", data: prefillTranscript });
      }

      const chartHint = shouldShowChart(userText);
      const history = messages
        .filter(m => !m.isLoading && m.id !== "welcome")
        .slice(-8)
        .map(m => ({ role: m.role, content: m.content }));

      const raw = await queryGemini(apiKey, userText, context, history, chartHint);
      const chart = parseChartFromResponse(raw);
      const content = stripChartBlock(raw);

      setMessages(prev =>
        prev.map(m =>
          m.id === loadingMsg.id
            ? { ...m, content, chart, isLoading: false }
            : m
        )
      );
    } catch (err) {
      setMessages(prev =>
        prev.map(m =>
          m.id === loadingMsg.id
            ? { ...m, content: `⚠ ${err.message}`, isLoading: false }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.statusDot} />
          <span className={styles.headerTitle}>AI Sales Assistant</span>
          <span className={styles.headerSub}>Gemini 2.0 Flash · RAG enabled</span>
        </div>
        <div className={styles.headerRight}>
          <button 
            onClick={handleNewChat}
            style={{padding: "6px 12px", background: "none", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "20px", color: "#fff", cursor: "pointer", fontSize: "0.85rem", marginRight: "12px", transition: "all 0.2s"}}
            onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
            onMouseOut={e => e.currentTarget.style.background = "transparent"}
          >
            + New Chat
          </button>
          <span className={styles.contextBadge}>
            {messages.filter(m => m.role === "user").length} queries
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {messages.map(msg => (
          <ChatMessage key={msg.id} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className={styles.suggestions}>
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              className={styles.suggestion}
              onClick={() => send(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className={styles.inputArea}>
        <div className={styles.inputWrap}>
          <textarea
            ref={inputRef}
            className={styles.input}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about deals, calls, pipeline, or request a chart…"
            rows={1}
            disabled={loading}
          />
          <button
            className={`${styles.sendBtn} ${(input.trim() && !loading) ? styles.sendActive : ""}`}
            onClick={() => send()}
            disabled={!input.trim() || loading}
          >
            {loading ? (
              <div className={styles.spinner} />
            ) : (
              <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                <path d="M17 10L3 3l3 7-3 7 14-7z" fill="currentColor"/>
              </svg>
            )}
          </button>
        </div>
        <p className={styles.hint}>
          Press Enter to send · Shift+Enter for new line · Try "show pipeline chart"
        </p>
      </div>
    </div>
  );
}
