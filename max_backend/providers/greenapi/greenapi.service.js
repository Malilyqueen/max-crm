/**
 * Green-API Service
 *
 * Couche métier pour gérer les instances WhatsApp via Green-API
 * Expose 4 fonctions principales : create, getQr, getStatus, refreshQr
 */

import { greenApiRequest, withRetry } from './greenapi.client.js';
import { GREENAPI_CONFIG } from './greenapi.config.js';

/**
 * Crée une nouvelle instance WhatsApp Green-API
 *
 * NOTE: Green-API nécessite généralement une création manuelle via leur dashboard.
 * Cette fonction suppose que vous avez déjà un idInstance et apiTokenInstance.
 *
 * @param {Object} params - Paramètres de création
 * @param {string} params.idInstance - ID de l'instance Green-API (fourni par Green-API)
 * @param {string} params.apiTokenInstance - Token API de l'instance
 * @returns {Promise<Object>} - { instanceId, status }
 */
export async function createInstance({ idInstance, apiTokenInstance }) {
  console.log('[GREEN-API SERVICE] 🆕 Création/Enregistrement instance', { idInstance });

  // Green-API ne permet pas de créer dynamiquement une instance via API.
  // On enregistre simplement les credentials pour utilisation ultérieure.
  // La "création" consiste à valider que l'instance existe et est accessible.

  try {
    const status = await getInstanceStatus({ idInstance, apiTokenInstance });

    return {
      instanceId: idInstance,
      apiToken: apiTokenInstance,
      status: status.stateInstance || 'unknown',
      provider: 'greenapi',
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('[GREEN-API SERVICE] ❌ Échec création instance:', error.message);
    throw new Error(`Impossible de valider l'instance Green-API: ${error.message}`);
  }
}

/**
 * Récupère le QR code pour scanner avec WhatsApp
 *
 * @param {Object} params
 * @param {string} params.idInstance
 * @param {string} params.apiTokenInstance
 * @returns {Promise<Object>} - { qrCode: "base64..." }
 */
export async function getQrCode({ idInstance, apiTokenInstance }) {
  console.log('[GREEN-API SERVICE] 📷 Récupération QR code', { idInstance });

  const endpoint = `/waInstance${idInstance}/qr/${apiTokenInstance}`;

  try {
    const response = await withRetry(
      () => greenApiRequest(endpoint, {}, GREENAPI_CONFIG.timeouts.getQrCode),
      GREENAPI_CONFIG.retry.maxAttempts,
      GREENAPI_CONFIG.retry.delayMs
    );

    // Format de réponse Green-API: { "type": "qrCode", "message": "data:image/png;base64,..." }
    // Ou parfois juste une string base64 directe
    let qrCodeData = response.message || response.qrCode || response;

    // Si la réponse est juste la string base64 sans préfixe, l'ajouter
    if (typeof qrCodeData === 'string' && !qrCodeData.startsWith('data:image')) {
      qrCodeData = `data:image/png;base64,${qrCodeData}`;
    }

    return {
      qrCode: qrCodeData,
      type: response.type || 'qrCode',
      expiresIn: GREENAPI_CONFIG.qr.expirationMs
    };
  } catch (error) {
    console.error('[GREEN-API SERVICE] ❌ Échec récupération QR:', error.message);
    throw new Error(`Impossible de récupérer le QR code: ${error.message}`);
  }
}

/**
 * Récupère le statut de l'instance WhatsApp
 *
 * @param {Object} params
 * @param {string} params.idInstance
 * @param {string} params.apiTokenInstance
 * @returns {Promise<Object>} - { stateInstance: "notAuthorized" | "authorized" | ... }
 */
export async function getInstanceStatus({ idInstance, apiTokenInstance }) {
  console.log('[GREEN-API SERVICE] 🔍 Vérification statut instance', { idInstance });

  const endpoint = `/waInstance${idInstance}/getStateInstance/${apiTokenInstance}`;

  try {
    const response = await greenApiRequest(
      endpoint,
      { method: 'GET' },
      GREENAPI_CONFIG.timeouts.getStatus
    );

    // Format Green-API: { "stateInstance": "notAuthorized" | "authorized" | "blocked" | "sleepMode" | ... }
    return {
      stateInstance: response.stateInstance,
      isAuthorized: response.stateInstance === 'authorized',
      rawResponse: response
    };
  } catch (error) {
    console.error('[GREEN-API SERVICE] ❌ Échec vérification statut:', error.message);
    throw new Error(`Impossible de vérifier le statut: ${error.message}`);
  }
}

/**
 * Rafraîchit le QR code (déconnecte et génère un nouveau QR)
 *
 * @param {Object} params
 * @param {string} params.idInstance
 * @param {string} params.apiTokenInstance
 * @returns {Promise<Object>} - { qrCode: "base64..." }
 */
export async function refreshQrCode({ idInstance, apiTokenInstance }) {
  console.log('[GREEN-API SERVICE] 🔄 Rafraîchissement QR code', { idInstance });

  // Étape 1: Déconnecter l'instance (logout)
  const logoutEndpoint = `/waInstance${idInstance}/logout/${apiTokenInstance}`;

  try {
    await greenApiRequest(
      logoutEndpoint,
      { method: 'GET' },
      GREENAPI_CONFIG.timeouts.refreshQr
    );

    console.log('[GREEN-API SERVICE] ✅ Instance déconnectée, génération nouveau QR...');

    // Étape 2: Récupérer le nouveau QR code
    // Attendre 1-2 secondes pour que Green-API génère le nouveau QR
    await new Promise(resolve => setTimeout(resolve, 2000));

    return await getQrCode({ idInstance, apiTokenInstance });
  } catch (error) {
    console.error('[GREEN-API SERVICE] ❌ Échec refresh QR:', error.message);
    throw new Error(`Impossible de rafraîchir le QR code: ${error.message}`);
  }
}

/**
 * Envoie un message de test (utile pour valider la connexion)
 *
 * @param {Object} params
 * @param {string} params.idInstance
 * @param {string} params.apiTokenInstance
 * @param {string} params.phoneNumber - Numéro au format international (ex: "33612345678")
 * @param {string} params.message - Message à envoyer
 * @returns {Promise<Object>} - { idMessage, status }
 */
export async function sendTestMessage({ idInstance, apiTokenInstance, phoneNumber, message }) {
  console.log('[GREEN-API SERVICE] 📤 Envoi message test', { phoneNumber });

  const endpoint = `/waInstance${idInstance}/sendMessage/${apiTokenInstance}`;

  try {
    const response = await greenApiRequest(
      endpoint,
      {
        method: 'POST',
        body: JSON.stringify({
          chatId: `${phoneNumber}@c.us`,
          message
        })
      },
      10000
    );

    return {
      idMessage: response.idMessage,
      status: 'sent',
      rawResponse: response
    };
  } catch (error) {
    console.error('[GREEN-API SERVICE] ❌ Échec envoi message:', error.message);
    throw new Error(`Impossible d'envoyer le message: ${error.message}`);
  }
}