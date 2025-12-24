/**
 * components/max/AdminPanel.tsx
 * Panneau d'administration avec bouton Rebuild et sélecteur tenant
 */

import React, { useState } from 'react';
import { useThemeColors } from '../../hooks/useThemeColors';
import { apiPost } from '../../hooks/useApi';
import { useSettingsStore } from '../../stores/useSettingsStore';

export function AdminPanel() {
  const colors = useThemeColors();
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [rebuildSuccess, setRebuildSuccess] = useState<string | null>(null);
  const [rebuildError, setRebuildError] = useState<string | null>(null);
  const { tenant, setTenant } = useSettingsStore();

  const handleRebuild = async () => {
    setIsRebuilding(true);
    setRebuildSuccess(null);
    setRebuildError(null);

    try {
      const result = await apiPost<{ success: boolean; message?: string }>('/api/admin/rebuild', {});

      if (result.success) {
        setRebuildSuccess('Rebuild EspoCRM effectué avec succès !');
        setTimeout(() => setRebuildSuccess(null), 5000);
      } else {
        setRebuildError(result.message || 'Erreur lors du rebuild');
      }
    } catch (error: any) {
      setRebuildError(error.message || 'Erreur lors du rebuild EspoCRM');
    } finally {
      setIsRebuilding(false);
    }
  };

  const handleTenantChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setTenant(event.target.value);
  };

  return (
    <div
      className="rounded-lg p-6 border"
      style={{
        background: colors.cardBg,
        borderColor: colors.border
      }}
    >
      <h3 className="text-lg font-semibold mb-4" style={{ color: colors.textPrimary }}>
        Outils d'Administration
      </h3>

      <div className="space-y-4">
        {/* Sélecteur Tenant */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
            Tenant
          </label>
          <select
            value={tenant}
            onChange={handleTenantChange}
            className="w-full px-4 py-2 rounded-lg border"
            style={{
              background: colors.cardBg,
              borderColor: colors.border,
              color: colors.textPrimary
            }}
          >
            <option value="default">default</option>
            <option value="tenant1">tenant1</option>
            <option value="tenant2">tenant2</option>
          </select>
          <p className="mt-1 text-xs" style={{ color: colors.textSecondary }}>
            Sélectionnez le tenant actif (UI only pour Phase 1)
          </p>
        </div>

        {/* Bouton Rebuild */}
        <div>
          <button
            onClick={handleRebuild}
            disabled={isRebuilding}
            className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {isRebuilding ? (
              <>
                <svg
                  className="w-5 h-5 animate-spin"
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
                Rebuild en cours...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Rebuild EspoCRM
              </>
            )}
          </button>
          <p className="mt-1 text-xs" style={{ color: colors.textSecondary }}>
            Reconstruit le cache et les métadonnées d'EspoCRM
          </p>
        </div>

        {/* Messages de feedback */}
        {rebuildSuccess && (
          <div className="p-3 bg-green-100 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-green-800">{rebuildSuccess}</p>
            </div>
          </div>
        )}

        {rebuildError && (
          <div className="p-3 bg-red-100 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-800">{rebuildError}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
