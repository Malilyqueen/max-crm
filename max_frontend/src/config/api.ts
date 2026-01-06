/**
 * Configuration API centralisée
 * Détection automatique de l'environnement
 */

// Détecter l'environnement basé sur l'URL actuelle
const isProduction = typeof window !== 'undefined' && (
  window.location.hostname === 'max.studiomacrea.cloud' ||
  window.location.hostname.includes('vercel.app')
);

// URLs API
export const API_BASE_URL = isProduction
  ? 'https://max-api.studiomacrea.cloud'
  : (import.meta.env.VITE_API_URL || 'http://localhost:3005');

export const ESPO_BASE_URL = isProduction
  ? 'https://crm.studiomacrea.cloud'
  : (import.meta.env.VITE_ESPO_BASE || 'http://localhost:8081/espocrm');

// Log pour debug
if (typeof window !== 'undefined') {
  console.log('[API Config] Environment:', isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
  console.log('[API Config] API Base URL:', API_BASE_URL);
  console.log('[API Config] EspoCRM URL:', ESPO_BASE_URL);
}