/**
 * components/dashboard/RecommendationsBlock.tsx
 * Bloc affichant les recommandations intelligentes de M.A.X.
 *
 * Affiche les actions suggérées par le moteur de décision:
 * - Relances J+1, J+3
 * - Paniers abandonnés
 * - Leads chauds
 * - etc.
 */

import React, { useEffect } from 'react';
import { Target, Users, ExternalLink, Send, PhoneOff, RefreshCw, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useRecommendationsStore,
  getPriorityColor,
  getPriorityIcon,
  getTypeIcon,
  getChannelIcon,
  type Recommendation,
  type RecommendationPriority
} from '../../stores/useRecommendationsStore';

interface RecommendationsBlockProps {
  maxItems?: number;
  showStats?: boolean;
}

export function RecommendationsBlock({ maxItems = 5, showStats = true }: RecommendationsBlockProps) {
  const {
    recommendations,
    stats,
    isLoading,
    isSyncing,
    error,
    loadRecommendations,
    loadStats,
    syncLeadsCache,
    executeRecommendation,
    dismissRecommendation,
    clearError
  } = useRecommendationsStore();

  useEffect(() => {
    loadRecommendations();
    if (showStats) {
      loadStats();
    }
  }, [loadRecommendations, loadStats, showStats]);

  const displayedRecommendations = recommendations.slice(0, maxItems);

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Actions suggérées par M.A.X.</h3>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={() => {
              clearError();
              loadRecommendations();
            }}
            className="mt-2 text-sm text-red-700 font-medium hover:underline"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header with gradient */}
      <div
        className="px-6 py-4 border-b border-gray-100"
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(168, 85, 247, 0.05))'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #a855f7)'
              }}
            >
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3
                className="text-lg font-semibold"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                Actions suggérées par M.A.X.
              </h3>
              <p className="text-sm text-gray-500">
                {isLoading ? 'Analyse en cours...' : `${recommendations.length} action${recommendations.length > 1 ? 's' : ''} recommandée${recommendations.length > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => loadRecommendations()}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Actualiser"
          >
            <svg
              className={`w-5 h-5 text-gray-500 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        {/* Stats mini-bar */}
        {showStats && stats && (
          <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
            {(['urgent', 'high', 'medium', 'low'] as RecommendationPriority[]).map(priority => {
              const count = stats.by_priority[priority] || 0;
              if (count === 0) return null;
              return (
                <div key={priority} className="flex items-center gap-1">
                  <span className="text-sm">{getPriorityIcon(priority)}</span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: getPriorityColor(priority) }}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : displayedRecommendations.length === 0 ? (
          <EmptyState
            isSyncing={isSyncing}
            error={error}
            onSync={syncLeadsCache}
          />
        ) : (
          <div className="space-y-3">
            {displayedRecommendations.map((recommendation) => (
              recommendation.type === 'never_contacted_bulk' ? (
                <BulkRecommendationCard
                  key={recommendation.id}
                  recommendation={recommendation}
                  onDismiss={() => dismissRecommendation(recommendation.id)}
                />
              ) : (
                <RecommendationCard
                  key={recommendation.id}
                  recommendation={recommendation}
                  onExecute={(actionType) => executeRecommendation(recommendation.id, actionType)}
                  onDismiss={() => dismissRecommendation(recommendation.id)}
                />
              )
            ))}

            {recommendations.length > maxItems && (
              <div className="text-center pt-2">
                <span className="text-sm text-gray-500">
                  +{recommendations.length - maxItems} autre{recommendations.length - maxItems > 1 ? 's' : ''} recommandation{recommendations.length - maxItems > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Empty State Component - distingue RAS réel vs données non à jour
interface EmptyStateProps {
  isSyncing: boolean;
  error: string | null;
  onSync: () => void;
}

function EmptyState({ isSyncing, error, onSync }: EmptyStateProps) {
  // Déterminer si c'est un RAS réel ou si les données doivent être actualisées
  // On considère que si on n'a jamais eu de recommandations, il faut actualiser
  const [hasTriedSync, setHasTriedSync] = React.useState(false);

  const handleSync = async () => {
    setHasTriedSync(true);
    onSync();
  };

  return (
    <div className="text-center py-8">
      {!hasTriedSync ? (
        // État initial - proposer d'actualiser
        <>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <Database className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="text-gray-900 font-medium mb-1">Données à actualiser</h4>
          <p className="text-gray-500 text-sm mb-4">
            Actualisez pour voir les actions recommandées.
          </p>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Actualisation en cours...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Actualiser les données
              </>
            )}
          </button>
          {isSyncing ? (
            <p className="text-xs text-indigo-500 mt-2">
              Synchronisation des contacts... Cela peut prendre quelques instants.
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-2">
              Met à jour les données CRM et recalcule les recommandations.
            </p>
          )}
        </>
      ) : (
        // Après actualisation - RAS réel
        <>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-3xl">✨</span>
          </div>
          <h4 className="text-gray-900 font-medium mb-1">Tout est en ordre !</h4>
          <p className="text-gray-500 text-sm mb-4">
            Aucune action urgente à effectuer pour le moment.
          </p>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                Actualisation...
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3" />
                Actualiser
              </>
            )}
          </button>
        </>
      )}
      {error && (
        <p className="text-xs text-red-500 mt-3 bg-red-50 px-3 py-2 rounded inline-block">
          {error}
        </p>
      )}
    </div>
  );
}

// Bulk Recommendation Card for never_contacted_bulk
interface BulkRecommendationCardProps {
  recommendation: Recommendation;
  onDismiss: () => void;
}

function BulkRecommendationCard({ recommendation, onDismiss }: BulkRecommendationCardProps) {
  const navigate = useNavigate();
  const priorityColor = getPriorityColor(recommendation.priority);

  const handleOpenTourDeControle = () => {
    navigate('/crm?notContacted=true');
  };

  return (
    <div
      className="relative p-4 rounded-lg border-2 transition-all hover:shadow-lg"
      style={{
        borderColor: priorityColor,
        background: `linear-gradient(135deg, ${priorityColor}10, ${priorityColor}05)`
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${priorityColor}20` }}
        >
          <PhoneOff className="w-6 h-6" style={{ color: priorityColor }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900 text-lg">
              {recommendation.count} leads jamais contactés
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: `${priorityColor}20`,
                color: priorityColor
              }}
            >
              {recommendation.priority === 'urgent' ? 'Action urgente' :
               recommendation.priority === 'high' ? 'Prioritaire' : 'À traiter'}
            </span>
          </div>

          <p className="text-sm text-gray-600 mb-3">
            {recommendation.reason}
          </p>

          {/* Stats breakdown */}
          {recommendation.stats && (
            <div className="flex flex-wrap gap-2 mb-3">
              {recommendation.stats.older_than_7d > 0 && (
                <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                  {recommendation.stats.older_than_7d} depuis +7j
                </span>
              )}
              {recommendation.stats.older_than_3d > 0 && (
                <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-medium">
                  {recommendation.stats.older_than_3d} depuis +3j
                </span>
              )}
              {recommendation.stats.older_than_1d > 0 && (
                <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                  {recommendation.stats.older_than_1d} depuis +24h
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenTourDeControle}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all hover:scale-105"
              style={{ backgroundColor: priorityColor }}
            >
              <Users className="w-4 h-4" />
              Voir les {recommendation.count} leads
              <ExternalLink className="w-3 h-3" />
            </button>

            <button
              onClick={() => navigate('/campagnes')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border font-medium transition-colors hover:bg-gray-50"
              style={{ borderColor: priorityColor, color: priorityColor }}
            >
              <Send className="w-4 h-4" />
              Lancer une campagne
            </button>

            <button
              onClick={onDismiss}
              className="ml-auto p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="Ignorer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  onExecute: (actionType: string) => void;
  onDismiss: () => void;
}

function RecommendationCard({ recommendation, onExecute, onDismiss }: RecommendationCardProps) {
  const priorityColor = getPriorityColor(recommendation.priority);

  return (
    <div
      className="relative p-4 rounded-lg border transition-all hover:shadow-md"
      style={{
        borderColor: `${priorityColor}30`,
        background: `linear-gradient(135deg, ${priorityColor}05, transparent)`
      }}
    >
      {/* Priority indicator */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
        style={{ backgroundColor: priorityColor }}
      />

      <div className="flex items-start gap-3 ml-2">
        {/* Type icon */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${priorityColor}15` }}
        >
          <span className="text-xl">{getTypeIcon(recommendation.type)}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900 truncate">
              {recommendation.lead_name}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: `${priorityColor}15`,
                color: priorityColor
              }}
            >
              {recommendation.priority === 'urgent' ? 'Urgent' :
               recommendation.priority === 'high' ? 'Prioritaire' :
               recommendation.priority === 'medium' ? 'À faire' : 'À prévoir'}
            </span>
          </div>

          <p className="text-sm text-gray-600 mb-2">
            <span className="font-medium text-gray-500">Pourquoi : </span>
            {recommendation.reason}
          </p>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            {recommendation.lead_company && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {recommendation.lead_company}
              </span>
            )}
            <span className="flex items-center gap-1">
              {getChannelIcon(recommendation.recommended_channel)}
              {recommendation.recommended_channel === 'whatsapp' ? 'WhatsApp' :
               recommendation.recommended_channel === 'email' ? 'Email' :
               recommendation.recommended_channel === 'sms' ? 'SMS' : 'Appel'}
            </span>
            <span>
              {recommendation.hours_since_interaction}h sans réponse
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Voir le lead */}
          <a
            href={`/crm?lead=${recommendation.lead_id}`}
            className="p-2 rounded-lg text-white transition-all hover:scale-105"
            style={{ backgroundColor: priorityColor }}
            title="Voir le lead"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </a>
          {/* Noter comme fait */}
          <button
            onClick={() => onExecute(recommendation.recommended_channel)}
            className="p-2 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-50 transition-colors"
            title="Marquer comme fait (ajouter au journal)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          {/* Ignorer */}
          <button
            onClick={onDismiss}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Ignorer cette suggestion"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default RecommendationsBlock;
