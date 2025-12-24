import React, { useState } from "react";
import { api } from "../lib/api";

export default function ActionsPanel() {
  const [log, setLog] = useState([]);

  async function run(label, fn) {
    setLog(prev => [...prev, `▶ ${label}…`]);
    try {
      const res = await fn();
      setLog(prev => [...prev, `✅ ${label}`, JSON.stringify(res).slice(0, 1000)]);
    } catch (e) {
      setLog(prev => [...prev, `❌ ${label}: ${e.message || e}`]);
    }
  }

  function addLog(msg) {
    setLog(prev => [...prev, msg]);
  }

  return (
    <section className="glass rounded-2xl p-4 md:p-6 space-y-3">
      <h2 className="text-lg font-semibold">Actions rapides</h2>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => run("Analyser les leads", () => api.get('/api/leads/analyze'))}
          className="btn rounded-lg px-3 py-2 bg-zinc-900 text-white"
        >
          /api/leads/analyze
        </button>
        <button
          onClick={() => run("Ask Task (par défaut)", () => api.post('/api/ask-task', { task: 'analyze' }))}
          className="btn rounded-lg px-3 py-2 bg-zinc-900 text-white"
        >
          /api/ask-task
        </button>
        <button
          onClick={() => run("Suggérer des tags", () => api.post('/api/tags/suggest', {}))}
          className="btn rounded-lg px-3 py-2 bg-zinc-900 text-white"
        >
          /api/tags/suggest
        </button>
        <button
          onClick={() => run("Appliquer tags suggérés", () => api.post('/api/tags/apply-suggested', {}))}
          className="btn rounded-lg px-3 py-2 bg-zinc-900 text-white"
        >
          /api/tags/apply-suggested
        </button>
        <button
          onClick={async () => {
            addLog('▶ /api/process-leads…');
            try {
              const r = await api.post('/api/process-leads', {});
              addLog('✅ Traitement intelligent OK');
              addLog(JSON.stringify(r, null, 2));
            } catch (e) {
              addLog('❌ /api/process-leads: ' + (e.message || e));
            }
          }}
          className="btn rounded-lg px-3 py-2 bg-zinc-900 text-white"
        >
          /api/process-leads
        </button>
        <button
          onClick={async () => {
            addLog('▶ /api/trigger-n8n…');
            try {
              const r = await api.post('/api/trigger-n8n', { event: 'apply_suggested_tags', payload: { time: Date.now() } });
              addLog('✅ n8n déclenché');
              addLog(JSON.stringify(r, null, 2));
            } catch (e) {
              addLog('❌ /api/trigger-n8n: ' + (e.message || e));
            }
          }}
          className="btn rounded-lg px-3 py-2 bg-zinc-900 text-white"
        >
          /api/trigger-n8n
        </button>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="text-xs text-white/60 mb-2">Log</div>
        <pre className="text-xs whitespace-pre-wrap break-words max-h-64 overflow-auto">
          {log.join('\n')}
        </pre>
      </div>
    </section>
  );
}
 
