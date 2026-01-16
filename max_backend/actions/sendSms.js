/**
 * actions/sendSms.js
 * Envoi SMS via Twilio avec logging automatique
 */

import twilio from 'twilio';
import { logMessageEvent } from '../lib/messageEventLogger.js';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER || '+15146412055';

/**
 * Envoie un SMS via Twilio
 * @param {Object} params
 * @param {string} params.to - Numéro de téléphone (+33...)
 * @param {string} params.message - Texte du message
 * @param {string} params.tenantId - Tenant ID
 * @param {string} params.leadId - Lead ID (optionnel)
 * @returns {Promise<Object>}
 */
export async function sendSms({ to, message, tenantId, leadId }) {
  try {
    console.log('[sendSms] Envoi vers:', to);

    // Envoi via Twilio
    const twilioMessage = await twilioClient.messages.create({
      body: message,
      from: TWILIO_FROM,
      to: to
    });

    // Logger l'event
    await logMessageEvent({
      channel: 'sms',
      provider: 'twilio',
      direction: 'out',
      leadId,
      phoneNumber: to,
      providerMessageId: twilioMessage.sid,
      status: 'queued', // Twilio status initial
      messageSnippet: message.substring(0, 200),
      rawPayload: {
        sid: twilioMessage.sid,
        status: twilioMessage.status,
        to: twilioMessage.to,
        from: twilioMessage.from
      },
      timestamp: new Date().toISOString()
    });

    console.log('[sendSms] ✅ Envoyé, SID:', twilioMessage.sid);

    return {
      ok: true,
      messageId: twilioMessage.sid,
      provider: 'twilio',
      status: twilioMessage.status
    };

  } catch (error) {
    console.error('[sendSms] ❌ Erreur:', error);

    // Logger l'échec
    if (leadId || to) {
      await logMessageEvent({
        channel: 'sms',
        provider: 'twilio',
        direction: 'out',
        leadId,
        phoneNumber: to,
        providerMessageId: 'failed-' + Date.now(),
        status: 'failed',
        messageSnippet: message?.substring(0, 200),
        rawPayload: { error: error.message },
        timestamp: new Date().toISOString()
      });
    }

    return {
      ok: false,
      error: error.message
    };
  }
}