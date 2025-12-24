/**
 * stores/useDashboardStore.ts
 * Store Zustand pour le Dashboard MVP1
 */

import { create } from 'zustand';
import { apiClient } from '../api/client';
import type { DashboardData, DashboardStats, LeadsTrend, RecentActivity, LeadsByStatus } from '../types/dashboard';

interface DashboardStore {
  // State
  stats: DashboardStats | null;
  leadsTrend: LeadsTrend[];
  recentActivity: RecentActivity[];
  leadsByStatus: LeadsByStatus[];
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;

  // Actions
  loadDashboard: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
  clearError: () => void;
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  // Initial state
  stats: null,
  leadsTrend: [],
  recentActivity: [],
  leadsByStatus: [],
  isLoading: false,
  error: null,
  lastUpdate: null,

  // Load dashboard data
  loadDashboard: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await apiClient.get<DashboardData>('/dashboard-mvp1/stats');

      set({
        stats: response.stats,
        leadsTrend: response.leadsTrend,
        recentActivity: response.recentActivity,
        leadsByStatus: response.leadsByStatus,
        isLoading: false,
        lastUpdate: new Date()
      });
    } catch (error: any) {
      console.error('[Dashboard] Erreur chargement:', error);
      set({
        isLoading: false,
        error: error.response?.data?.error || error.message || 'Erreur lors du chargement du dashboard'
      });
    }
  },

  // Refresh dashboard (alias for loadDashboard)
  refreshDashboard: async () => {
    await get().loadDashboard();
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  }
}));
