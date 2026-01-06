/**
 * Vérifie le statut d'approbation WhatsApp d'un template
 */

import dotenv from 'dotenv';
dotenv.config();

import twilio from 'twilio';

const contentSid = 'HX8903819c78549d63782e7209d9ce8b8c';  // Template OUI/NON

async function checkApprovalStatus() {
  console.log('\n🔍 VÉRIFICATION STATUT D\'APPROBATION WHATSAPP');
  console.log('='.repeat(80));
  console.log(`   ContentSid: ${contentSid}`);
  console.log('='.repeat(80) + '\n');

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  try {
    // Récupérer le template
    const content = await client.content.v1.contents(contentSid).fetch();

    console.log('📝 Template Info:');
    console.log(`   Name: ${content.friendlyName}`);
    console.log(`   Language: ${content.language}`);
    console.log(`   Type: ${Object.keys(content.types).join(', ')}`);
    console.log('');

    // Vérifier si le content a un champ approval_status (WhatsApp)
    console.log('📊 Détails complets du content:');
    console.log(JSON.stringify(content, null, 2));

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.code === 20404) {
      console.error('   Le template n\'existe plus ou n\'est pas accessible');
    }
  }
}

checkApprovalStatus();