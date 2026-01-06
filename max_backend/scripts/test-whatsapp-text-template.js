/**
 * test-whatsapp-text-template.js
 * Test avec un template TEXT simple (sans boutons) pour vérifier si le Sandbox fonctionne
 */

import dotenv from 'dotenv';
dotenv.config();

import twilio from 'twilio';

async function testTextTemplate() {
  console.log('\n🧪 TEST TEMPLATE TEXT SIMPLE (sans boutons)');
  console.log('='.repeat(80));

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

  const client = twilio(accountSid, authToken);

  // Utiliser le template TEXT MVP: appointment_confirm_text_v1
  const twilioPayload = {
    from: fromNumber,
    to: 'whatsapp:+33648662734',
    contentSid: 'HXb52bb079e24d459e6b3962a49213096e',  // Template TEXT MVP (fonctionne)
    contentVariables: JSON.stringify({
      "1": "Lionel",
      "2": "lundi 16 décembre 2025",
      "3": "14h30"
    })
  };

  console.log('📤 Payload Twilio (Template TEXT):');
  console.log(JSON.stringify(twilioPayload, null, 2));
  console.log('');

  try {
    console.log('📡 Envoi du message TEXT via Twilio...\n');
    const twilioMessage = await client.messages.create(twilioPayload);

    console.log('✅ MESSAGE ENVOYÉ AVEC SUCCÈS !');
    console.log(`   Message SID: ${twilioMessage.sid}`);
    console.log(`   Status: ${twilioMessage.status}`);
    console.log('\n⏳ Vérifiez votre WhatsApp dans quelques secondes...');

  } catch (error) {
    console.error('\n❌ ERREUR lors de l\'envoi:');
    console.error(`   Message: ${error.message}`);
    console.error(`   Code: ${error.code}`);
  }
}

testTextTemplate();