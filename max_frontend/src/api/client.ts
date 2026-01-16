/**
 * api/client.ts
 * Client API axios avec intercepteurs pour MVP1
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { useSettingsStore } from '../stores/useSettingsStore';
import { API_BASE_URL as BASE_URL } from '../config/api';

const API_BASE_URL = `${BASE_URL}/api`;

// Créer instance axios
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30 secondes
});

// Intercepteur REQUEST: Ajouter token d'authentification + headers multi-tenant
apiClient.interceptors.request.use(
  (config) => {
    let userRole = 'user'; // Default role

    // Récupérer token depuis localStorage
    const authStorage = localStorage.getItem('auth-storage');
    console.log('[API] Auth storage:', authStorage ? 'présent' : 'VIDE');

    if (authStorage) {
      try {
        const parsed = JSON.parse(authStorage);
        console.log('[API] Parsed storage:', parsed);

        const token = parsed?.state?.token;
        userRole = parsed?.state?.user?.role || 'user';
        console.log('[API] Token extrait:', token ? `${token.substring(0, 20)}...` : 'AUCUN');
        console.log('[API] User role:', userRole);

        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('[API] ✅ Token ajouté au header Authorization');
        } else {
          console.warn('[API] ⚠️ Pas de token disponible');
        }
      } catch (error) {
        console.error('[API] ❌ Erreur parsing auth storage:', error);
      }
    } else {
      console.warn('[API] ⚠️ Aucun auth-storage dans localStorage');
    }

    // TOUJOURS ajouter headers multi-tenant (même sans token)
    if (config.headers) {
      // Priorité 1: tenantId depuis l'auth user
      // Priorité 2: tenant depuis settings store
      // Priorité 3: default 'macrea'
      let tenant = 'macrea';

      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage);
          const userTenantId = parsed?.state?.user?.tenantId;
          if (userTenantId) {
            tenant = userTenantId;
            console.log('[API] 🏢 Tenant depuis user.tenantId:', tenant);
          } else {
            const settingsState = useSettingsStore.getState();
            tenant = settingsState.tenant || 'macrea';
            console.log('[API] 🏢 Tenant depuis settings store:', tenant);
          }
        } catch (e) {
          console.warn('[API] ⚠️ Erreur lecture tenant, utilisation par défaut');
        }
      } else {
        const settingsState = useSettingsStore.getState();
        tenant = settingsState.tenant || 'macrea';
        console.log('[API] 🏢 Tenant depuis settings store (pas d\'auth):', tenant);
      }

      config.headers['X-Tenant'] = tenant;
      config.headers['X-Role'] = userRole;
      config.headers['X-Preview'] = 'false';

      console.log('[API] ✅ Headers multi-tenant ajoutés:', {
        'X-Tenant': tenant,
        'X-Role': userRole,
        'X-Preview': 'false'
      });
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur RESPONSE: Gérer erreurs (notamment 401)
apiClient.interceptors.response.use(
  (response) => {
    // Retourner directement data pour simplifier l'usage
    return response.data;
  },
  (error: AxiosError) => {
    // Logger l'erreur AVANT de rediriger
    console.error('[API] ❌ Erreur requête:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });

    // Gérer erreur 401 (token expiré ou invalide)
    if (error.response?.status === 401) {
      console.error('[API] 🚫 401 Unauthorized - Token invalide ou expiré');
      console.error('[API] 🚫 Response data:', error.response?.data);

      // TEMPORAIRE : Ne pas rediriger automatiquement pour debug
      // Supprimer token et rediriger vers login
      // localStorage.removeItem('auth-storage');

      // Rediriger uniquement si pas déjà sur /login
      // if (window.location.pathname !== '/login') {
      //   window.location.href = '/login';
      // }
    }

    return Promise.reject(error);
  }
);

// Helpers pour simplifier l'usage
export const api = {
  get: <T = any>(url: string, config?: any): Promise<T> =>
    apiClient.get(url, config),

  post: <T = any>(url: string, data?: any, config?: any): Promise<T> =>
    apiClient.post(url, data, config),

  put: <T = any>(url: string, data?: any, config?: any): Promise<T> =>
    apiClient.put(url, data, config),

  delete: <T = any>(url: string, config?: any): Promise<T> =>
    apiClient.delete(url, config)
};

export default api;
