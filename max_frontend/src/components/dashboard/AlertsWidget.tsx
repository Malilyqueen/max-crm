/**
 * AlertsWidget.tsx - Widget Alertes Vivantes M.A.X.
 *
 * Affiche les alertes actives du système de monitoring des leads
 * - Stats par sévérité (high/med/low)
 * - Liste triée par sévérité puis date
 * - Actions: Résoudre, CTA optionnel
 * - États: Loading, Empty (vivant), Error
 */

import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { api } from '../../api/client';

interface Alert {
  id: string;
  lead_id: string;
  type: 'NoContact7d' | 'NoReply3d';
  severity: 'low' | 'med' | 'high';
  message: string;
  suggested_action?: {
    label?: string;
    action?: string;
    params?: Record<string, any>;
  };
  created_at: string;
  lead_name?: string;
  lead_email?: string;
}

interface AlertsStats {
  total: number;
  by_severity: {
    high: number;
    med: number;
    low: number;
  };
  by_type?: {
    NoContact7d: number;
    NoReply3d: number;
  };
}

interface AlertsResponse {
  success: boolean;
  alerts: Alert[];
  stats: AlertsStats;
}

const AlertsWidget: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<AlertsStats>({
    total: 0,
    by_severity: { high: 0, med: 0, low: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<AlertsResponse>('/alerts/active', {
        headers: { 'X-Tenant': 'macrea' }
      });

      if (response && response.success) {
        setAlerts(response.alerts || []);
        setStats(response.stats || { total: 0, by_severity: { high: 0, med: 0, low: 0 } });
      } else {
        setError('Erreur lors du chargement des alertes');
      }
    } catch (err) {
      console.error('Erreur fetch alertes:', err);
      setError('Impossible de charger les alertes');
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await api.post(`/alerts/${alertId}/resolve`, undefined, {
        headers: { 'X-Tenant': 'macrea' }
      });

      if (response && response.success) {
        // Retirer l'alerte de la liste
        setAlerts(prev => prev.filter(a => a.id !== alertId));

        // Mettre à jour les stats
        const resolvedAlert = alerts.find(a => a.id === alertId);
        if (resolvedAlert) {
          setStats(prev => ({
            total: prev.total - 1,
            by_severity: {
              ...prev.by_severity,
              [resolvedAlert.severity]: Math.max(0, prev.by_severity[resolvedAlert.severity] - 1)
            }
          }));
        }
      } else {
        alert('Erreur lors de la résolution');
      }
    } catch (err) {
      console.error('Erreur resolve alerte:', err);
      alert('Impossible de résoudre l\'alerte');
    }
  };

  const handleAction = (alert: Alert) => {
    // MVP: Juste un toast pour montrer l'action
    const actionLabel = alert.suggested_action?.label || 'Action';
    alert(`${actionLabel} pour ${alert.lead_name || alert.lead_id}`);
  };

  useEffect(() => {
    // Charger au mount
    fetchAlerts();

    // Auto-refresh toutes les 60 secondes
    const intervalId = setInterval(() => {
      fetchAlerts();
    }, 60000); // 60 secondes

    // Cleanup: arrêter l'interval au unmount
    return () => clearInterval(intervalId);
  }, []);

  // Badge de sévérité
  const SeverityBadge: React.FC<{ severity: 'low' | 'med' | 'high'; count: number }> = ({ severity, count }) => {
    const colors = {
      high: 'bg-red-100 text-red-800 border-red-300',
      med: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      low: 'bg-blue-100 text-blue-800 border-blue-300'
    };

    const labels = {
      high: 'Haute',
      med: 'Moyenne',
      low: 'Basse'
    };

    return (
      <div className={`px-3 py-1 rounded-full text-sm font-medium border ${colors[severity]}`}>
        {labels[severity]}: {count}
      </div>
    );
  };

  // État Loading
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Alertes M.A.X.</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Chargement des alertes...</span>
        </div>
      </div>
    );
  }

  // État Error
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Alertes M.A.X.</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={fetchAlerts}
            className="mt-3 text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // État Empty (vivant!)
  if (stats.total === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Alertes M.A.X.</h2>
          <button
            onClick={fetchAlerts}
            className="text-sm text-gray-600 hover:text-gray-800"
            title="Actualiser"
          >
            Actualiser
          </button>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="flex justify-center mb-3"><Check className="w-10 h-10 text-green-600" /></div>
          <p className="text-green-900 font-medium mb-2">
            R.A.S. aujourd'hui. Ton pipeline est propre.
          </p>
          <p className="text-green-700 text-sm">
            Si tu veux, je peux surveiller les leads silencieux et te prévenir dès qu'un contact devient froid.
          </p>
        </div>
      </div>
    );
  }

  // État Normal avec alertes
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header avec stats */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Alertes M.A.X.</h2>
          <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold">
            {stats.total}
          </span>
        </div>
        <button
          onClick={fetchAlerts}
          className="text-sm text-gray-600 hover:text-gray-800"
          title="Actualiser"
        >
          Actualiser
        </button>
      </div>

      {/* Badges de sévérité */}
      <div className="flex flex-wrap gap-2 mb-6">
        {stats.by_severity.high > 0 && (
          <SeverityBadge severity="high" count={stats.by_severity.high} />
        )}
        {stats.by_severity.med > 0 && (
          <SeverityBadge severity="med" count={stats.by_severity.med} />
        )}
        {stats.by_severity.low > 0 && (
          <SeverityBadge severity="low" count={stats.by_severity.low} />
        )}
      </div>

      {/* Liste des alertes triées */}
      <div className="space-y-3">
        {alerts.map(alert => {
          const severityColors = {
            high: 'border-l-red-500 bg-red-50',
            med: 'border-l-yellow-500 bg-yellow-50',
            low: 'border-l-blue-500 bg-blue-50'
          };

          const typeLabels = {
            NoContact7d: 'Aucun contact depuis 7 jours',
            NoReply3d: 'Pas de réponse depuis 3 jours'
          };

          return (
            <div
              key={alert.id}
              className={`border-l-4 ${severityColors[alert.severity]} rounded-r-lg p-4`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase">
                      {typeLabels[alert.type]}
                    </span>
                  </div>
                  <p className="text-gray-900 font-medium mb-1">
                    {alert.lead_name || `Lead ${alert.lead_id.substring(0, 8)}`}
                  </p>
                  <p className="text-sm text-gray-700 mb-2">
                    {alert.message}
                  </p>
                  {alert.lead_email && (
                    <p className="text-xs text-gray-500">
                      {alert.lead_email}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => resolveAlert(alert.id)}
                    className="px-3 py-1 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm font-medium whitespace-nowrap"
                  >
                    Résoudre
                  </button>
                  {alert.suggested_action && (
                    <button
                      onClick={() => handleAction(alert)}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium whitespace-nowrap"
                    >
                      {alert.suggested_action.label || 'Action'}
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-2 text-xs text-gray-500">
                Créée le {new Date(alert.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AlertsWidget;
