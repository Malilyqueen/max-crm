import { useState, useEffect } from 'react';
import { useAppCtx } from '../store/useAppCtx';

interface MaxAction {
  id: string;
  timestamp: string;
  type: string;
  title: string;
  description: string;
  metadata: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  success: boolean;
  error: string | null;
  agent: string;
}

const ACTION_ICONS: Record<string, string> = {
  field_created: '🏗️',
  tag_created: '🏷️',
  lead_imported: '📥',
  lead_tagged: '🎯',
  lead_analyzed: '🧠',
  strategy_generated: '💡',
  workflow_created: '⚙️',
  campaign_created: '📧',
  message_generated: '✉️',
  brain_detected: '🔍',
  rebuild_cache: '🔄'
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-400',
  medium: 'text-blue-400',
  high: 'text-purple-400',
  critical: 'text-cyan-400'
};

export function MaxActionsTimeline() {
  const { apiBase } = useAppCtx();
  const [actions, setActions] = useState<MaxAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActions();
  }, [apiBase]);

  async function fetchActions() {
    try {
      setLoading(true);

      // Pas besoin de headers tenant pour les actions M.A.X. (données globales)
      const res = await fetch(`${apiBase}/api/max/actions?limit=20`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await res.json();

      if (data.ok) {
        setActions(data.actions || []);
      } else {
        setError(data.error);
      }
    } catch (e) {
      console.error('[MaxActionsTimeline] Error:', e);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function formatTimestamp(timestamp: string) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;

    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
        <p className="text-sm">Erreur de chargement : {error}</p>
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-sm">Aucune action M.A.X. enregistrée pour le moment</p>
        <p className="text-xs mt-2">Les actions autonomes de M.A.X. apparaîtront ici</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          Actions M.A.X.
        </h3>
        <button
          onClick={fetchActions}
          className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          ↻ Actualiser
        </button>
      </div>

      {actions.map((action) => {
        const icon = ACTION_ICONS[action.type] || '📌';
        const priorityColor = PRIORITY_COLORS[action.priority] || 'text-gray-400';

        return (
          <div
            key={action.id}
            className={`bg-[#1A1F2E] border rounded-lg p-4 hover:border-cyan-500/50 transition-all ${
              action.success ? 'border-gray-700' : 'border-red-500/50'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="text-2xl flex-shrink-0">{icon}</div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Title and timestamp */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className={`font-medium ${priorityColor}`}>{action.title}</h4>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {formatTimestamp(action.timestamp)}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-300 mb-2">{action.description}</p>

                {/* Metadata */}
                {Object.keys(action.metadata).length > 0 && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {Object.entries(action.metadata).map(([key, value]) => (
                      <span
                        key={key}
                        className="bg-gray-800/50 px-2 py-1 rounded text-gray-400"
                      >
                        {key}: <span className="text-white">{JSON.stringify(value)}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Error if any */}
                {!action.success && action.error && (
                  <div className="mt-2 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">
                    ❌ {action.error}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
