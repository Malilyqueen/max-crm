/**
 * Webhook Mailjet - Events Email
 *
 * Ce webhook reçoit TOUS les events Mailjet:
 * - sent: Email envoyé avec succès
 * - delivered: Email livré à la boîte de réception
 * - open: Email ouvert par le destinataire
 * - click: Lien cliqué dans l'email
 * - bounce: Email bounced (hard ou soft)
 * - spam: Email marqué comme spam
 * - blocked: Email bloqué par Mailjet (liste noire, réputation)
 * - unsub: Désabonnement
 *
 * Documentation: https://dev.mailjet.com/email/guides/webhooks/
 */

import express from 'express';
import { logMessageEvent } from '../lib/messageEventLogger.js';
import { espoFetch } from '../lib/espoClient.js';
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

    // Même en cas d'erreur, répondre 200 pour éviter les retries
    res.status(200).send('OK');
  }
});

/**
 * Gère un event Mailjet
 */
async function handleMailjetEvent(event) {
  const {
    event: eventType,
    time,
    MessageID,
    Message_GUID,
    email,
    mj_campaign_id,
    mj_contact_id,
    customcampaign,
    CustomID,
    Payload,
    url,
    ip,
    geo,
    agent,
    error_related_to,
    error,
    comment
  } = event;

  console.log(`\n📨 EVENT: ${eventType}`);
  console.log(`   MessageID: ${MessageID}`);
  console.log(`   Email: ${email}`);
  console.log(`   Timestamp: ${new Date(time * 1000).toISOString()}`);

  // Extraire leadId depuis CustomID si présent (format: "Lead_xxx")
  let leadId = null;
  if (CustomID) {
    const match = CustomID.match(/^(Lead|Account|Contact)_(.+)$/);
    if (match) {
      leadId = match[2];
    }
  }

  // Si pas de leadId, chercher par email
  if (!leadId && email) {
    leadId = await findLeadByEmail(email);
  }

  // Normaliser le statut Mailjet vers format canonique
  const status = normalizeStatus(eventType, 'mailjet');

  // Logger l'event (DB/JSON)
  await logMessageEvent({
    channel: 'email',
    provider: 'mailjet',
    direction: 'out', // Mailjet webhooks = statuts messages sortants
    leadId,
    email,
    providerMessageId: String(MessageID),
    status,
    messageSnippet: url ? `Click: ${url}` : eventType,
    rawPayload: event,
    timestamp: new Date(time * 1000).toISOString()
  });

  // Mettre à jour le statut dans EspoCRM si leadId trouvé
  if (leadId) {
    await updateEmailStatusInCRM(leadId, eventType, email);
  }

  // Logs spécifiques par type d'event
  switch (eventType) {
    case 'delivered':
      console.log(`   ✅ Email livré à ${email}`);
      break;

    case 'open':
      console.log(`   👁️  Email ouvert par ${email}`);
      if (ip) console.log(`   IP: ${ip}, Geo: ${geo}, Agent: ${agent}`);
      break;

    case 'click':
      console.log(`   🔗 Lien cliqué: ${url}`);
      console.log(`   IP: ${ip}, Agent: ${agent}`);
      break;

    case 'bounce':
      console.log(`   ❌ Bounce: ${error_related_to}`);
      console.log(`   Error: ${error}`);
      console.log(`   Comment: ${comment}`);
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
 * Cherche un lead par email dans EspoCRM
 */
async function findLeadByEmail(email) {
  try {
    const normalized = email.toLowerCase().trim();

    // Chercher dans EspoCRM
    const response = await espoFetch(
      `/Lead?where[0][type]=equals&where[0][attribute]=emailAddress&where[0][value]=${encodeURIComponent(normalized)}&maxSize=1`
    );

    if (response && response.list && response.list.length > 0) {
      const lead = response.list[0];
      console.log(`   👤 Lead trouvé: ${lead.firstName || ''} ${lead.lastName || ''} (ID: ${lead.id})`);
      return lead.id;
    }

    return null;
  } catch (error) {
    console.error('   ⚠️  Erreur lors de la recherche du lead:', error.message);
    return null;
  }
}

/**
 * Met à jour le statut Email dans EspoCRM (ajouter une note)
 */
async function updateEmailStatusInCRM(leadId, eventType, email) {
  try {
    const messages = {
      'delivered': `✅ Email livré à ${email}`,
      'open': `👁️ Email ouvert par ${email}`,
      'click': `🔗 Lien cliqué dans l'email envoyé à ${email}`,
      'bounce': `❌ Email bounced pour ${email}`,
      'spam': `⚠️ Email marqué comme spam par ${email}`,
      'blocked': `🚫 Email bloqué pour ${email}`,
      'unsub': `🚪 ${email} s'est désabonné`
    };

    const message = messages[eventType] || `📧 Event email: ${eventType}`;

    console.log(`   📝 Création note pour lead ${leadId}`);

    await espoFetch('/Note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Email: ${eventType}`,
        post: `${message}\n\nTimestamp: ${new Date().toLocaleString('fr-FR')}`,
        parentType: 'Lead',
        parentId: leadId
      })
    });

    console.log('   ✅ Note créée dans CRM');
  } catch (error) {
    console.error('   ⚠️  Impossible de créer la note:', error.message);
  }
}

/**
 * GET /webhooks/mailjet/status
 * Endpoint de sanité pour vérifier que le webhook est accessible
 */
router.get('/status', (req, res) => {
  res.json({
    ok: true,
    service: 'mailjet-webhook',
    timestamp: new Date().toISOString(),
    events_supported: [
      'sent',
      'delivered',
      'open',
      'click',
      'bounce',
      'spam',
      'blocked',
      'unsub'
    ]
  });
});

export default router;