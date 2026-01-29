/**
 * hooks/useApi.ts
 * Hook centralisé pour les appels API avec headers multi-tenant automatiques
 */

import { useState, useEffect, useCallback } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';
import { API_BASE_URL } from '../config/api';

const API_BASE = API_BASE_URL;
const X_ROLE = import.meta.env.VITE_X_ROLE || 'admin';
const X_PREVIEW = import.meta.env.VITE_X_PREVIEW || 'true';

/**
 * Headers par défaut pour tous les appels API
 * Utilise le tenant du store s'il est disponible, sinon celui de l'env
 */
const getDefaultHeaders = (): HeadersInit => {
  // On récupère le tenant depuis le store Zustand
  const tenant = useSettingsStore.getState().tenant || import.meta.env.VITE_X_TENANT || 'default';

  return {
    'Content-Type': 'application/json',
    'X-Tenant': tenant,
    'X-Role': X_ROLE,
    'X-Preview': X_PREVIEW
  };
};

/**
 * Interface pour les options de fetch
 */
interface FetchOptions extends RequestInit {
  headers?: HeadersInit;
}

/**
 * Fonction fetch centralisée avec headers automatiques
 */
export const apiFetch = async <T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...getDefaultHeaders(),
      ...options.headers
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Hook useApi pour fetch avec gestion automatique des états
 */
interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useApi<T = any>(
  endpoint: string | null,
  options: FetchOptions = {}
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stabilize options reference - only re-run if method changes
  const method = options.method || 'GET';

  const fetchData = useCallback(async () => {
    if (!endpoint) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await apiFetch<T>(endpoint, { method });
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
      console.error(`Erreur API ${endpoint}:`, err);
    } finally {
      setLoading(false);
    }
  }, [endpoint, method]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook useApiLazy pour fetch manuel (pas au mount)
 */
interface UseApiLazyResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (endpoint: string, options?: FetchOptions) => Promise<T>;
}

export function useApiLazy<T = any>(): UseApiLazyResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (endpoint: string, options: FetchOptions = {}): Promise<T> => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiFetch<T>(endpoint, options);
      setData(result);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Une erreur est survenue';
      setError(errorMessage);
      console.error(`Erreur API ${endpoint}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, execute };
}

/**
 * Helpers pour les méthodes HTTP courantes
 */
export const apiGet = <T = any>(endpoint: string): Promise<T> => {
  return apiFetch<T>(endpoint, { method: 'GET' });
};

export const apiPost = <T = any>(endpoint: string, body: any): Promise<T> => {
  return apiFetch<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(body)
  });
};

export const apiPut = <T = any>(endpoint: string, body: any): Promise<T> => {
  return apiFetch<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body)
  });
};

export const apiPatch = <T = any>(endpoint: string, body: any): Promise<T> => {
  return apiFetch<T>(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(body)
  });
};

export const apiDelete = <T = any>(endpoint: string): Promise<T> => {
  return apiFetch<T>(endpoint, { method: 'DELETE' });
};
