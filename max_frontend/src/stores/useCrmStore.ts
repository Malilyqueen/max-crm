/**
 * stores/useCrmStore.ts
 * Store Zustand pour le CRM MVP1
 */

import { create } from 'zustand';
import { apiClient } from '../api/client';
import type {
  Lead,
  LeadFilters,
  LeadsListResponse,
  LeadDetailResponse,
  UpdateLeadStatusPayload,
  AddLeadNotePayload,
  LeadNote,
  LeadActivity
} from '../types/crm';

interface CrmStore {
  // State
  leads: Lead[];
  selectedLead: Lead | null;
  leadNotes: LeadNote[];
  leadActivities: LeadActivity[];
  filters: LeadFilters;
  isLoading: boolean;
  isLoadingDetail: boolean;
  error: string | null;
  total: number;
  page: number;
  pageSize: number;
  availableStatuses: string[]; // Statuts disponibles depuis EspoCRM

  // Actions
  loadLeads: (page?: number) => Promise<void>;
  loadLeadDetail: (leadId: string) => Promise<void>;
  updateLeadStatus: (payload: UpdateLeadStatusPayload) => Promise<void>;
  addLeadNote: (payload: AddLeadNotePayload) => Promise<void>;
  loadAvailableStatuses: () => Promise<void>;
  setFilters: (filters: Partial<LeadFilters>) => void;
  clearFilters: () => void;
  clearSelectedLead: () => void;
  clearError: () => void;
}

export const useCrmStore = create<CrmStore>((set, get) => ({
  // Initial state
  leads: [],
  selectedLead: null,
  leadNotes: [],
  leadActivities: [],
  filters: {},
  isLoading: false,
  isLoadingDetail: false,
  error: null,
  total: 0,
  page: 1,
  pageSize: 25,
  availableStatuses: [],

  // Load leads list
  loadLeads: async (page = 1) => {
    set({ isLoading: true, error: null, page });

    try {
      const { filters, pageSize } = get();

      // ⚠️ TEMPORAIRE: Utiliser route publique /crm-public sans auth
      // TODO Phase 3: Remettre /crm une fois JWT auth implémenté
      const response = await apiClient.get<LeadsListResponse>('/crm-public/leads', {
        params: {
          page,
          pageSize,
          ...filters
        }
      });

      set({
        leads: response.leads,
        total: response.total,
        isLoading: false
      });
    } catch (error: any) {
      console.error('[CRM] Erreur chargement leads:', error);
      set({
        isLoading: false,
        error: error.response?.data?.error || error.message || 'Erreur lors du chargement des leads'
      });
    }
  },

  // Load lead detail
  loadLeadDetail: async (leadId: string) => {
    set({ isLoadingDetail: true, error: null });

    try {
      // ⚠️ TEMPORAIRE: Utiliser route publique /crm-public sans auth
      // TODO Phase 3: Remettre /crm une fois JWT auth implémenté
      const response = await apiClient.get<LeadDetailResponse>(`/crm-public/leads/${leadId}`);

      set({
        selectedLead: response.lead,
        leadNotes: response.notes,
        leadActivities: response.activities,
        isLoadingDetail: false
      });
    } catch (error: any) {
      console.error('[CRM] Erreur chargement détail lead:', error);
      set({
        isLoadingDetail: false,
        error: error.response?.data?.error || error.message || 'Erreur lors du chargement du lead'
      });
    }
  },

  // Update lead status
  updateLeadStatus: async (payload: UpdateLeadStatusPayload) => {
    try {
      // ⚠️ TEMPORAIRE: Utiliser route publique /crm-public sans auth
      // TODO Phase 3: Remettre /crm une fois JWT auth implémenté
      const response = await apiClient.patch<{ lead: Lead }>(`/crm-public/leads/${payload.leadId}/status`, {
        status: payload.status
      });

      // Update lead in list
      set((state) => ({
        leads: state.leads.map((lead) =>
          lead.id === payload.leadId ? response.lead : lead
        ),
        selectedLead: state.selectedLead?.id === payload.leadId ? response.lead : state.selectedLead
      }));

      // Reload detail if lead is selected
      if (get().selectedLead?.id === payload.leadId) {
        await get().loadLeadDetail(payload.leadId);
      }
    } catch (error: any) {
      console.error('[CRM] Erreur changement statut:', error);
      set({
        error: error.response?.data?.error || error.message || 'Erreur lors du changement de statut'
      });
      throw error;
    }
  },

  // Add lead note
  addLeadNote: async (payload: AddLeadNotePayload) => {
    try {
      // ⚠️ TEMPORAIRE: Utiliser route publique /crm-public sans auth
      // TODO Phase 3: Remettre /crm une fois JWT auth implémenté
      const response = await apiClient.post<{ note: LeadNote }>(`/crm-public/leads/${payload.leadId}/notes`, {
        content: payload.content
      });

      // Add note to list
      set((state) => ({
        leadNotes: [response.note, ...state.leadNotes]
      }));

      // Reload detail to get updated activities
      await get().loadLeadDetail(payload.leadId);
    } catch (error: any) {
      console.error('[CRM] Erreur ajout note:', error);
      set({
        error: error.response?.data?.error || error.message || 'Erreur lors de l\'ajout de la note'
      });
      throw error;
    }
  },

  // Set filters
  setFilters: (newFilters: Partial<LeadFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      page: 1 // Reset to first page on filter change
    }));
    // Reload leads with new filters
    get().loadLeads(1);
  },

  // Clear filters
  clearFilters: () => {
    set({ filters: {}, page: 1 });
    get().loadLeads(1);
  },

  // Clear selected lead
  clearSelectedLead: () => {
    set({
      selectedLead: null,
      leadNotes: [],
      leadActivities: []
    });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },

  // Load available statuses from EspoCRM
  loadAvailableStatuses: async () => {
    // ⚠️ TEMPORAIRE: Utiliser valeurs par défaut au lieu d'appeler l'API
    // TODO Phase 3: Créer endpoint /crm-public/metadata/lead-statuses
    console.log('[CRM] Utilisation des statuts par défaut (endpoint metadata non encore implémenté)');
    set({ availableStatuses: ['New', 'Assigned', 'In Process', 'Converted', 'Recycled', 'Dead'] });

    // Code désactivé pour éviter erreur 401:
    // try {
    //   const response = await apiClient.get<{ options: string[]; default: string }>('/crm-public/metadata/lead-statuses');
    //   set({ availableStatuses: response.options });
    // } catch (error: any) {
    //   console.error('[CRM] Erreur chargement statuts:', error);
    //   set({ availableStatuses: ['New', 'Assigned', 'In Process', 'Converted', 'Recycled', 'Dead'] });
    // }
  }
}));
