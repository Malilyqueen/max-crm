/**
 * pages/DashboardPage.tsx
 * Page Dashboard MVP1
 */

import React, { useEffect } from 'react';
import { useDashboardStore } from '../stores/useDashboardStore';
import { StatCard } from '../components/dashboard/StatCard';
import { RecentActivityList } from '../components/dashboard/RecentActivityList';
import { QuickActions } from '../components/dashboard/QuickActions';
import AlertsWidget from '../components/dashboard/AlertsWidget';
import { useThemeColors } from '../hooks/useThemeColors';

export function DashboardPage() {
  const {
    stats,
    recentActivity,
    isLoading,
    error,
    loadDashboard,
    refreshDashboard,
    clearError
  } = useDashboardStore();
  const colors = useThemeColors();

  // Charger les données au mount
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (isLoading && !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p style={{ color: colors.textSecondary }}>Chargement du dashboard...</p>
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
              onClick={() => {
                clearError();
                loadDashboard();
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: colors.textPrimary }}>Dashboard</h1>
          <p className="mt-1" style={{ color: colors.textSecondary }}>Vue d'ensemble de votre activité CRM</p>
        </div>
        <button
          onClick={refreshDashboard}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          <svg
            className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
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

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            title="Total Leads"
            value={stats.totalLeads}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            }
            color="blue"
            trend={{
              value: stats.newLeadsToday,
              label: 'nouveaux aujourd\'hui',
              isPositive: stats.newLeadsToday > 0
            }}
            link="/crm"
            linkLabel="Voir tous les leads"
          />

          <StatCard
            title="Taux de conversion"
            value={`${stats.conversionRate}%`}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            color="green"
          />

          <StatCard
            title="Workflows actifs"
            value={stats.activeWorkflows}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            }
            color="purple"
          />

          <StatCard
            title="Tâches en attente"
            value={stats.pendingTasks}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            }
            color="orange"
          />

          <StatCard
            title="Interactions M.A.X."
            value={stats.maxInteractions}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            }
            color="blue"
          />
        </div>
      )}

      {/* Actions rapides */}
      <div>
        <h2 className="text-xl font-semibold mb-4" style={{ color: colors.textPrimary }}>Actions rapides</h2>
        <QuickActions />
      </div>

      {/* Alertes vivantes M.A.X. */}
      <AlertsWidget />

      {/* Activité récente */}
      <div className="rounded-lg shadow p-6" style={{ background: colors.cardBg }}>
        <h2 className="text-xl font-semibold mb-4" style={{ color: colors.textPrimary }}>Activité récente</h2>
        <RecentActivityList activities={recentActivity} />
      </div>
    </div>
  );
}