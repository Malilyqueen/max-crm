/**
 * test-consent-internal.js
 * Test INTERNE du consent gate (exécutable dans container max-backend)
 *
 * Usage:
 *   docker exec max-backend node test-consent-internal.js
 *
 * Tests:
 *   1. Sans consentId → 412 intelligent (requiresConsent + operation.details)
 *   2. Avec consentId valide → exécution OK
 */

import { createConsentRequest } from './lib/consentManager.js';

// Couleurs console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(emoji, color, message) {
  console.log(`${emoji} ${color}${message}${colors.reset}`);
}

// Simuler handleToolCalls en important directement le switch case
async function executeToolDirect(toolName, args) {
  // Import dynamique pour éviter dépendances circulaires
  const chatModule = await import('./routes/chat.js');

  // Chercher la fonction executeToolCall (ou équivalent)
  // Si pas exportée, on va simuler directement l'appel au switch case

  // Pour create_custom_field, on appelle directement la validation consent
  const { validateConsent } = await import('./lib/consentGate.js');

  if (toolName === 'create_custom_field') {
    const { entity, fieldName, label, type } = args;

    // Validation consent (comme dans chat.js ligne 1310)
    const consentValidation = await validateConsent(
      args,
      'field_creation',
      `Créer le champ custom "${label || fieldName}" (${type}) sur ${entity}`
    );

    if (!consentValidation.allowed) {
      return {
        success: false,
        error: consentValidation.error,
        httpCode: consentValidation.httpCode,
        requiresConsent: consentValidation.requiresConsent,
        operation: consentValidation.operation,
        message: consentValidation.message,
        activityLog: consentValidation.activityLog
      };
    }

    // Si on arrive ici, consent validé
    return {
      success: true,
      message: `✅ Consent validé - Le champ ${fieldName} serait créé (test mode)`
    };
  }

  if (toolName === 'configure_entity_layout') {
    const { entity, fieldName, createField } = args;

    const operationDescription = createField
      ? `Créer le champ "${fieldName}" ET l'ajouter aux layouts ${entity}`
      : `Ajouter le champ "${fieldName}" aux layouts ${entity}`;

    const { validateConsent } = await import('./lib/consentGate.js');

    const consentValidation = await validateConsent(
      args,
      'layout_modification',
      operationDescription
    );

    if (!consentValidation.allowed) {
      return {
        success: false,
        error: consentValidation.error,
        httpCode: consentValidation.httpCode,
        requiresConsent: consentValidation.requiresConsent,
        operation: consentValidation.operation,
        message: consentValidation.message,
        activityLog: consentValidation.activityLog
      };
    }

    return {
      success: true,
      message: `✅ Consent validé - Le layout ${entity}.${fieldName} serait modifié (test mode)`
    };
  }

  throw new Error(`Tool ${toolName} non supporté dans ce test`);
}

async function testScenario1_NoConsentId() {
  log('🧪', colors.cyan, '\n=== TEST 1: create_custom_field SANS consentId ===');

  const args = {
    entity: 'Lead',
    fieldName: 'testFieldInternal',
    label: 'Test Field Internal',
    type: 'varchar'
    // PAS de consentId
  };

  log('📤', colors.cyan, `Args: ${JSON.stringify(args, null, 2)}`);

  try {
    const result = await executeToolDirect('create_custom_field', args);

    log('📥', colors.cyan, '\nRésultat:');
    console.log(JSON.stringify(result, null, 2));

    // Vérifications
    const checks = [
      { name: 'success: false', pass: result.success === false },
      { name: 'httpCode: 412', pass: result.httpCode === 412 },
      { name: 'requiresConsent: true', pass: result.requiresConsent === true },
      { name: 'error: CONSENT_REQUIRED', pass: result.error === 'CONSENT_REQUIRED' },
      { name: 'operation.type présent', pass: result.operation && result.operation.type },
      { name: 'operation.details présent', pass: result.operation && result.operation.details },
      { name: 'operation.details.entity', pass: result.operation?.details?.entity === 'Lead' },
      { name: 'operation.details.fieldName', pass: result.operation?.details?.fieldName === 'testFieldInternal' }
    ];

    log('', colors.cyan, '\n📊 Vérifications:');
    let allPassed = true;
    checks.forEach(check => {
      if (check.pass) {
        log('✅', colors.green, check.name);
      } else {
        log('❌', colors.red, check.name);
        allPassed = false;
      }
    });

    if (allPassed) {
      log('🎉', colors.green, '\n✅ TEST 1 RÉUSSI - Blocage 412 intelligent fonctionne');
    } else {
      log('💥', colors.red, '\n❌ TEST 1 ÉCHOUÉ');
    }

    return allPassed;
  } catch (error) {
    log('💥', colors.red, `\nERREUR: ${error.message}`);
    console.error(error);
    return false;
  }
}

async function testScenario2_WithValidConsentId() {
  log('🧪', colors.cyan, '\n=== TEST 2: create_custom_field AVEC consentId valide ===');

  // Créer un consentement
  log('📤', colors.cyan, 'Création du consentement...');

  const consentData = await createConsentRequest({
    type: 'field_creation',
    description: 'Test interne avec consent',
    details: {
      entity: 'Lead',
      fieldName: 'testFieldWithConsent',
      label: 'Test Field With Consent',
      type: 'varchar'
    },
    tenantId: 'macrea-admin'
  });

  const consentId = consentData.consentId;
  log('✅', colors.green, `ConsentId créé: ${consentId}`);

  // Exécuter avec consentId
  const args = {
    entity: 'Lead',
    fieldName: 'testFieldWithConsent',
    label: 'Test Field With Consent',
    type: 'varchar',
    consentId: consentId
  };

  log('📤', colors.cyan, `\nArgs: ${JSON.stringify(args, null, 2)}`);

  try {
    const result = await executeToolDirect('create_custom_field', args);

    log('📥', colors.cyan, '\nRésultat:');
    console.log(JSON.stringify(result, null, 2));

    // Vérifications
    const checks = [
      { name: 'success: true', pass: result.success === true },
      { name: 'PAS de requiresConsent', pass: !result.requiresConsent },
      { name: 'PAS de error CONSENT_REQUIRED', pass: result.error !== 'CONSENT_REQUIRED' }
    ];

    log('', colors.cyan, '\n📊 Vérifications:');
    let allPassed = true;
    checks.forEach(check => {
      if (check.pass) {
        log('✅', colors.green, check.name);
      } else {
        log('❌', colors.red, check.name);
        allPassed = false;
      }
    });

    if (allPassed) {
      log('🎉', colors.green, '\n✅ TEST 2 RÉUSSI - Exécution avec consent fonctionne');
    } else {
      log('💥', colors.red, '\n❌ TEST 2 ÉCHOUÉ');
    }

    return allPassed;
  } catch (error) {
    log('💥', colors.red, `\nERREUR: ${error.message}`);
    console.error(error);
    return false;
  }
}

async function runAllTests() {
  log('🚀', colors.cyan, '\n╔════════════════════════════════════════════════════════════╗');
  log('🚀', colors.cyan, '║   TEST INTERNE CONSENT GATE - DÉTERMINISTE                 ║');
  log('🚀', colors.cyan, '╚════════════════════════════════════════════════════════════╝\n');

  try {
    const test1 = await testScenario1_NoConsentId();

    await new Promise(resolve => setTimeout(resolve, 1000));

    const test2 = await testScenario2_WithValidConsentId();

    log('', colors.cyan, '\n╔════════════════════════════════════════════════════════════╗');
    if (test1 && test2) {
      log('🎉', colors.green, '║   ✅ TOUS LES TESTS RÉUSSIS - CONSENT GATE OK              ║');
      log('', colors.cyan, '╚════════════════════════════════════════════════════════════╝\n');
      process.exit(0);
    } else {
      log('💥', colors.red, '║   ❌ CERTAINS TESTS ONT ÉCHOUÉ                             ║');
      log('', colors.cyan, '╚════════════════════════════════════════════════════════════╝\n');
      process.exit(1);
    }
  } catch (error) {
    log('💥', colors.red, `\nERREUR FATALE: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

runAllTests();
