import { useState } from "react";
import { TASKS } from "../data/crm";
import styles from "./TasksView.module.css";

const P_COLOR = { Critical:"#f87171", High:"#fbbf24", Medium:"#38bdf8", Low:"#7e8fa8" };
const T_ICON  = { Call:"📞", Email:"✉️", Meeting:"📅", Document:"📄" };

export default function TasksView({ deals }) {
  const [tasks, setTasks] = useState(TASKS);
  const [filter, setFilter] = useState("all");

  function toggle(id) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }

  const filters = [
    { id: "all",      label: "All",      count: tasks.length },
    { id: "open",     label: "Open",     count: tasks.filter(t=>!t.done).length },
    { id: "critical", label: "Critical", count: tasks.filter(t=>t.priority==="Critical"&&!t.done).length },
    { id: "done",     label: "Done",     count: tasks.filter(t=>t.done).length },
  ];

  const visible = tasks.filter(t => {
    if (filter === "open")     return !t.done;
    if (filter === "critical") return t.priority === "Critical" && !t.done;
    if (filter === "done")     return t.done;
    return true;
  });

  const getDeal = id => deals.find(d => d.id === id);

  return (
    <div className={styles.view}>
      <div className={styles.header}>
        <h1 className={styles.title}>Tasks & Follow-ups</h1>
        <div className={styles.filters}>
          {filters.map(f => (
            <button key={f.id} className={`${styles.filter} ${filter===f.id?styles.active:""}`} onClick={()=>setFilter(f.id)}>
              {f.label} <span className={styles.filterCount}>{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Summary row */}
      <div className={styles.summary}>
        {[
          { label:"Critical",  count:tasks.filter(t=>t.priority==="Critical"&&!t.done).length, color:"#f87171" },
          { label:"High",      count:tasks.filter(t=>t.priority==="High"&&!t.done).length, color:"#fbbf24" },
          { label:"Completed", count:tasks.filter(t=>t.done).length, color:"#34d399" },
          { label:"Total Open",count:tasks.filter(t=>!t.done).length, color:"#4f8eff" },
        ].map(s => (
          <div key={s.label} className={styles.summaryCard}>
            <span className={styles.summaryVal} style={{color:s.color}}>{s.count}</span>
            <span className={styles.summaryLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.taskList}>
        {visible.map(task => {
          const deal = getDeal(task.dealId);
          return (
            <div key={task.id} className={`${styles.taskCard} ${task.done?styles.taskDone:""}`}>
              <button className={`${styles.checkbox} ${task.done?styles.checked:""}`} onClick={()=>toggle(task.id)}>
                {task.done && <svg viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </button>
              <span className={styles.typeIcon}>{T_ICON[task.type]}</span>
              <div className={styles.taskBody}>
                <p className={styles.taskTitle}>{task.title}</p>
                <div className={styles.taskMeta}>
                  <span>{task.assignee}</span>
                  <span>·</span>
                  <span>Due {task.due}</span>
                  {deal && <><span>·</span><span className={styles.taskDeal}>{deal.company}</span></>}
                </div>
              </div>
              <div className={styles.taskRight}>
                <span className={styles.priority} style={{color:P_COLOR[task.priority],background:P_COLOR[task.priority]+"18",borderColor:P_COLOR[task.priority]+"40"}}>
                  {task.priority}
                </span>
                <span className={styles.taskType}>{task.type}</span>
              </div>
            </div>
          );
        })}
        {visible.length === 0 && <div className={styles.empty}>No tasks in this view ✓</div>}
      </div>
    </div>
  );
}
