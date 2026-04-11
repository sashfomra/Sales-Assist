import { useState } from "react";
import styles from "./ApiKeyModal.module.css";

const MODELS_INFO = [
  { name: "llama-3.1-8b-instant",  limit: "Unlimited requests · Fast & efficient", tag: "Chat" },
  { name: "whisper-large-v3",     limit: "Unlimited requests · Audio transcription", tag: "Audio" },
];

export default function ApiKeyModal({ onSave, onClose, current }) {
  const [val, setVal] = useState(current || "");

  function save() {
    if (val.trim()) { onSave(val.trim()); onClose(); }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.iconWrap}>
            <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
              <path d="M7 7V5a3 3 0 016 0v2M4 9h12a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1v-7a1 1 0 011-1z" stroke="#4f8eff" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h2 className={styles.title}>Groq API Key</h2>
            <p className={styles.sub}>Powers the AI chat & audio analysis</p>
          </div>
        </div>

        <div className={styles.body}>
          <p className={styles.info}>
            Get a free key at{" "}
            <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">
              console.groq.com/keys
            </a>
            {" "}— instant activation, no credit card needed.
          </p>

          <div className={styles.modelList}>
            <p className={styles.modelTitle}>Auto-fallback model chain</p>
            {MODELS_INFO.map((m, i) => (
              <div key={m.name} className={styles.modelRow}>
                <span className={styles.modelNum}>{i + 1}</span>
                <div className={styles.modelInfo}>
                  <span className={styles.modelName}>{m.name}</span>
                  <span className={styles.modelLimit}>{m.limit}</span>
                </div>
                <span className={`${styles.modelTag} ${i === 0 ? styles.tagGreen : i === 1 ? styles.tagBlue : styles.tagGray}`}>
                  {m.tag}
                </span>
              </div>
            ))}
            <p className={styles.modelNote}>
              Groq provides fast, unlimited API access. No rate limits on the free tier.
            </p>
          </div>

          <label className={styles.label}>Your API key</label>
          <input
            type="password"
            className={styles.input}
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => e.key === "Enter" && save()}
            placeholder="AIzaSy..."
            autoFocus
          />
          <p className={styles.note}>
            🔒 Stored in localStorage — never sent anywhere except Google's API directly.
          </p>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancel} onClick={onClose}>Cancel</button>
          <button className={styles.save} onClick={save} disabled={!val.trim()}>
            Save & Connect
          </button>
        </div>
      </div>
    </div>
  );
}
