/**
 * stores/useAutomationStore.ts
 * Store Zustand pour la gestion des workflows et automatisations
 *
 * Consomme l'API /api/automations (données réelles en DB)
 * Remplace l'ancienne version qui utilisait n8n + données mockées
 */

import { create } from 'zustand';
import { apiClient } from '../api/client';
import type { Workflow, AutomationFilters, WorkflowStatus } from '../types/automation';

interface AutoGuardConfig {
  enabled: boolean;
  allowed: string[];
  rateLimitPerHour: number;
  schedule: {
    start: string;
    end: string;
  };
}

interface AutomationState {
  // Data
  workflows: Workflow[];
  selectedWorkflow: Workflow | null;
  filters: AutomationFilters;
  autoGuardConfig: AutoGuardConfig | null;

  // UI State
  isLoading: boolean;
  isLoadingDetail: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  error: string | null;

  // Stats
  total: number;

  // Actions
  loadWorkflows: () => Promise<void>;
  loadAutoGuardConfig: () => Promise<void>;
  loadWorkflowDetail: (workflowId: string) => Promise<void>;
  createWorkflow: (data: CreateWorkflowData) => Promise<Workflow | null>;
  updateWorkflow: (id: string, data: Partial<CreateWorkflowData>) => Promise<Workflow | null>;
  deleteWorkflow: (id: string) => Promise<boolean>;
  toggleWorkflowStatus: (workflowId: string) => Promise<void>;
  executeWorkflow: (workflowId: string, leadId?: string) => Promise<any>;
  setFilters: (filters: AutomationFilters) => void;
  clearFilters: () => void;
  clearSelectedWorkflow: () => void;
  clearError: () => void;
}

// Type pour création de workflow
export interface CreateWorkflowData {
  name: string;
  description?: string;
  trigger_type: 'lead_created' | 'lead_status_changed' | 'time_based' | 'lead_updated' | 'tag_added' | 'manual';
  trigger_label?: string;
  trigger_config?: Record<string, any>;
  actions?: WorkflowAction[];
  status?: 'draft' | 'active' | 'inactive';
}

export interface WorkflowAction {
  id?: string;
  type: 'send_email' | 'wait' | 'add_tag' | 'create_task' | 'update_field' | 'notify';
  label: string;
  description?: string;
  config: Record<string, any>;
  order: number;
}

// API Response types
interface WorkflowsResponse {
  ok: boolean;
  workflows: Workflow[];
  total: number;
}

interface WorkflowResponse {
  ok: boolean;
  workflow: Workflow;
  message?: string;
}

interface ExecuteResponse {
  ok: boolean;
  execution_id: string;
  status: string;
  duration_ms: number;
  actions_executed: number;
  message?: string;
}

export const useAutomationStore = create<AutomationState>((set, get) => ({
  // Initial state
  workflows: [],
  selectedWorkflow: null,
  filters: {},
  autoGuardConfig: null,
  isLoading: false,
  isLoadingDetail: false,
  isCreating: false,
  isUpdating: false,
  error: null,
  total: 0,

  // Load workflows list (depuis /api/automations)
  loadWorkflows: async () => {
    set({ isLoading: true, error: null });

    try {
      const { filters } = get();

      // Build query params
      const params = new URLSearchParams();
      if (filters.status) {
        params.append('status', Array.isArray(filters.status) ? filters.status.join(',') : filters.status);
      }
      if (filters.triggerType) {
        params.append('triggerType', Array.isArray(filters.triggerType) ? filters.triggerType.join(',') : filters.triggerType);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }

      const queryString = params.toString();
      const url = `/automations${queryString ? `?${queryString}` : ''}`;

      console.log('[AUTOMATION STORE] Loading workflows:', url);

      const response = await apiClient.get<WorkflowsResponse>(url);

      if (response.ok) {
        set({
          workflows: response.workflows,
          total: response.total,
          isLoading: false
        });
        console.log(`[AUTOMATION STORE] Loaded ${response.workflows.length} workflows`);
      } else {
        throw new Error('Failed to load workflows');
      }

    } catch (error) {
      console.error('[AUTOMATION STORE] Erreur loadWorkflows:', error);
      set({
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        isLoading: false
      });
    }
  },

  // Load auto-guard config (pour compatibilité, config hardcodée)
  loadAutoGuardConfig: async () => {
    try {
      const config: AutoGuardConfig = {
        enabled: true,
        allowed: [],
        rateLimitPerHour: 50,
        schedule: {
          start: '09:00',
          end: '19:00'
        }
      };

      set({ autoGuardConfig: config });
    } catch (error) {
      console.error('[AUTOMATION STORE] Erreur loadAutoGuardConfig:', error);
    }
  },

  // Load workflow detail
  loadWorkflowDetail: async (workflowId: string) => {
    set({ isLoadingDetail: true, error: null });

    try {
      console.log('[AUTOMATION STORE] Loading workflow detail:', workflowId);

      const response = await apiClient.get<WorkflowResponse>(`/automations/${workflowId}`);

      if (response.ok) {
        set({
          selectedWorkflow: response.workflow,
          isLoadingDetail: false
        });
      } else {
        throw new Error('Workflow not found');
      }

    } catch (error) {
      console.error('[AUTOMATION STORE] Erreur loadWorkflowDetail:', error);
      set({
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        isLoadingDetail: false
      });
    }
  },

  // Create new workflow
  createWorkflow: async (data: CreateWorkflowData) => {
    set({ isCreating: true, error: null });

    try {
      console.log('[AUTOMATION STORE] Creating workflow:', data.name);

      const response = await apiClient.post<WorkflowResponse>('/automations', data);

      if (response.ok) {
        await get().loadWorkflows();
        set({ isCreating: false });
        console.log(`[AUTOMATION STORE] Workflow created: ${response.workflow.id}`);
        return response.workflow;
      } else {
        throw new Error('Failed to create workflow');
      }
    } catch (error) {
      console.error('[AUTOMATION STORE] Erreur createWorkflow:', error);
      set({
        isCreating: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la création'
      });
      return null;
    }
  },

  // Update workflow
  updateWorkflow: async (id: string, data: Partial<CreateWorkflowData>) => {
    set({ isUpdating: true, error: null });

    try {
      console.log('[AUTOMATION STORE] Updating workflow:', id);

      const response = await apiClient.patch<WorkflowResponse>(`/automations/${id}`, data);

      if (response.ok) {
        set(state => ({
          workflows: state.workflows.map(w =>
            w.id === id ? response.workflow : w
          ),
          selectedWorkflow: state.selectedWorkflow?.id === id
            ? response.workflow
            : state.selectedWorkflow,
          isUpdating: false
        }));
        console.log(`[AUTOMATION STORE] Workflow updated: ${id}`);
        return response.workflow;
      } else {
        throw new Error('Failed to update workflow');
      }
    } catch (error) {
      console.error('[AUTOMATION STORE] Erreur updateWorkflow:', error);
      set({
        isUpdating: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour'
      });
      return null;
    }
  },

  // Delete (archive) workflow
  deleteWorkflow: async (id: string) => {
    try {
      console.log('[AUTOMATION STORE] Deleting workflow:', id);

      const response = await apiClient.delete<{ ok: boolean }>(`/automations/${id}`);

      if (response.ok) {
        set(state => ({
          workflows: state.workflows.filter(w => w.id !== id),
          selectedWorkflow: state.selectedWorkflow?.id === id
            ? null
            : state.selectedWorkflow
        }));
        await get().loadWorkflows();
        return true;
      }
      return false;
    } catch (error) {
      console.error('[AUTOMATION STORE] Erreur deleteWorkflow:', error);
      set({ error: error instanceof Error ? error.message : 'Erreur lors de la suppression' });
      return false;
    }
  },

  // Toggle workflow status (active/inactive)
  toggleWorkflowStatus: async (workflowId: string) => {
    try {
      console.log('[AUTOMATION STORE] Toggling workflow status:', workflowId);

      const response = await apiClient.post<{ ok: boolean; status: string; message?: string }>(
        `/automations/${workflowId}/toggle`,
        {}
      );

      if (response.ok) {
        // Update local state
        set(state => ({
          workflows: state.workflows.map(w =>
            w.id === workflowId
              ? { ...w, status: response.status as WorkflowStatus }
              : w
          ),
          selectedWorkflow: state.selectedWorkflow?.id === workflowId
            ? { ...state.selectedWorkflow, status: response.status as WorkflowStatus }
            : state.selectedWorkflow
        }));

        console.log(`[AUTOMATION STORE] Workflow ${workflowId} → ${response.status}`);
      } else {
        throw new Error('Failed to toggle workflow status');
      }

    } catch (error) {
      console.error('[AUTOMATION STORE] Erreur toggleWorkflowStatus:', error);
      set({
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  },

  // Execute workflow manually
  executeWorkflow: async (workflowId: string, leadId?: string) => {
    try {
      console.log('[AUTOMATION STORE] Executing workflow:', workflowId);

      const response = await apiClient.post<ExecuteResponse>(
        `/automations/${workflowId}/execute`,
        { lead_id: leadId }
      );

      if (response.ok) {
        console.log(`[AUTOMATION STORE] Workflow executed: ${response.execution_id}`);
        // Reload to update stats
        await get().loadWorkflows();
        return response;
      } else {
        throw new Error('Failed to execute workflow');
      }

    } catch (error) {
      console.error('[AUTOMATION STORE] Erreur executeWorkflow:', error);
      set({
        error: error instanceof Error ? error.message : 'Erreur lors de l\'exécution'
      });
      return null;
    }
  },

  // Set filters
  setFilters: (filters: AutomationFilters) => {
    set({ filters });
    get().loadWorkflows();
  },

  // Clear filters
  clearFilters: () => {
    set({ filters: {} });
    get().loadWorkflows();
  },

  // Clear selected workflow
  clearSelectedWorkflow: () => {
    set({ selectedWorkflow: null });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  }
}));
