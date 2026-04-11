import styles from "./Sidebar.module.css";
import { METRICS, PIPELINE_STAGES, TASKS } from "../data/crm";

const STAGE_COLOR = {
  "Qualification":"#4f8eff","Demo":"#a78bfa","Proposal":"#38bdf8",
  "Negotiation":"#fbbf24","Closed Won":"#34d399","Closed Lost":"#f87171"
};
const STAGE_ORDER = ["Qualification","Demo","Proposal","Negotiation","Closed Won","Closed Lost"];

function fmt(n) {
  if (n >= 1000000) return `$${(n/1000000).toFixed(1)}M`;
  if (n >= 1000)    return `$${(n/1000).toFixed(0)}K`;
  return `$${n}`;
}

const getNav = (deals) => [
  { id:"dashboard", icon:"⚡", label:"Command Center" },
  { id:"chat",      icon:"🤖", label:"AI Assistant" },
  { id:"revenue",   icon:"💰", label:"Revenue",  badge: null },
  { id:"pipeline",  icon:"📊", label:"Pipeline" },
  { id:"deals",     icon:"🤝", label:"Deals",    count: deals.filter(d=>!d.stage.startsWith("Closed")).length },
  { id:"calls",     icon:"📞", label:"Calls" },
  { id:"contacts",  icon:"👥", label:"Contacts & Accounts" },
  { id:"tasks",     icon:"✅", label:"Tasks",    count: TASKS.filter(t=>!t.done&&t.priority==="Critical").length, countColor:"#f87171" },
  { id:"analyzeCall", icon:"🔬", label:"Analyze Call", badge:"NEW" },
];

export default function Sidebar({ activeView, onViewChange, onDealClick, activeDeal, deals }) {
  const hotDeals = deals.filter(d => d.value > 80000 && !d.stage.startsWith("Closed")).slice(0, 3);
  const NAV = getNav(deals);

  return (
    <aside className={styles.sidebar}>
      {/* Brand */}
      <div className={styles.brand}>
        <div className={styles.logo}>
          <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
            <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#4f8eff" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="#4f8eff" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
          <span>SalesIQ</span>
        </div>
        <div className={styles.badge}>PRO</div>
      </div>

      {/* Metrics strip */}
      <div className={styles.metricsStrip}>
        <div className={styles.metric}>
          <span className={styles.metricVal}>{fmt(METRICS.totalPipeline)}</span>
          <span className={styles.metricLabel}>Pipeline</span>
        </div>
        <div className={styles.metricDivider}/>
        <div className={styles.metric}>
          <span className={styles.metricVal}>{METRICS.winRate}%</span>
          <span className={styles.metricLabel}>Win Rate</span>
        </div>
        <div className={styles.metricDivider}/>
        <div className={styles.metric}>
          <span className={styles.metricVal}>{METRICS.quotaAttainment}%</span>
          <span className={styles.metricLabel}>Quota</span>
        </div>
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        {NAV.map(item => (
          <button
            key={item.id}
            className={`${styles.navItem} ${activeView === item.id ? styles.active : ""}`}
            onClick={() => onViewChange(item.id)}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
            {item.count !== undefined && item.count > 0 && (
              <span className={styles.navCount} style={item.countColor ? {background:item.countColor+"22",color:item.countColor} : {}}>
                {item.count}
              </span>
            )}
            {item.badge && (
              <span className={styles.navBadge}>{item.badge}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Pipeline mini */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Pipeline by stage</p>
        <div className={styles.stageList}>
          {STAGE_ORDER.slice(0, 4).map(stage => {
            const info = PIPELINE_STAGES[stage];
            return (
              <div key={stage} className={styles.stageRow}>
                <div className={styles.stageDot} style={{background: STAGE_COLOR[stage]}}/>
                <span className={styles.stageName}>{stage}</span>
                <span className={styles.stageVal}>{fmt(info.value)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hot deals */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Hot deals</p>
        <div className={styles.dealList}>
          {hotDeals.map(deal => (
            <button
              key={deal.id}
              className={`${styles.dealItem} ${activeDeal === deal.id ? styles.dealActive : ""}`}
              onClick={() => onDealClick(deal)}
            >
              <div className={styles.dealTop}>
                <span className={styles.dealName}>{deal.company}</span>
                <span className={styles.dealStage} style={{color: STAGE_COLOR[deal.stage]}}>{deal.stage}</span>
              </div>
              <div className={styles.dealBottom}>
                <span className={styles.dealVal}>{fmt(deal.value)}</span>
                <div className={styles.probBar}>
                  <div className={styles.probFill} style={{width:`${deal.probability}%`,background:STAGE_COLOR[deal.stage]}}/>
                </div>
                <span className={styles.dealProb}>{deal.probability}%</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.footerAvatars}>
          {["P","R","A"].map((l,i) => <div key={i} className={styles.repAvatar}>{l}</div>)}
        </div>
        <span className={styles.footerText}>3 reps active</span>
      </div>
    </aside>
  );
}
