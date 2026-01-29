/**
 * components/crm/LeadsFilters.tsx
 * Barre de filtres pour les leads
 *
 * CONTRAT: Les filtres échangent les CLÉS Espo (New, Assigned, etc.)
 * Les labels FR sont uniquement pour l'affichage UI.
 */

import React, { useState } from 'react';
import { PhoneOff, Check } from 'lucide-react';
import type { LeadFilters } from '../../types/crm';
import { useThemeColors } from '../../hooks/useThemeColors';

interface LeadsFiltersProps {
  filters: LeadFilters;
  onFiltersChange: (filters: Partial<LeadFilters>) => void;
  onClearFilters: () => void;
}

/**
 * Configuration des statuts : clé Espo → affichage FR
 * La clé (key) est envoyée au backend, le label est affiché à l'utilisateur
 */
const STATUS_CONFIG = [
  { key: 'New', label: 'Nouveau', color: '#3B82F6' },
  { key: 'Assigned', label: 'Assigné', color: '#10B981' },
  { key: 'In Process', label: 'En cours', color: '#F59E0B' },
  { key: 'Converted', label: 'Converti', color: '#22C55E' },
  { key: 'Recycled', label: 'Recyclé', color: '#6B7280' },
  { key: 'Dead', label: 'Perdu', color: '#EF4444' }
] as const;

export function LeadsFilters({ filters, onFiltersChange, onClearFilters }: LeadsFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const colors = useThemeColors();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFiltersChange({ search: searchInput });
  };

  // Toggle un statut dans le filtre (utilise la clé Espo)
  const handleStatusToggle = (statusKey: string) => {
    const currentStatuses = filters.status || [];
    const newStatuses = currentStatuses.includes(statusKey)
      ? currentStatuses.filter((s) => s !== statusKey)
      : [...currentStatuses, statusKey];

    onFiltersChange({ status: newStatuses.length > 0 ? newStatuses : undefined });
  };

  const hasActiveFilters = filters.search || (filters.status && filters.status.length > 0) || filters.notContacted;

  return (
    <div className="rounded-lg shadow p-4 space-y-4" style={{ background: colors.cardBg }}>
      {/* Recherche */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Rechercher par nom, email, entreprise..."
            className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              background: colors.background,
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`
            }}
          />
          <svg
            className="absolute right-3 top-2.5 h-5 w-5"
            style={{ color: colors.textSecondary }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Rechercher
        </button>
      </form>

      {/* Filtres par statut */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
          Statuts
        </label>
        <div className="flex flex-wrap gap-2">
          {STATUS_CONFIG.map((statusDef) => {
            const isActive = filters.status?.includes(statusDef.key);
            return (
              <button
                key={statusDef.key}
                onClick={() => handleStatusToggle(statusDef.key)}
                className="px-3 py-1.5 text-sm rounded-full border transition-all font-medium"
                style={{
                  backgroundColor: isActive ? statusDef.color : colors.cardBg,
                  color: isActive ? '#ffffff' : colors.textPrimary,
                  borderColor: isActive ? statusDef.color : colors.border
                }}
              >
                {statusDef.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filtre "Non contacté" - Business clé pour relances */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
          Filtres avancés
        </label>
        <button
          onClick={() => onFiltersChange({ notContacted: !filters.notContacted })}
          className="px-4 py-2 text-sm rounded-lg border-2 transition-all font-medium flex items-center gap-2"
          style={{
            backgroundColor: filters.notContacted ? '#dc2626' : colors.cardBg,
            color: filters.notContacted ? '#ffffff' : colors.textPrimary,
            borderColor: filters.notContacted ? '#dc2626' : colors.border
          }}
        >
          <PhoneOff className="w-4 h-4" />
          <span>Non contactés</span>
          {filters.notContacted && <Check className="w-4 h-4 ml-1" />}
        </button>
        <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
          Leads sans aucun message envoyé (relances à faire)
        </p>
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              setSearchInput('');
              onClearFilters();
            }}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}
    </div>
  );
}
