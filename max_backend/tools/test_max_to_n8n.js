#!/usr/bin/env node

/**
 * Test de l'intégration M.A.X. → n8n
 * Simule M.A.X. déclenchant un workflow via l'API backend
 */

// IMPORTANT: Charger dotenv AVANT d'importer les services
import 'dotenv/config';
import { trigger } from '../services/n8n.js';

console.log('================================================================================');
console.log('🧪 TEST INTÉGRATION M.A.X. → n8n');
console.log('================================================================================\n');

// Simuler un lead détecté par M.A.X.
const testLead = {
  id: '67890abcdef',
  name: 'Jean Dupont',
  email: 'jean.dupont@example.com',
  phone: '+33612345678',
  status: 'New',
  createdAt: new Date().toISOString()
};

// Simuler la suggestion de M.A.X.
const maxSuggestion = {
  action: 'relance',
  delayDays: 3,
  canal: 'whatsapp',
  message: 'Bonjour Jean, je reviens vers vous concernant votre demande de création de site web. Avez-vous eu le temps d\'y réfléchir ?'
};

console.log('📋 Lead détecté par M.A.X.:');
console.log(JSON.stringify(testLead, null, 2));
console.log('\n💡 Suggestion de M.A.X.:');
console.log(JSON.stringify(maxSuggestion, null, 2));

console.log('\n' + '='.repeat(80));
console.log('🚀 M.A.X. déclenche le workflow wf-relance-j3...\n');

// Payload à envoyer à n8n
const workflowPayload = {
  leadId: testLead.id,
  leadName: testLead.name,
  leadEmail: testLead.email,
  leadPhone: testLead.phone,
  messageSuggestion: maxSuggestion.message,
  canal: maxSuggestion.canal,
  delayMinutes: maxSuggestion.delayDays * 24 * 60, // Convertir jours en minutes
  actionType: maxSuggestion.action,
  detectedAt: new Date().toISOString()
};

try {
  // Appeler le service n8n (comme M.A.X. le ferait)
  const result = await trigger({
    code: 'wf-relance-j3',
    payload: workflowPayload,
    tenant: 'macrea',
    role: 'assistant',
    mode: 'assist' // Mode assist: M.A.X. propose, humain valide
  });

  console.log('✅ SUCCÈS - Workflow déclenché via M.A.X.!\n');
  console.log('📊 Résultat:');
  console.log(`   Run ID: ${result.runId}`);
  console.log(`   Status: ${result.status}`);
  console.log(`   Response: ${JSON.stringify(result.response)}`);

  console.log('\n' + '='.repeat(80));
  console.log('🎯 VÉRIFICATION:');
  console.log('='.repeat(80));
  console.log('1. Aller dans n8n: http://127.0.0.1:5678');
  console.log('2. Cliquer sur "Executions"');
  console.log(`3. Chercher l'exécution: ${result.runId}`);
  console.log('4. Attendre 5-10 secondes');
  console.log('5. Vérifier que le "Test Log" contient les données du lead');
  console.log('\n✨ L\'intégration M.A.X. → n8n fonctionne!\n');

} catch (error) {
  console.error('❌ ERREUR lors du déclenchement:', error.message);
  if (error.details) {
    console.error('\n📋 Détails:', JSON.stringify(error.details, null, 2));
  }
  process.exit(1);
}
