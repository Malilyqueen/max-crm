/**
 * components/crm/LeadsFilters.tsx
 * Barre de filtres pour les leads
 */

import React, { useState } from 'react';
import type { LeadStatus, LeadFilters } from '../../types/crm';
import { useThemeColors } from '../../hooks/useThemeColors';

interface LeadsFiltersProps {
  filters: LeadFilters;
  onFiltersChange: (filters: Partial<LeadFilters>) => void;
  onClearFilters: () => void;
}

const allStatuses: LeadStatus[] = ['Nouveau', 'Contacté', 'Qualifié', 'Proposition', 'Gagné', 'Perdu'];

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

  const handleStatusToggle = (status: LeadStatus) => {
    const currentStatuses = filters.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status];

    onFiltersChange({ status: newStatuses.length > 0 ? newStatuses : undefined });
  };

  const hasActiveFilters = filters.search || (filters.status && filters.status.length > 0);

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
        <label className="block text-sm font-medium text-gray-700 mb-2">Statuts</label>
        <div className="flex flex-wrap gap-2">
          {allStatuses.map((status) => {
            const isActive = filters.status?.includes(status);
            return (
              <button
                key={status}
                onClick={() => handleStatusToggle(status)}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {status}
              </button>
            );
          })}
        </div>
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
