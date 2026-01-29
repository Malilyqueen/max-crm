/**
 * stores/useEventsStore.ts
 * Store Zustand pour les message_events (Email, SMS, WhatsApp)
 */

import { create } from 'zustand';
import { apiClient } from '../api/client';
import type {
  MessageEvent,
  EventFilters,
  EventsListResponse,
  LeadEventsResponse,
  EventsStatsResponse
} from '../types/events';

interface EventsStore {
  // State
  events: MessageEvent[];
  filters: EventFilters;
  isLoading: boolean;
  error: string | null;
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;

  // Stats
  stats: EventsStatsResponse | null;
  isLoadingStats: boolean;

  // Actions
  loadEvents: (page?: number) => Promise<void>;
  loadEventsByLead: (leadId: string, phone?: string, email?: string) => Promise<void>;
  loadStats: (range?: string) => Promise<void>;
  setFilters: (filters: Partial<EventFilters>) => void;
  clearFilters: () => void;
  clearError: () => void;
}

export const useEventsStore = create<EventsStore>((set, get) => ({
  // Initial state
  events: [],
  filters: {},
  isLoading: false,
  error: null,
  total: 0,
  page: 1,
  pageSize: 25,
  hasMore: false,
  stats: null,
  isLoadingStats: false,

  // Load events list
  loadEvents: async (page = 1) => {
    set({ isLoading: true, error: null, page });

    try {
      const { filters, pageSize } = get();

      // Construire query params
      const params: any = {
        page,
        limit: pageSize
      };

      if (filters.channel && filters.channel.length > 0) {
        // Backend n'accepte qu'un canal à la fois pour le moment
        params.channel = filters.channel[0];
      }

      if (filters.status && filters.status.length > 0) {
        // Backend n'accepte qu'un statut à la fois
        params.status = filters.status[0];
      }

      if (filters.direction) {
        params.direction = filters.direction;
      }

      if (filters.leadId) {
        params.leadId = filters.leadId;
      }

      if (filters.search) {
        params.search = filters.search;
      }

      if (filters.startDate) {
        params.startDate = filters.startDate;
      }

      if (filters.endDate) {
        params.endDate = filters.endDate;
      }

      const response = await apiClient.get<EventsListResponse>('/events', {
        params
      });

      // Debug: vérifier message_snippet
      console.log('[EVENTS] Response items:', response.items);
      console.log('[EVENTS] First item message_snippet:', response.items?.[0]?.message_snippet);

      set({
        events: response.items,
        total: response.total,
        hasMore: response.hasMore,
        isLoading: false
      });
    } catch (error: any) {
      console.error('[EVENTS] Erreur chargement events:', error);
      set({
        isLoading: false,
        error: error.response?.data?.error || error.message || 'Erreur lors du chargement des events'
      });
    }
  },

  // Load events for a specific lead
  // Pass phone and email for fallback search when lead_id doesn't match
  loadEventsByLead: async (leadId: string, phone?: string, email?: string) => {
    set({ isLoading: true, error: null });

    try {
      // Build query params for fallback search
      const params: Record<string, string> = {};
      if (phone) params.phone = phone;
      if (email) params.email = email;

      const response = await apiClient.get<LeadEventsResponse>(`/events/lead/${leadId}`, { params });

      set({
        events: response.events,
        total: response.total,
        isLoading: false
      });
    } catch (error: any) {
      console.error('[EVENTS] Erreur chargement events lead:', error);
      set({
        isLoading: false,
        error: error.response?.data?.error || error.message || 'Erreur lors du chargement des events du lead'
      });
    }
  },

  // Load stats
  loadStats: async (range = '7d') => {
    set({ isLoadingStats: true, error: null });

    try {
      const response = await apiClient.get<EventsStatsResponse>('/events/stats', {
        params: { range }
      });

      set({
        stats: response,
        isLoadingStats: false
      });
    } catch (error: any) {
      console.error('[EVENTS] Erreur chargement stats:', error);
      set({
        isLoadingStats: false,
        error: error.response?.data?.error || error.message || 'Erreur lors du chargement des statistiques'
      });
    }
  },

  // Set filters
  setFilters: (newFilters: Partial<EventFilters>) => {
    set((state) => ({
      filters: {
        ...state.filters,
        ...newFilters
      }
    }));

    // Reload events with new filters
    get().loadEvents(1);
  },

  // Clear filters
  clearFilters: () => {
    set({ filters: {} });
    get().loadEvents(1);
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  }
}));
