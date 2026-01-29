/**
 * pages/MaxPage.tsx
 * Page M.A.X. - "Le Cerveau IA" avec Suggestions, Execution Log et Admin Tools
 */

import { useEffect, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { useThemeColors } from '../hooks/useThemeColors';
import { useAuthStore } from '../stores/useAuthStore';
import { useRecommendationsStore, getTypeIcon, type Recommendation } from '../stores/useRecommendationsStore';
import { SuggestionCard, type Suggestion } from '../components/max/SuggestionCard';
import { TaskTrayComponent, type ExecutionLogEntry } from '../components/max/TaskTrayComponent';
import { AdminPanel } from '../components/max/AdminPanel';

/**
 * Mapper un type de recommandation API vers un type de suggestion UI
 */
function mapRecommendationType(apiType: string): Suggestion['type'] {
  const typeMap: Record<string, Suggestion['type']> = {
    follow_up_j1: 'relance',
    follow_up_j3: 'relance',
    cart_abandoned: 'action',
    invoice_unpaid: 'action',
    hot_lead: 'action',
    appointment_reminder: 'relance',
    welcome_new_lead: 'email',
    reactivation: 'relance'
  };
  return typeMap[apiType] || 'action';
}

/**
 * Convertir une recommandation API en suggestion UI
 */
function recommendationToSuggestion(rec: Recommendation): Suggestion {
  const icon = getTypeIcon(rec.type);
  return {
    id: rec.id,
    type: mapRecommendationType(rec.type),
    title: `${icon} ${rec.name}`,
    description: rec.reason || rec.description,
    leadId: rec.lead_id,
    leadName: rec.lead_name
  };
}

interface ApiExecutionLog {
  ok: boolean;
  logs: Array<{
    id: string;
    timestamp: string;
    action: string;
    status: 'pending' | 'running' | 'success' | 'error';
    details?: string;
  }>;
}

export function MaxPage() {
  const colors = useThemeColors();
  const { user } = useAuthStore();
  const { data: executionLogData } = useApi<ApiExecutionLog>('/api/max/execution-log');

  // Recommendations store
  const {
    recommendations,
    isLoading: recommendationsLoading,
    loadRecommendations,
    executeRecommendation
  } = useRecommendationsStore();

  // SECURITY: Seuls les admins peuvent voir le panneau d'administration
  const isAdmin = user?.role === 'admin';

  // Charger les recommandations au montage
  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  // Convertir les recommandations API en suggestions UI
  const suggestions = useMemo(() => {
    return recommendations.map(recommendationToSuggestion);
  }, [recommendations]);

  // Execution logs depuis l'API (pas de fallback mock)
  const executionLogs: ExecutionLogEntry[] = executionLogData?.logs || [];

  const handleExecuteSuggestion = async (suggestion: Suggestion) => {
    console.log('[MAX PAGE] Exécution suggestion:', suggestion);

    // Appeler l'API pour marquer comme exécutée
    const success = await executeRecommendation(
      suggestion.id,
      suggestion.type,
      `Action ${suggestion.type} exécutée pour ${suggestion.leadName}`
    );

    if (success) {
      console.log('[MAX PAGE] Suggestion exécutée avec succès');
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" style={{ color: colors.textPrimary }}>
          M.A.X. - Le Cerveau IA
        </h1>
        <p className="mt-1" style={{ color: colors.textSecondary }}>
          Intelligence artificielle pour la gestion automatisée de vos leads CRM
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Section 1: Suggestions IA */}
        <div
          className="rounded-lg p-6 border"
          style={{
            background: colors.cardBg,
            borderColor: colors.border
          }}
        >
          <h2 className="text-xl font-semibold mb-4" style={{ color: colors.textPrimary }}>
            Suggestions IA
          </h2>
          <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
            Actions recommandées par M.A.X. pour optimiser votre CRM
          </p>

          {recommendationsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-8">
              <svg
                className="w-12 h-12 mx-auto mb-4"
                style={{ color: colors.textSecondary }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <p style={{ color: colors.textSecondary }}>Aucune suggestion pour le moment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onExecute={handleExecuteSuggestion}
                />
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Execution Log */}
        <div
          className="rounded-lg p-6 border"
          style={{
            background: colors.cardBg,
            borderColor: colors.border
          }}
        >
          <h2 className="text-xl font-semibold mb-4" style={{ color: colors.textPrimary }}>
            Journal d'exécution
          </h2>
          <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
            Historique des actions automatisées par M.A.X.
          </p>

          <TaskTrayComponent logs={executionLogs} />
        </div>
      </div>

      {/* Section 3: Admin Tools - ADMIN ONLY */}
      {isAdmin && <AdminPanel />}
    </div>
  );
}