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
  errorCode: string | null;
  needsCrmSetup: boolean;
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
  errorCode: null,
  needsCrmSetup: false,
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

      const errorCode = error.response?.data?.error || null;
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors du chargement du dashboard';
      const httpStatus = error.response?.status;

      // Détecter si le tenant n'a pas de CRM configuré
      // Codes d'erreur possibles: TENANT_NOT_PROVISIONED, CRM_NOT_CONFIGURED, CRM_PROVISIONING
      // Ou status HTTP 409/503 qui indique un problème de provisioning CRM
      const crmErrorCodes = ['TENANT_NOT_PROVISIONED', 'CRM_NOT_CONFIGURED', 'CRM_PROVISIONING', 'CRM_NOT_PROVISIONED', 'CRM_ERROR'];
      const needsCrmSetup = crmErrorCodes.includes(errorCode) || httpStatus === 409 || httpStatus === 503;

      console.log(`[Dashboard] 📊 Erreur détectée: code=${errorCode}, status=${httpStatus}, needsCrmSetup=${needsCrmSetup}`);

      if (needsCrmSetup) {
        console.log('[Dashboard] 🔧 CRM non provisionné - redirection vers /crm-setup requise');
      }

      set({
        isLoading: false,
        error: errorMessage,
        errorCode,
        needsCrmSetup
      });
    }
  },

  // Refresh dashboard (alias for loadDashboard)
  refreshDashboard: async () => {
    await get().loadDashboard();
  },

  // Clear error
  clearError: () => {
    set({ error: null, errorCode: null, needsCrmSetup: false });
  }
}));
