/**
 * Webhook Twilio SMS - Messages Entrants + Status Callbacks
 *
 * Ce webhook reçoit:
 * 1. Messages SMS entrants (réponses utilisateur)
 * 2. Status callbacks (sent, delivered, failed, undelivered)
 *
 * Documentation: https://www.twilio.com/docs/sms/twiml#twilios-request-to-your-application
 */

import express from 'express';
import twilio from 'twilio';
import { espoFetch } from '../lib/espoClient.js';
import { logMessageEvent } from '../lib/messageEventLogger.js';
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
      MessageSid,    // ID unique du message Twilio
      From,          // Numéro expéditeur (+33...)
      To,            // Numéro destinataire (votre numéro Twilio)
      Body,          // Texte du SMS
      SmsStatus      // Statut: received
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

    // Chercher le lead par numéro de téléphone
    const lead = await findLeadByPhone(From);

    if (lead) {
      console.log(`   👤 Lead trouvé: ${lead.name} (ID: ${lead.id})`);

      // Logger l'event
      await logMessageEvent({
        channel: 'sms',
        provider: 'twilio',
        direction: 'in',
        leadId: lead.id,
        phoneNumber: From,
        providerMessageId: MessageSid,
        status: 'received',
        messageSnippet: Body.substring(0, 200),
        rawPayload: req.body,
        timestamp: new Date().toISOString()
      });

      // Créer une note dans EspoCRM
      await createNote(lead.id, 'SMS reçu',
        `Le contact a envoyé un SMS:\n\n"${Body}"\n\n📱 Via Twilio SMS le ${new Date().toLocaleString('fr-FR')}`
      );

      console.log('   ✅ SMS traité et enregistré');
    } else {
      console.log(`   ⚠️  Aucun lead trouvé pour ${From}`);

      // Logger quand même (lead inconnu)
      await logMessageEvent({
        channel: 'sms',
        provider: 'twilio',
        direction: 'in',
        phoneNumber: From,
        providerMessageId: MessageSid,
        status: 'received_unknown',
        messageSnippet: Body.substring(0, 200),
        rawPayload: req.body,
        timestamp: new Date().toISOString()
      });
    }

    // Répondre 200 OK à Twilio (avec TwiML vide si pas de réponse auto)
    res.status(200).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');

    console.log('✅ Webhook traité avec succès');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Erreur lors du traitement du webhook SMS:', error);

    // Même en cas d'erreur, répondre 200 à Twilio pour éviter retries
    res.status(200).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }
});

/**
 * POST /webhooks/twilio-sms/status
 * Reçoit les status callbacks des SMS sortants (sent, delivered, failed)
 */
router.post('/status', async (req, res) => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('📊 WEBHOOK TWILIO SMS STATUS');
    console.log('='.repeat(80));

    const {
      MessageSid,
      MessageStatus,  // sent, delivered, failed, undelivered
      To,             // Destinataire (+33...)
      From,           // Votre numéro Twilio
      ErrorCode,      // Si failed
      ErrorMessage    // Si failed
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

    console.log(`${statusEmoji[MessageStatus] || '📋'} ${MessageStatus.toUpperCase()}`);

    // Chercher le lead
    const lead = await findLeadByPhone(To);

    // Normaliser le statut Twilio vers format canonique
    const normalizedStatus = normalizeStatus(MessageStatus, 'twilio');

    // Logger l'event status
    await logMessageEvent({
      channel: 'sms',
      provider: 'twilio',
      direction: 'out',
      leadId: lead?.id,
      phoneNumber: To,
      providerMessageId: MessageSid,
      status: normalizedStatus,
      rawPayload: req.body,
      timestamp: new Date().toISOString()
    });

    console.log('   ✅ Statut enregistré');

    // Répondre 200 OK à Twilio
    res.status(200).send('OK');

    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Erreur lors du traitement du status:', error);
    res.status(200).send('OK');
  }
});

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
 * GET /webhooks/twilio-sms/status-check
 * Endpoint de santé pour vérifier que le webhook est accessible
 */
router.get('/status-check', (req, res) => {
  res.json({
    ok: true,
    service: 'twilio-sms-webhook',
    timestamp: new Date().toISOString(),
    endpoints: {
      incoming: 'POST /webhooks/twilio-sms/incoming',
      status: 'POST /webhooks/twilio-sms/status'
    }
  });
});

export default router;