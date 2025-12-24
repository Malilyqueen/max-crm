/**
 * MetricsPage - Dashboard Budget & Tokens IA
 *
 * Page de monitoring et gestion du budget IA
 */

import { useState, useEffect } from 'react';
import { useAppCtx } from '../store/useAppCtx';

interface UsageData {
  ok: boolean;
  model: string;
  budget_total: number;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  calls_count: number;
  avg_tokens_per_task: number | null;
  tasks_left: number | null;
  cost_usd: number;
  cost_config: {
    input_per_million: number;
    output_per_million: number;
  };
}

interface HistoryEntry {
  ts: string;
  model: string;
  input: number;
  output: number;
  total: number;
  costDelta: number;
}

export function MetricsPage() {
  const { apiBase } = useAppCtx();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  const loadUsage = async () => {
    try {
      const res = await fetch(`${apiBase}/api/ai/usage`);
      const data = await res.json();
      if (data.ok) {
        setUsage(data);
      }
    } catch (error) {
      console.error('[MetricsPage] Erreur chargement usage:', error);
    }
  };

  const loadHistory = async (date: string) => {
    try {
      const res = await fetch(`${apiBase}/api/ai/usage/history?date=${date}`);
      const data = await res.json();
      if (data.ok) {
        setHistory(data.entries || []);
      }
    } catch (error) {
      console.error('[MetricsPage] Erreur chargement historique:', error);
    }
  };

  const handleReset = async () => {
    if (!confirm('Êtes-vous sûr de vouloir réinitialiser les compteurs? Cette action est irréversible.')) {
      return;
    }

    setResetting(true);
    try {
      const res = await fetch(`${apiBase}/api/ai/reset`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        alert('Compteurs réinitialisés avec succès!');
        loadUsage();
        loadHistory(selectedDate);
      } else {
        alert(`Erreur: ${data.error}`);
      }
    } catch (error) {
      console.error('[MetricsPage] Erreur reset:', error);
      alert('Erreur lors de la réinitialisation');
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    Promise.all([loadUsage(), loadHistory(selectedDate)]).finally(() => setLoading(false));

    // Polling toutes les 30s
    const interval = setInterval(loadUsage, 30_000);
    return () => clearInterval(interval);
  }, [apiBase]);

  useEffect(() => {
    loadHistory(selectedDate);
  }, [selectedDate]);

  if (loading || !usage) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-700 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Chargement des métriques...</p>
        </div>
      </div>
    );
  }

  const pct = Math.min(100, Math.round((usage.tokens.total / usage.budget_total) * 100));
  const capReached = usage.tokens.total >= usage.budget_total;

  let barColor = 'bg-cyan-500';
  if (pct > 90) barColor = 'bg-rose-500';
  else if (pct > 75) barColor = 'bg-orange-500';
  else if (pct > 50) barColor = 'bg-yellow-500';

  const estimatedDaysLeft = usage.avg_tokens_per_task
    ? Math.floor((usage.budget_total - usage.tokens.total) / (usage.avg_tokens_per_task * 10))
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Budget & Tokens IA</h1>
            <p className="text-slate-400">Monitoring et gestion de votre consommation IA</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300">
              Modèle: <span className="font-semibold text-cyan-400">{usage.model}</span>
            </span>
            <button
              onClick={handleReset}
              disabled={resetting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
            >
              {resetting ? 'Réinitialisation...' : 'Reset'}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Budget Global */}
          <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase">Budget Total</h3>
              <div className={`w-3 h-3 rounded-full ${capReached ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'}`}></div>
            </div>
            <p className="text-3xl font-bold text-white mb-2">{(usage.budget_total / 1000).toFixed(0)}K</p>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full transition-all ${barColor}`} style={{ width: `${pct}%` }}></div>
            </div>
            <p className="text-xs text-slate-500 mt-2">{pct}% utilisé</p>
          </div>

          {/* Tokens Consommés */}
          <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-6 shadow-lg">
            <h3 className="text-sm font-semibold text-slate-400 uppercase mb-4">Consommés</h3>
            <p className="text-3xl font-bold text-cyan-400 mb-2">{(usage.tokens.total / 1000).toFixed(1)}K</p>
            <div className="space-y-1 text-xs text-slate-500">
              <p>Input: {(usage.tokens.input / 1000).toFixed(1)}K</p>
              <p>Output: {(usage.tokens.output / 1000).toFixed(1)}K</p>
            </div>
          </div>

          {/* Coût Total */}
          <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-6 shadow-lg">
            <h3 className="text-sm font-semibold text-slate-400 uppercase mb-4">Coût Total</h3>
            <p className="text-3xl font-bold text-emerald-400 mb-2">${usage.cost_usd.toFixed(4)}</p>
            <div className="space-y-1 text-xs text-slate-500">
              <p>{usage.calls_count} appels effectués</p>
              <p>~${(usage.cost_usd / Math.max(usage.calls_count, 1)).toFixed(6)}/appel</p>
            </div>
          </div>

          {/* Estimation */}
          <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-6 shadow-lg">
            <h3 className="text-sm font-semibold text-slate-400 uppercase mb-4">Estimation</h3>
            {usage.tasks_left !== null ? (
              <>
                <p className="text-3xl font-bold text-violet-400 mb-2">~{usage.tasks_left > 9999 ? `${Math.floor(usage.tasks_left / 1000)}K` : usage.tasks_left}</p>
                <div className="space-y-1 text-xs text-slate-500">
                  <p>Tâches restantes</p>
                  {estimatedDaysLeft && <p>~{estimatedDaysLeft} jours</p>}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">Données insuffisantes</p>
            )}
          </div>
        </div>

        {/* Configuration */}
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Configuration Tarification</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800/60 rounded-lg">
              <span className="text-sm text-slate-400">Input (par million)</span>
              <span className="font-mono text-cyan-400">${usage.cost_config.input_per_million}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800/60 rounded-lg">
              <span className="text-sm text-slate-400">Output (par million)</span>
              <span className="font-mono text-cyan-400">${usage.cost_config.output_per_million}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800/60 rounded-lg">
              <span className="text-sm text-slate-400">Moyenne par tâche</span>
              <span className="font-mono text-cyan-400">{usage.avg_tokens_per_task || 'N/A'} tokens</span>
            </div>
          </div>
        </div>

        {/* Historique */}
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Historique des appels</h3>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>

          {history.length === 0 ? (
            <p className="text-center text-slate-500 py-8">Aucun appel pour cette date</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-700">
                  <tr className="text-left text-xs text-slate-400 uppercase">
                    <th className="pb-3 font-semibold">Heure</th>
                    <th className="pb-3 font-semibold">Modèle</th>
                    <th className="pb-3 font-semibold text-right">Input</th>
                    <th className="pb-3 font-semibold text-right">Output</th>
                    <th className="pb-3 font-semibold text-right">Total</th>
                    <th className="pb-3 font-semibold text-right">Coût</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {history.map((entry, idx) => (
                    <tr key={idx} className="text-sm hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 text-slate-300">
                        {new Date(entry.ts).toLocaleTimeString('fr-FR')}
                      </td>
                      <td className="py-3 text-slate-400">{entry.model.split('-')[2] || entry.model}</td>
                      <td className="py-3 text-right font-mono text-cyan-400">{entry.input.toLocaleString()}</td>
                      <td className="py-3 text-right font-mono text-violet-400">{entry.output.toLocaleString()}</td>
                      <td className="py-3 text-right font-mono text-slate-300">{entry.total.toLocaleString()}</td>
                      <td className="py-3 text-right font-mono text-emerald-400">${entry.costDelta.toFixed(6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between text-sm">
                <span className="text-slate-400">Total du jour:</span>
                <div className="flex gap-6 font-mono">
                  <span className="text-slate-300">
                    {history.reduce((sum, e) => sum + e.total, 0).toLocaleString()} tokens
                  </span>
                  <span className="text-emerald-400">
                    ${history.reduce((sum, e) => sum + e.costDelta, 0).toFixed(6)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
