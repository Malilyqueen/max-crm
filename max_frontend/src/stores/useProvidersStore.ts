/**
 * Store Zustand pour la gestion des providers self-service
 * Inclut la logique de skip de canaux optionnels (SMS/WhatsApp)
 */

import { create } from 'zustand';
import { apiClient } from '../api/client';
import type {
  Provider,
  ProviderWithCredentials,
  ProviderFormData,
  TestResult,
  ChannelType
} from '../types/providers';

// ============================================================
// SMS Settings Types
// ============================================================

export interface SmsConfig {
  sms_mode: 'macrea' | 'self_service';
  sms_sender_label: string | null;
  sms_sender_id: string | null;
  twilio_messaging_service_sid: string | null;
  twilio_from_number: string | null;
}

export interface ValidateSenderResult {
  suggested_id: string;
  is_available: boolean;
  base_id: string;
  alternatives: string[];
}

interface ProvidersState {
  // ============================================================
  // Data
  // ============================================================
  providers: Provider[];
  selectedProvider: ProviderWithCredentials | null;
  qrCode: string | null;
  skippedChannels: ('sms' | 'whatsapp')[]; // Email jamais skip (recommandé)

  // ============================================================
  // Loading States
  // ============================================================
  loading: boolean;
  saving: boolean;
  testing: Record<number, boolean>; // { providerId: isLoading }
  deleting: Record<number, boolean>;
  loadingQR: boolean;

  // ============================================================
  // Test Results
  // ============================================================
  testResults: Record<number, TestResult>;

  // ============================================================
  // Actions - CRUD
  // ============================================================
  fetchProviders: () => Promise<void>;
  fetchProviderDetails: (id: number) => Promise<void>;
  createProvider: (data: ProviderFormData) => Promise<Provider>;
  updateProvider: (id: number, data: Partial<ProviderFormData>) => Promise<Provider>;
  deleteProvider: (id: number) => Promise<void>;
  toggleActive: (id: number, active: boolean) => Promise<void>;

  // ============================================================
  // Actions - Test Connection
  // ============================================================
  testConnection: (id: number) => Promise<TestResult>;

  // ============================================================
  // Actions - WhatsApp QR
  // ============================================================
  fetchQRCode: (instanceId: string) => Promise<void>;
  clearQRCode: () => void;

  // ============================================================
  // Actions - Skip Channels
  // ============================================================
  skipChannel: (channel: 'sms' | 'whatsapp') => void;
  unskipChannel: (channel: 'sms' | 'whatsapp') => void;
  isChannelSkipped: (channel: 'sms' | 'whatsapp') => boolean;
  isChannelConfigured: (channel: ChannelType) => boolean;

  // ============================================================
  // UI Helpers
  // ============================================================
  clearSelectedProvider: () => void;
  clearTestResult: (id: number) => void;

  // ============================================================
  // Actions - SMS Settings
  // ============================================================
  smsConfig: SmsConfig | null;
  loadingSms: boolean;
  fetchSmsConfig: () => Promise<void>;
  updateSmsConfig: (config: Partial<SmsConfig>) => Promise<void>;
  validateSenderId: (label: string) => Promise<ValidateSenderResult>;
}

export const useProvidersStore = create<ProvidersState>((set, get) => ({
  // ============================================================
  // Initial State
  // ============================================================
  providers: [],
  selectedProvider: null,
  qrCode: null,
  skippedChannels: JSON.parse(localStorage.getItem('skipped_channels') || '[]'),
  loading: false,
  saving: false,
  testing: {},
  deleting: {},
  loadingQR: false,
  testResults: {},

  // ============================================================
  // CRUD Actions
  // ============================================================

  fetchProviders: async () => {
    try {
      set({ loading: true });
      const response: any = await apiClient.get('/settings/providers');
      console.log('[ProvidersStore] Providers fetched:', response.providers?.length || 0);
      set({
        providers: response.providers || [],
        loading: false
      });
    } catch (error: any) {
      console.error('[ProvidersStore] Erreur fetch providers:', error);
      set({ loading: false });
      throw error;
    }
  },

  fetchProviderDetails: async (id: number) => {
    try {
      set({ loading: true });
      const response: any = await apiClient.get(`/settings/providers/${id}`);
      console.log('[ProvidersStore] Provider details fetched:', id);
      set({
        selectedProvider: response.provider,
        loading: false
      });
    } catch (error: any) {
      console.error('[ProvidersStore] Erreur fetch provider details:', error);
      set({ loading: false });
      throw error;
    }
  },

  createProvider: async (data: ProviderFormData) => {
    try {
      set({ saving: true });
      const response: any = await apiClient.post('/settings/providers', data);
      console.log('[ProvidersStore] Provider created:', response.provider?.id);

      // Refresh la liste
      await get().fetchProviders();

      set({ saving: false });
      return response.provider;
    } catch (error: any) {
      console.error('[ProvidersStore] Erreur create provider:', error);
      set({ saving: false });
      throw error;
    }
  },

  updateProvider: async (id: number, data: Partial<ProviderFormData>) => {
    try {
      set({ saving: true });
      const response: any = await apiClient.put(`/settings/providers/${id}`, data);
      console.log('[ProvidersStore] Provider updated:', id);

      // Refresh la liste
      await get().fetchProviders();

      set({ saving: false });
      return response.provider;
    } catch (error: any) {
      console.error('[ProvidersStore] Erreur update provider:', error);
      set({ saving: false });
      throw error;
    }
  },

  deleteProvider: async (id: number) => {
    try {
      set((state) => ({
        deleting: { ...state.deleting, [id]: true }
      }));

      await apiClient.delete(`/settings/providers/${id}`);
      console.log('[ProvidersStore] Provider deleted:', id);

      // Refresh la liste
      await get().fetchProviders();

      set((state) => {
        const newDeleting = { ...state.deleting };
        delete newDeleting[id];
        return { deleting: newDeleting };
      });
    } catch (error: any) {
      console.error('[ProvidersStore] Erreur delete provider:', error);
      set((state) => {
        const newDeleting = { ...state.deleting };
        delete newDeleting[id];
        return { deleting: newDeleting };
      });
      throw error;
    }
  },

  toggleActive: async (id: number, active: boolean) => {
    try {
      await get().updateProvider(id, { is_active: active });
      console.log('[ProvidersStore] Provider toggled active:', id, active);
    } catch (error: any) {
      console.error('[ProvidersStore] Erreur toggle active:', error);
      throw error;
    }
  },

  // ============================================================
  // Test Connection
  // ============================================================

  testConnection: async (id: number) => {
    try {
      set((state) => ({
        testing: { ...state.testing, [id]: true }
      }));

      const response: any = await apiClient.post(`/settings/providers/${id}/test`);

      const result: TestResult = {
        success: response.success,
        status: response.status,
        message: response.message,
        error: response.error,
        details: response.details
      };

      console.log('[ProvidersStore] Test result:', id, result.status);

      set((state) => ({
        testing: { ...state.testing, [id]: false },
        testResults: { ...state.testResults, [id]: result }
      }));

      // Refresh la liste pour mettre à jour le statut
      await get().fetchProviders();

      return result;
    } catch (error: any) {
      console.error('[ProvidersStore] Erreur test connection:', error);
      set((state) => {
        const newTesting = { ...state.testing };
        delete newTesting[id];
        return { testing: newTesting };
      });
      throw error;
    }
  },

  // ============================================================
  // WhatsApp QR Code
  // ============================================================

  fetchQRCode: async (instanceId: string) => {
    try {
      set({ loadingQR: true });
      const response: any = await apiClient.get(
        `/settings/providers/greenapi/${instanceId}/qr`
      );
      console.log('[ProvidersStore] QR code fetched for instance:', instanceId);
      set({
        qrCode: response.qrCode,
        loadingQR: false
      });
    } catch (error: any) {
      console.error('[ProvidersStore] Erreur fetch QR code:', error);
      set({ loadingQR: false });
      throw error;
    }
  },

  clearQRCode: () => {
    set({ qrCode: null });
  },

  // ============================================================
  // Skip Channels Logic
  // ============================================================

  skipChannel: (channel: 'sms' | 'whatsapp') => {
    set((state) => {
      const newSkipped = [...state.skippedChannels, channel];
      localStorage.setItem('skipped_channels', JSON.stringify(newSkipped));
      console.log('[ProvidersStore] Channel skipped:', channel);
      return { skippedChannels: newSkipped };
    });
  },

  unskipChannel: (channel: 'sms' | 'whatsapp') => {
    set((state) => {
      const newSkipped = state.skippedChannels.filter((c) => c !== channel);
      localStorage.setItem('skipped_channels', JSON.stringify(newSkipped));
      console.log('[ProvidersStore] Channel unskipped:', channel);
      return { skippedChannels: newSkipped };
    });
  },

  isChannelSkipped: (channel: 'sms' | 'whatsapp') => {
    return get().skippedChannels.includes(channel);
  },

  isChannelConfigured: (channel: ChannelType) => {
    const providers = get().providers;

    switch (channel) {
      case 'email':
        return providers.some((p) =>
          ['mailjet', 'sendgrid', 'smtp', 'gmail'].includes(p.provider_type)
        );
      case 'sms':
        return providers.some((p) => p.provider_type === 'twilio_sms');
      case 'whatsapp':
        return providers.some((p) =>
          ['greenapi_whatsapp', 'twilio_whatsapp'].includes(p.provider_type)
        );
      default:
        return false;
    }
  },

  // ============================================================
  // UI Helpers
  // ============================================================

  clearSelectedProvider: () => {
    set({ selectedProvider: null });
  },

  clearTestResult: (id: number) => {
    set((state) => {
      const newResults = { ...state.testResults };
      delete newResults[id];
      return { testResults: newResults };
    });
  },

  // ============================================================
  // SMS Settings
  // ============================================================

  smsConfig: null,
  loadingSms: false,

  fetchSmsConfig: async () => {
    try {
      set({ loadingSms: true });
      const response: any = await apiClient.get('/settings/sms');
      console.log('[ProvidersStore] SMS config fetched:', response.config);
      set({
        smsConfig: response.config,
        loadingSms: false
      });
    } catch (error: any) {
      console.error('[ProvidersStore] Erreur fetch SMS config:', error);
      set({ loadingSms: false });
      throw error;
    }
  },

  updateSmsConfig: async (config: Partial<SmsConfig>) => {
    try {
      set({ loadingSms: true });
      const response: any = await apiClient.put('/settings/sms', config);
      console.log('[ProvidersStore] SMS config updated:', response.config);
      set({
        smsConfig: response.config,
        loadingSms: false
      });
    } catch (error: any) {
      console.error('[ProvidersStore] Erreur update SMS config:', error);
      set({ loadingSms: false });
      throw error;
    }
  },

  validateSenderId: async (label: string): Promise<ValidateSenderResult> => {
    try {
      const response: any = await apiClient.post('/settings/sms/validate-sender', {
        sms_sender_label: label
      });
      console.log('[ProvidersStore] Sender ID validated:', response.suggested_id);
      return {
        suggested_id: response.suggested_id,
        is_available: response.is_available,
        base_id: response.base_id,
        alternatives: response.alternatives || []
      };
    } catch (error: any) {
      console.error('[ProvidersStore] Erreur validation sender ID:', error);
      throw error;
    }
  }
}));
