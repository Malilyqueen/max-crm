/**
 * Webhook Green-API - Messages Entrants WhatsApp
 *
 * Ce webhook reçoit TOUS les events de Green-API:
 * - incomingMessageReceived: Message texte/média reçu
 * - outgoingMessageStatus: Statut message sortant (sent, delivered, read, failed)
 * - stateInstanceChanged: Changement état instance (authorized, notAuthorized)
 * - deviceInfo: Info appareil
 *
 * Documentation: https://green-api.com/en/docs/api/receiving/
 */

import express from 'express';
import { espoFetch } from '../lib/espoClient.js';
import { logMessageEvent } from '../lib/messageEventLogger.js';

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
    const { typeWebhook, instanceData, timestamp, senderData, messageData, statusData } = webhookData;

    console.log('📋 Event type:', typeWebhook);
    console.log('📋 Instance:', instanceData?.idInstance);
    console.log('📋 Timestamp:', new Date(timestamp * 1000).toISOString());

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

    // Même en cas d'erreur, répondre 200 pour éviter les retries
    res.status(200).json({ ok: false, error: error.message });
  }
});

/**
 * Gère les messages entrants (réponses utilisateur)
 */
async function handleIncomingMessage(webhookData) {
  console.log('\n💬 MESSAGE ENTRANT');

  const { senderData, messageData, idMessage, timestamp } = webhookData;
  const phone = extractPhoneNumber(senderData?.chatId || senderData?.sender);
  const messageType = messageData?.typeMessage;

  console.log(`   De: ${phone}`);
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

  // Chercher le lead par numéro de téléphone
  const lead = await findLeadByPhone(phone);

  if (lead) {
    console.log(`   👤 Lead trouvé: ${lead.name} (ID: ${lead.id})`);

    // Logger l'event (DB/JSON)
    await logMessageEvent({
      channel: 'whatsapp',
      provider: 'greenapi',
      direction: 'in',
      leadId: lead.id,
      phoneNumber: phone,
      providerMessageId: idMessage,
      status: 'received',
      messageSnippet: messageText.substring(0, 200),
      rawPayload: webhookData,
      timestamp: new Date(timestamp * 1000).toISOString()
    });

    // Créer une note dans EspoCRM
    await createNote(lead.id, 'Message WhatsApp reçu',
      `Le contact a envoyé un message:\n\n"${messageText}"\n\n📱 Via WhatsApp Green-API le ${new Date(timestamp * 1000).toLocaleString('fr-FR')}`
    );

    console.log('   ✅ Message traité et enregistré');
  } else {
    console.log(`   ⚠️  Aucun lead trouvé pour ${phone}`);

    // Logger quand même (lead inconnu)
    await logMessageEvent({
      channel: 'whatsapp',
      provider: 'greenapi',
      direction: 'in',
      phoneNumber: phone,
      providerMessageId: idMessage,
      status: 'received_unknown',
      messageSnippet: messageText.substring(0, 200),
      rawPayload: webhookData,
      timestamp: new Date(timestamp * 1000).toISOString()
    });
  }
}

/**
 * Gère les status des messages sortants (sent, delivered, read, failed)
 */
async function handleOutgoingStatus(webhookData) {
  console.log('\n📊 STATUT MESSAGE SORTANT');

  const { statusData, idMessage, timestamp } = webhookData;
  const status = statusData?.status;
  const phone = extractPhoneNumber(statusData?.chatId);

  console.log(`   MessageId: ${idMessage}`);
  console.log(`   Statut: ${status}`);
  console.log(`   Destinataire: ${phone}`);

  const statusEmoji = {
    'sent': '📤',
    'delivered': '✅',
    'read': '👁️',
    'failed': '❌'
  };

  console.log(`${statusEmoji[status] || '📋'} ${status.toUpperCase()}`);

  // Chercher le lead
  const lead = await findLeadByPhone(phone);

  // Logger l'event status
  await logMessageEvent({
    channel: 'whatsapp',
    provider: 'greenapi',
    direction: 'out',
    leadId: lead?.id,
    phoneNumber: phone,
    providerMessageId: idMessage,
    status: status,
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

  // TODO: Mettre à jour le statut de l'instance dans le storage
  // await updateInstanceStatus(instanceData.idInstance, stateInstance);
}

/**
 * Extrait le numéro de téléphone d'un chatId Green-API
 * Format: "33612345678@c.us" -> "+33612345678"
 */
function extractPhoneNumber(chatId) {
  if (!chatId) return '';

  const phoneNumber = chatId.replace('@c.us', '').replace('@g.us', '');

  // Ajouter le + si pas présent
  return phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
}

/**
 * Cherche un lead par numéro de téléphone dans EspoCRM
 */
async function findLeadByPhone(phoneNumber) {
  try {
    // Normaliser le numéro (enlever espaces, +, tirets)
    const normalized = phoneNumber.replace(/[\s\+\-\(\)]/g, '');

    // Chercher dans EspoCRM
    const response = await espoFetch(
      `/Lead?where[0][type]=or&where[0][value][0][type]=contains&where[0][value][0][attribute]=phoneNumber&where[0][value][0][value]=${normalized}&maxSize=1`
    );

    if (response && response.list && response.list.length > 0) {
      const lead = response.list[0];
      return {
        id: lead.id,
        name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Lead sans nom'
      };
    }

    return null;
  } catch (error) {
    console.error('   ⚠️  Erreur lors de la recherche du lead:', error.message);
    return null;
  }
}

/**
 * Crée une note dans EspoCRM pour tracer l'interaction
 */
async function createNote(leadId, subject, body) {
  try {
    console.log(`   📝 Création note pour lead ${leadId}`);

    await espoFetch('/Note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: subject,
        post: body,
        parentType: 'Lead',
        parentId: leadId
      })
    });

    console.log('   ✅ Note créée');
  } catch (error) {
    console.error('   ⚠️  Impossible de créer la note:', error.message);
  }
}

/**
 * GET /webhooks/greenapi/status
 * Endpoint de sanité pour vérifier que le webhook est accessible
 */
router.get('/status', (req, res) => {
  res.json({
    ok: true,
    service: 'greenapi-webhook',
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