/**
 * Store Zustand pour la gestion du billing WhatsApp
 * - Abonnement mensuel (24,90€/mois, 100 messages inclus)
 * - Recharges (packs de messages supplémentaires)
 * - Blocage si abonnement inactif
 */

import { create } from 'zustand';
import { apiClient } from '../api/client';

// ============================================================
// Types
// ============================================================

export interface RechargePack {
  messages: number;
  price: number;
  label: string;
}

export interface WhatsappBillingState {
  // État abonnement
  subscriptionActive: boolean;
  subscriptionExpiresAt: string | null;

  // Messages inclus (abonnement mensuel)
  includedMessages: number;
  includedMessagesUsed: number;
  includedRemaining: number;

  // Messages rechargés (achetés séparément)
  rechargedMessages: number;
  rechargedMessagesUsed: number;
  rechargedRemaining: number;

  // Total disponible
  totalAvailable: number;

  // Alertes
  isLowBalance: boolean;
  expiresSoon: boolean;

  // Packs et prix
  packs: Record<string, RechargePack>;
  subscriptionPrice: number;
  subscriptionIncludedMessages: number;

  // Loading states
  isLoading: boolean;
  isSubscribing: boolean;
  isRecharging: boolean;
  error: string | null;

  // Actions
  loadBilling: () => Promise<void>;
  subscribe: (months?: number) => Promise<void>;
  recharge: (packId: string) => Promise<void>;
  checkCanSend: () => Promise<{ canSend: boolean; reason?: string; message?: string }>;
  clearError: () => void;
}

export interface RechargeHistoryItem {
  id: number;
  tenant_id: string;
  pack_id: string;
  messages_count: number;
  price_eur: number;
  created_at: string;
  created_by: string | null;
}

// ============================================================
// Store
// ============================================================

export const useWhatsappBillingStore = create<WhatsappBillingState>((set, get) => ({
  // Initial state
  subscriptionActive: false,
  subscriptionExpiresAt: null,
  includedMessages: 0,
  includedMessagesUsed: 0,
  includedRemaining: 0,
  rechargedMessages: 0,
  rechargedMessagesUsed: 0,
  rechargedRemaining: 0,
  totalAvailable: 0,
  isLowBalance: false,
  expiresSoon: false,
  packs: {},
  subscriptionPrice: 24.90,
  subscriptionIncludedMessages: 100,
  isLoading: false,
  isSubscribing: false,
  isRecharging: false,
  error: null,

  // ============================================================
  // Load Billing State
  // ============================================================
  loadBilling: async () => {
    try {
      set({ isLoading: true, error: null });

      const response: any = await apiClient.get('/whatsapp/billing');

      if (!response.ok) {
        throw new Error(response.error || 'Erreur lors du chargement du billing');
      }

      const { billing, packs, subscriptionPrice, subscriptionIncludedMessages } = response;

      set({
        subscriptionActive: billing.subscriptionActive,
        subscriptionExpiresAt: billing.subscriptionExpiresAt,
        includedMessages: billing.includedMessages,
        includedMessagesUsed: billing.includedMessagesUsed,
        includedRemaining: billing.includedRemaining,
        rechargedMessages: billing.rechargedMessages,
        rechargedMessagesUsed: billing.rechargedMessagesUsed,
        rechargedRemaining: billing.rechargedRemaining,
        totalAvailable: billing.totalAvailable,
        isLowBalance: billing.isLowBalance,
        expiresSoon: billing.expiresSoon,
        packs: packs || {},
        subscriptionPrice: subscriptionPrice || 24.90,
        subscriptionIncludedMessages: subscriptionIncludedMessages || 100,
        isLoading: false
      });

      console.log('[WhatsappBillingStore] Billing loaded:', {
        active: billing.subscriptionActive,
        total: billing.totalAvailable
      });

    } catch (error: any) {
      console.error('[WhatsappBillingStore] Erreur loadBilling:', error);
      set({
        isLoading: false,
        error: error.message || 'Erreur lors du chargement'
      });
    }
  },

  // ============================================================
  // Subscribe (Activate/Renew)
  // ============================================================
  subscribe: async (months = 1) => {
    try {
      set({ isSubscribing: true, error: null });

      const response: any = await apiClient.post('/whatsapp/billing/subscribe', { months });

      if (!response.ok) {
        throw new Error(response.error || 'Erreur lors de l\'activation');
      }

      console.log('[WhatsappBillingStore] Abonnement activé:', response.message);

      // Recharger l'état complet
      await get().loadBilling();

      set({ isSubscribing: false });

    } catch (error: any) {
      console.error('[WhatsappBillingStore] Erreur subscribe:', error);
      set({
        isSubscribing: false,
        error: error.message || 'Erreur lors de l\'activation'
      });
      throw error;
    }
  },

  // ============================================================
  // Recharge (Buy Pack)
  // ============================================================
  recharge: async (packId: string) => {
    try {
      set({ isRecharging: true, error: null });

      const response: any = await apiClient.post('/whatsapp/billing/recharge', { packId });

      if (!response.ok) {
        throw new Error(response.error || 'Erreur lors de la recharge');
      }

      console.log('[WhatsappBillingStore] Recharge ajoutée:', response.message);

      // Recharger l'état complet
      await get().loadBilling();

      set({ isRecharging: false });

    } catch (error: any) {
      console.error('[WhatsappBillingStore] Erreur recharge:', error);
      set({
        isRecharging: false,
        error: error.message || 'Erreur lors de la recharge'
      });
      throw error;
    }
  },

  // ============================================================
  // Check Can Send
  // ============================================================
  checkCanSend: async () => {
    try {
      const response: any = await apiClient.get('/whatsapp/billing/check');

      if (!response.ok) {
        return { canSend: false, reason: 'error', message: response.error };
      }

      return {
        canSend: response.canSend,
        reason: response.reason,
        message: response.message
      };

    } catch (error: any) {
      console.error('[WhatsappBillingStore] Erreur checkCanSend:', error);
      return { canSend: false, reason: 'error', message: error.message };
    }
  },

  // ============================================================
  // Clear Error
  // ============================================================
  clearError: () => {
    set({ error: null });
  }
}));
