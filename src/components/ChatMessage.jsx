import { useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, Title, Tooltip, Legend, Filler
} from "chart.js";
import { Bar, Line, Doughnut, Pie } from "react-chartjs-2";
import styles from "./ChatMessage.module.css";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, Title, Tooltip, Legend, Filler
);

const CHART_COLORS = [
  "#4f8eff", "#a78bfa", "#38bdf8", "#34d399",
  "#fbbf24", "#f87171", "#f472b6", "#6ee7b7"
];

function renderMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^### (.*$)/gm, "<h3>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1>$1</h1>")
    .replace(/^\d+\. (.*$)/gm, "<li class='ordered'>$1</li>")
    .replace(/^[-•] (.*$)/gm, "<li>$1</li>")
    .replace(/(<li.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}

function SalesChart({ config }) {
  const chartData = {
    labels: config.labels,
    datasets: config.datasets.map((ds, i) => ({
      label: ds.label,
      data: ds.data,
      backgroundColor: ds.data.map((_, j) =>
        CHART_COLORS[(i * ds.data.length + j) % CHART_COLORS.length] + "cc"
      ),
      borderColor: CHART_COLORS[i % CHART_COLORS.length],
      borderWidth: 2,
      borderRadius: config.type === "bar" ? 6 : 0,
      fill: config.type === "line" ? "origin" : false,
      tension: 0.4,
      pointRadius: config.type === "line" ? 4 : 0,
      pointHoverRadius: 6,
    }))
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: ["doughnut", "pie"].includes(config.type),
        position: "bottom",
        labels: { color: "#7e8fa8", font: { family: "Cabinet Grotesk", size: 12 }, padding: 16, boxWidth: 12 }
      },
      title: { display: false },
      tooltip: {
        backgroundColor: "#1b2236",
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        titleColor: "#dde4f0",
        bodyColor: "#7e8fa8",
        cornerRadius: 8,
        padding: 10,
        callbacks: {
          label: ctx => {
            const val = ctx.raw;
            if (typeof val === "number" && val > 1000) {
              return ` $${val.toLocaleString()}`;
            }
            return ` ${val}`;
          }
        }
      }
    },
    scales: ["bar", "line"].includes(config.type) ? {
      x: {
        grid: { color: "rgba(255,255,255,0.04)" },
        ticks: { color: "#7e8fa8", font: { family: "Cabinet Grotesk", size: 11 } },
        border: { color: "rgba(255,255,255,0.06)" }
      },
      y: {
        grid: { color: "rgba(255,255,255,0.04)" },
        ticks: {
          color: "#7e8fa8",
          font: { family: "Cabinet Grotesk", size: 11 },
          callback: v => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : v
        },
        border: { color: "rgba(255,255,255,0.06)" }
      }
    } : undefined
  };

  const ChartComponent = { bar: Bar, line: Line, doughnut: Doughnut, pie: Pie }[config.type] || Bar;

  return (
    <div className={styles.chartWrap}>
      <p className={styles.chartTitle}>{config.title}</p>
      <div className={styles.chartCanvas}>
        <ChartComponent data={chartData} options={options} />
      </div>
    </div>
  );
}

export default function ChatMessage({ msg }) {
  const isUser = msg.role === "user";

  function renderStructuredData(structured) {
    if (!structured || typeof structured !== "object") return null;

    const fields = [
      ["Headline", structured.headline],
      ["Summary", structured.summary],
      ["Deal Value", structured.deal_value],
      ["Timeline", structured.timeline],
      ["Client", structured.client_name],
      ["Decision Maker", structured.decision_maker],
      ["Sentiment", structured.sentiment],
      ["Deal Score", structured.deal_score],
      ["Next Best Action", structured.nextBestAction],
    ].filter(([, value]) => value !== undefined && value !== null && value !== "");

    const listFields = [
      ["Risks", structured.risks],
      ["Next Steps", structured.next_steps],
      ["Alerts", structured.alerts],
      ["Strategic Tips", structured.strategicTips],
      ["Suggested Responses", structured.suggestedResponses],
    ].filter(([, value]) => Array.isArray(value) && value.length > 0);

    if (!fields.length && !listFields.length) return null;

    return (
      <div
        style={{
          marginBottom: "12px",
          padding: "14px",
          borderRadius: "14px",
          background: "rgba(79, 142, 255, 0.08)",
          border: "1px solid rgba(79, 142, 255, 0.22)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "10px",
            marginBottom: listFields.length ? "12px" : 0,
          }}
        >
          {fields.map(([label, value]) => (
            <div
              key={label}
              style={{
                padding: "10px 12px",
                borderRadius: "10px",
                background: "rgba(8, 15, 29, 0.45)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div style={{ fontSize: "0.72rem", color: "#7e8fa8", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {label}
              </div>
              <div style={{ fontSize: "0.92rem", color: "#e8eef7", lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
                {String(value)}
              </div>
            </div>
          ))}
        </div>

        {listFields.length > 0 && (
          <div style={{ display: "grid", gap: "10px" }}>
            {listFields.map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: "0.74rem", color: "#7e8fa8", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {label}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {value.map((item, index) => (
                    <span
                      key={`${label}-${index}`}
                      style={{
                        padding: "7px 10px",
                        borderRadius: "999px",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#dbe6f5",
                        fontSize: "0.84rem",
                        lineHeight: 1.35,
                      }}
                    >
                      {typeof item === "string" ? item : JSON.stringify(item)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isUser) {
    return (
      <div className={styles.userRow}>
        <div className={styles.userBubble}>{msg.content}</div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className={styles.assistantRow}>
      <div className={styles.avatar}>
        <svg viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" stroke="#4f8eff" strokeWidth="1.5" />
          <path d="M6 10.5C6 8.015 7.79 6 10 6s4 2.015 4 4.5" stroke="#4f8eff" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="10" cy="13" r="1.5" fill="#4f8eff"/>
        </svg>
      </div>
      <div className={styles.assistantContent}>
        {msg.isLoading ? (
          <div className={styles.loadingDots}>
            <span /><span /><span />
          </div>
        ) : (
          <>
            {renderStructuredData(msg.structured)}
            <div
              className={styles.assistantText}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
            />
            {msg.chart && <SalesChart config={msg.chart} />}
          </>
        )}
      </div>
    </div>
  );
}
