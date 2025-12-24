// src/components/TaskHighlights.jsx
import React, { useEffect, useState } from 'react';

export default function TaskHighlights() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/task-highlights')
      .then(r => r.json())
      .then(d => {
        if (d.ok) setItems(d.items || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm opacity-70">Chargement des dernières actions…</div>;
  if (!items.length) return <div className="text-sm opacity-70">Aucune action récente.</div>;

  return (
    <div className="mt-4 grid gap-3">
      {items.map((it, idx) => (
        <div key={idx} className="rounded-2xl shadow p-4 border">
          <div className="text-xs opacity-70">{new Date(it.timestamp).toLocaleString()}</div>
          <div className="font-semibold">{it.action}</div>
          {it.entity && <div className="text-xs">Entité : {it.entity}</div>}
          {it.details && (
            <pre className="text-xs mt-2 overflow-auto">
{JSON.stringify(it.details, null, 2)}
            </pre>
          )}
        </div>
      ))}
      <div className="text-right">
        <a className="underline text-sm" href="#task-history">Voir toutes les suggestions / actions</a>
      </div>
    </div>
  );
}
