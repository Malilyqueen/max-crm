/**
 * Webhook Green-API - Messages Entrants WhatsApp
 *
 * SECURITY V2 - MULTI-TENANT:
 * - Résolution tenant via providerMessageId (prioritaire) ou waId/phone
 * - JAMAIS de fallback tenant
 * - Events non résolus → orphan_webhook_events
 *
 * Events supportés:
 * - incomingMessageReceived, outgoingMessageStatus, stateInstanceChanged
 */

import express from 'express';
import { logMessageEvent } from '../lib/messageEventLogger.js';
import {
  resolveLeadAndTenantByWaId,
  isValidResolution,
  isAmbiguousResolution,
  logOrphanWebhookEvent
} from '../lib/tenantResolver.js';
import { normalizeStatus } from '../lib/statusNormalizer.js';

const router = express.Router();

/**
 * POST /webhooks/greenapi
 * Reçoit TOUS les webhooks Green-API
 */
router.post('/', async (req, res) => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('📲 WEBHOOK GREEN-API ENTRANT');
    console.log('='.repeat(80));

    const webhookData = req.body;
    const { typeWebhook, instanceData, timestamp } = webhookData;

    console.log('📋 Event type:', typeWebhook);
    console.log('📋 Instance:', instanceData?.idInstance);
    console.log('📋 Timestamp:', timestamp ? new Date(timestamp * 1000).toISOString() : 'N/A');

    // RÉPONDRE 200 OK IMMÉDIATEMENT (Green-API retente sinon)
    res.status(200).json({ ok: true, received: typeWebhook });

    // Traiter l'event de manière asynchrone
    setImmediate(async () => {
      try {
        switch (typeWebhook) {
          case 'incomingMessageReceived':
            await handleIncomingMessage(webhookData);
            break;

          case 'outgoingMessageStatus':
            await handleOutgoingStatus(webhookData);
            break;

          case 'stateInstanceChanged':
            await handleStateChange(webhookData);
            break;

          case 'deviceInfo':
            console.log('📱 Device info received (informational only)');
            break;

          default:
            console.log(`⚠️  Event type non géré: ${typeWebhook}`);
        }
      } catch (asyncError) {
        console.error('❌ Erreur traitement async:', asyncError);
      }
    });

    console.log('✅ Webhook acquitté (200 OK)');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Erreur lors du traitement du webhook Green-API:', error);
    res.status(200).json({ ok: false, error: error.message });
  }
});

/**
 * Gère les messages entrants avec résolution tenant sécurisée
 */
async function handleIncomingMessage(webhookData) {
  console.log('\n💬 MESSAGE ENTRANT');

  const { senderData, messageData, idMessage, timestamp } = webhookData;
  const chatId = senderData?.chatId || senderData?.sender;
  const phone = extractPhoneNumber(chatId);
  const messageType = messageData?.typeMessage;

  console.log(`   De: ${phone}`);
  console.log(`   ChatId: ${chatId}`);
  console.log(`   Type: ${messageType}`);

  // Extraire le contenu du message
  let messageText = '';
  switch (messageType) {
    case 'textMessage':
      messageText = messageData.textMessageData?.textMessage || '';
      break;
    case 'imageMessage':
      messageText = '[Image]';
      break;
    case 'videoMessage':
      messageText = '[Vidéo]';
      break;
    case 'documentMessage':
      messageText = '[Document]';
      break;
    default:
      messageText = `[${messageType}]`;
  }

  console.log(`   Message: ${messageText.substring(0, 100)}`);

  // ============================================
  // SECURITY: Résolution tenant obligatoire
  // ============================================

  const resolution = await resolveLeadAndTenantByWaId(chatId, null);

  if (!isValidResolution(resolution)) {
    const reason = isAmbiguousResolution(resolution) ? 'ambiguous' : 'no_match';

    console.warn(`   ⚠️ TENANT NON RÉSOLU (${reason}) - Event sera orphelin`);

    await logOrphanWebhookEvent({
      channel: 'whatsapp',
      provider: 'greenapi',
      reason,
      contactIdentifier: chatId,
      providerMessageId: idMessage,
      candidates: resolution?.candidates || null,
      payload: webhookData
    });

    console.log('   📝 Event enregistré comme orphelin');
    return;
  }

  // Résolution OK
  const { leadId, tenantId } = resolution;
  console.log(`   ✅ Tenant résolu: ${tenantId}, Lead: ${leadId}`);

  // Logger l'event avec tenant valide
  await logMessageEvent({
    channel: 'whatsapp',
    provider: 'greenapi',
    direction: 'in',
    tenantId, // SECURITY: tenant obligatoire
    leadId,
    phoneNumber: phone,
    providerMessageId: idMessage,
    status: 'received',
    messageSnippet: messageText.substring(0, 200),
    rawPayload: webhookData,
    timestamp: new Date(timestamp * 1000).toISOString()
  });

  console.log('   ✅ Message traité et enregistré');
}

/**
 * Gère les status des messages sortants avec résolution tenant sécurisée
 */
async function handleOutgoingStatus(webhookData) {
  console.log('\n📊 STATUT MESSAGE SORTANT');

  const { statusData, idMessage, timestamp } = webhookData;
  const status = statusData?.status;
  const chatId = statusData?.chatId;
  const phone = extractPhoneNumber(chatId);

  console.log(`   MessageId: ${idMessage}`);
  console.log(`   Statut: ${status}`);
  console.log(`   Destinataire: ${phone}`);

  const statusEmoji = {
    'sent': '📤',
    'delivered': '✅',
    'read': '👁️',
    'failed': '❌'
  };

  console.log(`${statusEmoji[status] || '📋'} ${status?.toUpperCase()}`);

  // ============================================
  // SECURITY: Résolution tenant obligatoire
  // ============================================

  // Pour un status sortant, utiliser idMessage en priorité
  const resolution = await resolveLeadAndTenantByWaId(chatId, idMessage);

  if (!isValidResolution(resolution)) {
    const reason = isAmbiguousResolution(resolution) ? 'ambiguous' : 'no_match';

    console.warn(`   ⚠️ TENANT NON RÉSOLU (${reason}) - Event sera orphelin`);

    await logOrphanWebhookEvent({
      channel: 'whatsapp',
      provider: 'greenapi',
      reason,
      contactIdentifier: chatId,
      providerMessageId: idMessage,
      candidates: resolution?.candidates || null,
      payload: webhookData
    });

    console.log('   📝 Event enregistré comme orphelin');
    return;
  }

  // Résolution OK
  const { leadId, tenantId } = resolution;
  console.log(`   ✅ Tenant résolu: ${tenantId}, Lead: ${leadId}`);

  // Normaliser le statut
  const normalizedStatus = normalizeStatus(status, 'greenapi');

  // Logger l'event avec tenant valide
  await logMessageEvent({
    channel: 'whatsapp',
    provider: 'greenapi',
    direction: 'out',
    tenantId, // SECURITY: tenant obligatoire
    leadId,
    phoneNumber: phone,
    providerMessageId: idMessage,
    status: normalizedStatus,
    rawPayload: webhookData,
    timestamp: new Date(timestamp * 1000).toISOString()
  });

  console.log('   ✅ Statut enregistré');
}

/**
 * Gère les changements d'état de l'instance
 */
async function handleStateChange(webhookData) {
  console.log('\n🔄 CHANGEMENT ÉTAT INSTANCE');

  const { instanceData, stateInstance } = webhookData;

  console.log(`   Instance: ${instanceData?.idInstance}`);
  console.log(`   Nouvel état: ${stateInstance}`);

  // Note: Les changements d'état d'instance n'ont pas besoin de tenant
  // car ils concernent l'infrastructure, pas les données utilisateur
}

/**
 * Extrait le numéro de téléphone d'un chatId Green-API
 */
function extractPhoneNumber(chatId) {
  if (!chatId) return '';
  const phoneNumber = chatId.replace('@c.us', '').replace('@g.us', '');
  return phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
}

/**
 * GET /webhooks/greenapi/status
 * Endpoint de santé
 */
router.get('/status', (req, res) => {
  res.json({
    ok: true,
    service: 'greenapi-webhook',
    version: 'v2-multitenant',
    timestamp: new Date().toISOString(),
    events_supported: [
      'incomingMessageReceived',
      'outgoingMessageStatus',
      'stateInstanceChanged',
      'deviceInfo'
    ]
  });
});

export default router;
