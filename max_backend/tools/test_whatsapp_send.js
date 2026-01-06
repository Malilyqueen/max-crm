#!/usr/bin/env node

/**
 * Test d'envoi WhatsApp via Twilio et n8n
 */

// IMPORTANT: Charger dotenv AVANT d'importer les services
import 'dotenv/config';
import { trigger } from '../services/n8n.js';

console.log('================================================================================');
console.log('🧪 TEST ENVOI WHATSAPP - Twilio via n8n');
console.log('================================================================================\n');

console.log('📋 Configuration:');
console.log(`   Workflow: wf-relance-j3-whatsapp`);
console.log(`   URL: ${process.env.N8N_WEBHOOK_RELANCE_J3_WHATSAPP}`);
console.log(`   Numéro destinataire: +33648662734\n`);

const testPayload = {
  leadId: 'test-whatsapp-' + Date.now(),
  leadName: 'Test WhatsApp',
  leadEmail: 'test@macrea.fr',
  leadPhone: '+33648662734', // TON numéro (doit avoir rejoint le sandbox Twilio)
  messageSuggestion: '🚀 Test envoi WhatsApp depuis M.A.X. via n8n et Twilio!\n\nSi tu reçois ce message, l\'intégration fonctionne parfaitement!',
  canal: 'whatsapp',
  delayMinutes: 0, // Envoi immédiat pour le test
  actionType: 'test',
  detectedAt: new Date().toISOString()
};

console.log('📤 Payload à envoyer:');
console.log(JSON.stringify(testPayload, null, 2));
console.log('\n' + '='.repeat(80));
console.log('⏳ Envoi du webhook à n8n...\n');

try {
  const result = await trigger({
    code: 'wf-relance-j3-whatsapp',
    payload: testPayload,
    tenant: 'macrea',
    role: 'assistant',
    mode: 'test'
  });

  console.log('✅ SUCCÈS - Workflow déclenché!\n');
  console.log('📊 Résultat:');
  console.log(`   Run ID: ${result.runId}`);
  console.log(`   Status: ${result.status}`);
  if (result.response) {
    console.log(`   Response: ${JSON.stringify(result.response)}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎯 VÉRIFICATIONS:');
  console.log('='.repeat(80));
  console.log('1. Aller dans n8n: http://127.0.0.1:5678');
  console.log('2. Cliquer sur "Executions"');
  console.log(`3. Chercher l'exécution: ${result.runId}`);
  console.log('4. Attendre ~10 secondes (Wait node)');
  console.log('5. Vérifier que le node Twilio a bien envoyé le message');
  console.log('6. Tu devrais recevoir le WhatsApp sur +33648662734');
  console.log('\n⚠️  IMPORTANT: Ton numéro doit avoir rejoint le sandbox WhatsApp Twilio!');
  console.log('   Si pas encore fait: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn\n');

} catch (error) {
  console.error('❌ ERREUR lors du déclenchement:', error.message);
  if (error.details) {
    console.error('\n📋 Détails:', JSON.stringify(error.details, null, 2));
  }

  console.log('\n🔍 Vérifications à faire:');
  console.log('   1. n8n est-il démarré? (http://127.0.0.1:5678)');
  console.log('   2. Le workflow "wf-relance-j3-whatsapp" est-il actif?');
  console.log('   3. Les credentials Twilio sont-elles configurées dans n8n?');
  console.log('   4. La variable N8N_WEBHOOK_RELANCE_J3_WHATSAPP est-elle dans .env?');

  process.exit(1);
}
