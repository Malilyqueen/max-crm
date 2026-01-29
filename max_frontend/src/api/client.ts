/**
 * api/client.ts
 * Client API axios avec intercepteurs pour MVP1
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_BASE_URL as BASE_URL } from '../config/api';
import { useAuthStore } from '../stores/useAuthStore';

const API_BASE_URL = `${BASE_URL}/api`;

// Créer instance axios
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30 secondes
});

// Intercepteur REQUEST: Ajouter token + tenant depuis authStore (PAS settings)
apiClient.interceptors.request.use(
  (config) => {
    // Lire directement depuis le store Zustand (pas de require, ESM compatible)
    const authState = useAuthStore.getState();

    const token = authState.token;
    const user = authState.user;

    // Ajouter token si présent
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // REGLE SECURITE: Le tenant vient UNIQUEMENT du user authentifié
    // Jamais de fallback vers settings store ou valeur par défaut
    if (user?.tenantId && config.headers) {
      config.headers['X-Tenant'] = user.tenantId;
      config.headers['X-Role'] = user.role || 'user';
      config.headers['X-Preview'] = 'false';
    }
    // Si pas de user.tenantId, on n'envoie pas X-Tenant
    // Le backend utilisera le tenant du token JWT

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
