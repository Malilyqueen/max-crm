/**
 * Webhook Twilio SMS - Messages Entrants + Status Callbacks
 *
 * SECURITY V2 - MULTI-TENANT:
 * - Résolution tenant via providerMessageId (prioritaire) ou phone
 * - JAMAIS de fallback tenant
 * - Events non résolus → orphan_webhook_events
 *
 * Endpoints:
 * - POST /incoming : SMS entrants
 * - POST /status : Status callbacks (sent, delivered, failed)
 */

import express from 'express';
import twilio from 'twilio';
import { logMessageEvent } from '../lib/messageEventLogger.js';
import {
  resolveLeadAndTenantByPhone,
  isValidResolution,
  isAmbiguousResolution,
  logOrphanWebhookEvent
} from '../lib/tenantResolver.js';
import { normalizeStatus } from '../lib/statusNormalizer.js';

const router = express.Router();

/**
 * POST /webhooks/twilio-sms/incoming
 * Reçoit les SMS entrants (réponses utilisateur)
 */
router.post('/incoming', async (req, res) => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('📱 WEBHOOK TWILIO SMS ENTRANT');
    console.log('='.repeat(80));

    const {
      MessageSid,
      From,
      To,
      Body,
      SmsStatus
    } = req.body;

    console.log('📋 Données reçues:');
    console.log(`   From: ${From}`);
    console.log(`   To: ${To}`);
    console.log(`   Body: ${Body}`);
    console.log(`   MessageSid: ${MessageSid}`);

    // Valider signature Twilio (sécurité)
    if (process.env.TWILIO_AUTH_TOKEN && req.headers['x-twilio-signature']) {
      const signature = req.headers['x-twilio-signature'];
      const url = `https://${req.get('host')}${req.originalUrl}`;

      const isValid = twilio.validateRequest(
        process.env.TWILIO_AUTH_TOKEN,
        signature,
        url,
        req.body
      );

      if (!isValid) {
        console.error('❌ SIGNATURE INVALIDE - Webhook rejeté');
        return res.status(403).send('Invalid signature');
      }

      console.log('✅ Signature Twilio validée');
    }

    // ============================================
    // SECURITY: Résolution tenant obligatoire
    // ============================================

    // Pour un SMS entrant, on cherche par le numéro de l'expéditeur (From)
    const resolution = await resolveLeadAndTenantByPhone(From, null);

    if (!isValidResolution(resolution)) {
      const reason = isAmbiguousResolution(resolution) ? 'ambiguous' : 'no_match';

      console.warn(`   ⚠️ TENANT NON RÉSOLU (${reason}) - Event sera orphelin`);

      await logOrphanWebhookEvent({
        channel: 'sms',
        provider: 'twilio',
        reason,
        contactIdentifier: From,
        providerMessageId: MessageSid,
        candidates: resolution?.candidates || null,
        payload: req.body
      });

      console.log('   📝 Event enregistré comme orphelin');

      // Répondre 200 OK à Twilio
      res.status(200).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      return;
    }

    // Résolution OK
    const { leadId, tenantId } = resolution;
    console.log(`   ✅ Tenant résolu: ${tenantId}, Lead: ${leadId}`);

    // Logger l'event avec tenant valide
    await logMessageEvent({
      channel: 'sms',
      provider: 'twilio',
      direction: 'in',
      tenantId, // SECURITY: tenant obligatoire
      leadId,
      phoneNumber: From,
      providerMessageId: MessageSid,
      status: 'received',
      messageSnippet: Body?.substring(0, 200),
      rawPayload: req.body,
      timestamp: new Date().toISOString()
    });

    console.log('   ✅ SMS traité et enregistré');

    // Répondre 200 OK à Twilio
    res.status(200).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');

    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Erreur lors du traitement du webhook SMS:', error);
    res.status(200).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }
});

/**
 * POST /webhooks/twilio-sms/status
 * Reçoit les status callbacks des SMS sortants
 */
router.post('/status', async (req, res) => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('📊 WEBHOOK TWILIO SMS STATUS');
    console.log('='.repeat(80));

    const {
      MessageSid,
      MessageStatus,
      To,
      From,
      ErrorCode,
      ErrorMessage
    } = req.body;

    console.log('📋 Status update:');
    console.log(`   MessageSid: ${MessageSid}`);
    console.log(`   Status: ${MessageStatus}`);
    console.log(`   To: ${To}`);

    if (ErrorCode) {
      console.log(`   ❌ Error: ${ErrorCode} - ${ErrorMessage}`);
    }

    const statusEmoji = {
      'sent': '📤',
      'delivered': '✅',
      'failed': '❌',
      'undelivered': '⚠️'
    };

    console.log(`${statusEmoji[MessageStatus] || '📋'} ${MessageStatus?.toUpperCase()}`);

    // ============================================
    // SECURITY: Résolution tenant obligatoire
    // ============================================

    // Pour un status callback, on a le MessageSid → utiliser prioritairement
    // Sinon fallback sur le numéro destinataire (To)
    const resolution = await resolveLeadAndTenantByPhone(To, MessageSid);

    if (!isValidResolution(resolution)) {
      const reason = isAmbiguousResolution(resolution) ? 'ambiguous' : 'no_match';

      console.warn(`   ⚠️ TENANT NON RÉSOLU (${reason}) - Event sera orphelin`);

      await logOrphanWebhookEvent({
        channel: 'sms',
        provider: 'twilio',
        reason,
        contactIdentifier: To,
        providerMessageId: MessageSid,
        candidates: resolution?.candidates || null,
        payload: req.body
      });

      console.log('   📝 Event enregistré comme orphelin');

      res.status(200).send('OK');
      return;
    }

    // Résolution OK
    const { leadId, tenantId } = resolution;
    console.log(`   ✅ Tenant résolu: ${tenantId}, Lead: ${leadId}`);

    // Normaliser le statut
    const normalizedStatus = normalizeStatus(MessageStatus, 'twilio');

    // Logger l'event avec tenant valide
    await logMessageEvent({
      channel: 'sms',
      provider: 'twilio',
      direction: 'out',
      tenantId, // SECURITY: tenant obligatoire
      leadId,
      phoneNumber: To,
      providerMessageId: MessageSid,
      status: normalizedStatus,
      rawPayload: req.body,
      timestamp: new Date().toISOString()
    });

    console.log('   ✅ Statut enregistré');

    res.status(200).send('OK');

    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Erreur lors du traitement du status:', error);
    res.status(200).send('OK');
  }
});

/**
 * GET /webhooks/twilio-sms/status-check
 * Endpoint de santé
 */
router.get('/status-check', (req, res) => {
  res.json({
    ok: true,
    service: 'twilio-sms-webhook',
    version: 'v2-multitenant',
    timestamp: new Date().toISOString(),
    endpoints: {
      incoming: 'POST /webhooks/twilio-sms/incoming',
      status: 'POST /webhooks/twilio-sms/status'
    }
  });
});

export default router;
