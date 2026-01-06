/**
 * Liste tous les templates WhatsApp approuvés dans Twilio
 * Objectif: Vérifier quels ContentSids sont valides et leurs configurations
 */

import twilio from 'twilio';
import 'dotenv/config';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  console.error('❌ TWILIO_ACCOUNT_SID et TWILIO_AUTH_TOKEN requis dans .env');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

console.log('\n' + '='.repeat(80));
console.log('📋 LISTE DES TEMPLATES WHATSAPP TWILIO');
console.log('='.repeat(80));
console.log(`   Account SID: ${accountSid}`);
console.log('='.repeat(80) + '\n');

try {
  // Récupérer tous les Content Templates
  const contents = await client.content.v1.contents.list({ limit: 50 });

  console.log(`✅ ${contents.length} templates trouvés\n`);

  contents.forEach((content, index) => {
    console.log(`${index + 1}. ${content.friendlyName || 'Sans nom'}`);
    console.log(`   SID: ${content.sid}`);
    console.log(`   Language: ${content.language || 'N/A'}`);
    console.log(`   Date: ${content.dateCreated}`);

    // Afficher les types de contenu
    if (content.types) {
      console.log(`   Types:`, Object.keys(content.types));

      // Si c'est un template WhatsApp
      if (content.types['twilio/quick-reply-buttons']) {
        console.log(`   📱 Quick Reply Buttons détecté`);
        const qr = content.types['twilio/quick-reply-buttons'];
        if (qr.body) {
          console.log(`   Body: ${qr.body.substring(0, 100)}...`);
        }
        if (qr.actions) {
          console.log(`   Actions: ${qr.actions.length} boutons`);
        }
      }

      if (content.types['twilio/text']) {
        console.log(`   📝 Text template`);
        const text = content.types['twilio/text'];
        if (text.body) {
          console.log(`   Body: ${text.body.substring(0, 100)}...`);
        }
      }
    }

    console.log('');
  });

  console.log('='.repeat(80));
  console.log(`✅ Total: ${contents.length} templates`);
  console.log('='.repeat(80) + '\n');

} catch (error) {
  console.error('❌ Erreur lors de la récupération des templates:', error);
  console.error('   Message:', error.message);
  console.error('   Code:', error.code);
  console.error('   Status:', error.status);
  process.exit(1);
}