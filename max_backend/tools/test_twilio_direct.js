#!/usr/bin/env node

/**
 * Script de test direct des credentials Twilio
 * Teste si les credentials Twilio fonctionnent correctement
 */

import twilio from 'twilio';

const accountSid = 'AC78ebc7238576304ae00fbe4df3a07f5e';
const authToken = '12a0e364fb468ea4b00ab07f7e09f6fe';
const fromNumber = 'whatsapp:+14155238886';

console.log('================================================================================');
console.log('🧪 TEST DIRECT TWILIO CREDENTIALS');
console.log('================================================================================\n');

console.log('📋 Configuration:');
console.log(`   Account SID: ${accountSid}`);
console.log(`   Auth Token: ${authToken.substring(0, 8)}...`);
console.log(`   From Number: ${fromNumber}`);
console.log('');

try {
  console.log('🔌 Initialisation du client Twilio...');
  const client = twilio(accountSid, authToken);

  console.log('✅ Client Twilio initialisé avec succès !');
  console.log('');
  console.log('📞 Test de connexion: récupération du compte...');

  // Tester la connexion en récupérant les infos du compte
  const account = await client.api.v2010.accounts(accountSid).fetch();

  console.log('✅ Connexion réussie !');
  console.log('');
  console.log('📋 Informations du compte:');
  console.log(`   Friendly Name: ${account.friendlyName}`);
  console.log(`   Status: ${account.status}`);
  console.log(`   Type: ${account.type}`);
  console.log('');

  console.log('================================================================================');
  console.log('✅ LES CREDENTIALS TWILIO SONT VALIDES !');
  console.log('================================================================================');
  console.log('');
  console.log('Vous pouvez maintenant redémarrer le serveur MAX pour utiliser ces credentials.');
  console.log('');

} catch (error) {
  console.error('❌ ERREUR lors du test Twilio:');
  console.error(`   Message: ${error.message}`);
  console.error(`   Code: ${error.code || 'N/A'}`);
  console.error(`   Status: ${error.status || 'N/A'}`);
  console.error('');
  console.error('Vérifiez que:');
  console.error('  1. L\'Account SID est correct (commence par AC...)');
  console.error('  2. L\'Auth Token est correct');
  console.error('  3. Vous avez un accès internet');
  console.error('  4. Votre compte Twilio est actif');
  console.error('');
  process.exit(1);
}
