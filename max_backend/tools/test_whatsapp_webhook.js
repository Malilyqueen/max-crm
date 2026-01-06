#!/usr/bin/env node

/**
 * Test du webhook entrant WhatsApp
 * Simule les différents types de webhooks que Twilio peut envoyer
 */

import 'dotenv/config';

const WEBHOOK_URL = 'http://localhost:3005/api/whatsapp/incoming';

console.log('================================================================================');
console.log('🧪 TEST WEBHOOK WHATSAPP ENTRANT');
console.log('================================================================================\n');

console.log('📋 URL du webhook:', WEBHOOK_URL);
console.log('');

// ============================================================================
// TEST 1: Clic sur bouton "Confirm"
// ============================================================================
console.log('='.repeat(80));
console.log('TEST 1️⃣ : CLIC SUR BOUTON "CONFIRM"');
console.log('='.repeat(80));

const testButtonConfirm = {
  MessageSid: 'SM' + Date.now(),
  From: 'whatsapp:+33648662734',
  To: 'whatsapp:+14155238886',
  Body: 'Confirm',
  ButtonPayload: 'confirm|tenant=macrea|contact=lead-abc123|type=appointment'
};

console.log('📤 Payload envoyé:');
console.log(JSON.stringify(testButtonConfirm, null, 2));

try {
  const response1 = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testButtonConfirm)
  });

  const result1 = await response1.text();
  console.log(`\n✅ Statut: ${response1.status} ${response1.statusText}`);
  console.log(`📥 Réponse: ${result1}\n`);
} catch (error) {
  console.error(`❌ Erreur: ${error.message}\n`);
}

await new Promise(resolve => setTimeout(resolve, 1000));

// ============================================================================
// TEST 2: Clic sur bouton "Cancel"
// ============================================================================
console.log('='.repeat(80));
console.log('TEST 2️⃣ : CLIC SUR BOUTON "CANCEL"');
console.log('='.repeat(80));

const testButtonCancel = {
  MessageSid: 'SM' + Date.now(),
  From: 'whatsapp:+33648662734',
  To: 'whatsapp:+14155238886',
  Body: 'Cancel',
  ButtonPayload: 'cancel|tenant=macrea|contact=lead-xyz789|type=appointment'
};

console.log('📤 Payload envoyé:');
console.log(JSON.stringify(testButtonCancel, null, 2));

try {
  const response2 = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testButtonCancel)
  });

  const result2 = await response2.text();
  console.log(`\n✅ Statut: ${response2.status} ${response2.statusText}`);
  console.log(`📥 Réponse: ${result2}\n`);
} catch (error) {
  console.error(`❌ Erreur: ${error.message}\n`);
}

await new Promise(resolve => setTimeout(resolve, 1000));

// ============================================================================
// TEST 3: Message texte libre
// ============================================================================
console.log('='.repeat(80));
console.log('TEST 3️⃣ : MESSAGE TEXTE LIBRE');
console.log('='.repeat(80));

const testTextMessage = {
  MessageSid: 'SM' + Date.now(),
  From: 'whatsapp:+33648662734',
  To: 'whatsapp:+14155238886',
  Body: 'Bonjour, je voudrais plus d\'informations sur vos services'
};

console.log('📤 Payload envoyé:');
console.log(JSON.stringify(testTextMessage, null, 2));

try {
  const response3 = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testTextMessage)
  });

  const result3 = await response3.text();
  console.log(`\n✅ Statut: ${response3.status} ${response3.statusText}`);
  console.log(`📥 Réponse: ${result3}\n`);
} catch (error) {
  console.error(`❌ Erreur: ${error.message}\n`);
}

await new Promise(resolve => setTimeout(resolve, 1000));

// ============================================================================
// TEST 4: Statut de livraison
// ============================================================================
console.log('='.repeat(80));
console.log('TEST 4️⃣ : STATUT DE LIVRAISON');
console.log('='.repeat(80));

const testDeliveryStatus = {
  MessageSid: 'SM' + Date.now(),
  MessageStatus: 'delivered',
  From: 'whatsapp:+14155238886',
  To: 'whatsapp:+33648662734'
};

console.log('📤 Payload envoyé:');
console.log(JSON.stringify(testDeliveryStatus, null, 2));

try {
  const response4 = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testDeliveryStatus)
  });

  const result4 = await response4.text();
  console.log(`\n✅ Statut: ${response4.status} ${response4.statusText}`);
  console.log(`📥 Réponse: ${result4}\n`);
} catch (error) {
  console.error(`❌ Erreur: ${error.message}\n`);
}

// ============================================================================
// TEST 5: Endpoint de santé
// ============================================================================
console.log('='.repeat(80));
console.log('TEST 5️⃣ : ENDPOINT DE SANTÉ');
console.log('='.repeat(80));

try {
  const response5 = await fetch('http://localhost:3005/api/whatsapp/status', {
    method: 'GET'
  });

  const result5 = await response5.json();
  console.log(`✅ Statut: ${response5.status} ${response5.statusText}`);
  console.log('📥 Réponse:', JSON.stringify(result5, null, 2));
} catch (error) {
  console.error(`❌ Erreur: ${error.message}`);
}

console.log('\n' + '='.repeat(80));
console.log('✅ TOUS LES TESTS TERMINÉS');
console.log('='.repeat(80));
console.log('\n📝 Prochaines étapes:');
console.log('1. Vérifier les logs du serveur M.A.X. pour voir les détails du traitement');
console.log('2. Configurer l\'URL du webhook dans Twilio:');
console.log('   https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox');
console.log('3. Utiliser ngrok pour exposer le webhook en production:');
console.log('   ngrok http 3005');
console.log('   Puis configurer: https://YOUR_NGROK_URL/api/whatsapp/incoming\n');
