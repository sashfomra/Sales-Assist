import { useState } from "react";
import NewDealModal from "./NewDealModal";
import styles from "./DealsView.module.css";

const STAGE_COLOR = {
  "Qualification": "#4f8eff", "Demo": "#a78bfa", "Proposal": "#38bdf8",
  "Negotiation": "#fbbf24", "Closed Won": "#34d399", "Closed Lost": "#f87171"
};

function fmt(n) {
  if (n >= 1000000) return `$${(n/1000000).toFixed(1)}M`;
  if (n >= 1000)    return `$${(n/1000).toFixed(0)}K`;
  return `$${n}`;
}

export default function DealsView({ onAskAI, deals, onAddDeal }) {
  const [selected, setSelected] = useState(deals[0]);
  const [filter, setFilter]     = useState("All");
  const [showModal, setShowModal] = useState(false);

  const stages = ["All", "Qualification", "Demo", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];
  const filtered = filter === "All" ? deals : deals.filter(d => d.stage === filter);

  return (
    <div className={styles.view}>
      {/* Left: deal table */}
      <div className={styles.tablePane}>
        <div className={styles.tableHeader}>
          <h1 className={styles.title}>Deals</h1>
          <div className={styles.filtersWrapper}>
            <div className={styles.filters}>
              {stages.map(s => (
                <button
                  key={s}
                  className={`${styles.filterBtn} ${filter === s ? styles.filterActive : ""}`}
                  onClick={() => setFilter(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            <button className={styles.newDealBtn} onClick={() => setShowModal(true)}>+ New Deal</button>
          </div>
        </div>

        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>Company</span>
            <span>Stage</span>
            <span>Value</span>
            <span>Close</span>
            <span>Owner</span>
          </div>
          <div className={styles.tableBody}>
            {filtered.map(deal => (
              <button
                key={deal.id}
                className={`${styles.tableRow} ${selected?.id === deal.id ? styles.rowActive : ""}`}
                onClick={() => setSelected(deal)}
              >
                <span className={styles.colCompany}>
                  <span className={styles.companyInit}>{deal.company[0]}</span>
                  <span>
                    <strong>{deal.company}</strong>
                    <small>{deal.contact}</small>
                  </span>
                </span>
                <span>
                  <span
                    className={styles.stagePill}
                    style={{
                      color: STAGE_COLOR[deal.stage],
                      borderColor: STAGE_COLOR[deal.stage] + "55",
                      background: STAGE_COLOR[deal.stage] + "18"
                    }}
                  >
                    {deal.stage}
                  </span>
                </span>
                <span className={styles.valCell}>{fmt(deal.value)}</span>
                <span className={styles.dateCell}>{deal.closeDate}</span>
                <span className={styles.ownerCell}>{deal.owner}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: deal detail */}
      {selected && (
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <div className={styles.detailInit}>{selected.company[0]}</div>
            <div>
              <h2 className={styles.detailName}>{selected.company}</h2>
              <p className={styles.detailContact}>{selected.contact} · {selected.owner}</p>
            </div>
          </div>

          <div className={styles.detailStats}>
            <div className={styles.stat}>
              <span className={styles.statVal}>{fmt(selected.value)}</span>
              <span className={styles.statLabel}>Deal value</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statVal}>{selected.probability}%</span>
              <span className={styles.statLabel}>Win prob</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statVal}>{selected.daysInStage}d</span>
              <span className={styles.statLabel}>In stage</span>
            </div>
          </div>

          <div className={styles.detailSection}>
            <p className={styles.detailSectionLabel}>Stage</p>
            <span
              className={styles.stagePill}
              style={{
                color: STAGE_COLOR[selected.stage],
                borderColor: STAGE_COLOR[selected.stage] + "55",
                background: STAGE_COLOR[selected.stage] + "18"
              }}
            >
              {selected.stage}
            </span>
          </div>

          <div className={styles.detailSection}>
            <p className={styles.detailSectionLabel}>Notes</p>
            <p className={styles.detailNotes}>{selected.notes}</p>
          </div>

          <div className={styles.detailSection}>
            <p className={styles.detailSectionLabel}>Activities</p>
            <div className={styles.activities}>
              {selected.activities.map((a, i) => (
                <div key={i} className={styles.activity}>
                  <span className={styles.activityDot} />
                  <span>{a}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.detailSection}>
            <p className={styles.detailSectionLabel}>Tags</p>
            <div className={styles.tags}>
              {selected.tags.map((t, i) => (
                <span key={i} className={styles.tag}>{t}</span>
              ))}
            </div>
          </div>

          <button
            className={styles.askAIBtn}
            onClick={() => onAskAI(selected)}
          >
            <svg viewBox="0 0 16 16" fill="none" width="15" height="15">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M5 8.5C5 6.567 6.343 5 8 5s3 1.567 3 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="8" cy="11" r="1" fill="currentColor"/>
            </svg>
            Ask AI about this deal
          </button>
        </div>
      )}

      {showModal && (
        <NewDealModal
          onClose={() => setShowModal(false)}
          onSave={onAddDeal}
        />
      )}
    </div>
  );
}
