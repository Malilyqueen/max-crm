/**
 * Vérifie le statut d'un message Twilio
 */

import twilio from 'twilio';
import 'dotenv/config';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const messageSid = 'MM743a5520cd969d90ee463c5dea1382ae'; // SID du premier message

if (!accountSid || !authToken) {
  console.error('❌ TWILIO_ACCOUNT_SID et TWILIO_AUTH_TOKEN requis');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

console.log('\n' + '='.repeat(80));
console.log('📊 VÉRIFICATION STATUT MESSAGE TWILIO');
console.log('='.repeat(80));
console.log(`   Message SID: ${messageSid}`);
console.log('='.repeat(80) + '\n');

try {
  const message = await client.messages(messageSid).fetch();

  console.log('📋 Détails du message:');
  console.log(`   Status: ${message.status}`);
  console.log(`   From: ${message.from}`);
  console.log(`   To: ${message.to}`);
  console.log(`   Date créé: ${message.dateCreated}`);
  console.log(`   Date envoyé: ${message.dateSent || 'N/A'}`);
  console.log(`   Date mis à jour: ${message.dateUpdated}`);
  console.log(`   Direction: ${message.direction}`);
  console.log(`   Prix: ${message.price || 'N/A'} ${message.priceUnit || ''}`);

  if (message.errorCode) {
    console.log(`\n❌ ERREUR:`);
    console.log(`   Code: ${message.errorCode}`);
    console.log(`   Message: ${message.errorMessage}`);
  } else {
    console.log(`\n✅ Pas d'erreur`);
  }

  console.log(`\n📝 Body: ${message.body || 'N/A'}`);
  console.log(`   Num Media: ${message.numMedia}`);
  console.log(`   Num Segments: ${message.numSegments}`);

  console.log('\n' + '='.repeat(80));
  console.log(`📊 STATUT: ${message.status}`);
  console.log('='.repeat(80) + '\n');

  // Légende des status
  console.log('Légende des statuts:');
  console.log('  - queued: En attente d\'envoi');
  console.log('  - sending: En cours d\'envoi');
  console.log('  - sent: Envoyé');
  console.log('  - delivered: Livré');
  console.log('  - undelivered: Non livré');
  console.log('  - failed: Échec');
  console.log('  - read: Lu par le destinataire\n');

} catch (error) {
  console.error('❌ Erreur:', error.message);
  console.error('   Code:', error.code);
  console.error('   Status:', error.status);
  process.exit(1);
}