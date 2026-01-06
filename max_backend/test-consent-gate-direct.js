/**
 * test-consent-gate-direct.js
 * Test DIRECT des tools avec validation consent (sans passer par LLM)
 *
 * Force l'appel direct de handleToolCalls pour tester la validation server-side
 */

import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'https://max-api.studiomacrea.cloud';
const TENANT = 'macrea-admin';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(emoji, color, message) {
  console.log(`${emoji} ${color}${message}${colors.reset}`);
}

/**
 * Appel DIRECT de handleToolCalls via endpoint /api/tools/execute
 * (Si cet endpoint n'existe pas, on doit le créer)
 */
async function executeToolDirect(toolName, args) {
  const response = await fetch(`${API_BASE}/api/tools/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant': TENANT
    },
    body: JSON.stringify({
      tool: toolName,
      args
    })
  });

  const result = await response.json();
  return { status: response.status, result };
}

async function testScenario1_NoConsentId_Direct() {
  log('🧪', colors.cyan, '\n=== TEST A: create_custom_field SANS consentId (DIRECT) ===');

  const toolArgs = {
    entity: 'Lead',
    fieldName: 'testField123',
    label: 'Test Field 123',
    type: 'varchar'
    // PAS de consentId
  };

  log('📤', colors.blue, `Appel direct tool: create_custom_field`);
  log('📦', colors.blue, `Args: ${JSON.stringify(toolArgs, null, 2)}`);

  const { status, result } = await executeToolDirect('create_custom_field', toolArgs);

  console.log('\n📥 Réponse HTTP Status:', status);
  console.log('📥 Réponse Body:');
  console.log(JSON.stringify(result, null, 2));

  // Vérifications
  const checks = [
    { name: 'HTTP 412', pass: status === 412 || result.httpCode === 412 },
    { name: 'requiresConsent: true', pass: result.requiresConsent === true },
    { name: 'operation.type présent', pass: result.operation && result.operation.type },
    { name: 'operation.details présent', pass: result.operation && result.operation.details },
    { name: 'error: CONSENT_REQUIRED', pass: result.error === 'CONSENT_REQUIRED' },
    { name: 'success: false', pass: result.success === false }
  ];

  log('', colors.cyan, '\n📊 Vérifications:');
  checks.forEach(check => {
    if (check.pass) {
      log('✅', colors.green, check.name);
    } else {
      log('❌', colors.red, check.name);
    }
  });

  const allPassed = checks.every(c => c.pass);
  if (allPassed) {
    log('🎉', colors.green, '\n✅ TEST A RÉUSSI - Blocage 412 intelligent fonctionne');
  } else {
    log('💥', colors.red, '\n❌ TEST A ÉCHOUÉ - Vérifier la validation consent');
  }

  return allPassed;
}

async function testScenario2_WithValidConsentId_Direct() {
  log('🧪', colors.cyan, '\n=== TEST B: create_custom_field AVEC consentId valide (DIRECT) ===');

  // Étape 1: Créer un consentement
  log('📤', colors.blue, 'Étape 1: Création du consentement...');

  const consentResponse = await fetch(`${API_BASE}/api/consent/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant': TENANT
    },
    body: JSON.stringify({
      type: 'field_creation',
      description: 'Test création champ avec consent valide',
      details: {
        entity: 'Lead',
        fieldName: 'testFieldWithConsent',
        label: 'Test Field With Consent',
        type: 'varchar'
      }
    })
  });

  const consentData = await consentResponse.json();
  const consentId = consentData.consentId;

  if (!consentId) {
    log('❌', colors.red, 'Échec création consent');
    console.log(consentData);
    return false;
  }

  log('✅', colors.green, `ConsentId créé: ${consentId}`);

  // Étape 2: Approuver le consentement (simuler click "Approuver")
  // Note: En réalité, l'exécution se fait via /api/consent/execute/:consentId
  // qui appelle automatiquement le tool avec le consentId
  // Pour ce test, on va appeler directement le tool avec le consentId

  log('📤', colors.blue, '\nÉtape 2: Appel tool AVEC consentId...');

  const toolArgs = {
    entity: 'Lead',
    fieldName: 'testFieldWithConsent',
    label: 'Test Field With Consent',
    type: 'varchar',
    consentId: consentId  // ✅ ConsentId fourni
  };

  const { status, result } = await executeToolDirect('create_custom_field', toolArgs);

  console.log('\n📥 Réponse HTTP Status:', status);
  console.log('📥 Réponse Body:');
  console.log(JSON.stringify(result, null, 2));

  // Vérifications
  const checks = [
    { name: 'HTTP 200 ou success: true', pass: status === 200 || result.success === true },
    { name: 'Pas de requiresConsent', pass: !result.requiresConsent },
    { name: 'Pas de CONSENT_REQUIRED', pass: result.error !== 'CONSENT_REQUIRED' }
  ];

  log('', colors.cyan, '\n📊 Vérifications:');
  checks.forEach(check => {
    if (check.pass) {
      log('✅', colors.green, check.name);
    } else {
      log('❌', colors.red, check.name);
    }
  });

  const allPassed = checks.every(c => c.pass);
  if (allPassed) {
    log('🎉', colors.green, '\n✅ TEST B RÉUSSI - Exécution avec consent fonctionne');
  } else {
    log('💥', colors.red, '\n❌ TEST B ÉCHOUÉ - Vérifier l\'exécution avec consent');
  }

  return allPassed;
}

async function runAllTests() {
  log('🚀', colors.cyan, '\n╔════════════════════════════════════════════════════════════╗');
  log('🚀', colors.cyan, '║   TEST DIRECT CONSENT GATE - FORCE TOOL CALLS              ║');
  log('🚀', colors.cyan, '╚════════════════════════════════════════════════════════════╝\n');

  log('🌐', colors.blue, `API Base: ${API_BASE}`);
  log('🏢', colors.blue, `Tenant: ${TENANT}\n`);

  try {
    // Test A: Sans consentId → 412 intelligent
    const testA = await testScenario1_NoConsentId_Direct();

    await new Promise(resolve => setTimeout(resolve, 2000)); // Pause 2s

    // Test B: Avec consentId valide → Succès
    const testB = await testScenario2_WithValidConsentId_Direct();

    log('', colors.cyan, '\n╔════════════════════════════════════════╗');
    if (testA && testB) {
      log('🎉', colors.green, '║   ✅ TOUS LES TESTS RÉUSSIS            ║');
    } else {
      log('💥', colors.red, '║   ❌ CERTAINS TESTS ONT ÉCHOUÉ         ║');
    }
    log('', colors.cyan, '╚════════════════════════════════════════╝\n');

  } catch (error) {
    log('💥', colors.red, `\nERREUR FATALE: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

runAllTests();
