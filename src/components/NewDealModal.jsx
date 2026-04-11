import { useState } from "react";
import styles from "./NewDealModal.module.css";
import { REPS } from "../data/crm";

const STAGES = ["Qualification", "Demo", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];

export default function NewDealModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    company: "",
    contact: "",
    value: "",
    stage: "Qualification",
    closeDate: "",
    owner: REPS[0]?.name || "Unassigned"
  });

  function handleSubmit(e) {
    e.preventDefault();
    const newDeal = {
      id: `D${Date.now()}`,
      name: `${formData.company} — New Deal`,
      stage: formData.stage,
      value: parseInt(formData.value, 10) || 0,
      probability: 50,
      owner: formData.owner,
      daysInStage: 0,
      closeDate: formData.closeDate || new Date().toISOString().split("T")[0],
      company: formData.company,
      contact: formData.contact,
      accountId: `A${Date.now()}`,
      notes: "Newly created deal.",
      activities: [],
      tags: [],
      score: 50,
      trend: "stable"
    };
    onSave(newDeal);
    onClose();
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Add New Deal</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label>Company Name</label>
              <input
                type="text"
                required
                value={formData.company}
                onChange={e => setFormData({...formData, company: e.target.value})}
                placeholder="e.g. Acme Corp"
              />
            </div>
            <div className={styles.field}>
              <label>Contact Person</label>
              <input
                type="text"
                required
                value={formData.contact}
                onChange={e => setFormData({...formData, contact: e.target.value})}
                placeholder="e.g. Jane Doe"
              />
            </div>
            <div className={styles.field}>
              <label>Deal Value ($)</label>
              <input
                type="number"
                required
                min="0"
                value={formData.value}
                onChange={e => setFormData({...formData, value: e.target.value})}
                placeholder="e.g. 50000"
              />
            </div>
            <div className={styles.field}>
              <label>Expected Close Date</label>
              <input
                type="date"
                required
                value={formData.closeDate}
                onChange={e => setFormData({...formData, closeDate: e.target.value})}
              />
            </div>
            <div className={styles.field}>
              <label>Stage</label>
              <select
                value={formData.stage}
                onChange={e => setFormData({...formData, stage: e.target.value})}
              >
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Owner</label>
              <select
                value={formData.owner}
                onChange={e => setFormData({...formData, owner: e.target.value})}
              >
                {REPS.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.saveBtn}>Create Deal</button>
          </div>
        </form>
      </div>
    </div>
  );
}
