/**
 * TEST N8N WORKFLOW - wf-relance-j3
 *
 * Ce script teste l'intégration complète M.A.X. → n8n
 */

// IMPORTANT: Charger dotenv AVANT d'importer les services
import 'dotenv/config';
import { trigger } from '../services/n8n.js';

console.log('='.repeat(80));
console.log('🧪 TEST N8N WORKFLOW - wf-relance-j3');
console.log('='.repeat(80) + '\n');

// Vérifier que le webhook est configuré
console.log('📋 Vérification de la configuration:\n');
console.log(`N8N_BASE: ${process.env.N8N_BASE || '❌ NON CONFIGURÉ'}`);
console.log(`N8N_WEBHOOK_RELANCE_J3: ${process.env.N8N_WEBHOOK_RELANCE_J3 || '❌ NON CONFIGURÉ'}`);
console.log(`N8N_WEBHOOK_SECRET: ${process.env.N8N_WEBHOOK_SECRET ? '✅ Configuré' : '⚠️  Non configuré (optionnel)'}\n`);

if (!process.env.N8N_WEBHOOK_RELANCE_J3) {
  console.error('❌ ERREUR: N8N_WEBHOOK_RELANCE_J3 non configuré dans .env');
  console.error('\nAjouter dans .env:');
  console.error('N8N_WEBHOOK_RELANCE_J3=http://127.0.0.1:5678/webhook/wf-relance-j3\n');
  process.exit(1);
}

console.log('='.repeat(80));
console.log('🚀 Démarrage du test...\n');

async function testWorkflow() {
  const testPayload = {
    leadId: 'test-lead-' + Date.now(),
    messageSuggestion: 'Bonjour, je reviens vers vous concernant votre demande de site web. Êtes-vous disponible cette semaine pour en discuter ?',
    canal: 'whatsapp',
    delayMinutes: 5,
    leadName: 'Test Lead',
    leadEmail: 'test@example.com',
    leadPhone: '+33612345678'
  };

  console.log('📤 Payload à envoyer:');
  console.log(JSON.stringify(testPayload, null, 2));
  console.log('\n' + '-'.repeat(80) + '\n');

  try {
    console.log('⏳ Envoi de la requête à n8n...\n');

    const result = await trigger({
      code: 'wf-relance-j3',
      payload: testPayload,
      tenant: 'default',
      role: 'admin',
      mode: 'assist'
    });

    console.log('✅ SUCCÈS - Workflow déclenché!\n');
    console.log('📊 Résultat:');
    console.log(`   Run ID: ${result.runId}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Response: ${result.text}\n`);

    console.log('='.repeat(80));
    console.log('🎯 PROCHAINES ÉTAPES:');
    console.log('='.repeat(80));
    console.log('1. Aller dans n8n: http://127.0.0.1:5678');
    console.log('2. Cliquer sur "Executions" dans le menu');
    console.log('3. Vous devriez voir une exécution "wf-relance-j3" en cours');
    console.log('4. Attendre 5 minutes pour voir le workflow se terminer');
    console.log('5. Vérifier que le node "Test Log" a bien reçu les données\n');

  } catch (error) {
    console.error('❌ ERREUR lors du test:\n');
    console.error(`   Message: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}\n`);

    if (error.message.includes('ECONNREFUSED')) {
      console.error('💡 SOLUTION: Vérifier que n8n est bien démarré:');
      console.error('   1. Ouvrir un terminal');
      console.error('   2. Exécuter: n8n start');
      console.error('   3. Vérifier que n8n est accessible sur http://127.0.0.1:5678\n');
    } else if (error.message.includes('404')) {
      console.error('💡 SOLUTION: Vérifier que le workflow est bien créé et activé dans n8n');
      console.error('   1. Aller sur http://127.0.0.1:5678');
      console.error('   2. Importer le workflow depuis: n8n_workflows/wf-relance-j3.json');
      console.error('   3. Activer le workflow (toggle en haut à droite)\n');
    }

    console.error('📚 Consulter le guide: docs/N8N_INSTALLATION_GUIDE.md\n');
    process.exit(1);
  }
}

// Test avec mode mock si n8n pas configuré
async function testMockMode() {
  console.log('⚠️  Mode MOCK activé (n8n non configuré)\n');
  console.log('Le système va simuler un déclenchement de workflow.\n');

  try {
    const result = await trigger({
      code: 'wf-relance-j3',
      payload: {
        leadId: 'mock-lead-123',
        messageSuggestion: 'Test message',
        canal: 'whatsapp'
      },
      tenant: 'default',
      role: 'admin',
      mode: 'assist'
    });

    console.log('✅ Mode MOCK fonctionne correctement\n');
    console.log('📊 Résultat mock:');
    console.log(`   Run ID: ${result.runId}`);
    console.log(`   Status: ${result.status}\n`);

    console.log('💡 Pour tester avec un VRAI workflow n8n:');
    console.log('   1. Installer n8n: npm install -g n8n');
    console.log('   2. Démarrer n8n: n8n start');
    console.log('   3. Configurer N8N_WEBHOOK_RELANCE_J3 dans .env');
    console.log('   4. Relancer ce test\n');

  } catch (error) {
    console.error('❌ Erreur même en mode mock:', error.message);
    process.exit(1);
  }
}

// Exécution
(async () => {
  if (process.env.N8N_WEBHOOK_RELANCE_J3) {
    await testWorkflow();
  } else {
    await testMockMode();
  }
})();
