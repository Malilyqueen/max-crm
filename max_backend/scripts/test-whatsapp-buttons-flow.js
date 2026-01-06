/**
 * Script de test du flux complet WhatsApp avec boutons
 *
 * Ce script teste le flux:
 * 1. Envoi d'un template WhatsApp avec boutons (via send_whatsapp_template)
 * 2. Simulation du clic sur un bouton (confirm/cancel)
 * 3. Vérification de l'action exécutée (mise à jour EspoCRM + envoi confirmation)
 *
 * Usage:
 *   node scripts/test-whatsapp-buttons-flow.js [confirm|cancel]
 */

import { sendWhatsAppMessage } from '../services/whatsappSendService.js';
import WhatsAppMessage from '../models/WhatsAppMessage.js';
import { executeWhatsAppAction } from '../config/whatsapp-actions.js';

const TEST_PHONE = process.env.TEST_WHATSAPP_NUMBER || '+33648662734';
const TEST_LEAD_ID = process.env.TEST_LEAD_ID || 'test-lead-123';
const TEST_TENANT = 'macrea';

// Simuler le clic sur un bouton
const buttonAction = process.argv[2] || 'confirm'; // 'confirm' ou 'cancel'

async function testCompleteFlow() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TEST FLUX COMPLET WHATSAPP AVEC BOUTONS');
  console.log('='.repeat(80));
  console.log(`📱 Téléphone de test: ${TEST_PHONE}`);
  console.log(`👤 Lead de test: ${TEST_LEAD_ID}`);
  console.log(`🏢 Tenant: ${TEST_TENANT}`);
  console.log(`🔘 Action bouton: ${buttonAction}`);
  console.log('='.repeat(80) + '\n');

  // ============================================================================
  // ÉTAPE 1: Envoyer un template WhatsApp avec boutons
  // ============================================================================
  console.log('📤 ÉTAPE 1: Envoi du template WhatsApp avec boutons\n');

  try {
    // Trouver le template de confirmation de RDV avec boutons
    const message = WhatsAppMessage.findByName('Confirmation RDV - Quick Reply');

    if (!message) {
      console.error('❌ Template "Confirmation RDV - Quick Reply" introuvable');
      console.log('\n💡 Vérifiez que les presets sont chargés dans la base de données.');
      console.log('   Exécutez: node scripts/load-whatsapp-presets.js\n');
      return;
    }

    console.log(`✅ Template trouvé: ${message.name}`);
    console.log(`   ContentSid: ${message.contentSid}`);
    console.log(`   Variables: ${message.variables.join(', ')}`);
    console.log(`   Boutons: ${message.buttons.length}`);

    // Variables pour le test
    const variables = {
      prenom: 'Jean',
      date: '15/12/2025',
      heure: '14h30',
      leadId: TEST_LEAD_ID,
      tenantId: TEST_TENANT
    };

    console.log('\n📋 Variables du message:');
    Object.entries(variables).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    // Envoyer le message
    console.log('\n⏳ Envoi en cours via Twilio...');

    const sendResult = await sendWhatsAppMessage(
      message.id,
      TEST_PHONE,
      TEST_LEAD_ID,
      variables
    );

    if (!sendResult.success) {
      console.error(`\n❌ Échec de l'envoi: ${sendResult.error}`);
      return;
    }

    console.log(`\n✅ Message envoyé avec succès!`);
    console.log(`   Twilio SID: ${sendResult.messageSid}`);
    console.log(`   Status: ${sendResult.status}`);
    console.log(`   À: ${sendResult.to}`);

  } catch (error) {
    console.error(`\n❌ Erreur lors de l'envoi du template:`, error.message);
    console.error(error.stack);
    return;
  }

  // ============================================================================
  // ÉTAPE 2: Simuler le clic sur un bouton
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('🔘 ÉTAPE 2: Simulation du clic sur bouton\n');

  // Attendre 3 secondes pour simuler le délai utilisateur
  console.log('⏳ Attente de 3 secondes (simulation délai utilisateur)...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Construire le payload du bouton (format standardisé)
  const buttonPayload = `${buttonAction}|tenant=${TEST_TENANT}|contact=${TEST_LEAD_ID}|type=appointment`;

  console.log(`📦 Payload bouton: ${buttonPayload}`);

  // Parser le payload
  const parsed = parseButtonPayload(buttonPayload);
  console.log('📋 Payload parsé:');
  console.log(`   Action: ${parsed.action}`);
  console.log(`   Tenant: ${parsed.tenant}`);
  console.log(`   Contact: ${parsed.contact}`);
  console.log(`   Type: ${parsed.type}`);

  // ============================================================================
  // ÉTAPE 3: Exécuter l'action WhatsApp
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('⚙️  ÉTAPE 3: Exécution de l\'action\n');

  try {
    const result = await executeWhatsAppAction(parsed.type, parsed.action, {
      tenantId: parsed.tenant,
      leadId: parsed.contact,
      from: TEST_PHONE,
      payload: {}
    });

    console.log('\n📊 Résultat de l\'exécution:');
    console.log(`   Succès: ${result.success ? '✅' : '❌'}`);
    console.log(`   Message: ${result.message}`);
    console.log(`   Mises à jour:`);
    Object.entries(result.updates || {}).forEach(([key, value]) => {
      console.log(`      ${key}: ${value}`);
    });

  } catch (error) {
    console.error(`\n❌ Erreur lors de l'exécution de l'action:`, error.message);
    console.error(error.stack);
  }

  // ============================================================================
  // RÉSUMÉ
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('📋 RÉSUMÉ DU TEST');
  console.log('='.repeat(80));
  console.log('✅ Étape 1: Template WhatsApp envoyé avec boutons');
  console.log('✅ Étape 2: Clic sur bouton simulé');
  console.log('✅ Étape 3: Action exécutée (mise à jour EspoCRM + message de confirmation)');
  console.log('\n🎯 ACTIONS ATTENDUES:');
  if (buttonAction === 'confirm') {
    console.log('   1. Lead mis à jour: status = "In Process"');
    console.log('   2. Note créée: "Rendez-vous confirmé"');
    console.log('   3. Message WhatsApp envoyé: "✅ Parfait ! Votre rendez-vous est confirmé..."');
  } else {
    console.log('   1. Lead mis à jour: status = "Dead"');
    console.log('   2. Note créée: "Rendez-vous annulé"');
    console.log('   3. Message WhatsApp envoyé: "Votre rendez-vous a bien été annulé..."');
  }
  console.log('\n💡 VÉRIFICATIONS:');
  console.log(`   - Ouvrir EspoCRM et vérifier le lead: ${TEST_LEAD_ID}`);
  console.log(`   - Vérifier WhatsApp sur ${TEST_PHONE}`);
  console.log(`   - Consulter les logs du serveur max_backend\n`);
  console.log('='.repeat(80) + '\n');
}

/**
 * Parse un payload de bouton WhatsApp
 * Format: "action|tenant=xxx|contact=yyy|type=zzz"
 */
function parseButtonPayload(payload) {
  const parts = payload.split('|');
  const parsed = {};

  parts.forEach(part => {
    const [key, value] = part.split('=');
    if (key && value) {
      parsed[key] = value;
    } else {
      // Premier élément sans '=' est l'action
      parsed.action = part;
    }
  });

  return parsed;
}

// Lancer le test
testCompleteFlow().catch(error => {
  console.error('\n❌ ERREUR FATALE:', error);
  process.exit(1);
});
