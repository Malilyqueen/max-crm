/**
 * WhatsApp Helper - Wrapper simple pour envoyer des messages via Green-API
 *
 * Usage:
 *   import { sendWhatsApp } from './lib/whatsappHelper.js';
 *   await sendWhatsApp('+15146412055', 'Bonjour!');
 */

import { sendTestMessage } from '../providers/greenapi/greenapi.service.js';
import { getInstance } from './waInstanceStorage.js';

/**
 * Envoie un message WhatsApp via Green-API
 *
 * @param {string} phoneNumber - Numéro au format international (+15146412055)
 * @param {string} message - Texte du message
 * @param {string} [instanceId='7105440259'] - ID de l'instance Green-API
 * @returns {Promise<Object>} - { ok: true, messageId }
 */
export async function sendWhatsApp(phoneNumber, message, instanceId = '7105440259') {
  try {
    // Nettoyer le numéro (enlever +, espaces, tirets)
    const cleanNumber = phoneNumber.replace(/[\+\s\-\(\)]/g, '');

    console.log('[WHATSAPP-HELPER] 📤 Envoi message:', {
      to: cleanNumber,
      preview: message.substring(0, 50)
    });

    // Récupérer l'instance depuis le storage
    const instance = await getInstance(instanceId);

    if (!instance || !instance.apiToken) {
      throw new Error(`Instance WhatsApp ${instanceId} non trouvée ou non configurée`);
    }

    if (instance.status !== 'authorized') {
      throw new Error(`Instance WhatsApp non autorisée (status: ${instance.status})`);
    }

    // Envoyer via Green-API
    const result = await sendTestMessage({
      idInstance: instanceId,
      apiTokenInstance: instance.apiToken,
      phoneNumber: cleanNumber,
      message
    });

    console.log('[WHATSAPP-HELPER] ✅ Message envoyé:', result.idMessage);

    return {
      ok: true,
      messageId: result.idMessage,
      status: 'sent',
      to: cleanNumber
    };

  } catch (error) {
    console.error('[WHATSAPP-HELPER] ❌ Erreur envoi:', error.message);
    throw error;
  }
}

/**
 * Envoie un message WhatsApp à un lead (alias pour sendWhatsApp)
 */
export async function sendWhatsAppToLead(leadPhone, message) {
  return sendWhatsApp(leadPhone, message);
}
