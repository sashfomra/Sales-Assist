import { useEffect, useRef, useState } from "react";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import { METRICS, REPS } from "../data/crm";
import styles from "./RevenueView.module.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

function fmt(n) {
  if (n >= 1000000) return `$${(n/1000000).toFixed(1)}M`;
  if (n >= 1000)    return `$${(n/1000).toFixed(0)}K`;
  return `$${n}`;
}

const CHART_DEFAULTS = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: {
    backgroundColor: "#1b2236", borderColor: "rgba(255,255,255,0.1)", borderWidth: 1,
    titleColor: "#dde4f0", bodyColor: "#7e8fa8", cornerRadius: 8, padding: 10,
    callbacks: { label: ctx => ` ${fmt(ctx.raw)}` }
  }},
  scales: {
    x: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#7e8fa8", font: { family: "Cabinet Grotesk", size: 11 } }, border: { color: "rgba(255,255,255,0.06)" } },
    y: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#7e8fa8", font: { family: "Cabinet Grotesk", size: 11 }, callback: v => fmt(v) }, border: { color: "rgba(255,255,255,0.06)" } }
  }
};

export default function RevenueView({ deals }) {
  const [period, setPeriod] = useState("ytd");
  const pct = Math.round((METRICS.annualClosed / METRICS.annualTarget) * 100);
  const forecastPct = Math.round(((METRICS.annualClosed + METRICS.forecastThisMonth) / METRICS.annualTarget) * 100);

  const revenueData = {
    labels: METRICS.monthLabels,
    datasets: [{
      label: "Revenue", data: METRICS.monthlyRevenue,
      backgroundColor: METRICS.monthlyRevenue.map(v => v > 0 ? "rgba(79,142,255,0.7)" : "rgba(79,142,255,0.12)"),
      borderColor: "#4f8eff", borderWidth: 2, borderRadius: 6,
    }]
  };

  const forecastData = {
    labels: METRICS.forecastLabels,
    datasets: [{
      label: "Forecast", data: METRICS.forecastByMonth,
      backgroundColor: "rgba(167,139,250,0.2)", borderColor: "#a78bfa",
      borderWidth: 2, borderRadius: 6, fill: true, tension: 0.4,
    }]
  };

  const repPipelineData = {
    labels: Object.keys(METRICS.pipelineByRep),
    datasets: [{
      data: Object.values(METRICS.pipelineByRep),
      backgroundColor: ["#4f8eff", "#a78bfa", "#34d399"],
      borderWidth: 0, hoverOffset: 8,
    }]
  };

  const winLossData = {
    labels: METRICS.winLoss.labels,
    datasets: [
      { label: "Won", data: METRICS.winLoss.won, backgroundColor: "rgba(52,211,153,0.7)", borderRadius: 4, borderWidth: 0 },
      { label: "Lost", data: METRICS.winLoss.lost, backgroundColor: "rgba(248,113,113,0.7)", borderRadius: 4, borderWidth: 0 },
    ]
  };

  const velocityData = {
    labels: METRICS.dealVelocity.labels,
    datasets: [{
      label: "Avg Days", data: METRICS.dealVelocity.days,
      borderColor: "#fbbf24", backgroundColor: "rgba(251,191,36,0.1)",
      borderWidth: 2, fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: "#fbbf24",
    }]
  };

  return (
    <div className={styles.view}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Revenue & Forecast</h1>
          <p className={styles.sub}>FY 2024 · Q1 in progress</p>
        </div>
        <div className={styles.periodTabs}>
          {["mtd","qtd","ytd"].map(p => (
            <button key={p} className={`${styles.tab} ${period===p ? styles.tabActive : ""}`} onClick={() => setPeriod(p)}>
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.scrollArea}>
        {/* KPI Strip */}
        <div className={styles.kpiStrip}>
          {[
            { label: "Closed Won (FY)", val: fmt(METRICS.annualClosed), sub: `${pct}% of annual target`, color: "#34d399" },
            { label: "Annual Target", val: fmt(METRICS.annualTarget), sub: "FY 2024", color: "#4f8eff" },
            { label: "Forecast (This Month)", val: fmt(METRICS.forecastThisMonth), sub: "Based on pipeline prob.", color: "#a78bfa" },
            { label: "Total Pipeline", val: fmt(METRICS.totalPipeline), sub: "Active opportunities", color: "#fbbf24" },
            { label: "Avg Deal Size", val: fmt(METRICS.avgDealSize), sub: "Across all open deals", color: "#38bdf8" },
            { label: "Avg Sales Cycle", val: `${METRICS.avgSalesCycle}d`, sub: "Days to close", color: "#f472b6" },
          ].map((k, i) => (
            <div key={i} className={styles.kpiCard}>
              <div className={styles.kpiAccent} style={{ background: k.color }} />
              <p className={styles.kpiLabel}>{k.label}</p>
              <p className={styles.kpiVal} style={{ color: k.color }}>{k.val}</p>
              <p className={styles.kpiSub}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Annual quota progress */}
        <div className={styles.quotaSection}>
          <div className={styles.quotaHeader}>
            <span className={styles.quotaTitle}>Annual Quota Progress</span>
            <span className={styles.quotaPct}>{pct}% closed · {forecastPct}% with forecast</span>
          </div>
          <div className={styles.quotaTrack}>
            <div className={styles.quotaClosed} style={{ width: `${pct}%` }} />
            <div className={styles.quotaForecast} style={{ width: `${forecastPct - pct}%`, left: `${pct}%` }} />
            <div className={styles.quotaTarget} style={{ left: "68%" }}>
              <span>68% quota</span>
            </div>
          </div>
          <div className={styles.quotaLegend}>
            <span><span className={styles.dot} style={{background:"#34d399"}}/>Closed Won {fmt(METRICS.annualClosed)}</span>
            <span><span className={styles.dot} style={{background:"rgba(79,142,255,0.4)"}}/>Forecast {fmt(METRICS.forecastThisMonth)}</span>
            <span><span className={styles.dot} style={{background:"rgba(255,255,255,0.1)"}}/>Remaining {fmt(METRICS.annualTarget - METRICS.annualClosed - METRICS.forecastThisMonth)}</span>
          </div>
        </div>

        {/* Main charts grid */}
        <div className={styles.chartsGrid}>
          {/* Monthly revenue */}
          <div className={`${styles.chartCard} ${styles.wide}`}>
            <div className={styles.chartHead}>
              <p className={styles.chartTitle}>Monthly Revenue</p>
              <p className={styles.chartSub}>Actual closed revenue by month</p>
            </div>
            <div className={styles.chartCanvas} style={{height:220}}>
              <Bar data={revenueData} options={CHART_DEFAULTS} />
            </div>
          </div>

          {/* Forecast */}
          <div className={`${styles.chartCard} ${styles.wide}`}>
            <div className={styles.chartHead}>
              <p className={styles.chartTitle}>Revenue Forecast</p>
              <p className={styles.chartSub}>Expected closes based on pipeline × probability</p>
            </div>
            <div className={styles.chartCanvas} style={{height:220}}>
              <Line data={forecastData} options={{...CHART_DEFAULTS, scales: {...CHART_DEFAULTS.scales}}} />
            </div>
          </div>
        </div>

        <div className={styles.chartsGrid2}>
          {/* Pipeline by rep (donut) */}
          <div className={styles.chartCard}>
            <div className={styles.chartHead}>
              <p className={styles.chartTitle}>Pipeline by Rep</p>
              <p className={styles.chartSub}>Active pipeline split</p>
            </div>
            <div className={styles.donutWrap}>
              <div style={{height:180, position:"relative"}}>
                <Doughnut data={repPipelineData} options={{
                  ...CHART_DEFAULTS,
                  scales: undefined,
                  cutout: "68%",
                  plugins: { ...CHART_DEFAULTS.plugins, tooltip: { ...CHART_DEFAULTS.plugins.tooltip } }
                }} />
              </div>
              <div className={styles.donutLegend}>
                {Object.entries(METRICS.pipelineByRep).map(([rep, val], i) => (
                  <div key={rep} className={styles.legendRow}>
                    <span className={styles.legendDot} style={{background:["#4f8eff","#a78bfa","#34d399"][i]}}/>
                    <span className={styles.legendName}>{rep}</span>
                    <span className={styles.legendVal}>{fmt(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Win/Loss reasons */}
          <div className={styles.chartCard}>
            <div className={styles.chartHead}>
              <p className={styles.chartTitle}>Win / Loss Analysis</p>
              <p className={styles.chartSub}>Top reasons deals are won or lost</p>
            </div>
            <div className={styles.chartCanvas} style={{height:220}}>
              <Bar data={winLossData} options={{
                ...CHART_DEFAULTS,
                indexAxis: "y",
                plugins: { ...CHART_DEFAULTS.plugins, legend: { display: true, position: "bottom", labels: { color: "#7e8fa8", font: { family: "Cabinet Grotesk", size: 11 }, boxWidth: 10, padding: 12 } } },
              }} />
            </div>
          </div>

          {/* Deal velocity */}
          <div className={styles.chartCard}>
            <div className={styles.chartHead}>
              <p className={styles.chartTitle}>Deal Velocity</p>
              <p className={styles.chartSub}>Avg days to close (trending down = good)</p>
            </div>
            <div className={styles.chartCanvas} style={{height:220}}>
              <Line data={velocityData} options={{
                ...CHART_DEFAULTS,
                scales: {
                  x: CHART_DEFAULTS.scales.x,
                  y: { ...CHART_DEFAULTS.scales.y, ticks: { ...CHART_DEFAULTS.scales.y.ticks, callback: v => `${v}d` } }
                }
              }} />
            </div>
          </div>
        </div>

        {/* Rep leaderboard */}
        <div className={styles.repSection}>
          <p className={styles.sectionTitle}>Rep Performance</p>
          <div className={styles.repGrid}>
            {REPS.map((rep, i) => {
              const attainment = Math.round((rep.closed / rep.quota) * 100);
              return (
                <div key={rep.name} className={styles.repCard}>
                  <div className={styles.repTop}>
                    <div className={styles.repAvatar} style={{background: ["rgba(79,142,255,0.2)","rgba(167,139,250,0.2)","rgba(52,211,153,0.2)"][i], color: ["#4f8eff","#a78bfa","#34d399"][i]}}>
                      {rep.avatar}
                    </div>
                    <div>
                      <p className={styles.repName}>{rep.name}</p>
                      <p className={styles.repDeals}>{rep.deals} deals · {rep.calls} calls</p>
                    </div>
                    <span className={styles.repRank}>#{i+1}</span>
                  </div>
                  <div className={styles.repStats}>
                    {[
                      { label: "Closed", val: fmt(rep.closed) },
                      { label: "Pipeline", val: fmt(rep.pipeline) },
                      { label: "Win Rate", val: `${rep.winRate}%` },
                      { label: "Avg Cycle", val: `${rep.avgCycle}d` },
                    ].map(s => (
                      <div key={s.label} className={styles.repStat}>
                        <span className={styles.repStatVal}>{s.val}</span>
                        <span className={styles.repStatLabel}>{s.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.repQuota}>
                    <div className={styles.repQuotaTop}>
                      <span>Quota attainment</span>
                      <span style={{color: attainment >= 80 ? "#34d399" : attainment >= 50 ? "#fbbf24" : "#f87171"}}>{attainment}%</span>
                    </div>
                    <div className={styles.repTrack}>
                      <div className={styles.repFill} style={{
                        width: `${Math.min(attainment, 100)}%`,
                        background: attainment >= 80 ? "#34d399" : attainment >= 50 ? "#fbbf24" : "#f87171"
                      }}/>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Conversion funnel */}
        <div className={styles.funnelSection}>
          <p className={styles.sectionTitle}>Conversion Funnel</p>
          <div className={styles.funnel}>
            {METRICS.conversionFunnel.stages.map((stage, i) => {
              const count = METRICS.conversionFunnel.counts[i];
              const rate  = METRICS.conversionFunnel.rates[i];
              const colors = ["#4f8eff","#a78bfa","#38bdf8","#fbbf24","#34d399"];
              return (
                <div key={stage} className={styles.funnelStage}>
                  <div className={styles.funnelBar}>
                    <div className={styles.funnelFill} style={{ width: `${rate}%`, background: colors[i] }} />
                  </div>
                  <div className={styles.funnelMeta}>
                    <span className={styles.funnelName}>{stage}</span>
                    <span className={styles.funnelCount}>{count} deals</span>
                    <span className={styles.funnelRate} style={{ color: colors[i] }}>{rate}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
