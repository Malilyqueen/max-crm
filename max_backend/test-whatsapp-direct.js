/**
 * Test direct du service WhatsApp avec le template PRIORITAIRE
 * Objectif: Vérifier le payload exact envoyé à Twilio pour debugger l'erreur 63027
 */

import { sendWhatsAppMessage } from './services/whatsappSendService.js';
import WhatsAppMessage from './models/WhatsAppMessage.js';
import { WHATSAPP_MESSAGE_PRESETS } from './config/whatsapp-message-presets.js';

console.log('\n' + '='.repeat(80));
console.log('🧪 TEST DIRECT WHATSAPP - Template PRIORITAIRE');
console.log('='.repeat(80));

// Charger les presets en mémoire
console.log('\n📦 Chargement des presets...');
WHATSAPP_MESSAGE_PRESETS.forEach(preset => {
  WhatsAppMessage.create({
    id: preset.id,
    tenantId: preset.tenantId,
    name: preset.name,
    type: preset.type,
    templateName: preset.templateName,
    contentSid: preset.contentSid,
    variables: preset.variables,
    mode: preset.mode,
    buttons: preset.buttons || [],
    messageText: preset.messageText,
    status: 'active',
    metadata: {
      description: preset.description,
      payloadEncoding: preset.payloadEncoding || false,
      payloadSchema: preset.payloadSchema || null
    }
  });
});
console.log(`   ✅ ${WHATSAPP_MESSAGE_PRESETS.length} presets chargés`);

// Récupérer le template par son nom
const template = WhatsAppMessage.findByName('Confirmation RDV - Quick Reply');

if (!template) {
  console.error('❌ Template "Confirmation RDV - Quick Reply" introuvable');
  process.exit(1);
}

console.log(`\n📋 Template trouvé:`);
console.log(`   ID: ${template.id}`);
console.log(`   Name: ${template.name}`);
console.log(`   ContentSid: ${template.contentSid}`);
console.log(`   Variables: ${template.variables.join(', ')}`);

// Paramètres du test
const testParams = {
  messageId: template.id,
  toPhoneNumber: '+33648662734',
  leadId: '69272eee2a489f7a6',
  variableValues: {
    prenom: 'Malala',
    date: '20/12/2025',
    heure: '15h',
    leadId: '69272eee2a489f7a6',
    tenantId: 'macrea'
  }
};

console.log(`\n📤 Paramètres du test:`);
console.log(`   To: ${testParams.toPhoneNumber}`);
console.log(`   Lead: ${testParams.leadId}`);
console.log(`   Variables:`, testParams.variableValues);

console.log('\n' + '='.repeat(80));
console.log('🚀 LANCEMENT DU TEST...');
console.log('='.repeat(80) + '\n');

// Appeler le service
try {
  const result = await sendWhatsAppMessage(
    testParams.messageId,
    testParams.toPhoneNumber,
    testParams.leadId,
    testParams.variableValues
  );

  console.log('\n' + '='.repeat(80));
  console.log('📊 RÉSULTAT:');
  console.log('='.repeat(80));
  console.log(JSON.stringify(result, null, 2));
  console.log('='.repeat(80) + '\n');

  if (result.success) {
    console.log('✅ TEST RÉUSSI!');
    process.exit(0);
  } else {
    console.log('❌ TEST ÉCHOUÉ:', result.error);
    process.exit(1);
  }

} catch (error) {
  console.error('\n❌ ERREUR LORS DU TEST:', error);
  console.error('   Message:', error.message);
  console.error('   Stack:', error.stack);
  process.exit(1);
}