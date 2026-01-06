/**
 * Test Direct Enrichissement 100%
 * Teste directement batchAnalyzeLeads sans passer par l'API chat
 */

import { batchAnalyzeLeads } from './lib/emailAnalyzer.js';

// Leads de test (simulant les 37 leads sans secteur)
const testLeads = [
  // 1. Lead avec email
  {
    id: 'test_001',
    name: 'Restaurant La Bella',
    emailAddress: 'contact@labella.fr',
    phoneNumber: null,
    description: null
  },
  // 2. Lead avec téléphone uniquement
  {
    id: 'test_002',
    name: 'Transport Express',
    emailAddress: null,
    phoneNumber: '+33612345678',
    description: 'Transport de marchandises'
  },
  // 3. Lead avec description uniquement
  {
    id: 'test_003',
    name: 'Menuiserie Dubois',
    emailAddress: null,
    phoneNumber: null,
    description: 'Fabrication de meubles sur mesure'
  },
  // 4. Lead avec uniquement nom
  {
    id: 'test_004',
    name: 'Garage Automobile Martin',
    emailAddress: null,
    phoneNumber: null,
    description: null
  },
  // 5. Lead données minimales
  {
    id: 'test_005',
    name: 'Lead Minimal',
    emailAddress: null,
    phoneNumber: null,
    description: null
  },
  // 6. Lead avec email invalide
  {
    id: 'test_006',
    name: 'Test Email Invalide',
    emailAddress: 'invalid@',
    phoneNumber: null,
    description: null
  },
  // 7. Lead multi-canal
  {
    id: 'test_007',
    name: 'Entreprise Multi',
    emailAddress: 'contact@multi.com',
    phoneNumber: '+33698765432',
    description: 'Services informatiques'
  }
];

console.log('🧪 TEST DIRECT ENRICHISSEMENT 100%');
console.log('═══════════════════════════════════════════════════');
console.log('');
console.log(`📊 Leads à tester: ${testLeads.length}`);
console.log('');

try {
  console.log('🔄 Lancement batchAnalyzeLeads...');
  const results = await batchAnalyzeLeads(testLeads);

  console.log('');
  console.log('✅ RÉSULTATS:');
  console.log('─────────────────────────────────────────────────');
  console.log(`Analysés: ${results.analyzed}`);
  console.log(`Enrichis: ${results.enriched}`);
  console.log(`Skipped: ${results.skipped || 0}`);
  console.log('');

  // Validation philosophie 100%
  console.log('🎯 VALIDATION PHILOSOPHIE 100%:');
  console.log('─────────────────────────────────────────────────');

  if (results.enriched === testLeads.length) {
    console.log('✅ 100% enrichis - PHILOSOPHIE RESPECTÉE');
  } else {
    console.log(`❌ ÉCHEC: ${results.enriched}/${testLeads.length} enrichis`);
    console.log(`   ${testLeads.length - results.enriched} leads ignorés`);
  }

  if (results.skipped && results.skipped > 0) {
    console.log(`❌ ÉCHEC: ${results.skipped} leads skipped détectés`);
  } else {
    console.log('✅ Aucun lead ignoré (skipped)');
  }

  console.log('');
  console.log('📋 DÉTAIL PAR LEAD:');
  console.log('─────────────────────────────────────────────────');

  results.details.forEach((detail, index) => {
    const lead = testLeads[index];
    console.log(`\n${index + 1}. ${lead.name} (${lead.id})`);
    console.log(`   Email: ${lead.emailAddress || '❌'}`);
    console.log(`   Phone: ${lead.phoneNumber || '❌'}`);
    console.log(`   Description: ${lead.description ? '✅' : '❌'}`);
    console.log(`   → Secteur: ${detail.secteur || 'NON ENRICHI'}`);
    console.log(`   → Tags: ${detail.tags ? detail.tags.join(', ') : 'AUCUN'}`);
    console.log(`   → Stratégie: ${detail.strategie_contact || 'AUCUNE'}`);
    console.log(`   → Confiance: ${detail.confiance || 'N/A'}`);
    console.log(`   → Status: ${detail.status || 'unknown'}`);
  });

  console.log('');
  console.log('═══════════════════════════════════════════════════');

  // Vérifications critiques
  let allPassed = true;

  // 1. 100% enrichis
  if (results.enriched !== testLeads.length) {
    console.log('❌ TEST ÉCHOUÉ: Pas 100% enrichis');
    allPassed = false;
  }

  // 2. Aucun skipped
  if (results.skipped && results.skipped > 0) {
    console.log('❌ TEST ÉCHOUÉ: Leads skipped détectés');
    allPassed = false;
  }

  // 3. Tous les leads ont un secteur
  const leadsWithoutSecteur = results.details.filter(d => !d.secteur || d.secteur === '');
  if (leadsWithoutSecteur.length > 0) {
    console.log(`❌ TEST ÉCHOUÉ: ${leadsWithoutSecteur.length} leads sans secteur`);
    allPassed = false;
  }

  // 4. Tous les leads ont des tags
  const leadsWithoutTags = results.details.filter(d => !d.tags || d.tags.length === 0);
  if (leadsWithoutTags.length > 0) {
    console.log(`❌ TEST ÉCHOUÉ: ${leadsWithoutTags.length} leads sans tags`);
    allPassed = false;
  }

  // 5. Tous les leads ont une stratégie
  const leadsWithoutStrategy = results.details.filter(d => !d.strategie_contact);
  if (leadsWithoutStrategy.length > 0) {
    console.log(`❌ TEST ÉCHOUÉ: ${leadsWithoutStrategy.length} leads sans stratégie`);
    allPassed = false;
  }

  console.log('');
  if (allPassed) {
    console.log('🎉 TOUS LES TESTS PASSÉS - PHILOSOPHIE 100% VALIDÉE');
  } else {
    console.log('💔 CERTAINS TESTS ONT ÉCHOUÉ');
    process.exit(1);
  }

} catch (error) {
  console.error('');
  console.error('❌ ERREUR LORS DU TEST:');
  console.error(error);
  process.exit(1);
}
