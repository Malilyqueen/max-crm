/**
 * Test du template Confirmer/Annuler avec 3 variables body
 */

import dotenv from 'dotenv';
dotenv.config();

import twilio from 'twilio';

async function testTemplate() {
  console.log('\n🧪 TEST TEMPLATE CONFIRMER/ANNULER (3 VARIABLES BODY)');
  console.log('='.repeat(80));

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  // Template avec boutons Confirmer/Annuler
  // Body a 3 variables: {{1}}, {{2}}, {{3}}
  // Boutons ont {{4}} et {{5}} mais ce sont des payloads, pas des variables body
  const twilioPayload = {
    from: process.env.TWILIO_WHATSAPP_FROM,
    to: 'whatsapp:+33648662734',
    contentSid: 'HXd70815ab2465aaed6ab72fde5018021a',  // Template Confirmer/Annuler
    contentVariables: JSON.stringify({
      "1": "Lionel",
      "2": "16 décembre",
      "3": "14h30"
      // PAS de {{4}} ni {{5}} car ce sont dans les payloads des boutons, pas dans le body
    })
  };

  console.log('📤 Payload:');
  console.log(JSON.stringify(twilioPayload, null, 2));
  console.log('');

  try {
    const msg = await client.messages.create(twilioPayload);
    console.log('✅ Envoyé ! SID:', msg.sid);
    console.log('   Status:', msg.status);

    // Attendre et vérifier
    await new Promise(resolve => setTimeout(resolve, 5000));
    const status = await client.messages(msg.sid).fetch();
    console.log('\n📊 Statut après 5s:', status.status);
    if (status.errorCode) {
      console.log('❌ Error Code:', status.errorCode);
    } else {
      console.log('✅ Pas d\'erreur - vérifiez votre WhatsApp !');
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message, '- Code:', error.code);
  }
}

testTemplate();