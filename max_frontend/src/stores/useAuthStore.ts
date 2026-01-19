/**
 * stores/useAuthStore.ts
 * Store Zustand pour l'authentification avec persist
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../api/client';
import type { AuthState, User, AuthResponse, SignupData } from '../types/auth';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      /**
       * Login avec email/password
       */
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await api.post<AuthResponse>('/auth/login', {
            email,
            password
          });

          if (response.success && response.token && response.user) {
            set({
              user: response.user,
              token: response.token,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });

            console.log('[AUTH] ✅ Login réussi:', response.user.email);
            console.log('[AUTH] 💾 Token sauvegardé:', response.token.substring(0, 20) + '...');

            // Vérifier immédiatement que le token est dans le localStorage
            setTimeout(() => {
              const stored = localStorage.getItem('auth-storage');
              console.log('[AUTH] 🔍 Vérification localStorage:', stored ? 'PRÉSENT' : 'ABSENT');
              if (stored) {
                const parsed = JSON.parse(stored);
                console.log('[AUTH] 📦 Contenu localStorage:', parsed);
              }
            }, 100);
          } else {
            throw new Error(response.error || 'Login échoué');
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error ||
            error.message ||
            'Erreur de connexion';

          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage
          });

          console.error('[AUTH] ❌ Erreur login:', errorMessage);
          throw new Error(errorMessage);
        }
      },

      /**
       * Signup self-service (crée compte + tenant)
       */
      signup: async (data: SignupData) => {
        set({ isLoading: true, error: null });

        try {
          const response = await api.post<AuthResponse>('/auth/signup', data);

          if (response.success && response.token && response.user) {
            set({
              user: response.user,
              token: response.token,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });

            console.log('[AUTH] ✅ Signup réussi:', response.user.email, '- tenant:', response.user.tenantId);
          } else {
            throw new Error(response.error || 'Inscription échouée');
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error ||
            error.message ||
            'Erreur lors de l\'inscription';

          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage
          });

          console.error('[AUTH] ❌ Erreur signup:', errorMessage);
          throw new Error(errorMessage);
        }
      },

      /**
       * Logout (supprimer token + user)
       */
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null
        });

        console.log('[AUTH] 👋 Logout');

        // Optionnel: Appeler endpoint /auth/logout côté serveur
        api.post('/auth/logout').catch(() => {
          // Ignore errors
        });
      },

      /**
       * Vérifier l'authentification (call /auth/me)
       */
      checkAuth: async () => {
        const { token } = get();

        // Pas de token, pas auth
        if (!token) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false
          });
          return;
        }

        set({ isLoading: true });

        try {
          const response = await api.get<{ success: boolean; user: User }>(
            '/auth/me'
          );

          if (response.success && response.user) {
            set({
              user: response.user,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });

            console.log('[AUTH] ✅ Token valide:', response.user.email);
          } else {
            throw new Error('Token invalide');
          }
        } catch (error: any) {
          console.error('[AUTH] ❌ Token invalide ou expiré');

          // Token invalide, logout
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
        }
      },

      /**
       * Effacer l'erreur
       */
      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'auth-storage', // Clé localStorage
      partialize: (state) => ({
        // Ne persister que user et token
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

export default useAuthStore;
