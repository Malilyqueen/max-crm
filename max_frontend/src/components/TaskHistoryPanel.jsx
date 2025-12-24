// src/components/TaskHistoryPanel.jsx
import React, { useEffect, useState } from 'react';

export default function TaskHistoryPanel() {
  const [range, setRange] = useState('24h'); // '24h' | '48h' | 'all'
  const [data, setData] = useState({ ok: true, items: [], count: 0 });
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch(`/api/task-history?range=${range}`)
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [range]);

  return (
    <section id="task-history" className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Historique des tâches M.A.X.</h2>
        <div className="flex gap-2">
          <select
            value={range}
            onChange={e => setRange(e.target.value)}
            className="border rounded-xl px-3 py-2"
          >
            <option value="24h">Dernières 24h</option>
            <option value="48h">Dernières 48h</option>
            <option value="all">Tout</option>
          </select>
          <button onClick={load} className="border rounded-xl px-3 py-2">Rafraîchir</button>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 text-sm opacity-70">Chargement…</div>
      ) : !data.ok ? (
        <div className="mt-4 text-sm text-red-600">Erreur: {String(data.error || 'Inconnue')}</div>
      ) : !data.items?.length ? (
        <div className="mt-4 text-sm opacity-70">Aucune tâche trouvée.</div>
      ) : (
        <div className="mt-4 grid gap-3">
          {data.items.map((it, idx) => (
            <div key={idx} className="rounded-2xl border p-4">
              <div className="text-xs opacity-70">{new Date(it.timestamp).toLocaleString()}</div>
              <div className="font-semibold">{it.action}</div>
              {it.entity && <div className="text-xs">Entité : {it.entity}</div>}
              {it.details && (
                <pre className="text-xs mt-2 overflow-auto">
{JSON.stringify(it.details, null, 2)}
                </pre>
              )}
              <div className="text-xs opacity-70 mt-2">Acteur : {it.actor || 'M.A.X.'}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
