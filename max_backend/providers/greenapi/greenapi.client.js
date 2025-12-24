/**
 * Green-API HTTP Client
 *
 * Client HTTP bas niveau pour communiquer avec Green-API
 * Aucun SDK - uniquement fetch() natif
 */

import { GREENAPI_CONFIG } from './greenapi.config.js';

/**
 * Effectue une requête HTTP vers Green-API avec retry et timeout
 *
 * @param {string} endpoint - L'endpoint API (ex: '/waInstance{idInstance}/qr/{apiTokenInstance}')
 * @param {Object} options - Options fetch()
 * @param {number} timeoutMs - Timeout en millisecondes
 * @returns {Promise<Object>} - Réponse JSON de l'API
 */
export async function greenApiRequest(endpoint, options = {}, timeoutMs = 10000) {
  const url = `${GREENAPI_CONFIG.baseUrl}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.log(`[GREEN-API] 📤 ${options.method || 'GET'} ${endpoint}`);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      console.error(`[GREEN-API] ❌ HTTP ${response.status}:`, data);
      throw new Error(`Green-API error: ${response.status} - ${data.message || JSON.stringify(data)}`);
    }

    console.log(`[GREEN-API] ✅ Success:`, data);
    return data;

  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.error(`[GREEN-API] ⏱️  Timeout après ${timeoutMs}ms sur ${endpoint}`);
      throw new Error(`Green-API timeout: ${endpoint}`);
    }

    console.error(`[GREEN-API] ❌ Erreur réseau:`, error.message);
    throw error;
  }
}

/**
 * Effectue une requête avec retry automatique
 *
 * @param {Function} requestFn - Fonction qui effectue la requête
 * @param {number} maxAttempts - Nombre max de tentatives
 * @param {number} delayMs - Délai entre chaque retry
 * @returns {Promise<Object>} - Résultat de la requête
 */
export async function withRetry(requestFn, maxAttempts = 3, delayMs = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      console.warn(`[GREEN-API] 🔄 Tentative ${attempt}/${maxAttempts} échouée:`, error.message);

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}