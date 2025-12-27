/**
 * Webhook entrant WhatsApp - Reçoit les réponses Twilio
 *
 * Ce webhook reçoit:
 * - Les réponses aux messages WhatsApp envoyés
 * - Les clics sur les boutons des templates
 * - Les statuts de livraison (delivered, read, failed...)
 *
 * Architecture multitenant:
 * - Parse le ButtonPayload pour extraire tenantId, contactId, action
 * - Route vers le bon tenant
 * - Met à jour l'état du lead/contact dans EspoCRM
 */

import express from 'express';
import { parseButtonPayload } from '../config/whatsapp-templates.js';
import { espoFetch } from '../lib/espoClient.js';
import { executeWhatsAppAction } from '../config/whatsapp-actions.js';
import { logActivity } from '../lib/activityLogger.js';

const router = express.Router();

/**
 * POST /whatsapp/incoming
 * Reçoit les webhooks Twilio WhatsApp
 */
router.post('/incoming', async (req, res) => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('📲 WEBHOOK WHATSAPP ENTRANT');
    console.log('='.repeat(80));

    const {
      MessageSid,      // ID unique du message Twilio
      From,            // Numéro WhatsApp de l'expéditeur (whatsapp:+33...)
      To,              // Numéro WhatsApp de réception (whatsapp:+14155238886)
      Body,            // Texte du message reçu
      ButtonPayload,   // Payload du bouton cliqué (si template avec boutons)
      MessageStatus,   // Statut: sent, delivered, read, failed...
      NumMedia         // Nombre de médias (images, vidéos...)
    } = req.body;

    console.log('📋 Données reçues:');
    console.log(`   From: ${From}`);
    console.log(`   To: ${To}`);
    console.log(`   Body: ${Body}`);
    console.log(`   ButtonPayload: ${ButtonPayload || 'N/A'}`);
    console.log(`   MessageStatus: ${MessageStatus || 'N/A'}`);
    console.log(`   MessageSid: ${MessageSid}`);

    // CAS 1: Clic sur un bouton (template avec ButtonPayload)
    if (ButtonPayload) {
      await handleButtonClick(ButtonPayload, From, Body, MessageSid);
    }
    // CAS 2: Message texte libre (réponse sans bouton)
    else if (Body) {
      await handleTextMessage(From, Body, MessageSid);
    }
    // CAS 3: Statut de livraison uniquement (pas de réponse utilisateur)
    else if (MessageStatus) {
      await handleStatusUpdate(MessageSid, MessageStatus);
    }
    // CAS 4: Média (image, vidéo...)
    else if (NumMedia && parseInt(NumMedia) > 0) {
      console.log(`📎 ${NumMedia} média(s) reçu(s) - fonctionnalité à implémenter`);
    }

    // Répondre 200 OK immédiatement à Twilio (important!)
    res.status(200).send('OK');

    console.log('✅ Webhook traité avec succès');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Erreur lors du traitement du webhook WhatsApp:', error);

    // Même en cas d'erreur, on répond 200 à Twilio
    // Sinon Twilio va retenter plusieurs fois
    res.status(200).send('ERROR');
  }
});

/**
 * Gère le clic sur un bouton de template
 */
async function handleButtonClick(buttonPayload, from, body, messageSid) {
  console.log('\n🔘 CLIC SUR BOUTON DÉTECTÉ');

  try {
    const phoneNumber = from.replace('whatsapp:', '');

    // DETECTION DU FORMAT DE PAYLOAD
    // Format 1 (PRIORITAIRE): "action=confirm|type=appointment|lead=abc123|tenant=macrea"
    // Format 2 (FALLBACK): "OUI" ou "NON"

    if (buttonPayload.includes('action=') && buttonPayload.includes('|')) {
      // ===== CAS 1: PAYLOAD STRUCTURÉ (template prioritaire) =====
      console.log('📦 Format STRUCTURÉ détecté (avec contexte complet)');

      const parsed = parseButtonPayload(buttonPayload);
      console.log('📦 Payload parsé:', parsed);

      const { action, tenant, contact, lead, type } = parsed;
      const leadId = contact || lead; // Support des deux noms

      if (!action || !tenant || !leadId) {
        console.error('⚠️  Payload incomplet:', parsed);
        return;
      }

      console.log(`\n🎯 Action: ${action}`);
      console.log(`   Tenant: ${tenant}`);
      console.log(`   Lead: ${leadId}`);
      console.log(`   Type: ${type || 'N/A'}`);
      console.log(`   Phone: ${phoneNumber}`);

      // Logger l'activité entrante (clic bouton = réponse)
      try {
        await logActivity({
          leadId,
          channel: 'whatsapp',
          direction: 'in',
          status: 'replied',
          messageSnippet: `Clic bouton: ${action}`,
          meta: {
            from: phoneNumber,
            twilioSid: messageSid,
            buttonPayload,
            action,
            type
          },
          tenantId: tenant
        });
        console.log(`   📝 Activité entrante loggée (clic bouton structuré)`);
      } catch (logError) {
        console.warn(`   ⚠️  Erreur log activité (non bloquant):`, logError.message);
      }

      // Extraire le contexte additionnel du payload si présent
      let additionalContext = {};
      if (parsed.ctx) {
        try {
          additionalContext = JSON.parse(decodeURIComponent(parsed.ctx));
        } catch (e) {
          console.warn('   ⚠️  Impossible de parser le contexte:', parsed.ctx);
        }
      }

      // Exécuter l'action via le système de handlers
      const result = await executeWhatsAppAction(type, action, {
        tenantId: tenant,
        leadId: leadId,
        from: phoneNumber,
        payload: additionalContext
      });

      if (result.success) {
        console.log(`   ✅ ${result.message}`);
      } else {
        console.error(`   ❌ ${result.message}`);
      }

    } else {
      // ===== CAS 2: PAYLOAD SIMPLE "OUI" / "NON" (template fallback) =====
      console.log('📦 Format SIMPLE détecté (OUI/NON - reconstruction contexte nécessaire)');
      console.log(`   Réponse: ${buttonPayload}`);
      console.log(`   Phone: ${phoneNumber}`);

      // Chercher le lead par numéro de téléphone
      const lead = await findLeadByPhone(phoneNumber);

      if (!lead) {
        console.error(`   ❌ Aucun lead trouvé pour le numéro ${phoneNumber}`);
        // Créer une note orpheline pour tracer la réponse
        console.log(`   💡 Réponse "${buttonPayload}" enregistrée mais non liée`);
        return;
      }

      console.log(`   👤 Lead trouvé: ${lead.name} (ID: ${lead.id})`);

      // Logger l'activité entrante (clic bouton = réponse)
      try {
        await logActivity({
          leadId: lead.id,
          channel: 'whatsapp',
          direction: 'in',
          status: 'replied',
          messageSnippet: `Clic bouton: ${buttonPayload}`,
          meta: {
            from: phoneNumber,
            twilioSid: messageSid,
            buttonPayload
          },
          tenantId: 'macrea'
        });
        console.log(`   📝 Activité entrante loggée (clic bouton)`);
      } catch (logError) {
        console.warn(`   ⚠️  Erreur log activité (non bloquant):`, logError.message);
      }

      // Déterminer l'action à partir de la réponse
      const action = buttonPayload.toUpperCase() === 'OUI' ? 'confirm' : 'cancel';
      console.log(`   🎯 Action mappée: ${action}`);

      // Exécuter l'action (type=appointment par défaut pour les RDV)
      const result = await executeWhatsAppAction('appointment', action, {
        tenantId: 'macrea', // Tenant par défaut (à améliorer avec multi-tenant)
        leadId: lead.id,
        from: phoneNumber,
        payload: {
          reconstructed: true,
          originalPayload: buttonPayload
        }
      });

      if (result.success) {
        console.log(`   ✅ ${result.message}`);
      } else {
        console.error(`   ❌ ${result.message}`);
      }
    }

    // TODO: Envoyer une notification à M.A.X. pour ce tenant
    // await notifyMAX(tenant, {
    //   event: 'whatsapp_button_click',
    //   contactId: leadId,
    //   action,
    //   type,
    //   phoneNumber,
    //   result
    // });

  } catch (error) {
    console.error('❌ Erreur lors du traitement du clic bouton:', error);
  }
}

/**
 * Gère un message texte libre (pas de bouton)
 */
async function handleTextMessage(from, body, messageSid) {
  console.log('\n💬 MESSAGE TEXTE REÇU');
  console.log(`   De: ${from}`);
  console.log(`   Message: ${body}`);

  try {
    // Extraire le numéro de téléphone
    const phoneNumber = from.replace('whatsapp:', '');

    // Normaliser le texte pour la détection
    const normalizedBody = body.trim().toLowerCase();

    // Chercher le lead par numéro de téléphone dans EspoCRM
    const lead = await findLeadByPhone(phoneNumber);

    if (lead) {
      console.log(`   👤 Lead trouvé: ${lead.name} (ID: ${lead.id})`);

      // Logger l'activité entrante (best effort - ne bloque jamais le traitement)
      try {
        await logActivity({
          leadId: lead.id,
          channel: 'whatsapp',
          direction: 'in',
          status: 'replied',
          messageSnippet: body.substring(0, 100),
          meta: {
            from: phoneNumber,
            twilioSid: messageSid
          },
          tenantId: 'macrea'
        });
        console.log(`   📝 Activité entrante loggée pour lead ${lead.id}`);
      } catch (logError) {
        console.warn(`   ⚠️  Erreur log activité (non bloquant):`, logError.message);
      }

      // DÉTECTION DES RÉPONSES OUI/NON pour confirmation RDV
      if (normalizedBody === 'oui' || normalizedBody === 'yes' || normalizedBody === 'o') {
        console.log('   ✅ CONFIRMATION RDV détectée');

        // Exécuter l'action de confirmation
        const result = await executeWhatsAppAction('appointment', 'confirm', {
          tenantId: 'macrea',
          leadId: lead.id,
          from: phoneNumber,
          payload: { reconstructed: true, originalMessage: body }
        });

        if (result.success) {
          console.log('   🎉 RDV confirmé avec succès !');
          // M.A.X. envoie automatiquement une réponse via executeWhatsAppAction
        }

      } else if (normalizedBody === 'non' || normalizedBody === 'no' || normalizedBody === 'n') {
        console.log('   ❌ ANNULATION RDV détectée');

        // Exécuter l'action d'annulation
        const result = await executeWhatsAppAction('appointment', 'cancel', {
          tenantId: 'macrea',
          leadId: lead.id,
          from: phoneNumber,
          payload: { reconstructed: true, originalMessage: body }
        });

        if (result.success) {
          console.log('   📝 RDV annulé avec succès !');
          // M.A.X. envoie automatiquement une réponse via executeWhatsAppAction
        }

      } else {
        // Message quelconque - on l'enregistre juste comme note
        await createWhatsAppNote(
          lead.id,
          'Message WhatsApp reçu',
          `Le contact a envoyé un message:\n\n"${body}"`
        );
        console.log('   ✅ Message enregistré dans EspoCRM');
      }

    } else {
      console.log(`   ⚠️  Aucun lead trouvé pour le numéro ${phoneNumber}`);
      console.log(`   💡 Le message WhatsApp est enregistré mais non lié à un lead`);

      // On pourrait créer un lead automatiquement ici si besoin
      // await createLeadFromWhatsApp(phoneNumber, body);
    }

  } catch (error) {
    console.error('❌ Erreur lors du traitement du message texte:', error);
  }
}

/**
 * Gère les mises à jour de statut (delivered, read, failed...)
 */
async function handleStatusUpdate(messageSid, status) {
  console.log(`\n📊 STATUT: ${status} (MessageSid: ${messageSid})`);

  // TODO: Mettre à jour le statut du message dans une table de tracking
  // Pour l'instant, on log juste

  const statusEmoji = {
    'sent': '📤',
    'delivered': '✅',
    'read': '👁️',
    'failed': '❌',
    'undelivered': '⚠️'
  };

  console.log(`${statusEmoji[status] || '📋'} Message ${messageSid}: ${status}`);
}

/**
 * Trouve un lead dans EspoCRM par son numéro de téléphone
 */
async function findLeadByPhone(phoneNumber) {
  try {
    // Normaliser le numéro (enlever les espaces, points, tirets)
    const normalized = phoneNumber.replace(/[\s\.\-]/g, '');

    // Chercher dans EspoCRM
    // On utilise une recherche flexible car le format peut varier
    const response = await espoFetch(`/Lead?where[0][type]=or&where[0][value][0][type]=contains&where[0][value][0][attribute]=phoneNumber&where[0][value][0][value]=${normalized}&maxSize=1`);

    if (response && response.list && response.list.length > 0) {
      const lead = response.list[0];
      return {
        id: lead.id,
        name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Lead sans nom'
      };
    }

    return null;
  } catch (error) {
    console.error(`   ⚠️  Erreur lors de la recherche du lead:`, error.message);
    return null;
  }
}

/**
 * Crée une note dans EspoCRM pour tracer une interaction WhatsApp
 */
async function createWhatsAppNote(leadId, subject, body) {
  try {
    console.log(`   📝 Création d'une note pour le lead ${leadId}`);

    await espoFetch('/Note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: subject,
        post: body + `\n\n📱 Interaction via WhatsApp le ${new Date().toLocaleString('fr-FR')}`,
        parentType: 'Lead',
        parentId: leadId
      })
    });

    console.log(`   ✅ Note créée avec succès`);
  } catch (error) {
    console.error(`   ⚠️  Impossible de créer la note:`, error.message);
    // Ne pas bloquer si la création de note échoue
  }
}

/**
 * GET /whatsapp/status
 * Endpoint de santé pour vérifier que le webhook est accessible
 */
router.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    service: 'whatsapp-webhook',
    timestamp: new Date().toISOString()
  });
});

export default router;
