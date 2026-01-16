/**
 * pages/ActivityDashboardPage.tsx
 * Dashboard d'activité multi-canal (Email, SMS, WhatsApp)
 *
 * Composants:
 * - ActivityKpiRow: KPIs globaux par canal
 * - EventFiltersComponent: Filtres date/canal/statut/recherche
 * - MessageEventsTable: Liste paginée des événements
 *
 * Features:
 * - URL querystring persistence (filtres dans l'URL)
 * - Pagination
 * - États loading/empty/error
 */

import { useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Activity, AlertCircle, RefreshCw, X, Mail, MessageSquare, Smartphone, ArrowUpRight, ArrowDownLeft, Calendar, Search } from 'lucide-react';

import { useEventsStore } from '../stores/useEventsStore';
import { ActivityKpiRow } from '../components/activity/ActivityKpiRow';
import { EventFiltersComponent } from '../components/activity/EventFilters';
import { MessageEventsTable } from '../components/activity/MessageEventsTable';
import type { EventFilters, Channel, EventStatus, Direction } from '../types/events';
import { CHANNEL_CONFIGS, STATUS_CONFIGS } from '../types/events';

export function ActivityDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Store
  const {
    events,
    filters,
    isLoading,
    error,
    total,
    page,
    pageSize,
    hasMore,
    stats,
    isLoadingStats,
    loadEvents,
    loadStats,
    setFilters,
    clearFilters,
    clearError
  } = useEventsStore();

  // Parse filters from URL on mount
  useEffect(() => {
    const urlFilters: Partial<EventFilters> = {};

    const channelParam = searchParams.get('channel');
    if (channelParam) {
      urlFilters.channel = channelParam.split(',') as Channel[];
    }

    const statusParam = searchParams.get('status');
    if (statusParam) {
      urlFilters.status = statusParam.split(',') as EventStatus[];
    }

    const directionParam = searchParams.get('direction');
    if (directionParam && (directionParam === 'in' || directionParam === 'out')) {
      urlFilters.direction = directionParam as Direction;
    }

    const searchParam = searchParams.get('search');
    if (searchParam) {
      urlFilters.search = searchParam;
    }

    const startDateParam = searchParams.get('startDate');
    if (startDateParam) {
      urlFilters.startDate = startDateParam;
    }

    const endDateParam = searchParams.get('endDate');
    if (endDateParam) {
      urlFilters.endDate = endDateParam;
    }

    // Set filters if any found in URL
    if (Object.keys(urlFilters).length > 0) {
      setFilters(urlFilters);
    } else {
      // Load with default filters
      loadEvents(1);
    }

    // Load stats
    loadStats('7d');
  }, []); // Only on mount

  // Sync filters to URL
  const syncFiltersToUrl = useCallback((newFilters: EventFilters) => {
    const params = new URLSearchParams();

    if (newFilters.channel && newFilters.channel.length > 0) {
      params.set('channel', newFilters.channel.join(','));
    }

    if (newFilters.status && newFilters.status.length > 0) {
      params.set('status', newFilters.status.join(','));
    }

    if (newFilters.direction) {
      params.set('direction', newFilters.direction);
    }

    if (newFilters.search) {
      params.set('search', newFilters.search);
    }

    if (newFilters.startDate) {
      params.set('startDate', newFilters.startDate);
    }

    if (newFilters.endDate) {
      params.set('endDate', newFilters.endDate);
    }

    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: Partial<EventFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    syncFiltersToUrl(updatedFilters);
    setFilters(newFilters);
  }, [filters, setFilters, syncFiltersToUrl]);

  // Handle clear filters
  const handleClearFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
    clearFilters();
  }, [setSearchParams, clearFilters]);

  // Handle page change
  const handlePageChange = useCallback((newPage: number) => {
    loadEvents(newPage);
    // Scroll to top of table
    window.scrollTo({ top: 400, behavior: 'smooth' });
  }, [loadEvents]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    loadEvents(page);
    loadStats('7d');
  }, [loadEvents, loadStats, page]);

  // Build active filters chips
  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; icon: React.ReactNode; onRemove: () => void }> = [];

    // Channels
    filters.channel?.forEach(channel => {
      const config = CHANNEL_CONFIGS[channel];
      const Icon = channel === 'email' ? Mail : channel === 'whatsapp' ? MessageSquare : Smartphone;
      chips.push({
        key: `channel-${channel}`,
        label: config.label,
        icon: <Icon className="w-3.5 h-3.5" />,
        onRemove: () => {
          const newChannels = filters.channel?.filter(c => c !== channel);
          handleFiltersChange({ channel: newChannels?.length ? newChannels : undefined });
        }
      });
    });

    // Direction
    if (filters.direction) {
      const Icon = filters.direction === 'in' ? ArrowDownLeft : ArrowUpRight;
      chips.push({
        key: 'direction',
        label: filters.direction === 'in' ? 'Entrants' : 'Sortants',
        icon: <Icon className="w-3.5 h-3.5" />,
        onRemove: () => handleFiltersChange({ direction: undefined })
      });
    }

    // Date range
    if (filters.startDate || filters.endDate) {
      const label = filters.startDate && filters.endDate
        ? `${filters.startDate} → ${filters.endDate}`
        : filters.startDate
          ? `Depuis ${filters.startDate}`
          : `Jusqu'au ${filters.endDate}`;
      chips.push({
        key: 'dates',
        label,
        icon: <Calendar className="w-3.5 h-3.5" />,
        onRemove: () => handleFiltersChange({ startDate: undefined, endDate: undefined })
      });
    }

    // Search
    if (filters.search) {
      chips.push({
        key: 'search',
        label: `"${filters.search}"`,
        icon: <Search className="w-3.5 h-3.5" />,
        onRemove: () => handleFiltersChange({ search: undefined })
      });
    }

    // Statuses
    filters.status?.forEach(status => {
      const config = STATUS_CONFIGS[status];
      chips.push({
        key: `status-${status}`,
        label: config.label,
        icon: <span className="text-xs">{config.emoji}</span>,
        onRemove: () => {
          const newStatuses = filters.status?.filter(s => s !== status);
          handleFiltersChange({ status: newStatuses?.length ? newStatuses : undefined });
        }
      });
    });

    return chips;
  }, [filters, handleFiltersChange]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-violet-600 rounded-xl flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Activité</h1>
              </div>
              <p className="text-gray-600 ml-15">
                Suivi temps réel de vos communications Email, SMS et WhatsApp
              </p>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isLoading || isLoadingStats}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading || isLoadingStats ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Fermer
            </button>
          </div>
        )}

        {/* KPIs */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Vue d'ensemble (7 derniers jours)</h2>
          <ActivityKpiRow stats={stats} isLoading={isLoadingStats} />
        </section>

        {/* Filters */}
        <section>
          <EventFiltersComponent
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
          />
        </section>

        {/* Events table */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Événements
              {!isLoading && total > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({total} au total)
                </span>
              )}
            </h2>
          </div>

          {/* Active filters chips */}
          {activeFilterChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-sm text-gray-500">Filtres actifs:</span>
              {activeFilterChips.map(chip => (
                <span
                  key={chip.key}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                >
                  {chip.icon}
                  {chip.label}
                  <button
                    onClick={chip.onRemove}
                    className="ml-1 p-0.5 hover:bg-gray-200 rounded-full transition-colors"
                    title="Supprimer ce filtre"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <button
                onClick={handleClearFilters}
                className="text-sm text-cyan-600 hover:text-cyan-700 font-medium ml-2"
              >
                Tout effacer
              </button>
            </div>
          )}

          <MessageEventsTable
            events={events}
            isLoading={isLoading}
            total={total}
            page={page}
            pageSize={pageSize}
            hasMore={hasMore}
            onPageChange={handlePageChange}
          />
        </section>
      </div>
    </div>
  );
}