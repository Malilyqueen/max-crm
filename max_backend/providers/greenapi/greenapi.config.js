/**
 * Green-API Configuration
 *
 * Configuration centralisée pour Green-API WhatsApp provider
 * https://green-api.com/docs/api/
 */

export const GREENAPI_CONFIG = {
  // Base URL pour l'API Green-API
  baseUrl: process.env.GREENAPI_BASE_URL || 'https://api.green-api.com',

  // Timeouts en millisecondes
  timeouts: {
    createInstance: 30000,  // 30s pour créer une instance
    getQrCode: 10000,       // 10s pour récupérer le QR
    getStatus: 5000,        // 5s pour le statut
    refreshQr: 10000        // 10s pour refresh QR
  },

  // Retry configuration
  retry: {
    maxAttempts: 3,
    delayMs: 1000
  },

  // QR Code settings
  qr: {
    expirationMs: 45000,  // 45 secondes avant expiration
    pollingIntervalMs: 2000  // Polling toutes les 2 secondes (pour le front)
  }
};

/**
 * Valide que les variables d'environnement Green-API sont présentes
 */
export function validateGreenApiConfig() {
  const required = ['GREENAPI_BASE_URL'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.warn(`[GREEN-API] ⚠️  Variables manquantes (non-bloquant): ${missing.join(', ')}`);
  }

  return {
    isValid: missing.length === 0,
    missing
  };
}