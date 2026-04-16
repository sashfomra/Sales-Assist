import { useState, useEffect } from "react";
import { DEALS as INITIAL_DEALS } from "./data/crm";
import Sidebar from "./components/Sidebar";
import ChatPanel from "./components/ChatPanel";
import PipelineView from "./components/PipelineView";
import DealsView from "./components/DealsView";
import CallsView from "./components/CallsView";
import ApiKeyModal from "./components/ApiKeyModal";
import DashboardView from "./components/DashboardView";
import RevenueView from "./components/RevenueView";
import ContactsView from "./components/ContactsView";
import TasksView from "./components/TasksView";
import AnalyzeCallView from "./components/AnalyzeCallView";
import LiveAssistView from "./components/LiveAssistView";
import styles from "./App.module.css";

const VIEW_LABELS = {
  dashboard: "Command Center",
  chat: "AI Assistant",
  liveAssist: "Live Assist",
  revenue: "Revenue & Forecast",
  pipeline: "Pipeline Board",
  deals: "Deals",
  calls: "Calls",
  contacts: "Contacts & Accounts",
  tasks: "Tasks & Follow-ups",
  analyzeCall: "Analyze Call",
};

export default function App() {
  const [view, setView] = useState("dashboard");
  const [deals, setDeals] = useState(INITIAL_DEALS);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("gemini_key") || "");
  const [showModal, setShowModal] = useState(false);
  const [prefillDeal, setPrefillDeal] = useState(null);
  const [prefillTranscript, setPrefillTranscript] = useState(null);
  const [activeDeal, setActiveDeal] = useState(null);

  useEffect(() => { if (!apiKey) setShowModal(true); }, []);

  function saveKey(k) { localStorage.setItem("gemini_key", k); setApiKey(k); }

  function handleDealClick(deal) {
    setActiveDeal(deal.id);
    setPrefillDeal(deal);
    setView("chat");
  }

  function handleAskAI(deal) { setPrefillDeal(deal); setView("chat"); }

  function handleAddDeal(newDeal) {
    setDeals(prev => [...prev, newDeal]);
  }

  return (
    <div className={styles.app}>
      <Sidebar
        activeView={view}
        deals={deals}
        onViewChange={v => { setView(v); setPrefillDeal(null); setPrefillTranscript(null); }}
        onDealClick={handleDealClick}
        activeDeal={activeDeal}
      />

      <div className={styles.main}>
        {/* Topbar */}
        <div className={styles.topbar}>
          <div className={styles.breadcrumb}>
            <span className={styles.breadHome}>SalesIQ</span>
            <span className={styles.breadSep}>/</span>
            <span className={styles.breadCurrent}>{VIEW_LABELS[view]}</span>
          </div>
          <div className={styles.topbarActions}>
            <div className={styles.apiStatus} onClick={() => setShowModal(true)}>
              <span className={`${styles.apiDot} ${apiKey ? styles.apiConnected : styles.apiDisconnected}`} />
              <span>{apiKey ? "Gemini connected" : "No API key"}</span>
              <span className={styles.apiEdit}>⚙</span>
            </div>
          </div>
        </div>

        {/* Views */}
        <div className={styles.content}>
          {view === "dashboard" && <DashboardView deals={deals} onNavigate={setView} />}
          {view === "chat" && <ChatPanel apiKey={apiKey} prefillDeal={prefillDeal} prefillTranscript={prefillTranscript} />}
          {view === "liveAssist" && <LiveAssistView apiKey={apiKey} deals={deals} />}
          {view === "revenue" && <RevenueView deals={deals} />}
          {view === "pipeline" && <PipelineView deals={deals} onDealClick={handleDealClick} />}
          {view === "deals" && <DealsView deals={deals} onAskAI={handleAskAI} onAddDeal={handleAddDeal} />}
          {view === "calls" && <CallsView deals={deals} onAskAI={handleAskAI} />}
          {view === "contacts" && <ContactsView />}
          {view === "tasks" && <TasksView deals={deals} />}
          {view === "analyzeCall" && <AnalyzeCallView apiKey={apiKey} onChatWithTranscript={t => { setPrefillTranscript(t); setView("chat"); }} />}
        </div>
      </div>

      {showModal && (
        <ApiKeyModal current={apiKey} onSave={saveKey} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
