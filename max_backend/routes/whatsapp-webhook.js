/**
 * Webhook entrant WhatsApp - Reçoit les réponses Twilio
 *
 * SECURITY V2 - MULTI-TENANT:
 * - Résolution tenant via tenantResolver (prioritaire) ou ButtonPayload structuré
 * - JAMAIS de fallback tenant hardcodé
 * - Events non résolus → orphan_webhook_events
 *
 * Ce webhook reçoit:
 * - Les réponses aux messages WhatsApp envoyés
 * - Les clics sur les boutons des templates
 * - Les statuts de livraison (delivered, read, failed...)
 */

import express from 'express';
import { parseButtonPayload } from '../config/whatsapp-templates.js';
import { espoFetch } from '../lib/espoClient.js';
import { executeWhatsAppAction } from '../config/whatsapp-actions.js';
import { logActivity } from '../lib/activityLogger.js';
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
 * POST /whatsapp/incoming
 * Reçoit les webhooks Twilio WhatsApp
 */
router.post('/incoming', async (req, res) => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('📲 WEBHOOK WHATSAPP ENTRANT (Twilio)');
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
      await handleButtonClick(ButtonPayload, From, Body, MessageSid, req.body);
    }
    // CAS 2: Message texte libre (réponse sans bouton)
    else if (Body) {
      await handleTextMessage(From, Body, MessageSid, req.body);
    }
    // CAS 3: Statut de livraison uniquement (pas de réponse utilisateur)
    else if (MessageStatus) {
      await handleStatusUpdate(MessageSid, MessageStatus, To, req.body);
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
async function handleButtonClick(buttonPayload, from, body, messageSid, rawPayload) {
  console.log('\n🔘 CLIC SUR BOUTON DÉTECTÉ');

  try {
    const phoneNumber = from.replace('whatsapp:', '');

    // DETECTION DU FORMAT DE PAYLOAD
    // Format 1 (PRIORITAIRE): "action=confirm|type=appointment|lead=abc123|tenant=macrea"
    // Format 2 (FALLBACK SÉCURISÉ): "OUI" ou "NON" → résolution via tenantResolver

    if (buttonPayload.includes('action=') && buttonPayload.includes('|')) {
      // ===== CAS 1: PAYLOAD STRUCTURÉ (template avec contexte complet) =====
      console.log('📦 Format STRUCTURÉ détecté (avec contexte complet)');

      const parsed = parseButtonPayload(buttonPayload);
      console.log('📦 Payload parsé:', parsed);

      const { action, tenant, contact, lead, type } = parsed;
      const leadId = contact || lead; // Support des deux noms

      if (!action || !tenant || !leadId) {
        console.error('⚠️  Payload incomplet:', parsed);

        // Logger comme orphelin
        await logOrphanWebhookEvent({
          channel: 'whatsapp',
          provider: 'twilio',
          reason: 'incomplete_payload',
          contactIdentifier: phoneNumber,
          providerMessageId: messageSid,
          candidates: null,
          payload: rawPayload
        });
        return;
      }

      console.log(`\n🎯 Action: ${action}`);
      console.log(`   Tenant: ${tenant}`);
      console.log(`   Lead: ${leadId}`);
      console.log(`   Type: ${type || 'N/A'}`);
      console.log(`   Phone: ${phoneNumber}`);

      // SECURITY: tenantId vient du payload structuré (validé lors de l'envoi)
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
          tenantId: tenant // SECURITY: tenant du payload structuré
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
        tenantId: tenant, // SECURITY: tenant du payload
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
      // ===== CAS 2: PAYLOAD SIMPLE "OUI" / "NON" (résolution sécurisée obligatoire) =====
      console.log('📦 Format SIMPLE détecté (OUI/NON - résolution tenant via tenantResolver)');
      console.log(`   Réponse: ${buttonPayload}`);
      console.log(`   Phone: ${phoneNumber}`);

      // ============================================
      // SECURITY: Résolution tenant obligatoire
      // ============================================
      const resolution = await resolveLeadAndTenantByPhone(phoneNumber, null);

      if (!isValidResolution(resolution)) {
        const reason = isAmbiguousResolution(resolution) ? 'ambiguous' : 'no_match';

        console.warn(`   ⚠️ TENANT NON RÉSOLU (${reason}) - Event sera orphelin`);

        await logOrphanWebhookEvent({
          channel: 'whatsapp',
          provider: 'twilio',
          reason,
          contactIdentifier: phoneNumber,
          providerMessageId: messageSid,
          candidates: resolution?.candidates || null,
          payload: rawPayload
        });

        console.log('   📝 Event enregistré comme orphelin');
        return; // NE PAS traiter sans tenant!
      }

      // Résolution OK
      const { leadId, tenantId } = resolution;
      console.log(`   ✅ Tenant résolu: ${tenantId}, Lead: ${leadId}`);

      // Logger l'activité entrante (clic bouton = réponse)
      try {
        await logActivity({
          leadId,
          channel: 'whatsapp',
          direction: 'in',
          status: 'replied',
          messageSnippet: `Clic bouton: ${buttonPayload}`,
          meta: {
            from: phoneNumber,
            twilioSid: messageSid,
            buttonPayload
          },
          tenantId // SECURITY: tenant résolu
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
        tenantId, // SECURITY: tenant résolu
        leadId,
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

  } catch (error) {
    console.error('❌ Erreur lors du traitement du clic bouton:', error);
  }
}

/**
 * Gère un message texte libre (pas de bouton)
 */
async function handleTextMessage(from, body, messageSid, rawPayload) {
  console.log('\n💬 MESSAGE TEXTE REÇU');
  console.log(`   De: ${from}`);
  console.log(`   Message: ${body}`);

  try {
    // Extraire le numéro de téléphone
    const phoneNumber = from.replace('whatsapp:', '');

    // Normaliser le texte pour la détection
    const normalizedBody = body.trim().toLowerCase();

    // ============================================
    // SECURITY: Résolution tenant obligatoire
    // ============================================
    const resolution = await resolveLeadAndTenantByPhone(phoneNumber, null);

    if (!isValidResolution(resolution)) {
      const reason = isAmbiguousResolution(resolution) ? 'ambiguous' : 'no_match';

      console.warn(`   ⚠️ TENANT NON RÉSOLU (${reason}) - Event sera orphelin`);

      await logOrphanWebhookEvent({
        channel: 'whatsapp',
        provider: 'twilio',
        reason,
        contactIdentifier: phoneNumber,
        providerMessageId: messageSid,
        candidates: resolution?.candidates || null,
        payload: rawPayload
      });

      console.log('   📝 Event enregistré comme orphelin');
      return; // NE PAS traiter sans tenant!
    }

    // Résolution OK
    const { leadId, tenantId } = resolution;
    console.log(`   ✅ Tenant résolu: ${tenantId}, Lead: ${leadId}`);

    // Logger l'activité entrante
    try {
      await logActivity({
        leadId,
        channel: 'whatsapp',
        direction: 'in',
        status: 'replied',
        messageSnippet: body.substring(0, 100),
        meta: {
          from: phoneNumber,
          twilioSid: messageSid
        },
        tenantId // SECURITY: tenant résolu
      });
      console.log(`   📝 Activité entrante loggée pour lead ${leadId}`);
    } catch (logError) {
      console.warn(`   ⚠️  Erreur log activité (non bloquant):`, logError.message);
    }

    // Logger l'event message
    await logMessageEvent({
      channel: 'whatsapp',
      provider: 'twilio',
      direction: 'in',
      tenantId, // SECURITY: tenant résolu
      leadId,
      phoneNumber,
      providerMessageId: messageSid,
      status: 'received',
      messageSnippet: body.substring(0, 200),
      rawPayload,
      timestamp: new Date().toISOString()
    });

    // DÉTECTION DES RÉPONSES OUI/NON pour confirmation RDV
    if (normalizedBody === 'oui' || normalizedBody === 'yes' || normalizedBody === 'o') {
      console.log('   ✅ CONFIRMATION RDV détectée');

      // Exécuter l'action de confirmation
      const result = await executeWhatsAppAction('appointment', 'confirm', {
        tenantId, // SECURITY: tenant résolu
        leadId,
        from: phoneNumber,
        payload: { reconstructed: true, originalMessage: body }
      });

      if (result.success) {
        console.log('   🎉 RDV confirmé avec succès !');
      }

    } else if (normalizedBody === 'non' || normalizedBody === 'no' || normalizedBody === 'n') {
      console.log('   ❌ ANNULATION RDV détectée');

      // Exécuter l'action d'annulation
      const result = await executeWhatsAppAction('appointment', 'cancel', {
        tenantId, // SECURITY: tenant résolu
        leadId,
        from: phoneNumber,
        payload: { reconstructed: true, originalMessage: body }
      });

      if (result.success) {
        console.log('   📝 RDV annulé avec succès !');
      }

    } else {
      // Message quelconque - on l'enregistre juste comme note
      await createWhatsAppNote(
        leadId,
        tenantId,
        'Message WhatsApp reçu',
        `Le contact a envoyé un message:\n\n"${body}"`
      );
      console.log('   ✅ Message enregistré dans EspoCRM');
    }

  } catch (error) {
    console.error('❌ Erreur lors du traitement du message texte:', error);
  }
}

/**
 * Gère les mises à jour de statut (delivered, read, failed...)
 */
async function handleStatusUpdate(messageSid, status, to, rawPayload) {
  console.log(`\n📊 STATUT: ${status} (MessageSid: ${messageSid})`);

  const statusEmoji = {
    'sent': '📤',
    'delivered': '✅',
    'read': '👁️',
    'failed': '❌',
    'undelivered': '⚠️'
  };

  console.log(`${statusEmoji[status] || '📋'} Message ${messageSid}: ${status}`);

  // Extraire le numéro de téléphone
  const phoneNumber = to ? to.replace('whatsapp:', '') : null;

  if (!phoneNumber) {
    console.warn('   ⚠️ Pas de numéro destinataire - impossible de résoudre le tenant');
    return;
  }

  // ============================================
  // SECURITY: Résolution tenant obligatoire
  // ============================================
  // Pour un status callback, on a le MessageSid → utiliser prioritairement
  const resolution = await resolveLeadAndTenantByPhone(phoneNumber, messageSid);

  if (!isValidResolution(resolution)) {
    const reason = isAmbiguousResolution(resolution) ? 'ambiguous' : 'no_match';

    console.warn(`   ⚠️ TENANT NON RÉSOLU (${reason}) - Event sera orphelin`);

    await logOrphanWebhookEvent({
      channel: 'whatsapp',
      provider: 'twilio',
      reason,
      contactIdentifier: phoneNumber,
      providerMessageId: messageSid,
      candidates: resolution?.candidates || null,
      payload: rawPayload
    });

    console.log('   📝 Event enregistré comme orphelin');
    return;
  }

  // Résolution OK
  const { leadId, tenantId } = resolution;
  console.log(`   ✅ Tenant résolu: ${tenantId}, Lead: ${leadId}`);

  // Normaliser le statut
  const normalizedStatus = normalizeStatus(status, 'twilio');

  // Logger l'event avec tenant valide
  await logMessageEvent({
    channel: 'whatsapp',
    provider: 'twilio',
    direction: 'out',
    tenantId, // SECURITY: tenant résolu
    leadId,
    phoneNumber,
    providerMessageId: messageSid,
    status: normalizedStatus,
    rawPayload,
    timestamp: new Date().toISOString()
  });

  console.log('   ✅ Statut enregistré');
}

/**
 * Crée une note dans EspoCRM pour tracer une interaction WhatsApp
 * SECURITY: Requiert tenantId pour isolation
 */
async function createWhatsAppNote(leadId, tenantId, subject, body) {
  try {
    console.log(`   📝 Création d'une note pour le lead ${leadId} (tenant: ${tenantId})`);

    // Note: espoFetch devrait être tenant-aware dans une implémentation complète
    // Pour l'instant, on log juste avec le tenant pour traçabilité
    await espoFetch('/Note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: subject,
        post: body + `\n\n📱 Interaction via WhatsApp le ${new Date().toLocaleString('fr-FR')}\n🏢 Tenant: ${tenantId}`,
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
    ok: true,
    service: 'whatsapp-webhook',
    version: 'v2-multitenant',
    timestamp: new Date().toISOString(),
    events_supported: [
      'button_click',
      'text_message',
      'status_update'
    ]
  });
});

export default router;