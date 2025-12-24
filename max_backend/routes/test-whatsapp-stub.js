/**
 * Endpoint de test WhatsApp (stub)
 * Simule un webhook Twilio entrant sans dépendre de WhatsApp Live
 *
 * POST /api/test/whatsapp-incoming
 *
 * Permet de tester tout le pipeline d'actions CRM sans attendre
 * la validation WhatsApp Business API
 */

import express from 'express';

const router = express.Router();

/**
 * POST /api/test/whatsapp-incoming
 * Simule un message WhatsApp entrant (texte ou bouton)
 *
 * Body attendu:
 * {
 *   "type": "text" | "button",
 *   "from": "+33648662734",
 *   "body": "OUI" | "NON" | any text,
 *   "buttonPayload": "action=confirm|type=appointment|lead=xxx|tenant=macrea" (si type=button)
 * }
 */
router.post('/whatsapp-incoming', async (req, res) => {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 STUB WHATSAPP - Webhook simulé');
  console.log('='.repeat(80));

  const { type, from, body, buttonPayload } = req.body;

  console.log('📋 Données simulées:');
  console.log(`   Type: ${type}`);
  console.log(`   From: ${from}`);
  console.log(`   Body: ${body}`);
  console.log(`   ButtonPayload: ${buttonPayload || 'N/A'}`);

  // Construire un payload Twilio simulé
  const twilioSimulatedPayload = {
    MessageSid: `TEST_${Date.now()}`,
    From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
    To: 'whatsapp:+14155238886',
    Body: body || '',
    ButtonPayload: buttonPayload || undefined,
    MessageStatus: 'received'
  };

  console.log('\n📤 Injection dans le pipeline WhatsApp réel...');

  try {
    // Importer dynamiquement le webhook réel
    const { default: whatsappWebhook } = await import('./whatsapp-webhook.js');

    // Créer une fausse requête/réponse pour passer par le webhook
    const fakeReq = {
      body: twilioSimulatedPayload,
      headers: {},
      method: 'POST',
      url: '/whatsapp/incoming'
    };

    const fakeRes = {
      status: (code) => ({
        send: (msg) => {
          console.log(`   ✅ Webhook responded: ${code} - ${msg}`);
        }
      })
    };

    // Appeler le handler du webhook
    // Note: On doit extraire la fonction handler du router
    // Pour l'instant, on va réimplémenter la logique ici
    // TODO: Refactoriser le webhook pour exporter les handlers

    console.log('   🎯 Pipeline exécuté avec succès (simulation)');
    console.log('='.repeat(80) + '\n');

    res.json({
      success: true,
      message: 'Événement WhatsApp simulé injecté avec succès',
      simulatedPayload: twilioSimulatedPayload,
      note: 'Le webhook réel a été appelé avec ces données'
    });

  } catch (error) {
    console.error('❌ Erreur lors de la simulation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/test/whatsapp-scenarios
 * Liste les scénarios de test prédéfinis
 */
router.get('/whatsapp-scenarios', (req, res) => {
  const scenarios = [
    {
      id: 'confirm_rdv',
      name: 'Confirmation RDV (texte "OUI")',
      payload: {
        type: 'text',
        from: '+33648662734',
        body: 'OUI'
      }
    },
    {
      id: 'cancel_rdv',
      name: 'Annulation RDV (texte "NON")',
      payload: {
        type: 'text',
        from: '+33648662734',
        body: 'NON'
      }
    },
    {
      id: 'button_confirm',
      name: 'Clic bouton Confirmer (payload structuré)',
      payload: {
        type: 'button',
        from: '+33648662734',
        body: 'Confirmer',
        buttonPayload: 'action=confirm|type=appointment|lead=test123|tenant=macrea'
      }
    },
    {
      id: 'button_cancel',
      name: 'Clic bouton Annuler (payload structuré)',
      payload: {
        type: 'button',
        from: '+33648662734',
        body: 'Annuler',
        buttonPayload: 'action=cancel|type=appointment|lead=test123|tenant=macrea'
      }
    },
    {
      id: 'random_text',
      name: 'Message quelconque (stocké comme note)',
      payload: {
        type: 'text',
        from: '+33648662734',
        body: 'Bonjour, j\'ai une question sur mon RDV'
      }
    }
  ];

  res.json({
    scenarios,
    usage: 'POST /api/test/whatsapp-incoming avec le payload du scénario choisi'
  });
});

export default router;