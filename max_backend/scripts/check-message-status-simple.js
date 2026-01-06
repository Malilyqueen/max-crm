/**
 * check-message-status-simple.js
 * Vérifie le statut d'un message Twilio
 */

import dotenv from 'dotenv';
dotenv.config();

import twilio from 'twilio';

const messageSid = 'MM9114336bea2de0d3943f832f640727cc';  // Le SID du message envoyé

async function checkStatus() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  const client = twilio(accountSid, authToken);

  try {
    const message = await client.messages(messageSid).fetch();

    console.log('\n📊 STATUT DU MESSAGE');
    console.log('='.repeat(80));
    console.log(`   SID: ${message.sid}`);
    console.log(`   Status: ${message.status}`);
    console.log(`   To: ${message.to}`);
    console.log(`   From: ${message.from}`);
    console.log(`   Date Created: ${message.dateCreated}`);
    console.log(`   Date Sent: ${message.dateSent}`);
    console.log(`   Error Code: ${message.errorCode || 'Aucun'}`);
    console.log(`   Error Message: ${message.errorMessage || 'Aucun'}`);
    console.log('='.repeat(80) + '\n');

    if (message.status === 'delivered') {
      console.log('✅ Message livré avec succès !');
    } else if (message.status === 'sent') {
      console.log('✅ Message envoyé (en attente de livraison)');
    } else if (message.status === 'queued') {
      console.log('⏳ Message en file d\'attente...');
    } else if (message.status === 'failed') {
      console.log(`❌ Message échoué - Code erreur: ${message.errorCode}`);
      console.log(`   Message d'erreur: ${message.errorMessage}`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

checkStatus();