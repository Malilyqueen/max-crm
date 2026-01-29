/**
 * actions/sendSms.js
 * Envoi SMS via Twilio avec credentials per-tenant
 *
 * SÉCURITÉ MULTI-TENANT (PHASE 3):
 * - tenantId OBLIGATOIRE
 * - Credentials récupérés depuis tenant_provider_configs (chiffrés)
 * - AUCUN usage de process.env.TWILIO_* pour envoi
 * - Erreur explicite PROVIDER_NOT_CONFIGURED si tenant non configuré
 */

import twilio from 'twilio';
import { logMessageEvent } from '../lib/messageEventLogger.js';
import {
  getTwilioCredentials,
  ProviderNotConfiguredError,
  ProviderCredentialsError
} from '../lib/providerResolver.js';

/**
 * Envoie un SMS via Twilio avec credentials du tenant
 *
 * @param {Object} params
 * @param {string} params.to - Numéro de téléphone destinataire (+33...)
 * @param {string} params.message - Texte du message
 * @param {string} params.tenantId - Tenant ID (OBLIGATOIRE)
 * @param {string} [params.leadId] - Lead ID (optionnel)
 * @param {string} [params.campaignId] - Campaign ID (optionnel)
 * @returns {Promise<SendSmsResult>}
 *
 * @typedef {Object} SendSmsResult
 * @property {boolean} ok - Succès de l'envoi
 * @property {string} [messageId] - SID du message Twilio (si ok)
 * @property {string} [provider] - 'twilio' (si ok)
 * @property {string} [status] - Status initial Twilio (si ok)
 * @property {string} [from] - Numéro d'envoi utilisé (si ok)
 * @property {string} [error] - Message d'erreur (si !ok)
 * @property {string} [code] - Code d'erreur (si !ok)
 */
export async function sendSms({ to, message, tenantId, leadId, campaignId }) {
  // ============================================
  // SECURITY: tenantId est OBLIGATOIRE
  // ============================================
  if (!tenantId) {
    console.error('🚫 [SECURITY] sendSms REFUSÉ - tenantId MANQUANT!');
    return {
      ok: false,
      error: 'SECURITY: tenantId obligatoire pour sendSms',
      code: 'MISSING_TENANT_ID'
    };
  }

  // Validation des paramètres
  if (!to || !message) {
    console.error(`[sendSms] [Tenant: ${tenantId}] Paramètres manquants: to=${to}, message=${message ? 'OK' : 'MISSING'}`);
    return {
      ok: false,
      error: 'Paramètres requis: to et message',
      code: 'MISSING_PARAMETERS'
    };
  }

  console.log(`[sendSms] [Tenant: ${tenantId}] Envoi vers: ${to}`);

  // ============================================
  // PHASE 3: Récupération credentials per-tenant
  // ============================================
  let twilioCredentials;

  try {
    twilioCredentials = await getTwilioCredentials(tenantId);
  } catch (error) {
    // Gestion explicite des erreurs de provider
    if (error instanceof ProviderNotConfiguredError) {
      console.error(`[sendSms] ❌ PROVIDER_NOT_CONFIGURED: Tenant "${tenantId}" n'a pas Twilio SMS configuré`);

      // Logger l'échec avec raison explicite
      await logMessageEvent({
        channel: 'sms',
        provider: 'twilio',
        direction: 'out',
        tenantId,
        leadId,
        campaignId,
        phoneNumber: to,
        providerMessageId: 'failed-no-provider-' + Date.now(),
        status: 'failed',
        messageSnippet: message?.substring(0, 200),
        rawPayload: {
          error: 'PROVIDER_NOT_CONFIGURED',
          tenantId,
          message: 'Twilio SMS non configuré pour ce tenant'
        },
        timestamp: new Date().toISOString()
      });

      return {
        ok: false,
        error: `Twilio SMS non configuré pour le tenant "${tenantId}". Configurez vos credentials dans les paramètres.`,
        code: 'PROVIDER_NOT_CONFIGURED'
      };
    }

    if (error instanceof ProviderCredentialsError) {
      console.error(`[sendSms] ❌ PROVIDER_CREDENTIALS_ERROR: ${error.message}`);

      await logMessageEvent({
        channel: 'sms',
        provider: 'twilio',
        direction: 'out',
        tenantId,
        leadId,
        campaignId,
        phoneNumber: to,
        providerMessageId: 'failed-credentials-' + Date.now(),
        status: 'failed',
        messageSnippet: message?.substring(0, 200),
        rawPayload: {
          error: 'PROVIDER_CREDENTIALS_ERROR',
          reason: error.reason
        },
        timestamp: new Date().toISOString()
      });

      return {
        ok: false,
        error: `Erreur credentials Twilio: ${error.reason}`,
        code: 'PROVIDER_CREDENTIALS_ERROR'
      };
    }

    // Erreur inattendue
    console.error(`[sendSms] ❌ Erreur récupération credentials:`, error);
    return {
      ok: false,
      error: `Erreur récupération credentials: ${error.message}`,
      code: 'CREDENTIALS_ERROR'
    };
  }

  // ============================================
  // Envoi via Twilio avec credentials du tenant
  // ============================================
  try {
    // Créer un client Twilio avec les credentials du tenant
    const twilioClient = twilio(
      twilioCredentials.accountSid,
      twilioCredentials.authToken
    );

    // URL du webhook pour recevoir les status updates
    const statusCallbackUrl = process.env.API_BASE_URL
      ? `${process.env.API_BASE_URL}/webhooks/twilio-sms/status`
      : 'https://max-api.studiomacrea.cloud/webhooks/twilio-sms/status';

    console.log(`[sendSms] [Tenant: ${tenantId}] Envoi depuis: ${twilioCredentials.phoneNumber}`);
    console.log(`[sendSms] [Tenant: ${tenantId}] Provider: ${twilioCredentials.providerName}`);

    // Envoi via Twilio avec numéro du tenant
    const twilioMessage = await twilioClient.messages.create({
      body: message,
      from: twilioCredentials.phoneNumber, // Numéro du tenant
      to: to,
      statusCallback: statusCallbackUrl
    });

    console.log('[sendSms] StatusCallback configuré:', statusCallbackUrl);

    // Logger l'event avec tenantId OBLIGATOIRE
    await logMessageEvent({
      channel: 'sms',
      provider: 'twilio',
      direction: 'out',
      tenantId, // SECURITY: tenantId obligatoire
      leadId,
      campaignId,
      phoneNumber: to,
      providerMessageId: twilioMessage.sid,
      status: 'queued', // Twilio status initial
      messageSnippet: message.substring(0, 200),
      rawPayload: {
        sid: twilioMessage.sid,
        status: twilioMessage.status,
        to: twilioMessage.to,
        from: twilioMessage.from, // Numéro du tenant
        providerId: twilioCredentials.providerId,
        providerName: twilioCredentials.providerName
      },
      timestamp: new Date().toISOString()
    });

    console.log(`[sendSms] [Tenant: ${tenantId}] ✅ Envoyé, SID: ${twilioMessage.sid}`);

    return {
      ok: true,
      messageId: twilioMessage.sid,
      provider: 'twilio',
      status: twilioMessage.status,
      from: twilioCredentials.phoneNumber // Retourner le numéro utilisé
    };

  } catch (error) {
    console.error(`[sendSms] [Tenant: ${tenantId}] ❌ Erreur Twilio:`, error.message);

    // Logger l'échec avec tenantId OBLIGATOIRE
    await logMessageEvent({
      channel: 'sms',
      provider: 'twilio',
      direction: 'out',
      tenantId, // SECURITY: tenantId obligatoire
      leadId,
      campaignId,
      phoneNumber: to,
      providerMessageId: 'failed-' + Date.now(),
      status: 'failed',
      messageSnippet: message?.substring(0, 200),
      rawPayload: {
        error: error.message,
        code: error.code,
        from: twilioCredentials.phoneNumber
      },
      timestamp: new Date().toISOString()
    });

    return {
      ok: false,
      error: error.message,
      code: error.code || 'TWILIO_ERROR'
    };
  }
}

/**
 * Vérifie si un tenant peut envoyer des SMS (a Twilio configuré)
 *
 * @param {string} tenantId - ID du tenant
 * @returns {Promise<boolean>}
 */
export async function canSendSms(tenantId) {
  if (!tenantId) return false;

  try {
    await getTwilioCredentials(tenantId);
    return true;
  } catch (error) {
    return false;
  }
}
