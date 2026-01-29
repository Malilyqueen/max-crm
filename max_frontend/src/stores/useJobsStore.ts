/**
 * stores/useJobsStore.ts
 * Store Zustand pour les batch jobs (import, bulk_update)
 */

import { create } from 'zustand';
import { apiClient } from '../api/client';

// Types
export type JobStatus = 'pending' | 'awaiting_validation' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type JobType = 'import' | 'bulk_update' | 'bulk_delete';

export interface BatchJob {
  id: string;
  tenant_id: string;
  job_type: JobType;
  operation_name: string;
  status: JobStatus;
  total_items: number;
  processed_items: number;
  success_count: number;
  fail_count: number;
  skip_count: number;
  errors?: Array<{ item: string; error: string }>;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  file_name?: string;
  progress?: number;
  eta?: string;
}

// Labels humains pour les statuts
export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  pending: 'En attente',
  awaiting_validation: 'Validation requise',
  queued: 'En file d\'attente',
  running: 'En cours',
  completed: 'Terminé',
  failed: 'Erreur',
  cancelled: 'Annulé'
};

// Couleurs pour les statuts
export const JOB_STATUS_COLORS: Record<JobStatus, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
  awaiting_validation: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  queued: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-400' },
  running: { bg: 'bg-cyan-100', text: 'text-cyan-700', dot: 'bg-cyan-400' },
  completed: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-400' },
  failed: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-400' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' }
};

// Labels pour les types de jobs
export const JOB_TYPE_LABELS: Record<JobType, string> = {
  import: 'Import CSV',
  bulk_update: 'Modification en masse',
  bulk_delete: 'Suppression en masse'
};

interface JobsStore {
  // State
  jobs: BatchJob[];
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;

  // Polling
  pollingInterval: NodeJS.Timeout | null;

  // Actions
  loadJobs: (limit?: number) => Promise<void>;
  cancelJob: (jobId: string) => Promise<void>;
  getJobErrors: (jobId: string) => Promise<Array<{ item: string; error: string }>>;

  // Polling
  startPolling: () => void;
  stopPolling: () => void;
  adjustPolling: (hasActiveJobs: boolean) => void;

  // Clear
  clearError: () => void;
}

// Helper selectors (use outside store)
export const selectActiveJobs = (jobs: BatchJob[]) => jobs.filter(j => j.status === 'queued' || j.status === 'running');
export const selectQueuedCount = (jobs: BatchJob[]) => jobs.filter(j => j.status === 'queued').length;
export const selectRunningCount = (jobs: BatchJob[]) => jobs.filter(j => j.status === 'running').length;
export const selectHasActiveJobs = (jobs: BatchJob[]) => jobs.some(j => j.status === 'queued' || j.status === 'running');

export const useJobsStore = create<JobsStore>((set, get) => ({
  // Initial state
  jobs: [],
  isLoading: false,
  error: null,
  lastUpdate: null,
  pollingInterval: null,

  // Load jobs
  loadJobs: async (limit = 20) => {
    set({ isLoading: true, error: null });

    try {
      const response = await apiClient.get<{ ok: boolean; jobs: BatchJob[] }>(`/batch-jobs?limit=${limit}`);

      if (response.ok) {
        const jobs = response.jobs;
        set({
          jobs,
          isLoading: false,
          lastUpdate: new Date()
        });

        // Adjust polling based on active jobs
        const hasActive = jobs.some(j => j.status === 'queued' || j.status === 'running');
        get().adjustPolling(hasActive);
      }
    } catch (error: any) {
      console.error('[Jobs] Erreur chargement:', error);
      set({
        isLoading: false,
        error: error.response?.data?.message || error.message || 'Erreur lors du chargement des jobs'
      });
    }
  },

  // Cancel job
  cancelJob: async (jobId: string) => {
    try {
      await apiClient.post(`/batch-jobs/${jobId}/cancel`);
      // Reload jobs to get updated status
      await get().loadJobs();
    } catch (error: any) {
      console.error('[Jobs] Erreur annulation:', error);
      throw error;
    }
  },

  // Get job errors
  getJobErrors: async (jobId: string) => {
    try {
      const response = await apiClient.get<{ ok: boolean; errors: Array<{ item: string; error: string }> }>(`/batch-jobs/${jobId}/errors`);
      return response.errors || [];
    } catch (error: any) {
      console.error('[Jobs] Erreur récupération erreurs:', error);
      return [];
    }
  },

  // Smart polling - internal
  adjustPolling: (hasActiveJobs: boolean) => {
    const currentInterval = get().pollingInterval;

    if (hasActiveJobs) {
      // Fast polling: 2.5s
      if (currentInterval) clearInterval(currentInterval);
      const interval = setInterval(() => {
        get().loadJobs();
      }, 2500);
      set({ pollingInterval: interval });
    } else {
      // Slow polling: 30s
      if (currentInterval) clearInterval(currentInterval);
      const interval = setInterval(() => {
        get().loadJobs();
      }, 30000);
      set({ pollingInterval: interval });
    }
  },

  // Start polling
  startPolling: () => {
    // Initial load
    get().loadJobs();
  },

  // Stop polling
  stopPolling: () => {
    const interval = get().pollingInterval;
    if (interval) {
      clearInterval(interval);
      set({ pollingInterval: null });
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  }
}));
