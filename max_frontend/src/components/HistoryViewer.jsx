import React, { useEffect, useState } from "react";

// Use relative API path; backend proxy will handle /api requests during development
const API = "";

export default function HistoryViewer() {
  const [history, setHistory] = useState([]);
  const [filterHours, setFilterHours] = useState(48);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch(`${API}/api/history`)
      .then((r) => r.json())
      .then((rows) => {
        const now = Date.now();
        const cutoff = now - filterHours * 3600 * 1000;
        const filtered = rows
          .filter((r) => new Date(r.timestamp || r.date || 0).getTime() > cutoff)
          .reverse(); // Plus récents en haut
        setHistory(filtered);
      })
      .catch((e) => console.warn("⚠️ Erreur chargement historique :", e));
  }, [filterHours, open]);

  return (
    <div style={{ marginTop: 40 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: "6px 12px",
          borderRadius: 6,
          backgroundColor: "#f3f3f3",
          border: "1px solid #ccc",
          cursor: "pointer",
          marginBottom: 10
        }}
      >
        {open ? "🔽 Fermer l’historique" : "🕓 Voir l’historique M.A.X."}
      </button>

      {open && (
        <div>
          <div style={{ marginBottom: 10 }}>
            <label>Afficher les messages des dernières : </label>
            <select value={filterHours} onChange={(e) => setFilterHours(Number(e.target.value))}>
              <option value={24}>24h</option>
              <option value={48}>48h</option>
              <option value={168}>7 jours</option>
              <option value={999999}>Tout</option>
            </select>
          </div>
          <div
            style={{
              maxHeight: 300,
              overflowY: "auto",
              background: "#fafafa",
              padding: 10,
              border: "1px solid #ccc",
              borderRadius: 6
            }}
          >
            {history.length === 0 ? (
              <div style={{ fontStyle: "italic", color: "#777" }}>Aucun message pour cette période.</div>
            ) : (
              history.map((h, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <b>{h.role === "ai" ? "🤖 M.A.X." : "🧑 Vous"}</b> — <small>{new Date(h.timestamp).toLocaleString()}</small>
                  <div style={{ whiteSpace: "pre-wrap" }}>{h.message}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
