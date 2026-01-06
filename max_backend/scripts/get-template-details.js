/**
 * Récupère les détails exacts d'un Content Template Twilio
 */

import twilio from 'twilio';
import 'dotenv/config';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const contentSid = 'HXd70815ab2465aaed6ab72fde5018021a'; // Template PRIORITAIRE

if (!accountSid || !authToken) {
  console.error('❌ TWILIO_ACCOUNT_SID et TWILIO_AUTH_TOKEN requis');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

console.log('\n' + '='.repeat(80));
console.log('📋 DÉTAILS DU TEMPLATE TWILIO');
console.log('='.repeat(80));
console.log(`   ContentSid: ${contentSid}`);
console.log('='.repeat(80) + '\n');

try {
  const content = await client.content.v1.contents(contentSid).fetch();

  console.log('📝 Informations générales:');
  console.log(`   Friendly Name: ${content.friendlyName}`);
  console.log(`   Language: ${content.language}`);
  console.log(`   Date créé: ${content.dateCreated}`);
  console.log(`   Date mis à jour: ${content.dateUpdated}`);

  console.log('\n📦 Types de contenu disponibles:');
  console.log(`   ${Object.keys(content.types).join(', ')}`);

  // Afficher les détails de chaque type
  for (const [typeName, typeData] of Object.entries(content.types)) {
    console.log(`\n🔹 Type: ${typeName}`);
    console.log(JSON.stringify(typeData, null, 2));
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Template récupéré avec succès');
  console.log('='.repeat(80) + '\n');

} catch (error) {
  console.error('❌ Erreur:', error.message);
  console.error('   Code:', error.code);
  console.error('   Status:', error.status);

  if (error.code === 20404) {
    console.error('\n⚠️  Le ContentSid n\'existe pas ou n\'est pas accessible');
  }

  process.exit(1);
}