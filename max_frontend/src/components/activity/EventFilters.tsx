/**
 * components/activity/EventFilters.tsx
 * Filtres pour le dashboard d'activité (période, canal, statut, recherche)
 */

import { useState, useEffect, useRef } from 'react';
import { Search, Calendar, Filter, X, Mail, MessageSquare, Smartphone } from 'lucide-react';
import type { EventFilters, Channel, EventStatus, Direction } from '../../types/events';
import { CHANNEL_CONFIGS, STATUS_CONFIGS } from '../../types/events';

interface EventFiltersProps {
  filters: EventFilters;
  onFiltersChange: (filters: Partial<EventFilters>) => void;
  onClearFilters: () => void;
}

export function EventFiltersComponent({ filters, onFiltersChange, onClearFilters }: EventFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Local search state for debounce
  const [localSearch, setLocalSearch] = useState(filters.search || '');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  // Sync local search with filters.search when it changes externally (e.g., URL restore)
  useEffect(() => {
    if (filters.search !== localSearch && !isInitialMount.current) {
      setLocalSearch(filters.search || '');
    }
    isInitialMount.current = false;
  }, [filters.search]);

  // Debounced search - only trigger API call after 400ms of no typing
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Skip on initial mount
    if (isInitialMount.current) {
      return;
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      const trimmedSearch = localSearch.trim();
      if (trimmedSearch !== (filters.search || '')) {
        onFiltersChange({ search: trimmedSearch || undefined });
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [localSearch]);

  // Period presets
  const periodPresets = [
    { label: "Aujourd'hui", value: 'today' },
    { label: '7 derniers jours', value: '7d' },
    { label: '30 derniers jours', value: '30d' },
    { label: '90 derniers jours', value: '90d' }
  ];

  const [selectedPeriod, setSelectedPeriod] = useState('7d');

  // Handle period change
  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case '7d':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case '30d':
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
      case '90d':
        startDate = new Date(now.setDate(now.getDate() - 90));
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 7));
    }

    onFiltersChange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    });
  };

  // Handle channel toggle
  const handleChannelToggle = (channel: Channel) => {
    const currentChannels = filters.channel || [];
    const newChannels = currentChannels.includes(channel)
      ? currentChannels.filter(c => c !== channel)
      : [...currentChannels, channel];

    onFiltersChange({ channel: newChannels.length > 0 ? newChannels : undefined });
  };

  // Handle status toggle
  const handleStatusToggle = (status: EventStatus) => {
    const currentStatuses = filters.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];

    onFiltersChange({ status: newStatuses.length > 0 ? newStatuses : undefined });
  };

  // Handle direction change
  const handleDirectionChange = (direction: Direction | undefined) => {
    onFiltersChange({ direction });
  };

  // Count active filters
  const activeFiltersCount: number = [
    filters.channel?.length || 0,
    filters.status?.length || 0,
    filters.direction ? 1 : 0,
    filters.search ? 1 : 0,
    filters.startDate || filters.endDate ? 1 : 0
  ].reduce((sum, count) => sum + count, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filtres</h3>
          {activeFiltersCount > 0 && (
            <span className="px-2.5 py-0.5 bg-cyan-100 text-cyan-700 text-xs font-medium rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </div>

        {activeFiltersCount > 0 && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Search - uses local state with debounce */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher par email ou numéro de téléphone..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
        />
      </div>

      {/* Period */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <Calendar className="inline w-4 h-4 mr-2" />
          Période
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {periodPresets.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handlePeriodChange(preset.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPeriod === preset.value
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Channel filters */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Canal</label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CHANNEL_CONFIGS) as Channel[]).map((channel) => {
            const config = CHANNEL_CONFIGS[channel];
            const isActive = filters.channel?.includes(channel);
            const Icon = channel === 'email' ? Mail : channel === 'whatsapp' ? MessageSquare : Smartphone;

            return (
              <button
                key={channel}
                onClick={() => handleChannelToggle(channel)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'ring-2 ring-offset-2 ring-current'
                    : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: isActive ? config.bgColor : '#f3f4f6',
                  color: isActive ? config.color : '#6b7280'
                }}
              >
                <Icon className="w-4 h-4" />
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Direction filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Direction</label>
        <div className="flex gap-2">
          <button
            onClick={() => handleDirectionChange(undefined)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !filters.direction
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tous
          </button>
          <button
            onClick={() => handleDirectionChange('out')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filters.direction === 'out'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Sortants
          </button>
          <button
            onClick={() => handleDirectionChange('in')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filters.direction === 'in'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Entrants
          </button>
        </div>
      </div>

      {/* Advanced filters toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
      >
        {showAdvanced ? 'Masquer' : 'Afficher'} les filtres avancés
      </button>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="pt-4 border-t border-gray-200 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Statut</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {(['sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced'] as EventStatus[]).map((status) => {
                const config = STATUS_CONFIGS[status];
                const isActive = filters.status?.includes(status);

                return (
                  <button
                    key={status}
                    onClick={() => handleStatusToggle(status)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                      isActive
                        ? 'ring-2 ring-offset-2 ring-current font-medium'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: isActive ? `${config.color}20` : '#f3f4f6',
                      color: isActive ? config.color : '#6b7280'
                    }}
                  >
                    <span>{config.emoji}</span>
                    <span>{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom date range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date de début</label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => onFiltersChange({ startDate: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date de fin</label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => onFiltersChange({ endDate: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
