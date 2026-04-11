// ── SalesIQ CRM Data Layer ─────────────────────────────────────
// Full mock dataset: deals, calls, contacts, tasks, revenue, activities

export const DEALS = [
  {
    id: "D001", name: "Acme Corp — Enterprise License",
    stage: "Negotiation", value: 128000, probability: 80,
    owner: "Priya S.", daysInStage: 12, closeDate: "2024-03-15",
    company: "Acme Corp", contact: "John Harlow", accountId: "A001",
    notes: "Final pricing call scheduled for Monday. Legal reviewing MSA.",
    activities: ["Demo completed", "Proposal sent", "Legal review in progress"],
    tags: ["Enterprise", "High-value"], score: 82, trend: "up"
  },
  {
    id: "D002", name: "TechNova SaaS Bundle",
    stage: "Proposal", value: 54000, probability: 55,
    owner: "Raj M.", daysInStage: 7, closeDate: "2024-03-22",
    company: "TechNova", contact: "Sara Kim", accountId: "A002",
    notes: "Competitor eval ongoing. Needs security questionnaire.",
    activities: ["Discovery call done", "Proposal sent"],
    tags: ["Mid-market", "SaaS"], score: 58, trend: "stable"
  },
  {
    id: "D003", name: "GlobalBank Compliance Suite",
    stage: "Qualification", value: 210000, probability: 35,
    owner: "Priya S.", daysInStage: 3, closeDate: "2024-04-30",
    company: "GlobalBank", contact: "Michael Chen", accountId: "A003",
    notes: "Initial interest confirmed. Needs executive sponsor.",
    activities: ["Cold outreach response", "Intro call booked"],
    tags: ["Enterprise", "Finance", "High-value"], score: 41, trend: "up"
  },
  {
    id: "D004", name: "RetailPro Inventory AI",
    stage: "Closed Won", value: 36000, probability: 100,
    owner: "Amir K.", daysInStage: 0, closeDate: "2024-02-28",
    company: "RetailPro", contact: "Lisa Tran", accountId: "A004",
    notes: "Contract signed. Onboarding kickoff March 5.",
    activities: ["Signed", "PO received", "Kickoff scheduled"],
    tags: ["SMB", "Retail"], score: 100, trend: "stable"
  },
  {
    id: "D005", name: "HealthOS Patient Analytics",
    stage: "Demo", value: 89000, probability: 60,
    owner: "Amir K.", daysInStage: 5, closeDate: "2024-03-30",
    company: "HealthOS", contact: "Dr. Patel", accountId: "A005",
    notes: "Technical demo next week. HIPAA compliance is key concern.",
    activities: ["Discovery done", "Technical eval scheduled"],
    tags: ["Mid-market", "Healthcare"], score: 64, trend: "up"
  },
  {
    id: "D006", name: "StartupHub Seed Pack",
    stage: "Closed Lost", value: 12000, probability: 0,
    owner: "Raj M.", daysInStage: 0, closeDate: "2024-02-20",
    company: "StartupHub", contact: "Nia Osei", accountId: "A006",
    notes: "Went with competitor. Cited pricing.",
    activities: ["Proposal rejected"],
    tags: ["SMB", "Startup"], score: 0, trend: "down"
  },
  {
    id: "D007", name: "LogiChain Fleet Management",
    stage: "Negotiation", value: 175000, probability: 75,
    owner: "Priya S.", daysInStage: 18, closeDate: "2024-03-10",
    company: "LogiChain", contact: "Tom Wagner", accountId: "A007",
    notes: "Stalled on multi-year discount terms. Escalate to VP.",
    activities: ["Demo done", "Legal approved", "Pricing negotiation"],
    tags: ["Enterprise", "Logistics"], score: 55, trend: "down"
  },
  {
    id: "D008", name: "EduTech LMS Platform",
    stage: "Proposal", value: 42000, probability: 50,
    owner: "Raj M.", daysInStage: 14, closeDate: "2024-04-05",
    company: "EduTech Inc", contact: "Rachel Park", accountId: "A008",
    notes: "Waiting for budget approval from board.",
    activities: ["Demo done", "Proposal sent"],
    tags: ["Mid-market", "Education"], score: 47, trend: "stable"
  },
  {
    id: "D009", name: "CloudSec Zero Trust Platform",
    stage: "Demo", value: 145000, probability: 65,
    owner: "Priya S.", daysInStage: 4, closeDate: "2024-04-15",
    company: "CloudSec Ltd", contact: "Amy Zhang", accountId: "A009",
    notes: "Strong interest from CISO. Budget confirmed Q2.",
    activities: ["Intro call done", "Technical demo scheduled"],
    tags: ["Enterprise", "Security", "High-value"], score: 71, trend: "up"
  },
  {
    id: "D010", name: "FinTrust Risk Engine",
    stage: "Qualification", value: 78000, probability: 40,
    owner: "Amir K.", daysInStage: 6, closeDate: "2024-05-01",
    company: "FinTrust", contact: "David Okafor", accountId: "A010",
    notes: "Regulatory compliance angle resonating. Early stage.",
    activities: ["LinkedIn outreach", "Discovery call booked"],
    tags: ["Mid-market", "Finance"], score: 44, trend: "up"
  }
];

export const ACCOUNTS = [
  { id: "A001", name: "Acme Corp", industry: "Manufacturing", size: "Enterprise", employees: 5200, arr: 128000, healthScore: 82, website: "acmecorp.com", location: "San Francisco, CA", since: "2023-06", contacts: ["John Harlow", "Emily Ross"], deals: ["D001"] },
  { id: "A002", name: "TechNova", industry: "SaaS", size: "Mid-market", employees: 340, arr: 54000, healthScore: 58, website: "technova.io", location: "Austin, TX", since: "2024-01", contacts: ["Sara Kim"], deals: ["D002"] },
  { id: "A003", name: "GlobalBank", industry: "Finance", size: "Enterprise", employees: 28000, arr: 0, healthScore: 41, website: "globalbank.com", location: "New York, NY", since: "2024-02", contacts: ["Michael Chen", "VP Legal"], deals: ["D003"] },
  { id: "A004", name: "RetailPro", industry: "Retail", size: "SMB", employees: 85, arr: 36000, healthScore: 95, website: "retailpro.co", location: "Chicago, IL", since: "2023-11", contacts: ["Lisa Tran"], deals: ["D004"] },
  { id: "A005", name: "HealthOS", industry: "Healthcare", size: "Mid-market", employees: 620, arr: 0, healthScore: 64, website: "healthos.io", location: "Boston, MA", since: "2024-01", contacts: ["Dr. Patel", "IT Director"], deals: ["D005"] },
  { id: "A007", name: "LogiChain", industry: "Logistics", size: "Enterprise", employees: 3100, arr: 0, healthScore: 55, website: "logichain.com", location: "Dallas, TX", since: "2023-12", contacts: ["Tom Wagner"], deals: ["D007"] },
  { id: "A008", name: "EduTech Inc", industry: "Education", size: "Mid-market", employees: 210, arr: 0, healthScore: 47, website: "edutechinc.com", location: "Seattle, WA", since: "2024-01", contacts: ["Rachel Park"], deals: ["D008"] },
  { id: "A009", name: "CloudSec Ltd", industry: "Cybersecurity", size: "Enterprise", employees: 1800, arr: 0, healthScore: 71, website: "cloudsec.com", location: "Washington, DC", since: "2024-02", contacts: ["Amy Zhang", "CISO"], deals: ["D009"] },
];

export const CONTACTS = [
  { id: "C001", name: "John Harlow", title: "VP of Operations", company: "Acme Corp", accountId: "A001", email: "j.harlow@acmecorp.com", phone: "+1 415 555 0182", dealId: "D001", lastContact: "2024-02-26", sentiment: "Positive", notes: "Key champion. Has exec buy-in." },
  { id: "C002", name: "Sara Kim", title: "Head of Engineering", company: "TechNova", accountId: "A002", email: "sara@technova.io", phone: "+1 512 555 0134", dealId: "D002", lastContact: "2024-02-24", sentiment: "Neutral", notes: "Evaluating 2 vendors. Security focus." },
  { id: "C003", name: "Michael Chen", title: "Chief Compliance Officer", company: "GlobalBank", accountId: "A003", email: "m.chen@globalbank.com", phone: "+1 212 555 0167", dealId: "D003", lastContact: "2024-02-22", sentiment: "Positive", notes: "Needs board approval for spend." },
  { id: "C004", name: "Lisa Tran", title: "CTO", company: "RetailPro", accountId: "A004", email: "lisa@retailpro.co", phone: "+1 312 555 0198", dealId: "D004", lastContact: "2024-02-28", sentiment: "Very Positive", notes: "Signed! Great relationship." },
  { id: "C005", name: "Dr. Patel", title: "Chief Medical Officer", company: "HealthOS", accountId: "A005", email: "patel@healthos.io", phone: "+1 617 555 0145", dealId: "D005", lastContact: "2024-02-25", sentiment: "Very Positive", notes: "HIPAA compliance is top priority." },
  { id: "C006", name: "Tom Wagner", title: "Director of Operations", company: "LogiChain", accountId: "A007", email: "t.wagner@logichain.com", phone: "+1 972 555 0121", dealId: "D007", lastContact: "2024-02-23", sentiment: "Tense", notes: "Pushing hard on discount. Risk of churn." },
  { id: "C007", name: "Rachel Park", title: "L&D Manager", company: "EduTech Inc", accountId: "A008", email: "r.park@edutechinc.com", phone: "+1 206 555 0177", dealId: "D008", lastContact: "2024-02-21", sentiment: "Neutral", notes: "Waiting on board budget approval." },
  { id: "C008", name: "Amy Zhang", title: "CISO", company: "CloudSec Ltd", accountId: "A009", email: "a.zhang@cloudsec.com", phone: "+1 202 555 0156", dealId: "D009", lastContact: "2024-02-27", sentiment: "Positive", notes: "Budget confirmed Q2. Strong champion." },
];

export const TASKS = [
  { id: "T001", title: "Send revised MSA to Acme Corp", dealId: "D001", assignee: "Priya S.", due: "2024-03-01", priority: "High", done: false, type: "Document" },
  { id: "T002", title: "Security questionnaire — TechNova", dealId: "D002", assignee: "Raj M.", due: "2024-03-02", priority: "High", done: false, type: "Document" },
  { id: "T003", title: "Schedule exec alignment call — GlobalBank", dealId: "D003", assignee: "Priya S.", due: "2024-03-03", priority: "Medium", done: false, type: "Call" },
  { id: "T004", title: "Onboarding kickoff — RetailPro", dealId: "D004", assignee: "Amir K.", due: "2024-03-05", priority: "High", done: true, type: "Meeting" },
  { id: "T005", title: "Send HIPAA BAA — HealthOS", dealId: "D005", assignee: "Amir K.", due: "2024-03-04", priority: "High", done: false, type: "Document" },
  { id: "T006", title: "VP Sales to call Tom Wagner — LogiChain", dealId: "D007", assignee: "Priya S.", due: "2024-02-29", priority: "Critical", done: false, type: "Call" },
  { id: "T007", title: "Follow up on board approval — EduTech", dealId: "D008", assignee: "Raj M.", due: "2024-03-06", priority: "Medium", done: false, type: "Email" },
  { id: "T008", title: "Technical demo prep — CloudSec", dealId: "D009", assignee: "Priya S.", due: "2024-03-07", priority: "High", done: false, type: "Meeting" },
  { id: "T009", title: "Prepare counter-offer — LogiChain", dealId: "D007", assignee: "Raj M.", due: "2024-03-01", priority: "Critical", done: false, type: "Document" },
  { id: "T010", title: "Discovery call — FinTrust", dealId: "D010", assignee: "Amir K.", due: "2024-03-08", priority: "Medium", done: false, type: "Call" },
];

export const CALLS = [
  { id: "CL001", deal: "D001", type: "Negotiation Call", date: "2024-02-26", duration: "42 min", rep: "Priya S.", sentiment: "Positive", outcome: "Price agreed in principle", summary: "John confirmed budget approval. Discussed 3-year vs 2-year commitment. Agreed on 15% multi-year discount. Next step: legal sign-off.", keyMoments: ["Budget confirmed at $128K", "Legal timeline: 2 weeks", "Champion: John Harlow"], objections: ["Needs IT security review", "Prefers annual payment"], nextSteps: ["Send revised MSA", "Schedule exec alignment call"] },
  { id: "CL002", deal: "D002", type: "Discovery Call", date: "2024-02-24", duration: "28 min", rep: "Raj M.", sentiment: "Neutral", outcome: "Proposal requested", summary: "Sara mentioned they're evaluating two vendors. Biggest pain: manual reporting. Liked our integration story but wants security docs.", keyMoments: ["Pain: 8hrs/week manual reports", "Timeline: Q2 go-live", "Decision: 3 stakeholders"], objections: ["Security concerns", "Budget not confirmed yet"], nextSteps: ["Send security questionnaire", "Proposal by Friday"] },
  { id: "CL003", deal: "D005", type: "Technical Demo", date: "2024-02-25", duration: "55 min", rep: "Amir K.", sentiment: "Very Positive", outcome: "Advanced to next stage", summary: "Dr. Patel loved the HIPAA compliance module. Their IT team was impressed by the audit trail feature. Budget greenlit internally.", keyMoments: ["HIPAA module: strong fit", "IT team approved", "Budget $89K approved"], objections: ["Data residency requirements", "Need pilot program"], nextSteps: ["Send HIPAA BAA", "Schedule pilot kickoff"] },
  { id: "CL004", deal: "D007", type: "Negotiation Call", date: "2024-02-23", duration: "35 min", rep: "Priya S.", sentiment: "Tense", outcome: "Escalation needed", summary: "Tom pushed hard on 40% multi-year discount which we can't support. Suggested escalating to VP Sales for custom terms. Risk of churn.", keyMoments: ["Asked for 40% discount", "Competitor offer mentioned", "3-year deal possible"], objections: ["Pricing too high", "Competitor cheaper by 20%"], nextSteps: ["VP Sales to call Tom", "Prepare counter-offer"] },
  { id: "CL005", deal: "D009", type: "Intro Call", date: "2024-02-27", duration: "30 min", rep: "Priya S.", sentiment: "Positive", outcome: "Demo scheduled", summary: "Amy Zhang confirmed budget is approved for Q2. CISO is the economic buyer. Compliance with FedRAMP is critical. Strong fit.", keyMoments: ["Budget Q2 confirmed", "FedRAMP requirement", "Demo booked for March 8"], objections: ["FedRAMP certification needed", "Long procurement cycle"], nextSteps: ["Send FedRAMP docs", "Technical demo prep"] },
];

export const PIPELINE_STAGES = {
  "Qualification": { deals: 2, value: 288000, color: "#4f8eff" },
  "Demo":          { deals: 2, value: 234000, color: "#a78bfa" },
  "Proposal":      { deals: 2, value: 96000,  color: "#38bdf8" },
  "Negotiation":   { deals: 2, value: 303000, color: "#fbbf24" },
  "Closed Won":    { deals: 1, value: 36000,  color: "#34d399" },
  "Closed Lost":   { deals: 1, value: 12000,  color: "#f87171" }
};

export const METRICS = {
  totalPipeline:     957000,
  closedWon:         36000,
  winRate:           42,
  avgDealSize:       95700,
  avgSalesCycle:     47,
  quotaAttainment:   68,
  monthlyTarget:     150000,
  annualTarget:      1800000,
  annualClosed:      36000,
  forecastThisMonth: 118000,
  monthlyRevenue:    [28000, 42000, 58000, 35000, 89000, 54000, 128000, 0, 0, 0, 0, 0],
  monthLabels:       ["Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun","Jul"],
  closedByRep:       { "Priya S.": 128000, "Raj M.": 54000, "Amir K.": 89000 },
  pipelineByRep:     { "Priya S.": 513000, "Raj M.": 174000, "Amir K.": 267000 },
  quotaByRep:        { "Priya S.": 200000, "Raj M.": 150000, "Amir K.": 175000 },
  winLoss: {
    labels: ["Pricing", "Competitor", "No budget", "Timing", "Wrong fit"],
    won:    [12, 5, 3, 8, 2],
    lost:   [6, 9, 4, 3, 5]
  },
  conversionFunnel: {
    stages: ["Qualification", "Demo", "Proposal", "Negotiation", "Closed Won"],
    counts: [18, 12, 8, 5, 3],
    rates:  [100, 67, 44, 28, 17]
  },
  dealVelocity: {
    labels: ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb"],
    days:   [62, 55, 48, 51, 44, 47, 43]
  },
  forecastByMonth: [118000, 303000, 210000, 145000],
  forecastLabels:  ["Mar", "Apr", "May", "Jun"]
};

export const REPS = [
  { name: "Priya S.", avatar: "P", deals: 4, pipeline: 513000, closed: 128000, quota: 200000, winRate: 48, avgCycle: 42, calls: 18 },
  { name: "Raj M.",   avatar: "R", deals: 3, pipeline: 174000, closed: 54000,  quota: 150000, winRate: 38, avgCycle: 51, calls: 14 },
  { name: "Amir K.",  avatar: "A", deals: 3, pipeline: 267000, closed: 89000,  quota: 175000, winRate: 45, avgCycle: 44, calls: 16 },
];

export const ACTIVITIES = [
  { id: "ACT001", type: "call",     text: "Negotiation call with Acme Corp — price agreed",     rep: "Priya S.", time: "2h ago",  dealId: "D001" },
  { id: "ACT002", type: "email",    text: "Security questionnaire sent to TechNova",             rep: "Raj M.",   time: "4h ago",  dealId: "D002" },
  { id: "ACT003", type: "deal",     text: "CloudSec Ltd advanced to Demo stage",                 rep: "Priya S.", time: "6h ago",  dealId: "D009" },
  { id: "ACT004", type: "alert",    text: "LogiChain stalled 18 days — escalation needed",       rep: "System",   time: "8h ago",  dealId: "D007" },
  { id: "ACT005", type: "won",      text: "RetailPro deal CLOSED WON — $36K",                    rep: "Amir K.",  time: "1d ago",  dealId: "D004" },
  { id: "ACT006", type: "meeting",  text: "Technical demo completed — HealthOS loved HIPAA module", rep: "Amir K.", time: "1d ago", dealId: "D005" },
  { id: "ACT007", type: "proposal", text: "Proposal sent to EduTech Inc — $42K",                 rep: "Raj M.",   time: "2d ago",  dealId: "D008" },
  { id: "ACT008", type: "call",     text: "Intro call with CloudSec — demo scheduled",           rep: "Priya S.", time: "2d ago",  dealId: "D009" },
];

// RAG retrieval
export function retrieveContext(query) {
  const q = query.toLowerCase();
  const results = [];
  DEALS.forEach(d => {
    const score =
      (q.includes(d.company.toLowerCase()) ? 3 : 0) +
      (q.includes(d.name.toLowerCase()) ? 3 : 0) +
      (q.includes(d.stage.toLowerCase()) ? 2 : 0) +
      (q.includes(d.owner.toLowerCase().split(" ")[0]) ? 2 : 0) +
      (d.tags.some(t => q.includes(t.toLowerCase())) ? 1 : 0) +
      (q.includes("deal") || q.includes("pipeline") ? 1 : 0) +
      (q.includes("risk") && d.daysInStage > 10 ? 2 : 0) +
      (q.includes("stall") && d.daysInStage > 10 ? 2 : 0) +
      (q.includes("won") && d.stage === "Closed Won" ? 2 : 0) +
      (q.includes("lost") && d.stage === "Closed Lost" ? 2 : 0) +
      (q.includes("enterprise") && d.tags.includes("Enterprise") ? 2 : 0);
    if (score > 0) results.push({ type: "deal", data: d, score });
  });
  CALLS.forEach(c => {
    const score =
      (q.includes("call") || q.includes("conversation") ? 2 : 0) +
      (q.includes(c.rep.toLowerCase().split(" ")[0]) ? 2 : 0) +
      (q.includes("objection") ? 2 : 0) +
      (q.includes("next step") ? 2 : 0) +
      (q.includes("sentiment") ? 1 : 0);
    if (score > 0) results.push({ type: "call", data: c, score });
  });
  if (q.includes("pipeline") || q.includes("revenue") || q.includes("quota") ||
      q.includes("win rate") || q.includes("metric") || q.includes("performance") ||
      q.includes("summary") || q.includes("overview") || q.includes("forecast")) {
    results.push({ type: "metrics", data: METRICS, score: 3 });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 5);
}

export const CHART_TRIGGERS = ["chart","graph","visualize","show me","plot","trend","pipeline","breakdown","by stage","by rep","revenue","monthly","forecast"];
export function shouldShowChart(query) {
  return CHART_TRIGGERS.some(t => query.toLowerCase().includes(t));
}
