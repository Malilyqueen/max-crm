/**
 * test-whatsapp-simple-template.js
 * Test d'envoi du template OUI/NON simple avec 3 variables seulement
 * ContentSid: HX8903819c78549d63782e7209d9ce8b8c
 */

// IMPORTANT: Charger .env AVANT tous les imports pour que les services aient accès aux variables
import dotenv from 'dotenv';
dotenv.config();

import { getPresetByName } from '../config/whatsapp-message-presets.js';
import { sendWhatsAppMessage } from '../services/whatsappSendService.js';
import { WhatsAppMessage } from '../models/WhatsAppMessage.js';

async function testSimpleTemplate() {
  console.log('\n🧪 TEST TEMPLATE SIMPLE OUI/NON (3 VARIABLES)');
  console.log('='.repeat(80));
  console.log('ContentSid: HX8903819c78549d63782e7209d9ce8b8c');
  console.log('Variables: {{1}} prénom, {{2}} date, {{3}} heure');
  console.log('Boutons: OUI / NON (payload simple)');
  console.log('='.repeat(80) + '\n');

  // Debug: Vérifier que les variables d'environnement sont chargées
  console.log('🔍 DEBUG - Variables d\'environnement Twilio:');
  console.log(`   TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? 'Défini (longueur: ' + process.env.TWILIO_ACCOUNT_SID.length + ')' : 'NON DÉFINI'}`);
  console.log(`   TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? 'Défini (longueur: ' + process.env.TWILIO_AUTH_TOKEN.length + ')' : 'NON DÉFINI'}`);
  console.log(`   TWILIO_WHATSAPP_FROM: ${process.env.TWILIO_WHATSAPP_FROM || 'NON DÉFINI'}`);
  console.log('');

  // Charger le preset "Confirmation RDV - OUI/NON"
  const preset = getPresetByName('Confirmation RDV - OUI/NON');

  if (!preset) {
    console.error('❌ Preset "Confirmation RDV - OUI/NON" introuvable !');
    return;
  }

  console.log('✅ Preset trouvé:');
  console.log(`   ID: ${preset.id}`);
  console.log(`   ContentSid: ${preset.contentSid}`);
  console.log(`   Variables: ${preset.variables.join(', ')}`);
  console.log(`   Mode: ${preset.mode}`);
  console.log(`   Boutons: ${preset.buttons.length}`);
  console.log('');

  // Créer un WhatsAppMessage à partir du preset
  const whatsappMessage = new WhatsAppMessage({
    id: preset.id,
    tenantId: preset.tenantId,
    name: preset.name,
    type: preset.type,
    messageText: preset.messageText,
    variables: preset.variables,
    buttons: preset.buttons,
    contentSid: preset.contentSid,
    status: 'active'
  });

  // Sauvegarder le message en mémoire
  whatsappMessage.save();

  console.log('✅ WhatsAppMessage créé et sauvegardé avec ID:', whatsappMessage.id);
  console.log('');

  // Variables de test avec SEULEMENT les 3 variables du template
  const variableValues = {
    prenom: 'Lionel',
    date: 'lundi 16 décembre',
    heure: '14h30'
    // PAS de leadId ni tenantId ici !
  };

  try {
    console.log('📤 Envoi du message...\n');
    const result = await sendWhatsAppMessage(
      whatsappMessage.id,  // L'ID du WhatsAppMessage
      '+33767402920',  // Votre numéro WhatsApp (sans le préfixe whatsapp: - il sera ajouté automatiquement)
      null,  // Pas de leadId pour ce test simple
      variableValues  // Les valeurs des variables
    );

    console.log('\n✅ RÉSULTAT:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n🎉 Message envoyé avec succès !');
      console.log(`   Message SID: ${result.messageSid}`);
      console.log(`   Status: ${result.status}`);
      console.log('\n⏳ Vérifiez votre WhatsApp dans quelques secondes...');
    } else {
      console.log('\n❌ Échec de l\'envoi:');
      console.log(`   Erreur: ${result.error}`);
    }

  } catch (error) {
    console.error('\n❌ ERREUR LORS DU TEST:');
    console.error(error);
  }
}

// Exécution du test
testSimpleTemplate();