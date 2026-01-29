/**
 * stores/useSettingsStore.ts
 * Store pour les paramètres utilisateur (langue, notifications, etc.)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../api/client';

export type Language = 'fr' | 'en';
export type Theme = 'light' | 'dark';

interface TokenUsage {
  used: number;
  limit: number;
  percentage: number;
  isLoaded: boolean;
  hasError: boolean;
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
      tenant: 'macrea-admin', // Tenant production par défaut
      notifications: {
        email: true,
        whatsapp: true,
        push: false
      },
      tokenUsage: {
        used: 0,
        limit: 0,
        percentage: 0,
        isLoaded: false,
        hasError: false
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
          // API réelle: GET /api/ai/usage
          const response = await apiClient.get<{
            ok: boolean;
            budget_total: number;
            tokens: { total: number };
          }>('/ai/usage');

          if (response.ok) {
            const used = response.tokens?.total || 0;
            const limit = response.budget_total || 10_000_000;
            const percentage = limit > 0 ? Math.round((used / limit) * 100 * 10) / 10 : 0;

            set({
              tokenUsage: {
                used,
                limit,
                percentage,
                isLoaded: true,
                hasError: false
              }
            });
            console.log('[SETTINGS] Token usage loaded from API:', { used, limit, percentage });
          }
        } catch (error) {
          console.error('[SETTINGS] Erreur chargement token usage:', error);
          set({
            tokenUsage: {
              used: 0,
              limit: 0,
              percentage: 0,
              isLoaded: true,
              hasError: true
            }
          });
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
