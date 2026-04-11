import { useState } from "react";
import { CONTACTS, ACCOUNTS } from "../data/crm";
import styles from "./ContactsView.module.css";

const SENT_COLOR = { "Very Positive":"#34d399","Positive":"#4f8eff","Neutral":"#fbbf24","Tense":"#f87171" };

export default function ContactsView() {
  const [view, setView]       = useState("contacts");
  const [selected, setSelected] = useState(CONTACTS[0]);
  const [search, setSearch]   = useState("");

  const filtered = (view === "contacts" ? CONTACTS : ACCOUNTS).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase()) ||
    c.industry?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.view}>
      <div className={styles.header}>
        <h1 className={styles.title}>Contacts & Accounts</h1>
        <div className={styles.headerRight}>
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${view==="contacts"?styles.active:""}`} onClick={()=>setView("contacts")}>Contacts</button>
            <button className={`${styles.tab} ${view==="accounts"?styles.active:""}`} onClick={()=>setView("accounts")}>Accounts</button>
          </div>
          <input className={styles.search} placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.list}>
          {view === "contacts" ? filtered.map(c => (
            <button key={c.id} className={`${styles.contactRow} ${selected?.id===c.id?styles.rowActive:""}`} onClick={()=>setSelected(c)}>
              <div className={styles.avatar}>{c.name.split(" ").map(w=>w[0]).join("").slice(0,2)}</div>
              <div className={styles.contactInfo}>
                <p className={styles.contactName}>{c.name}</p>
                <p className={styles.contactSub}>{c.title} · {c.company}</p>
              </div>
              <span className={styles.sentDot} style={{background: SENT_COLOR[c.sentiment]||"#7e8fa8"}}/>
            </button>
          )) : filtered.map(acc => (
            <button key={acc.id} className={`${styles.contactRow} ${selected?.id===acc.id?styles.rowActive:""}`} onClick={()=>setSelected(acc)}>
              <div className={styles.avatar} style={{background:"rgba(79,142,255,0.15)",color:"var(--accent)"}}>{acc.name[0]}</div>
              <div className={styles.contactInfo}>
                <p className={styles.contactName}>{acc.name}</p>
                <p className={styles.contactSub}>{acc.industry} · {acc.size}</p>
              </div>
              <div className={styles.healthScore} style={{color: acc.healthScore>70?"#34d399":acc.healthScore>45?"#fbbf24":"#f87171"}}>{acc.healthScore}</div>
            </button>
          ))}
        </div>

        {selected && view === "contacts" && (
          <div className={styles.detail}>
            <div className={styles.detailHeader}>
              <div className={styles.bigAvatar}>{selected.name.split(" ").map(w=>w[0]).join("").slice(0,2)}</div>
              <div>
                <h2 className={styles.detailName}>{selected.name}</h2>
                <p className={styles.detailTitle}>{selected.title}</p>
                <p className={styles.detailCo}>{selected.company}</p>
              </div>
            </div>
            <div className={styles.sentRow}>
              <span className={styles.sentLabel}>Sentiment</span>
              <span className={styles.sentBadge} style={{color:SENT_COLOR[selected.sentiment],background:SENT_COLOR[selected.sentiment]+"18",borderColor:SENT_COLOR[selected.sentiment]+"44"}}>{selected.sentiment}</span>
            </div>
            <div className={styles.fields}>
              {[["Email",selected.email],["Phone",selected.phone],["Last Contact",selected.lastContact]].map(([l,v])=>(
                <div key={l} className={styles.field}><span className={styles.fieldLabel}>{l}</span><span className={styles.fieldVal}>{v}</span></div>
              ))}
            </div>
            <div className={styles.notesSection}>
              <p className={styles.notesLabel}>Notes</p>
              <p className={styles.notesText}>{selected.notes}</p>
            </div>
          </div>
        )}

        {selected && view === "accounts" && (
          <div className={styles.detail}>
            <div className={styles.detailHeader}>
              <div className={styles.bigAvatar} style={{background:"rgba(79,142,255,0.15)",color:"var(--accent)",fontSize:24}}>{selected.name[0]}</div>
              <div>
                <h2 className={styles.detailName}>{selected.name}</h2>
                <p className={styles.detailTitle}>{selected.industry} · {selected.size}</p>
                <p className={styles.detailCo}>{selected.location}</p>
              </div>
            </div>
            <div className={styles.accountStats}>
              {[
                {label:"Employees",val:selected.employees?.toLocaleString()},
                {label:"ARR",val:selected.arr>0?`$${(selected.arr/1000).toFixed(0)}K`:"—"},
                {label:"Since",val:selected.since},
                {label:"Health",val:`${selected.healthScore}/100`},
              ].map(s=>(
                <div key={s.label} className={styles.accStat}>
                  <span className={styles.accStatVal}>{s.val}</span>
                  <span className={styles.accStatLabel}>{s.label}</span>
                </div>
              ))}
            </div>
            <div className={styles.fields}>
              {[["Website",selected.website],["Contacts",selected.contacts?.join(", ")]].map(([l,v])=>(
                <div key={l} className={styles.field}><span className={styles.fieldLabel}>{l}</span><span className={styles.fieldVal}>{v}</span></div>
              ))}
            </div>
            <div className={styles.healthSection}>
              <div className={styles.healthTop}><span>Account Health Score</span><span style={{color:selected.healthScore>70?"#34d399":selected.healthScore>45?"#fbbf24":"#f87171",fontWeight:700}}>{selected.healthScore}/100</span></div>
              <div className={styles.healthTrack}><div className={styles.healthFill} style={{width:`${selected.healthScore}%`,background:selected.healthScore>70?"#34d399":selected.healthScore>45?"#fbbf24":"#f87171"}}/></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
