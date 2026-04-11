import styles from "./PipelineView.module.css";
import { PIPELINE_STAGES } from "../data/crm";

const STAGE_ORDER = ["Qualification","Demo","Proposal","Negotiation","Closed Won","Closed Lost"];
const STAGE_COLOR = {
  "Qualification": "#4f8eff",
  "Demo":          "#a78bfa",
  "Proposal":      "#38bdf8",
  "Negotiation":   "#fbbf24",
  "Closed Won":    "#34d399",
  "Closed Lost":   "#f87171"
};

function fmt(n) {
  if (n >= 1000000) return `$${(n/1000000).toFixed(1)}M`;
  if (n >= 1000)    return `$${(n/1000).toFixed(0)}K`;
  return `$${n}`;
}

export default function PipelineView({ onDealClick, deals }) {
  const byStage = {};
  STAGE_ORDER.forEach(s => { byStage[s] = []; });
  deals.forEach(d => { if (byStage[d.stage]) byStage[d.stage].push(d); });

  return (
    <div className={styles.view}>
      <div className={styles.header}>
        <h1 className={styles.title}>Pipeline Board</h1>
        <div className={styles.headerRight}>
          <span className={styles.totalLabel}>Total Pipeline</span>
          <span className={styles.totalVal}>$746K</span>
        </div>
      </div>

      <div className={styles.board}>
        {STAGE_ORDER.map(stage => {
          const deals = byStage[stage];
          const stageValue = deals.reduce((s, d) => s + d.value, 0);
          const color = STAGE_COLOR[stage];

          return (
            <div key={stage} className={styles.column}>
              <div className={styles.colHeader}>
                <div className={styles.colTop}>
                  <span className={styles.colDot} style={{ background: color }} />
                  <span className={styles.colName}>{stage}</span>
                  <span className={styles.colCount}>{deals.length}</span>
                </div>
                <span className={styles.colVal}>{fmt(stageValue)}</span>
              </div>

              <div className={styles.cards}>
                {deals.map(deal => (
                  <button
                    key={deal.id}
                    className={styles.card}
                    onClick={() => onDealClick(deal)}
                  >
                    <div className={styles.cardTop}>
                      <span className={styles.cardCo}>{deal.company}</span>
                      <span className={styles.cardVal}>{fmt(deal.value)}</span>
                    </div>
                    <p className={styles.cardName}>{deal.name.split("—")[1]?.trim() || deal.name}</p>
                    <div className={styles.cardMeta}>
                      <span className={styles.cardOwner}>{deal.owner}</span>
                      {deal.daysInStage > 10 && (
                        <span className={styles.cardAlert}>⚠ {deal.daysInStage}d</span>
                      )}
                    </div>
                    <div className={styles.cardProb}>
                      <div className={styles.cardProbBar}>
                        <div
                          className={styles.cardProbFill}
                          style={{ width: `${deal.probability}%`, background: color }}
                        />
                      </div>
                      <span className={styles.cardProbVal}>{deal.probability}%</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
