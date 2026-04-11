import { useState } from "react";
import { CALLS } from "../data/crm";
import styles from "./CallsView.module.css";

const SENTIMENT_COLOR = {
  "Very Positive": "#34d399",
  "Positive":      "#4f8eff",
  "Neutral":       "#fbbf24",
  "Tense":         "#f87171"
};

export default function CallsView({ onAskAI, deals }) {
  const [selected, setSelected] = useState(CALLS[0]);

  function getDeal(id) {
    return deals.find(d => d.id === id);
  }

  return (
    <div className={styles.view}>
      {/* Call list */}
      <div className={styles.listPane}>
        <div className={styles.listHeader}>
          <h1 className={styles.title}>Call Recordings</h1>
          <span className={styles.count}>{CALLS.length} calls</span>
        </div>
        <div className={styles.list}>
          {CALLS.map(call => {
            const deal = getDeal(call.deal);
            return (
              <button
                key={call.id}
                className={`${styles.callCard} ${selected?.id === call.id ? styles.callActive : ""}`}
                onClick={() => setSelected(call)}
              >
                <div className={styles.callTop}>
                  <span className={styles.callType}>{call.type}</span>
                  <span
                    className={styles.sentiment}
                    style={{ color: SENTIMENT_COLOR[call.sentiment] }}
                  >
                    ● {call.sentiment}
                  </span>
                </div>
                <p className={styles.callCo}>{deal?.company}</p>
                <div className={styles.callMeta}>
                  <span>{call.date}</span>
                  <span>·</span>
                  <span>{call.duration}</span>
                  <span>·</span>
                  <span>{call.rep}</span>
                </div>
                <p className={styles.callOutcome}>{call.outcome}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Call detail */}
      {selected && (
        <div className={styles.detailPane}>
          <div className={styles.detailHead}>
            <div>
              <h2 className={styles.detailType}>{selected.type}</h2>
              <p className={styles.detailMeta}>
                {getDeal(selected.deal)?.company} · {selected.date} · {selected.duration} · {selected.rep}
              </p>
            </div>
            <span
              className={styles.sentimentBadge}
              style={{
                color: SENTIMENT_COLOR[selected.sentiment],
                borderColor: SENTIMENT_COLOR[selected.sentiment] + "44",
                background: SENTIMENT_COLOR[selected.sentiment] + "15"
              }}
            >
              {selected.sentiment}
            </span>
          </div>

          <div className={styles.outcomeBanner}>
            <span className={styles.outcomeIcon}>✓</span>
            <span>{selected.outcome}</span>
          </div>

          <div className={styles.section}>
            <p className={styles.sectionLabel}>Call summary</p>
            <p className={styles.summary}>{selected.summary}</p>
          </div>

          <div className={styles.section}>
            <p className={styles.sectionLabel}>Key moments</p>
            <div className={styles.moments}>
              {selected.keyMoments.map((m, i) => (
                <div key={i} className={styles.moment}>
                  <span className={styles.momentIndex}>{i + 1}</span>
                  <span>{m}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.twoCol}>
            <div className={styles.section}>
              <p className={styles.sectionLabel}>Objections raised</p>
              {selected.objections.map((o, i) => (
                <div key={i} className={styles.objection}>
                  <span className={styles.objIcon}>⚠</span>
                  <span>{o}</span>
                </div>
              ))}
            </div>
            <div className={styles.section}>
              <p className={styles.sectionLabel}>Next steps</p>
              {selected.nextSteps.map((n, i) => (
                <div key={i} className={styles.nextStep}>
                  <span className={styles.nextIcon}>→</span>
                  <span>{n}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            className={styles.askAIBtn}
            onClick={() => onAskAI({ company: getDeal(selected.deal)?.company, id: selected.deal })}
          >
            Ask AI to analyze this call
          </button>
        </div>
      )}
    </div>
  );
}
