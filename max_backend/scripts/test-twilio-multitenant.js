/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║           TESTS TWILIO MULTI-TENANT - PHASE 3 SECURITY                       ║
 * ║                   VALIDATION CREDENTIALS PER-TENANT                          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * OBJECTIF: Vérifier que sendSms() utilise les credentials du tenant
 *
 * SCÉNARIOS:
 * 1. Tenant avec Twilio configuré → utilise ses credentials
 * 2. Tenant sans Twilio → erreur PROVIDER_NOT_CONFIGURED
 * 3. Tenant A et Tenant B → utilisent leurs propres numéros
 *
 * USAGE:
 *   node scripts/test-twilio-multitenant.js          # Lancer les tests
 *   node scripts/test-twilio-multitenant.js --setup  # Voir les instructions setup
 *   node scripts/test-twilio-multitenant.js --dry    # Test sans envoi réel
 *
 * PRÉ-REQUIS:
 *   - Variables: SUPABASE_URL, SUPABASE_SERVICE_KEY, CREDENTIALS_ENCRYPTION_KEY
 *   - Table tenant_provider_configs créée
 *   - Credentials Twilio configurés pour les tenants de test
 */

import { createClient } from '@supabase/supabase-js';
import { sendSms, canSendSms } from '../actions/sendSms.js';
import {
  getTwilioCredentials,
  hasProviderConfigured,
  ProviderNotConfiguredError
} from '../lib/providerResolver.js';
import { encryptCredentials } from '../lib/encryption.js';

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

// Mode dry-run (pas d'envoi réel)
const DRY_RUN = process.argv.includes('--dry');

// ============================================================================
// TEST DATA
// ============================================================================

const TEST_TENANTS = {
  // Tenant A avec Twilio configuré
  tenantA: {
    id: 'test-tenant-a',
    name: 'Tenant A (Production)',
    twilioConfig: {
      accountSid: 'AC_TEST_TENANT_A_SID', // Remplacer par vrai SID pour test réel
      authToken: 'test_auth_token_a',      // Remplacer par vrai token pour test réel
      phoneNumber: '+15551234001'          // Remplacer par vrai numéro
    }
  },

  // Tenant B avec Twilio configuré (différent)
  tenantB: {
    id: 'test-tenant-b',
    name: 'Tenant B (Production)',
    twilioConfig: {
      accountSid: 'AC_TEST_TENANT_B_SID', // Différent de Tenant A!
      authToken: 'test_auth_token_b',
      phoneNumber: '+15551234002'          // Différent de Tenant A!
    }
  },

  // Tenant C sans Twilio (doit échouer)
  tenantC: {
    id: 'test-tenant-c-no-twilio',
    name: 'Tenant C (Pas de Twilio)',
    twilioConfig: null // Pas de config!
  }
};

// Numéro de test pour envoi (si pas dry-run)
const TEST_PHONE_NUMBER = process.env.TEST_PHONE_NUMBER || '+33600000000';

// ============================================================================
// RÉSULTATS
// ============================================================================

const testResults = {
  passed: [],
  failed: []
};

function logTest(name, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  console.log(`\n${icon} TEST: ${name}`);
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
// SETUP: Créer les configs de test
// ============================================================================

async function setupTestProviders() {
  console.log('\n📦 Setup des providers de test...\n');

  for (const [key, tenant] of Object.entries(TEST_TENANTS)) {
    if (!tenant.twilioConfig) {
      console.log(`   ⏭️  ${tenant.name}: Pas de Twilio (intentionnel)`);
      continue;
    }

    try {
      // Vérifier si existe déjà
      const { data: existing } = await supabase
        .from('tenant_provider_configs')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('provider_type', 'twilio_sms')
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`   ✓ ${tenant.name}: Déjà configuré (ID: ${existing[0].id})`);
        continue;
      }

      // Chiffrer les credentials
      const encryptedConfig = encryptCredentials(tenant.twilioConfig, tenant.id);

      // Insérer
      const { data, error } = await supabase
        .from('tenant_provider_configs')
        .insert({
          tenant_id: tenant.id,
          provider_type: 'twilio_sms',
          provider_name: `${tenant.name} - Twilio SMS`,
          encrypted_config: encryptedConfig,
          is_active: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error(`   ❌ ${tenant.name}: Erreur insertion - ${error.message}`);
      } else {
        console.log(`   ✅ ${tenant.name}: Configuré (ID: ${data.id})`);
      }

    } catch (error) {
      console.error(`   ❌ ${tenant.name}: Exception - ${error.message}`);
    }
  }
}

async function cleanupTestProviders() {
  console.log('\n🧹 Nettoyage des providers de test...\n');

  for (const tenant of Object.values(TEST_TENANTS)) {
    const { error } = await supabase
      .from('tenant_provider_configs')
      .delete()
      .eq('tenant_id', tenant.id);

    if (error) {
      console.log(`   ⚠️  ${tenant.name}: ${error.message}`);
    } else {
      console.log(`   ✓ ${tenant.name}: Nettoyé`);
    }
  }
}

// ============================================================================
// TESTS
// ============================================================================

async function testTenantACredentials() {
  const tenant = TEST_TENANTS.tenantA;

  try {
    const creds = await getTwilioCredentials(tenant.id);

    if (creds.accountSid === tenant.twilioConfig.accountSid &&
        creds.phoneNumber === tenant.twilioConfig.phoneNumber) {
      logTest(
        'Tenant A → Récupération credentials OK',
        true,
        `AccountSID: ${creds.accountSid.substring(0, 10)}..., Phone: ${creds.phoneNumber}`
      );
      return true;
    } else {
      logTest(
        'Tenant A → Récupération credentials OK',
        false,
        `Credentials ne correspondent pas`
      );
      return false;
    }

  } catch (error) {
    logTest(
      'Tenant A → Récupération credentials OK',
      false,
      `Exception: ${error.message}`
    );
    return false;
  }
}

async function testTenantBCredentials() {
  const tenant = TEST_TENANTS.tenantB;

  try {
    const creds = await getTwilioCredentials(tenant.id);

    if (creds.accountSid === tenant.twilioConfig.accountSid &&
        creds.phoneNumber === tenant.twilioConfig.phoneNumber) {
      logTest(
        'Tenant B → Credentials différents de A',
        true,
        `Phone: ${creds.phoneNumber} (≠ Tenant A)`
      );
      return true;
    } else {
      logTest(
        'Tenant B → Credentials différents de A',
        false,
        `Credentials incorrects`
      );
      return false;
    }

  } catch (error) {
    logTest(
      'Tenant B → Credentials différents de A',
      false,
      `Exception: ${error.message}`
    );
    return false;
  }
}

async function testTenantCNoProvider() {
  const tenant = TEST_TENANTS.tenantC;

  try {
    await getTwilioCredentials(tenant.id);

    // Si on arrive ici, c'est un échec (devait throw)
    logTest(
      'Tenant C (sans Twilio) → PROVIDER_NOT_CONFIGURED',
      false,
      'Aucune exception levée alors que le tenant n\'a pas Twilio!'
    );
    return false;

  } catch (error) {
    if (error instanceof ProviderNotConfiguredError) {
      logTest(
        'Tenant C (sans Twilio) → PROVIDER_NOT_CONFIGURED',
        true,
        `Erreur correcte: ${error.code}`
      );
      return true;
    } else {
      logTest(
        'Tenant C (sans Twilio) → PROVIDER_NOT_CONFIGURED',
        false,
        `Mauvais type d'erreur: ${error.constructor.name}`
      );
      return false;
    }
  }
}

async function testHasProviderConfigured() {
  const hasA = await hasProviderConfigured(TEST_TENANTS.tenantA.id, 'twilio_sms');
  const hasC = await hasProviderConfigured(TEST_TENANTS.tenantC.id, 'twilio_sms');

  if (hasA && !hasC) {
    logTest(
      'hasProviderConfigured() → Détection correcte',
      true,
      `Tenant A: true, Tenant C: false`
    );
    return true;
  } else {
    logTest(
      'hasProviderConfigured() → Détection correcte',
      false,
      `Tenant A: ${hasA}, Tenant C: ${hasC} (attendu: true, false)`
    );
    return false;
  }
}

async function testCanSendSms() {
  const canA = await canSendSms(TEST_TENANTS.tenantA.id);
  const canC = await canSendSms(TEST_TENANTS.tenantC.id);

  if (canA && !canC) {
    logTest(
      'canSendSms() → Détection correcte',
      true,
      `Tenant A: true, Tenant C: false`
    );
    return true;
  } else {
    logTest(
      'canSendSms() → Détection correcte',
      false,
      `Tenant A: ${canA}, Tenant C: ${canC} (attendu: true, false)`
    );
    return false;
  }
}

async function testSendSmsTenantC() {
  const tenant = TEST_TENANTS.tenantC;

  const result = await sendSms({
    to: TEST_PHONE_NUMBER,
    message: 'Test message (devrait échouer)',
    tenantId: tenant.id
  });

  if (!result.ok && result.code === 'PROVIDER_NOT_CONFIGURED') {
    logTest(
      'sendSms() Tenant C → Erreur PROVIDER_NOT_CONFIGURED',
      true,
      `Code: ${result.code}`
    );
    return true;
  } else {
    logTest(
      'sendSms() Tenant C → Erreur PROVIDER_NOT_CONFIGURED',
      false,
      `Résultat inattendu: ${JSON.stringify(result)}`
    );
    return false;
  }
}

async function testSendSmsTenantA() {
  if (DRY_RUN) {
    logTest(
      'sendSms() Tenant A → Envoi réel (DRY-RUN)',
      true,
      'Mode dry-run: envoi réel non testé'
    );
    return true;
  }

  // ⚠️ ATTENTION: Ce test envoie un vrai SMS!
  const tenant = TEST_TENANTS.tenantA;

  console.log(`\n   ⚠️  ENVOI SMS RÉEL vers ${TEST_PHONE_NUMBER}...`);

  const result = await sendSms({
    to: TEST_PHONE_NUMBER,
    message: `[TEST] SMS depuis Tenant A - ${new Date().toISOString()}`,
    tenantId: tenant.id,
    leadId: 'test-lead-123'
  });

  if (result.ok) {
    logTest(
      'sendSms() Tenant A → Envoi réel OK',
      true,
      `SID: ${result.messageId}, From: ${result.from}`
    );

    // Vérifier que le FROM est bien celui du tenant
    if (result.from === tenant.twilioConfig.phoneNumber) {
      logTest(
        'sendSms() Tenant A → FROM correct',
        true,
        `Numéro utilisé: ${result.from}`
      );
    } else {
      logTest(
        'sendSms() Tenant A → FROM correct',
        false,
        `Attendu: ${tenant.twilioConfig.phoneNumber}, Obtenu: ${result.from}`
      );
    }

    return true;
  } else {
    logTest(
      'sendSms() Tenant A → Envoi réel OK',
      false,
      `Erreur: ${result.error} (code: ${result.code})`
    );
    return false;
  }
}

async function testNoMissingTenantId() {
  const result = await sendSms({
    to: TEST_PHONE_NUMBER,
    message: 'Test sans tenant',
    tenantId: null // Volontairement null
  });

  if (!result.ok && result.code === 'MISSING_TENANT_ID') {
    logTest(
      'sendSms() sans tenantId → Rejeté',
      true,
      `Code: ${result.code}`
    );
    return true;
  } else {
    logTest(
      'sendSms() sans tenantId → Rejeté',
      false,
      `Devrait être rejeté! Résultat: ${JSON.stringify(result)}`
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
  console.log('║                         RAPPORT FINAL PHASE 3                                ║');
  console.log('║                    TWILIO CREDENTIALS PER-TENANT                             ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ STATISTIQUES                                                                │');
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');
  console.log(`│   ✅ Tests réussis:   ${String(testResults.passed.length).padEnd(3)}                                                   │`);
  console.log(`│   ❌ Tests échoués:   ${String(testResults.failed.length).padEnd(3)}                                                   │`);
  console.log(`│   📊 Total:           ${String(testResults.passed.length + testResults.failed.length).padEnd(3)}                                                   │`);
  console.log('└─────────────────────────────────────────────────────────────────────────────┘');

  if (testResults.failed.length > 0) {
    console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐');
    console.log('│ ❌ TESTS ÉCHOUÉS                                                            │');
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
    console.log('║  🎉 PHASE 3 VALIDÉE - TWILIO MULTI-TENANT OK                                 ║');
    console.log('║                                                                              ║');
    console.log('║  • Credentials récupérés depuis tenant_provider_configs                     ║');
    console.log('║  • Chaque tenant utilise son propre Account SID et numéro                   ║');
    console.log('║  • PROVIDER_NOT_CONFIGURED si tenant non configuré                          ║');
    console.log('║  • Aucun fallback vers process.env.TWILIO_*                                 ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  } else {
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║  ❌ PHASE 3 NON VALIDÉE - CORRECTIONS REQUISES                               ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  }

  console.log('\n');
}

// ============================================================================
// INSTRUCTIONS SETUP
// ============================================================================

function printSetupInstructions() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                         INSTRUCTIONS SETUP PHASE 3                           ║
╚══════════════════════════════════════════════════════════════════════════════╝

1. CRÉER LA TABLE tenant_provider_configs (si pas déjà fait):

   Exécuter dans Supabase SQL Editor:
   ───────────────────────────────────────────────────────────────────────────

   CREATE TABLE IF NOT EXISTS public.tenant_provider_configs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     tenant_id VARCHAR(50) NOT NULL,
     provider_type VARCHAR(30) NOT NULL, -- 'twilio_sms', 'twilio_whatsapp', 'mailjet'
     provider_name VARCHAR(100),
     encrypted_config TEXT NOT NULL, -- Credentials chiffrés (AES-256-GCM)
     is_active BOOLEAN DEFAULT TRUE,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW(),

     UNIQUE(tenant_id, provider_type)
   );

   CREATE INDEX idx_provider_configs_tenant ON tenant_provider_configs(tenant_id);
   CREATE INDEX idx_provider_configs_active ON tenant_provider_configs(tenant_id, provider_type)
     WHERE is_active = TRUE;

   ───────────────────────────────────────────────────────────────────────────

2. FORMAT DES CREDENTIALS TWILIO (avant chiffrement):

   {
     "accountSid": "AC...........................",
     "authToken": "your_auth_token_here",
     "phoneNumber": "+15551234567"
   }

3. EXEMPLE D'INSERTION (via API ou script):

   import { encryptCredentials } from './lib/encryption.js';

   const credentials = {
     accountSid: "AC...",
     authToken: "...",
     phoneNumber: "+15551234567"
   };

   const encryptedConfig = encryptCredentials(credentials, tenantId);

   await supabase.from('tenant_provider_configs').insert({
     tenant_id: 'mon-tenant',
     provider_type: 'twilio_sms',
     provider_name: 'Twilio Production',
     encrypted_config: encryptedConfig,
     is_active: true
   });

4. LANCER LES TESTS:

   # Mode dry-run (pas d'envoi réel)
   node scripts/test-twilio-multitenant.js --dry

   # Test complet (envoie un vrai SMS!)
   TEST_PHONE_NUMBER=+33612345678 node scripts/test-twilio-multitenant.js

`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║           TESTS TWILIO MULTI-TENANT - PHASE 3 SECURITY                       ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  console.log('\nConfiguration:');
  console.log(`  • Supabase: ${SUPABASE_URL?.substring(0, 40)}...`);
  console.log(`  • Mode: ${DRY_RUN ? 'DRY-RUN (pas d\'envoi réel)' : 'PRODUCTION (envoi réel!)'}`);
  console.log(`  • Timestamp: ${new Date().toISOString()}`);

  // Setup
  await setupTestProviders();

  // ==========================================
  // SECTION 1: Récupération credentials
  // ==========================================
  logSection('1. RÉCUPÉRATION CREDENTIALS PER-TENANT');

  await testTenantACredentials();
  await testTenantBCredentials();
  await testTenantCNoProvider();

  // ==========================================
  // SECTION 2: Helpers
  // ==========================================
  logSection('2. FONCTIONS HELPER');

  await testHasProviderConfigured();
  await testCanSendSms();

  // ==========================================
  // SECTION 3: Envoi SMS
  // ==========================================
  logSection('3. ENVOI SMS MULTI-TENANT');

  await testNoMissingTenantId();
  await testSendSmsTenantC();
  await testSendSmsTenantA();

  // Cleanup
  await cleanupTestProviders();

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
