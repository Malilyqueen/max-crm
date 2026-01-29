/**
 * pages/OutboxPage.tsx
 * Écran Outbox/Runs - Liste des message_events (Email, SMS, WhatsApp)
 * Preuve d'exécution réelle des envois
 */

import { useEffect, useState } from 'react';
import { useEventsStore } from '../stores/useEventsStore';
import { useThemeColors } from '../hooks/useThemeColors';
import {
  CHANNEL_CONFIGS,
  STATUS_CONFIGS,
  type Channel,
  type EventStatus
} from '../types/events';

// Filtres rapides
const QUICK_FILTERS = [
  { label: 'Tous', value: null },
  { label: 'WhatsApp', value: 'whatsapp' as Channel },
  { label: 'Email', value: 'email' as Channel },
  { label: 'SMS', value: 'sms' as Channel }
];

export function OutboxPage() {
  const colors = useThemeColors();
  const {
    events,
    isLoading,
    error,
    total,
    page,
    hasMore,
    stats,
    isLoadingStats,
    loadEvents,
    loadStats,
    setFilters,
    clearFilters
  } = useEventsStore();

  const [activeFilter, setActiveFilter] = useState<Channel | null>(null);

  // Charger les events et stats au montage
  useEffect(() => {
    loadEvents(1);
    loadStats('7d');
  }, [loadEvents, loadStats]);

  // Appliquer filtre canal
  const handleFilterChange = (channel: Channel | null) => {
    setActiveFilter(channel);
    if (channel) {
      setFilters({ channel: [channel] });
    } else {
      clearFilters();
    }
  };

  // Charger page suivante
  const handleLoadMore = () => {
    if (hasMore && !isLoading) {
      loadEvents(page + 1);
    }
  };

  // Formater timestamp relatif
  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
          Outbox - Historique des envois
        </h1>
        <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
          Tous les messages envoyés et reçus par M.A.X.
        </p>
      </div>

      {/* Stats rapides */}
      {stats && !isLoadingStats && (
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(stats.statsByChannel).map(([channel, channelStats]) => {
            const config = CHANNEL_CONFIGS[channel as Channel];
            return (
              <div
                key={channel}
                className="rounded-lg p-4 border"
                style={{ background: colors.cardBg, borderColor: colors.border }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{config.icon}</span>
                  <span className="font-medium" style={{ color: colors.textPrimary }}>
                    {config.label}
                  </span>
                </div>
                <div className="text-2xl font-bold" style={{ color: config.color }}>
                  {channelStats.total}
                </div>
                <div className="text-xs" style={{ color: colors.textSecondary }}>
                  {channelStats.delivered} livrés · {channelStats.deliveryRate}% taux
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filtres */}
      <div className="flex items-center gap-2">
        {QUICK_FILTERS.map((filter) => (
          <button
            key={filter.label}
            onClick={() => handleFilterChange(filter.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeFilter === filter.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filter.value && CHANNEL_CONFIGS[filter.value]?.icon} {filter.label}
          </button>
        ))}
        <div className="ml-auto text-sm" style={{ color: colors.textSecondary }}>
          {total} événements
        </div>
      </div>

      {/* Liste des events */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{ background: colors.cardBg, borderColor: colors.border }}
      >
        {error ? (
          <div className="p-8 text-center text-red-500">
            {error}
          </div>
        ) : isLoading && events.length === 0 ? (
          <div className="p-8 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center" style={{ color: colors.textSecondary }}>
            Aucun événement trouvé
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: colors.border }}>
            {events.map((event) => {
              const channelConfig = CHANNEL_CONFIGS[event.channel];
              const statusConfig = STATUS_CONFIGS[event.status as EventStatus] || {
                label: event.status,
                color: '#6b7280',
                emoji: '•'
              };

              return (
                <div
                  key={event.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Channel icon */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                      style={{ backgroundColor: channelConfig.bgColor }}
                    >
                      {channelConfig.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium" style={{ color: colors.textPrimary }}>
                          {event.direction === 'out' ? '→' : '←'}{' '}
                          {event.email || event.phone_number || 'Inconnu'}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${statusConfig.color}20`,
                            color: statusConfig.color
                          }}
                        >
                          {statusConfig.emoji} {statusConfig.label}
                        </span>
                      </div>

                      {/* Message preview */}
                      {event.message_snippet && (
                        <p
                          className="text-sm truncate mb-1"
                          style={{ color: colors.textSecondary }}
                        >
                          {event.message_snippet}
                        </p>
                      )}

                      {/* Meta */}
                      <div className="flex items-center gap-3 text-xs" style={{ color: colors.textSecondary }}>
                        <span>{formatRelativeTime(event.event_timestamp)}</span>
                        <span>•</span>
                        <span>{channelConfig.label}</span>
                        {event.lead_id && (
                          <>
                            <span>•</span>
                            <span>Lead: {event.lead_id.slice(0, 8)}...</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load more */}
        {hasMore && (
          <div className="p-4 text-center border-t" style={{ borderColor: colors.border }}>
            <button
              onClick={handleLoadMore}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Chargement...' : 'Charger plus'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default OutboxPage;
