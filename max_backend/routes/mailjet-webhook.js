/**
 * Webhook Mailjet - Events Email
 *
 * SECURITY V2 - MULTI-TENANT:
 * - Résolution tenant via providerMessageId (prioritaire) ou email
 * - JAMAIS de fallback tenant
 * - Events non résolus → orphan_webhook_events
 *
 * Events supportés:
 * - sent, delivered, open, click, bounce, spam, blocked, unsub
 */

import express from 'express';
import { logMessageEvent } from '../lib/messageEventLogger.js';
import {
  resolveLeadAndTenantByEmail,
  isValidResolution,
  isAmbiguousResolution,
  logOrphanWebhookEvent
} from '../lib/tenantResolver.js';
import { normalizeStatus } from '../lib/statusNormalizer.js';

const router = express.Router();

/**
 * POST /webhooks/mailjet
 * Reçoit TOUS les webhooks Mailjet
 */
router.post('/', async (req, res) => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('📧 WEBHOOK MAILJET ENTRANT');
    console.log('='.repeat(80));

    // Mailjet envoie un tableau d'events
    const events = Array.isArray(req.body) ? req.body : [req.body];

    console.log(`📋 ${events.length} event(s) reçu(s)`);

    // RÉPONDRE 200 OK IMMÉDIATEMENT (Mailjet retente sinon)
    res.status(200).send('OK');

    // Traiter les events de manière asynchrone
    setImmediate(async () => {
      for (const event of events) {
        try {
          await handleMailjetEvent(event);
        } catch (asyncError) {
          console.error('❌ Erreur traitement event:', asyncError);
        }
      }
    });

    console.log('✅ Webhook acquitté (200 OK)');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Erreur lors du traitement du webhook Mailjet:', error);
    res.status(200).send('OK');
  }
});

/**
 * Gère un event Mailjet avec résolution tenant sécurisée
 */
async function handleMailjetEvent(event) {
  const {
    event: eventType,
    time,
    MessageID,
    email,
    url,
    ip,
    geo,
    agent,
    error_related_to,
    error,
    comment,
    CustomID
  } = event;

  console.log(`\n📨 EVENT: ${eventType}`);
  console.log(`   MessageID: ${MessageID}`);
  console.log(`   Email: ${email}`);
  console.log(`   Timestamp: ${new Date(time * 1000).toISOString()}`);

  // ============================================
  // SECURITY: Résolution tenant obligatoire
  // ============================================

  // 1. Résoudre le tenant via providerMessageId (prioritaire) puis email
  const resolution = await resolveLeadAndTenantByEmail(email, String(MessageID));

  // 2. Vérifier la résolution
  if (!isValidResolution(resolution)) {
    // Pas de résolution valide → logger comme orphan
    const reason = isAmbiguousResolution(resolution) ? 'ambiguous' : 'no_match';

    console.warn(`   ⚠️ TENANT NON RÉSOLU (${reason}) - Event sera orphelin`);

    await logOrphanWebhookEvent({
      channel: 'email',
      provider: 'mailjet',
      reason,
      contactIdentifier: email,
      providerMessageId: String(MessageID),
      candidates: resolution?.candidates || null,
      payload: event
    });

    console.log('   📝 Event enregistré comme orphelin');
    return; // NE PAS logger dans message_events sans tenant!
  }

  // 3. Résolution OK → on a leadId et tenantId
  const { leadId, tenantId } = resolution;

  console.log(`   ✅ Tenant résolu: ${tenantId}, Lead: ${leadId}`);

  // ============================================
  // Logger l'event avec tenant valide
  // ============================================

  const status = normalizeStatus(eventType, 'mailjet');

  await logMessageEvent({
    channel: 'email',
    provider: 'mailjet',
    direction: 'out', // Mailjet webhooks = statuts messages sortants
    tenantId, // SECURITY: tenant obligatoire
    leadId,
    email,
    providerMessageId: String(MessageID),
    status,
    messageSnippet: url ? `Click: ${url}` : eventType,
    rawPayload: event,
    timestamp: new Date(time * 1000).toISOString()
  });

  // Logs spécifiques par type d'event
  switch (eventType) {
    case 'delivered':
      console.log(`   ✅ Email livré à ${email}`);
      break;
    case 'open':
      console.log(`   👁️  Email ouvert par ${email}`);
      break;
    case 'click':
      console.log(`   🔗 Lien cliqué: ${url}`);
      break;
    case 'bounce':
      console.log(`   ❌ Bounce: ${error_related_to} - ${error}`);
      break;
    case 'spam':
      console.log(`   ⚠️  Marqué comme spam par ${email}`);
      break;
    case 'blocked':
      console.log(`   🚫 Bloqué: ${error}`);
      break;
    case 'unsub':
      console.log(`   🚪 Désabonnement: ${email}`);
      break;
    default:
      console.log(`   📋 Event: ${eventType}`);
  }

  console.log('   ✅ Event traité et enregistré');
}

/**
 * GET /webhooks/mailjet/status
 * Endpoint de sanité
 */
router.get('/status', (req, res) => {
  res.json({
    ok: true,
    service: 'mailjet-webhook',
    version: 'v2-multitenant',
    timestamp: new Date().toISOString(),
    events_supported: [
      'sent', 'delivered', 'open', 'click',
      'bounce', 'spam', 'blocked', 'unsub'
    ]
  });
});

export default router;
