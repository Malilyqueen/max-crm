import React from 'react';

export default function AjouterLeads({ leads, onAdded }) {
  if (!leads || leads.length === 0) return null;

  async function handleAdd() {
    try {
      const res = await fetch('http://localhost:3005/api/leads/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ leads, context: "campagne_rentree" })
      });
      const data = await res.json();
      if (data.ok) {
        alert(`✅ ${data.insertedCount} leads ajoutés, ${data.duplicateCount} doublons ignorés.`);
        onAdded?.(data);
      } else {
        alert('Erreur: ' + data.error);
      }
    } catch (err) {
      alert('Erreur réseau: ' + err.message);
    }
  }

  return (
    <div className="ajouter-leads">
      <button onClick={handleAdd}>➕ Ajouter {leads.length} leads</button>
    </div>
  );
}
