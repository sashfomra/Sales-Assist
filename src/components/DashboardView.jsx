import { METRICS, ACTIVITIES, TASKS, REPS } from "../data/crm";
import styles from "./DashboardView.module.css";

const STAGE_COLOR = {
  "Qualification":"#4f8eff","Demo":"#a78bfa","Proposal":"#38bdf8",
  "Negotiation":"#fbbf24","Closed Won":"#34d399","Closed Lost":"#f87171"
};
const ACTIVITY_ICON = { call:"📞", email:"✉️", deal:"🤝", alert:"⚠️", won:"🏆", meeting:"📅", proposal:"📄" };
const PRIORITY_COLOR = { Critical:"#f87171", High:"#fbbf24", Medium:"#38bdf8", Low:"#7e8fa8" };

function fmt(n) {
  if (n >= 1000000) return `$${(n/1000000).toFixed(1)}M`;
  if (n >= 1000)    return `$${(n/1000).toFixed(0)}K`;
  return `$${n}`;
}

export default function DashboardView({ onNavigate, deals }) {
  const atRisk   = deals.filter(d => d.daysInStage > 10 && !d.stage.startsWith("Closed"));
  const closingSoon = deals.filter(d => !d.stage.startsWith("Closed") && d.probability >= 60).sort((a,b) => b.value - a.value).slice(0,4);
  const openTasks = TASKS.filter(t => !t.done).sort((a,b) => PRIORITY_COLOR[a.priority] === "#f87171" ? -1 : 1).slice(0,5);

  return (
    <div className={styles.view}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Command Center</h1>
          <p className={styles.sub}>Good morning — here's what needs your attention today</p>
        </div>
        <div className={styles.date}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div>
      </div>

      <div className={styles.scrollArea}>
        {/* Top KPIs */}
        <div className={styles.kpiRow}>
          {[
            { label:"Total Pipeline",   val:fmt(METRICS.totalPipeline), delta:"+12%", up:true,  color:"#4f8eff" },
            { label:"Forecast (Month)", val:fmt(METRICS.forecastThisMonth), delta:"+8%", up:true, color:"#a78bfa" },
            { label:"Win Rate",         val:`${METRICS.winRate}%`, delta:"-2%", up:false, color:"#fbbf24" },
            { label:"Quota Attainment", val:`${METRICS.quotaAttainment}%`, delta:"+5%", up:true, color:"#34d399" },
            { label:"Open Deals",       val:deals.filter(d=>!d.stage.startsWith("Closed")).length, delta:"2 new", up:true, color:"#38bdf8" },
            { label:"Overdue Tasks",    val:openTasks.filter(t=>t.priority==="Critical").length, delta:"action needed", up:false, color:"#f87171" },
          ].map((k,i) => (
            <div key={i} className={styles.kpiCard}>
              <div className={styles.kpiTop}>
                <span className={styles.kpiLabel}>{k.label}</span>
                <span className={styles.kpiDelta} style={{color: k.up ? "#34d399" : "#f87171"}}>
                  {k.up ? "↑" : "↓"} {k.delta}
                </span>
              </div>
              <p className={styles.kpiVal} style={{color: k.color}}>{k.val}</p>
            </div>
          ))}
        </div>

        <div className={styles.mainGrid}>
          {/* Activity Feed */}
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <p className={styles.cardTitle}>Live Activity</p>
              <span className={styles.liveChip}><span className={styles.liveDot}/>Live</span>
            </div>
            <div className={styles.activityList}>
              {ACTIVITIES.map(act => (
                <div key={act.id} className={styles.activityRow}>
                  <span className={styles.activityIcon}>{ACTIVITY_ICON[act.type]}</span>
                  <div className={styles.activityBody}>
                    <p className={styles.activityText}>{act.text}</p>
                    <span className={styles.activityMeta}>{act.rep} · {act.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* At-risk deals */}
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <p className={styles.cardTitle}>⚠ At-Risk Deals</p>
              <span className={styles.riskCount}>{atRisk.length} deals</span>
            </div>
            <div className={styles.riskList}>
              {atRisk.map(deal => (
                <div key={deal.id} className={styles.riskRow}>
                  <div className={styles.riskLeft}>
                    <p className={styles.riskCo}>{deal.company}</p>
                    <p className={styles.riskNote}>{deal.notes.slice(0,60)}…</p>
                  </div>
                  <div className={styles.riskRight}>
                    <span className={styles.riskDays}>{deal.daysInStage}d stale</span>
                    <span className={styles.riskVal}>{fmt(deal.value)}</span>
                  </div>
                </div>
              ))}
              {atRisk.length === 0 && <p className={styles.empty}>No at-risk deals 🎉</p>}
            </div>
          </div>
        </div>

        <div className={styles.bottomGrid}>
          {/* Closing soon */}
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <p className={styles.cardTitle}>Closing Soon</p>
              <span className={styles.sub2}>High probability deals</span>
            </div>
            <div className={styles.closingList}>
              {closingSoon.map(deal => (
                <div key={deal.id} className={styles.closingRow}>
                  <div className={styles.closingInit}>{deal.company[0]}</div>
                  <div className={styles.closingBody}>
                    <p className={styles.closingCo}>{deal.company}</p>
                    <p className={styles.closingClose}>Close: {deal.closeDate}</p>
                  </div>
                  <div className={styles.closingRight}>
                    <span className={styles.closingVal}>{fmt(deal.value)}</span>
                    <span className={styles.closingProb} style={{color: STAGE_COLOR[deal.stage]}}>{deal.probability}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Open tasks */}
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <p className={styles.cardTitle}>Open Tasks</p>
              <span className={styles.taskCount}>{TASKS.filter(t=>!t.done).length} pending</span>
            </div>
            <div className={styles.taskList}>
              {openTasks.map(task => (
                <div key={task.id} className={styles.taskRow}>
                  <div className={styles.taskCheck} />
                  <div className={styles.taskBody}>
                    <p className={styles.taskTitle}>{task.title}</p>
                    <span className={styles.taskMeta}>{task.assignee} · Due {task.due}</span>
                  </div>
                  <span className={styles.taskPriority} style={{
                    color: PRIORITY_COLOR[task.priority],
                    background: PRIORITY_COLOR[task.priority] + "18",
                    borderColor: PRIORITY_COLOR[task.priority] + "44"
                  }}>{task.priority}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rep leaderboard mini */}
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <p className={styles.cardTitle}>Rep Leaderboard</p>
              <span className={styles.sub2}>This month</span>
            </div>
            <div className={styles.repList}>
              {REPS.map((rep,i) => {
                const pct = Math.round((rep.closed / rep.quota) * 100);
                const colors = ["#4f8eff","#a78bfa","#34d399"];
                return (
                  <div key={rep.name} className={styles.repRow}>
                    <span className={styles.repRank}>#{i+1}</span>
                    <div className={styles.repAv} style={{background:colors[i]+"22",color:colors[i]}}>{rep.avatar}</div>
                    <div className={styles.repInfo}>
                      <p className={styles.repName}>{rep.name}</p>
                      <div className={styles.repBar}>
                        <div className={styles.repFill} style={{width:`${Math.min(pct,100)}%`,background:colors[i]}}/>
                      </div>
                    </div>
                    <div className={styles.repMeta}>
                      <span style={{color:colors[i]}}>{pct}%</span>
                      <span>{fmt(rep.closed)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
