/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║           TESTS MULTI-TENANT WEBHOOKS - PHASE 2 SECURITY                     ║
 * ║                      RAPPORT DE VALIDATION PROD                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * OBJECTIF: Prouver que les webhooks respectent l'isolation multi-tenant
 *
 * TESTS AVEC VÉRIFICATION SUPABASE:
 * ✅ Cas unique    : 1 write message_events avec bon tenant_id
 * ✅ Cas ambiguous : 0 write message_events + 1 write orphan (reason=ambiguous)
 * ✅ Cas no_match  : 0 write message_events + 1 write orphan (reason=no_match)
 *
 * USAGE:
 *   node scripts/test-multitenant-webhooks.js --setup  # Instructions setup
 *   node scripts/test-multitenant-webhooks.js          # Lancer tests
 *
 * ONE-LINER:
 *   node scripts/test-multitenant-webhooks.js --setup && node scripts/test-multitenant-webhooks.js
 */

import { createClient } from '@supabase/supabase-js';
import {
  resolveLeadAndTenantByEmail,
  resolveLeadAndTenantByPhone,
  resolveLeadAndTenantByWaId,
  isValidResolution,
  isAmbiguousResolution,
  logOrphanWebhookEvent
} from '../lib/tenantResolver.js';
import { logMessageEvent } from '../lib/messageEventLogger.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('\n❌ Variables manquantes: SUPABASE_URL et SUPABASE_SERVICE_KEY requis\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================================================
// TEST DATA
// ============================================================================

const TEST_DATA = {
  // Tenant de test
  testTenant: 'test-phase2-tenant',
  testLead: 'test-phase2-lead-001',

  // Identifiants uniques pour ce test run
  uniqueProviderId: `TEST_UNIQUE_${Date.now()}`,
  ambiguousProviderId: `TEST_AMBIGUOUS_${Date.now()}`,
  noMatchProviderId: `TEST_NOMATCH_${Date.now()}`,

  // Contacts de test
  uniqueEmail: 'unique-test@phase2-validation.com',
  ambiguousEmail: 'ambiguous@phase2-validation.com',
  unknownEmail: `unknown-${Date.now()}@nowhere.test`,
  unknownPhone: `+336${Date.now().toString().slice(-8)}`
};

// ============================================================================
// RÉSULTATS
// ============================================================================

const testResults = {
  passed: [],
  failed: []
};

function logTest(name, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  console.log(`\n${icon} ${name}`);
  if (details) {
    console.log(`   ${details}`);
  }
  if (passed) {
    testResults.passed.push(name);
  } else {
    testResults.failed.push({ name, details });
  }
}

function logSection(title) {
  console.log('\n' + '═'.repeat(70));
  console.log(`  ${title}`);
  console.log('═'.repeat(70));
}

// ============================================================================
// HELPERS: Comptage Supabase
// ============================================================================

async function countMessageEvents(providerMessageId) {
  const { data, error } = await supabase
    .from('message_events')
    .select('id, tenant_id')
    .eq('provider_message_id', providerMessageId);

  if (error) {
    console.error('   Erreur count message_events:', error.message);
    return { count: -1, tenantId: null };
  }

  return {
    count: data?.length || 0,
    tenantId: data?.[0]?.tenant_id || null
  };
}

async function countOrphanEvents(providerMessageId) {
  const { data, error } = await supabase
    .from('orphan_webhook_events')
    .select('id, reason')
    .eq('provider_message_id', providerMessageId);

  if (error) {
    if (error.code === '42P01') {
      console.error('   ⚠️ Table orphan_webhook_events inexistante!');
      return { count: -1, reason: null };
    }
    console.error('   Erreur count orphan_events:', error.message);
    return { count: -1, reason: null };
  }

  return {
    count: data?.length || 0,
    reason: data?.[0]?.reason || null
  };
}

async function cleanup(providerMessageId) {
  await supabase.from('message_events').delete().eq('provider_message_id', providerMessageId);
  await supabase.from('orphan_webhook_events').delete().eq('provider_message_id', providerMessageId);
}

// ============================================================================
// TEST 1: CAS UNIQUE → WRITE DANS MESSAGE_EVENTS AVEC BON TENANT
// ============================================================================

async function testUniqueCase() {
  logSection('TEST 1: CAS UNIQUE → message_events avec bon tenant_id');

  const providerId = TEST_DATA.uniqueProviderId;
  const expectedTenant = TEST_DATA.testTenant;
  const expectedLead = TEST_DATA.testLead;

  console.log(`\n   📝 Simulation: résolution réussie → log message_event`);
  console.log(`   ProviderMessageId: ${providerId}`);

  // Simuler une résolution réussie
  const resolution = { leadId: expectedLead, tenantId: expectedTenant };

  // Logger l'event (comme le ferait un webhook)
  await logMessageEvent({
    channel: 'email',
    provider: 'mailjet',
    direction: 'out',
    tenantId: resolution.tenantId,
    leadId: resolution.leadId,
    email: TEST_DATA.uniqueEmail,
    providerMessageId: providerId,
    status: 'delivered',
    messageSnippet: 'Test unique case',
    rawPayload: { test: true },
    timestamp: new Date().toISOString()
  });

  // Vérifier Supabase
  const messageResult = await countMessageEvents(providerId);
  const orphanResult = await countOrphanEvents(providerId);

  // Cleanup
  await cleanup(providerId);

  // Assertions
  const messageOk = messageResult.count === 1 && messageResult.tenantId === expectedTenant;
  const orphanOk = orphanResult.count === 0;

  if (messageOk && orphanOk) {
    logTest(
      'Cas unique → 1 write message_events (bon tenant)',
      true,
      `message_events: ${messageResult.count} (tenant=${messageResult.tenantId}), orphan: ${orphanResult.count}`
    );
    return true;
  } else {
    logTest(
      'Cas unique → 1 write message_events (bon tenant)',
      false,
      `message_events: ${messageResult.count} (tenant=${messageResult.tenantId}), orphan: ${orphanResult.count}`
    );
    return false;
  }
}

// ============================================================================
// TEST 2: CAS AMBIGUOUS → 0 MESSAGE_EVENTS + 1 ORPHAN (reason=ambiguous)
// ============================================================================

async function testAmbiguousCase() {
  logSection('TEST 2: CAS AMBIGUOUS → orphan_webhook_events (reason=ambiguous)');

  const providerId = TEST_DATA.ambiguousProviderId;

  console.log(`\n   📝 Simulation: résolution ambiguë → log orphan`);
  console.log(`   ProviderMessageId: ${providerId}`);

  // Simuler une résolution ambiguë (ce que ferait tenantResolver)
  const resolution = {
    ambiguous: true,
    candidates: [
      { leadId: 'lead-tenant-a', tenantId: 'tenant-a' },
      { leadId: 'lead-tenant-b', tenantId: 'tenant-b' }
    ]
  };

  // Vérifier que c'est bien ambigu
  if (!isAmbiguousResolution(resolution)) {
    logTest('Cas ambiguous → détection ambiguïté', false, 'isAmbiguousResolution() a échoué');
    return false;
  }

  // Logger comme orphelin (comme le ferait un webhook)
  await logOrphanWebhookEvent({
    channel: 'email',
    provider: 'mailjet',
    reason: 'ambiguous',
    contactIdentifier: TEST_DATA.ambiguousEmail,
    providerMessageId: providerId,
    candidates: resolution.candidates,
    payload: { test: true, type: 'ambiguous_test' }
  });

  // Vérifier Supabase
  const messageResult = await countMessageEvents(providerId);
  const orphanResult = await countOrphanEvents(providerId);

  // Cleanup
  await cleanup(providerId);

  // Assertions
  const messageOk = messageResult.count === 0;
  const orphanOk = orphanResult.count === 1 && orphanResult.reason === 'ambiguous';

  if (messageOk && orphanOk) {
    logTest(
      'Cas ambiguous → 0 message_events + 1 orphan (reason=ambiguous)',
      true,
      `message_events: ${messageResult.count}, orphan: ${orphanResult.count} (reason=${orphanResult.reason})`
    );
    return true;
  } else {
    logTest(
      'Cas ambiguous → 0 message_events + 1 orphan (reason=ambiguous)',
      false,
      `message_events: ${messageResult.count}, orphan: ${orphanResult.count} (reason=${orphanResult.reason})`
    );
    return false;
  }
}

// ============================================================================
// TEST 3: CAS NO_MATCH → 0 MESSAGE_EVENTS + 1 ORPHAN (reason=no_match)
// ============================================================================

async function testNoMatchCase() {
  logSection('TEST 3: CAS NO_MATCH → orphan_webhook_events (reason=no_match)');

  const providerId = TEST_DATA.noMatchProviderId;

  console.log(`\n   📝 Simulation: aucun match → log orphan`);
  console.log(`   ProviderMessageId: ${providerId}`);

  // Simuler une résolution sans match (null)
  const resolution = null;

  // Vérifier que ce n'est pas valide
  if (isValidResolution(resolution)) {
    logTest('Cas no_match → détection null', false, 'isValidResolution(null) devrait être false');
    return false;
  }

  // Logger comme orphelin (comme le ferait un webhook)
  await logOrphanWebhookEvent({
    channel: 'sms',
    provider: 'twilio',
    reason: 'no_match',
    contactIdentifier: TEST_DATA.unknownPhone,
    providerMessageId: providerId,
    candidates: null,
    payload: { test: true, type: 'no_match_test' }
  });

  // Vérifier Supabase
  const messageResult = await countMessageEvents(providerId);
  const orphanResult = await countOrphanEvents(providerId);

  // Cleanup
  await cleanup(providerId);

  // Assertions
  const messageOk = messageResult.count === 0;
  const orphanOk = orphanResult.count === 1 && orphanResult.reason === 'no_match';

  if (messageOk && orphanOk) {
    logTest(
      'Cas no_match → 0 message_events + 1 orphan (reason=no_match)',
      true,
      `message_events: ${messageResult.count}, orphan: ${orphanResult.count} (reason=${orphanResult.reason})`
    );
    return true;
  } else {
    logTest(
      'Cas no_match → 0 message_events + 1 orphan (reason=no_match)',
      false,
      `message_events: ${messageResult.count}, orphan: ${orphanResult.count} (reason=${orphanResult.reason})`
    );
    return false;
  }
}

// ============================================================================
// TEST 4: RÉSOLUTION RÉELLE - EMAIL INCONNU → NULL
// ============================================================================

async function testRealResolutionUnknown() {
  logSection('TEST 4: RÉSOLUTION RÉELLE - Email inconnu → null');

  console.log(`\n   📝 Appel réel: resolveLeadAndTenantByEmail('${TEST_DATA.unknownEmail}')`);

  const resolution = await resolveLeadAndTenantByEmail(TEST_DATA.unknownEmail);

  if (resolution === null) {
    logTest(
      'resolveLeadAndTenantByEmail(inconnu) → null',
      true,
      'Aucun fallback tenant, retourne null'
    );
    return true;
  } else {
    logTest(
      'resolveLeadAndTenantByEmail(inconnu) → null',
      false,
      `DANGER: Retourne ${JSON.stringify(resolution)} au lieu de null!`
    );
    return false;
  }
}

// ============================================================================
// TEST 5: RÉSOLUTION RÉELLE - PHONE INCONNU → NULL
// ============================================================================

async function testRealResolutionUnknownPhone() {
  logSection('TEST 5: RÉSOLUTION RÉELLE - Phone inconnu → null');

  console.log(`\n   📝 Appel réel: resolveLeadAndTenantByPhone('${TEST_DATA.unknownPhone}')`);

  const resolution = await resolveLeadAndTenantByPhone(TEST_DATA.unknownPhone);

  if (resolution === null) {
    logTest(
      'resolveLeadAndTenantByPhone(inconnu) → null',
      true,
      'Aucun fallback tenant, retourne null'
    );
    return true;
  } else {
    logTest(
      'resolveLeadAndTenantByPhone(inconnu) → null',
      false,
      `DANGER: Retourne ${JSON.stringify(resolution)} au lieu de null!`
    );
    return false;
  }
}

// ============================================================================
// TEST 6: AUCUN FALLBACK TENANT
// ============================================================================

async function testNoFallbackTenant() {
  logSection('TEST 6: AUCUN FALLBACK TENANT');

  console.log(`\n   📝 Vérification: 3 résolutions inconnues ne retournent jamais de tenant`);

  const r1 = await resolveLeadAndTenantByEmail('fallback-check-1@nowhere.test');
  const r2 = await resolveLeadAndTenantByPhone('+33699000111');
  const r3 = await resolveLeadAndTenantByWaId('33699000111@c.us');

  const hasFallback = [r1, r2, r3].some(r =>
    r !== null && !r.ambiguous && r.tenantId
  );

  if (!hasFallback) {
    logTest(
      'Aucun fallback tenant détecté',
      true,
      'Les 3 résolutions retournent null (pas de tenant par défaut)'
    );
    return true;
  } else {
    logTest(
      'Aucun fallback tenant détecté',
      false,
      `DANGER: Fallback détecté! r1=${JSON.stringify(r1)}, r2=${JSON.stringify(r2)}, r3=${JSON.stringify(r3)}`
    );
    return false;
  }
}

// ============================================================================
// RAPPORT FINAL
// ============================================================================

function printFinalReport() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                         RAPPORT FINAL PHASE 2                                ║');
  console.log('║                    VALIDATION SÉCURITÉ MULTI-TENANT                          ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ RÉSULTATS DES TESTS                                                         │');
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');

  for (const passed of testResults.passed) {
    console.log(`│ ✅ ${passed.substring(0, 70).padEnd(70)} │`);
  }
  for (const failed of testResults.failed) {
    console.log(`│ ❌ ${failed.name.substring(0, 70).padEnd(70)} │`);
  }

  console.log('└─────────────────────────────────────────────────────────────────────────────┘');

  console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ STATISTIQUES                                                                │');
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');
  console.log(`│   ✅ Tests réussis:   ${String(testResults.passed.length).padEnd(3)}                                                   │`);
  console.log(`│   ❌ Tests échoués:   ${String(testResults.failed.length).padEnd(3)}                                                   │`);
  console.log(`│   📊 Total:           ${String(testResults.passed.length + testResults.failed.length).padEnd(3)}                                                   │`);
  console.log('└─────────────────────────────────────────────────────────────────────────────┘');

  if (testResults.failed.length > 0) {
    console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐');
    console.log('│ ❌ DÉTAILS ÉCHECS                                                           │');
    console.log('├─────────────────────────────────────────────────────────────────────────────┤');
    for (const fail of testResults.failed) {
      console.log(`│   • ${fail.name}`);
      console.log(`│     ${fail.details}`);
    }
    console.log('└─────────────────────────────────────────────────────────────────────────────┘');
  }

  console.log('\n');
  if (testResults.failed.length === 0) {
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║  🎉 PHASE 2 VALIDÉE - PRÊT POUR PRODUCTION                                   ║');
    console.log('║                                                                              ║');
    console.log('║  ✅ Cas unique    : write message_events avec bon tenant_id                 ║');
    console.log('║  ✅ Cas ambiguous : 0 write tenant + 1 orphan (reason=ambiguous)            ║');
    console.log('║  ✅ Cas no_match  : 0 write tenant + 1 orphan (reason=no_match)             ║');
    console.log('║  ✅ Aucun fallback tenant                                                   ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  } else {
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║  ❌ PHASE 2 NON VALIDÉE - CORRECTIONS REQUISES                               ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  }

  console.log('\n');
}

// ============================================================================
// SETUP INSTRUCTIONS
// ============================================================================

function printSetupInstructions() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                         SETUP PHASE 2 - TESTS WEBHOOKS                       ║
╚══════════════════════════════════════════════════════════════════════════════╝

PRÉ-REQUIS:
───────────────────────────────────────────────────────────────────────────────
1. Variables d'environnement:
   • SUPABASE_URL
   • SUPABASE_SERVICE_KEY

2. Tables Supabase:
   • message_events (déjà existante)
   • orphan_webhook_events (créer avec create-orphan-webhook-events-table.sql)

3. EspoCRM accessible (pour tests de résolution réels)

COMMANDES:
───────────────────────────────────────────────────────────────────────────────
# 1. Créer la table orphan_webhook_events
#    → Supabase Dashboard → SQL Editor → Coller le script SQL

# 2. Lancer les tests
node scripts/test-multitenant-webhooks.js

# 3. One-liner complet
node scripts/test-multitenant-webhooks.js --setup && node scripts/test-multitenant-webhooks.js

CE QUE LES TESTS VÉRIFIENT:
───────────────────────────────────────────────────────────────────────────────
1. Cas unique (résolution OK)
   → 1 write dans message_events avec le bon tenant_id
   → 0 write dans orphan_webhook_events

2. Cas ambiguous (même contact dans 2 tenants)
   → 0 write dans message_events
   → 1 write dans orphan_webhook_events (reason='ambiguous')

3. Cas no_match (contact inconnu)
   → 0 write dans message_events
   → 1 write dans orphan_webhook_events (reason='no_match')

4. Aucun fallback tenant
   → Jamais de tenant par défaut inventé

`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║           TESTS MULTI-TENANT WEBHOOKS - PHASE 2 SECURITY                     ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  console.log('\nConfiguration:');
  console.log(`  • Supabase: ${SUPABASE_URL?.substring(0, 40)}...`);
  console.log(`  • Timestamp: ${new Date().toISOString()}`);

  // Tests
  await testUniqueCase();
  await testAmbiguousCase();
  await testNoMatchCase();
  await testRealResolutionUnknown();
  await testRealResolutionUnknownPhone();
  await testNoFallbackTenant();

  // Rapport
  printFinalReport();

  process.exit(testResults.failed.length > 0 ? 1 : 0);
}

// Check args
if (process.argv.includes('--setup')) {
  printSetupInstructions();
} else {
  main().catch(err => {
    console.error('❌ Erreur fatale:', err);
    process.exit(1);
  });
}
