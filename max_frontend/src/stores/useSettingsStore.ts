/**
 * stores/useSettingsStore.ts
 * Store pour les paramètres utilisateur (langue, notifications, etc.)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'fr' | 'en';
export type Theme = 'light' | 'dark';

interface TokenUsage {
  used: number;
  limit: number;
  percentage: number;
}

interface SettingsState {
  language: Language;
  theme: Theme;
  tenant: string;
  notifications: {
    email: boolean;
    whatsapp: boolean;
    push: boolean;
  };
  tokenUsage: TokenUsage;

  // Actions
  setLanguage: (language: Language) => void;
  setTheme: (theme: Theme) => void;
  setTenant: (tenant: string) => void;
  setNotifications: (notifications: Partial<SettingsState['notifications']>) => void;
  loadTokenUsage: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      language: 'fr',
      theme: 'light',
      tenant: 'macrea-admin',
      notifications: {
        email: true,
        whatsapp: true,
        push: false
      },
      tokenUsage: {
        used: 12450,
        limit: 50000,
        percentage: 24.9
      },

      setLanguage: (language) => {
        set({ language });
        console.log(`[SETTINGS] Langue changée: ${language}`);
      },

      setTheme: (theme) => {
        set({ theme });
        console.log(`[SETTINGS] Thème changé: ${theme}`);
      },

      setTenant: (tenant) => {
        set({ tenant });
        console.log(`[SETTINGS] Tenant changé: ${tenant}`);
      },

      setNotifications: (notifications) => {
        set((state) => ({
          notifications: {
            ...state.notifications,
            ...notifications
          }
        }));
        console.log('[SETTINGS] Notifications mises à jour');
      },

      loadTokenUsage: async () => {
        try {
          // MVP1: Mock data, Phase 2: API call
          // const response = await api.get('/api/usage/tokens');

          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 500));

          // Mock data for MVP1
          const mockUsage = {
            used: 12450 + Math.floor(Math.random() * 1000),
            limit: 50000,
            percentage: 0
          };
          mockUsage.percentage = Math.round((mockUsage.used / mockUsage.limit) * 100 * 10) / 10;

          set({ tokenUsage: mockUsage });
          console.log('[SETTINGS] Token usage loaded:', mockUsage);
        } catch (error) {
          console.error('[SETTINGS] Erreur chargement token usage:', error);
        }
      }
    }),
    {
      name: 'settings-storage',
      partialize: (state) => ({
        language: state.language,
        theme: state.theme,
        tenant: state.tenant,
        notifications: state.notifications
      })
    }
  )
);

export default useSettingsStore;
