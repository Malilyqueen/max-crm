/**
 * test-whatsapp-direct-twilio.js
 * Test DIRECT avec Twilio SDK sans passer par whatsappSendService
 * Pour tester le template OUI/NON avec 3 variables
 */

import dotenv from 'dotenv';
dotenv.config();

import twilio from 'twilio';

async function testDirectTwilio() {
  console.log('\n🧪 TEST DIRECT TWILIO - Template OUI/NON (3 VARIABLES)');
  console.log('='.repeat(80));

  // Vérifier les credentials
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

  console.log('🔍 Credentials Twilio:');
  console.log(`   ACCOUNT_SID: ${accountSid ? '✅ Défini' : '❌ Non défini'}`);
  console.log(`   AUTH_TOKEN: ${authToken ? '✅ Défini' : '❌ Non défini'}`);
  console.log(`   FROM: ${fromNumber}`);
  console.log('');

  if (!accountSid || !authToken) {
    console.error('❌ ERREUR: Credentials Twilio manquants !');
    return;
  }

  // Créer le client Twilio
  const client = twilio(accountSid, authToken);

  // Payload pour Twilio - Template OUI/NON avec 3 variables
  const twilioPayload = {
    from: fromNumber,
    to: 'whatsapp:+33648662734',  // Votre numéro qui a rejoint le Sandbox
    contentSid: 'HX8903819c78549d63782e7209d9ce8b8c',  // Template OUI/NON
    contentVariables: JSON.stringify({
      "1": "Lionel",
      "2": "lundi 16 décembre",
      "3": "14h30"
    })
  };

  console.log('📤 Payload Twilio:');
  console.log(JSON.stringify(twilioPayload, null, 2));
  console.log('');

  try {
    console.log('📡 Envoi du message via Twilio...\n');
    const twilioMessage = await client.messages.create(twilioPayload);

    console.log('✅ MESSAGE ENVOYÉ AVEC SUCCÈS !');
    console.log(`   Message SID: ${twilioMessage.sid}`);
    console.log(`   Status: ${twilioMessage.status}`);
    console.log(`   To: ${twilioMessage.to}`);
    console.log(`   From: ${twilioMessage.from}`);
    console.log('\n⏳ Vérifiez votre WhatsApp dans quelques secondes...');

  } catch (error) {
    console.error('\n❌ ERREUR lors de l\'envoi:');
    console.error(`   Message: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    console.error(`   Status: ${error.status}`);
    console.error(`   More Info: ${error.moreInfo}`);
    console.error('\n   Détails complets:');
    console.error(JSON.stringify(error, null, 2));
  }
}

// Exécution
testDirectTwilio();