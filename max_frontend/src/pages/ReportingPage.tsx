/**
 * pages/ReportingPage.tsx
 * Page Reporting - KPIs et Timeline selon Phase 1 du README
 */

import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useThemeColors } from '../hooks/useThemeColors';

interface DashboardData {
  ok: boolean;
  kpis: {
    totalLeads: number;
    activeLeads: number;
  };
  timeline: Array<{
    id: string;
    when: string;
    label: string;
    name: string;
  }>;
}

type TimeFilter = '24h' | '7j' | '30j';

export function ReportingPage() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('24h');
  const { data, loading, error, refetch } = useApi<DashboardData>('/api/dashboard');
  const colors = useThemeColors();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p style={{ color: colors.textSecondary }}>Chargement des rapports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-red-800 font-semibold mb-1">Erreur</h3>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            Boîte Noire
          </h1>
          <p className="mt-1" style={{ color: colors.textSecondary }}>
            Enregistrement complet de votre activité CRM • Historique et KPIs
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <svg
            className="w-4 h-4"
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
          Actualiser
        </button>
      </div>

      {/* Filtre temporel (UI only) */}
      <div className="flex gap-2">
        {(['24h', '7j', '30j'] as TimeFilter[]).map((filter) => (
          <button
            key={filter}
            onClick={() => setTimeFilter(filter)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeFilter === filter
                ? 'bg-blue-600 text-white'
                : 'text-blue-600 hover:bg-blue-50'
            }`}
            style={
              timeFilter !== filter
                ? {
                    color: colors.textSecondary,
                    background: colors.cardBg,
                    border: `1px solid ${colors.border}`
                  }
                : undefined
            }
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Leads */}
        <div
          className="rounded-lg p-6 border"
          style={{
            background: colors.cardBg,
            borderColor: colors.border
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
              Total Leads
            </h3>
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>
          <div className="text-4xl font-bold" style={{ color: colors.textPrimary }}>
            {data.kpis.totalLeads}
          </div>
          <p className="text-sm mt-2" style={{ color: colors.textSecondary }}>
            Leads enregistrés
          </p>
        </div>

        {/* Active Leads */}
        <div
          className="rounded-lg p-6 border"
          style={{
            background: colors.cardBg,
            borderColor: colors.border
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
              Leads Actifs
            </h3>
            <div className="p-3 bg-green-100 rounded-lg">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="text-4xl font-bold" style={{ color: colors.textPrimary }}>
            {data.kpis.activeLeads}
          </div>
          <p className="text-sm mt-2" style={{ color: colors.textSecondary }}>
            En cours de traitement
          </p>
        </div>
      </div>

      {/* Timeline des derniers leads */}
      <div
        className="rounded-lg p-6 border"
        style={{
          background: colors.cardBg,
          borderColor: colors.border
        }}
      >
        <h2 className="text-xl font-semibold mb-4" style={{ color: colors.textPrimary }}>
          Timeline - Derniers leads
        </h2>

        {data.timeline.length === 0 ? (
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
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p style={{ color: colors.textSecondary }}>Aucune activité récente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.timeline.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 rounded-lg border transition-colors hover:shadow-md"
                style={{
                  background: colors.cardBg,
                  borderColor: colors.borderLight
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold" style={{ color: colors.textPrimary }}>
                      {item.name}
                    </div>
                    <div className="text-sm" style={{ color: colors.textSecondary }}>
                      {item.label}
                    </div>
                  </div>
                </div>
                <div className="text-sm" style={{ color: colors.textSecondary }}>
                  {new Date(item.when).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}