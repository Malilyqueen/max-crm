/**
 * stores/useRecommendationsStore.ts
 * Store Zustand pour les recommandations intelligentes M.A.X.
 *
 * Consomme l'API /api/max/recommendations
 * Affiche les actions suggérées par le moteur de décision
 */

import { create } from 'zustand';
import { apiClient } from '../api/client';

// Types
export interface Recommendation {
  id: string;
  lead_id?: string;  // Optional for bulk recommendations
  lead_name?: string;  // Optional for bulk recommendations
  lead_email?: string;
  lead_phone?: string;
  lead_company?: string;
  type: RecommendationType;
  name: string;
  description: string;
  priority: RecommendationPriority;
  recommended_channel: 'whatsapp' | 'email' | 'sms' | 'phone';
  fallback_channel?: string;
  template_category?: string;
  hours_since_interaction?: number;  // Optional for bulk
  reason: string;
  created_at: string;
  expires_at?: string;

  // Bulk recommendation fields
  is_bulk?: boolean;
  count?: number;
  stats?: {
    total: number;
    older_than_7d: number;
    older_than_3d: number;
    older_than_1d: number;
  };
  leads?: Array<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
    created_at: string;
  }>;
  cta?: {
    label: string;
    action: string;
    params: {
      filter?: string;
      url?: string;
    };
  };
  bulk_action?: {
    label: string;
    action: string;
    params: {
      channel?: string;
      filters?: Record<string, any>;
    };
  };
}

export type RecommendationType =
  | 'follow_up_j1'
  | 'follow_up_j3'
  | 'cart_abandoned'
  | 'invoice_unpaid'
  | 'hot_lead'
  | 'appointment_reminder'
  | 'welcome_new_lead'
  | 'reactivation'
  | 'never_contacted'
  | 'never_contacted_bulk';

export type RecommendationPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface RecommendationTypeInfo {
  key: RecommendationType;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface PriorityInfo {
  key: RecommendationPriority;
  name: string;
  description: string;
  color: string;
  icon: string;
}

export interface RecommendationStats {
  total: number;
  by_priority: Record<RecommendationPriority, number>;
  by_type: Record<string, number>;
  by_channel: Record<string, number>;
}

interface RecommendationsState {
  // Data
  recommendations: Recommendation[];
  stats: RecommendationStats | null;
  types: RecommendationTypeInfo[];
  priorities: PriorityInfo[];

  // Filters
  priorityFilter: RecommendationPriority | null;
  typeFilter: RecommendationType | null;

  // UI State
  isLoading: boolean;
  isLoadingStats: boolean;
  isSyncing: boolean;
  error: string | null;

  // Actions
  loadRecommendations: () => Promise<void>;
  loadStats: () => Promise<void>;
  loadTypes: () => Promise<void>;
  loadPriorities: () => Promise<void>;
  syncLeadsCache: () => Promise<boolean>;
  executeRecommendation: (id: string, actionType: string, description?: string) => Promise<boolean>;
  dismissRecommendation: (id: string, reason?: string) => Promise<boolean>;
  setPriorityFilter: (priority: RecommendationPriority | null) => void;
  setTypeFilter: (type: RecommendationType | null) => void;
  clearFilters: () => void;
  clearError: () => void;
}

// API Response types
interface RecommendationsResponse {
  ok: boolean;
  recommendations: Recommendation[];
  total: number;
  analyzed_leads?: number;
  source?: string;
}

interface StatsResponse {
  ok: boolean;
  stats: RecommendationStats;
}

interface TypesResponse {
  ok: boolean;
  types: RecommendationTypeInfo[];
}

interface PrioritiesResponse {
  ok: boolean;
  priorities: PriorityInfo[];
}

export const useRecommendationsStore = create<RecommendationsState>((set, get) => ({
  // Initial state
  recommendations: [],
  stats: null,
  types: [],
  priorities: [],
  priorityFilter: null,
  typeFilter: null,
  isLoading: false,
  isLoadingStats: false,
  isSyncing: false,
  error: null,

  // Load recommendations
  loadRecommendations: async () => {
    set({ isLoading: true, error: null });

    try {
      const { priorityFilter, typeFilter } = get();

      // Build query params
      const params = new URLSearchParams();
      params.append('limit', '20');
      if (priorityFilter) params.append('priority', priorityFilter);
      if (typeFilter) params.append('type', typeFilter);

      const queryString = params.toString();
      const url = `/max/recommendations?${queryString}`;

      console.log('[RECOMMENDATIONS STORE] Loading:', url);

      const response = await apiClient.get<RecommendationsResponse>(url);

      if (response.ok) {
        set({
          recommendations: response.recommendations,
          isLoading: false
        });
        console.log(`[RECOMMENDATIONS STORE] Loaded ${response.recommendations.length} recommendations`);
      } else {
        throw new Error('Failed to load recommendations');
      }

    } catch (error) {
      console.error('[RECOMMENDATIONS STORE] Error:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erreur de chargement'
      });
    }
  },

  // Load statistics
  loadStats: async () => {
    set({ isLoadingStats: true });

    try {
      const response = await apiClient.get<StatsResponse>('/max/recommendations/stats');

      if (response.ok) {
        set({
          stats: response.stats,
          isLoadingStats: false
        });
      }
    } catch (error) {
      console.error('[RECOMMENDATIONS STORE] Error loading stats:', error);
      set({ isLoadingStats: false });
    }
  },

  // Load recommendation types
  loadTypes: async () => {
    try {
      const response = await apiClient.get<TypesResponse>('/max/recommendations/types');

      if (response.ok) {
        set({ types: response.types });
      }
    } catch (error) {
      console.error('[RECOMMENDATIONS STORE] Error loading types:', error);
    }
  },

  // Load priorities
  loadPriorities: async () => {
    try {
      const response = await apiClient.get<PrioritiesResponse>('/max/recommendations/priorities');

      if (response.ok) {
        set({ priorities: response.priorities });
      }
    } catch (error) {
      console.error('[RECOMMENDATIONS STORE] Error loading priorities:', error);
    }
  },

  // Sync leads cache - peut prendre du temps si beaucoup de contacts
  syncLeadsCache: async () => {
    set({ isSyncing: true, error: null });

    try {
      console.log('[RECOMMENDATIONS STORE] Syncing leads cache...');

      // Timeout étendu à 2 minutes pour les gros volumes
      const response = await apiClient.post<{ ok: boolean; synced?: number; message?: string; error?: string }>(
        '/sync/leads-cache',
        {},
        { timeout: 120000 }
      );

      if (response.ok) {
        console.log(`[RECOMMENDATIONS STORE] Synced ${response.synced || 0} leads`);
        // Reload recommendations after sync
        await get().loadRecommendations();
        set({ isSyncing: false });
        return true;
      } else {
        throw new Error(response.error || response.message || 'Sync failed');
      }
    } catch (error: unknown) {
      console.error('[RECOMMENDATIONS STORE] Error syncing:', error);

      // Extraire le message d'erreur selon le type
      let errorMessage = 'Erreur de synchronisation';
      if (error && typeof error === 'object') {
        const err = error as { response?: { data?: { error?: string; message?: string }; status?: number }; message?: string; code?: string };

        // Timeout spécifique
        if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
          errorMessage = 'La synchronisation prend trop de temps. Réessayez ou contactez le support.';
        } else if (err.response?.data?.error) {
          errorMessage = err.response.data.error;
        } else if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.response?.status === 401) {
          errorMessage = 'Session expirée. Veuillez vous reconnecter.';
        } else if (err.response?.status === 500) {
          errorMessage = 'Erreur serveur. Vérifiez la configuration.';
        } else if (err.message) {
          errorMessage = err.message;
        }
      }

      set({
        isSyncing: false,
        error: errorMessage
      });
      return false;
    }
  },

  // Execute a recommendation - crée un message_event pour déclencher relances J+1/J+3
  executeRecommendation: async (id: string, actionType: string, description?: string) => {
    try {
      // Récupérer la recommandation complète pour avoir les infos du lead
      const recommendation = get().recommendations.find(r => r.id === id);

      console.log('[RECOMMENDATIONS STORE] Executing:', id, actionType, recommendation?.lead_name);

      const response = await apiClient.post<{ ok: boolean; message_event_id?: string }>(`/max/recommendations/${id}/execute`, {
        action_type: actionType,
        lead_id: recommendation?.lead_id,
        lead_phone: recommendation?.lead_phone,
        lead_email: recommendation?.lead_email,
        description: description || `Contact ${recommendation?.lead_name} via ${actionType}`
      });

      if (response.ok) {
        console.log('[RECOMMENDATIONS STORE] ✅ Action enregistrée, timer relance démarré');
        // Remove from local list
        set(state => ({
          recommendations: state.recommendations.filter(r => r.id !== id)
        }));
        // Reload stats
        get().loadStats();
        return true;
      }
      return false;
    } catch (error) {
      console.error('[RECOMMENDATIONS STORE] Error executing:', error);
      set({ error: error instanceof Error ? error.message : 'Erreur' });
      return false;
    }
  },

  // Dismiss a recommendation
  dismissRecommendation: async (id: string, reason?: string) => {
    try {
      console.log('[RECOMMENDATIONS STORE] Dismissing:', id);

      const response = await apiClient.post<{ ok: boolean }>(`/max/recommendations/${id}/dismiss`, {
        reason
      });

      if (response.ok) {
        // Remove from local list
        set(state => ({
          recommendations: state.recommendations.filter(r => r.id !== id)
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('[RECOMMENDATIONS STORE] Error dismissing:', error);
      return false;
    }
  },

  // Set priority filter
  setPriorityFilter: (priority) => {
    set({ priorityFilter: priority });
    get().loadRecommendations();
  },

  // Set type filter
  setTypeFilter: (type) => {
    set({ typeFilter: type });
    get().loadRecommendations();
  },

  // Clear filters
  clearFilters: () => {
    set({
      priorityFilter: null,
      typeFilter: null
    });
    get().loadRecommendations();
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  }
}));

// Helper functions for UI
export function getPriorityColor(priority: RecommendationPriority): string {
  const colors: Record<RecommendationPriority, string> = {
    urgent: '#dc2626',
    high: '#f97316',
    medium: '#eab308',
    low: '#22c55e'
  };
  return colors[priority] || '#6b7280';
}

export function getPriorityIcon(priority: RecommendationPriority): string {
  const icons: Record<RecommendationPriority, string> = {
    urgent: '🚨',
    high: '⚡',
    medium: '📌',
    low: '📋'
  };
  return icons[priority] || '📋';
}

export function getTypeIcon(type: RecommendationType): string {
  const icons: Record<RecommendationType, string> = {
    follow_up_j1: '📞',
    follow_up_j3: '⚠️',
    cart_abandoned: '🛒',
    invoice_unpaid: '💰',
    hot_lead: '🔥',
    appointment_reminder: '📅',
    welcome_new_lead: '👋',
    reactivation: '🔄',
    never_contacted: '📵',
    never_contacted_bulk: '📵'
  };
  return icons[type] || '📋';
}

export function getChannelIcon(channel: string): string {
  const icons: Record<string, string> = {
    whatsapp: '💬',
    email: '📧',
    sms: '💬',
    phone: '📞'
  };
  return icons[channel] || '📤';
}
