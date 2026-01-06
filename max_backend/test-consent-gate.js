/**
 * test-consent-gate.js
 * Test du système de consentement avec validation server-side
 *
 * Scénarios testés:
 * 1. Appel tool SANS consentId → 412 intelligent (requiresConsent + operation + details)
 * 2. Appel tool AVEC consentId invalide → 404/409/410 selon le cas
 * 3. Appel tool AVEC consentId valide → Succès
 */

import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'https://max-api.studiomacrea.cloud';
const TENANT = 'macrea-admin';

// ANSI colors pour output lisible
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

async function sendChatMessage(message, sessionId = 'test-consent-gate') {
  const response = await fetch(`${API_BASE}/api/chat/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant': TENANT
    },
    body: JSON.stringify({
      message,
      sessionId
    })
  });

  return response.json();
}

async function testScenario1_NoConsentId() {
  log('🧪', colors.cyan, '\n=== SCÉNARIO 1: Appel create_custom_field SANS consentId ===');

  const message = 'Crée un champ custom "testField123" de type varchar sur Lead';

  log('📤', colors.blue, `Envoi: "${message}"`);

  const result = await sendChatMessage(message);

  console.log('\n📥 Réponse reçue:');
  console.log(JSON.stringify(result, null, 2));

  // Vérifier la structure de la réponse 412
  if (result.response && result.response.includes('requiresConsent')) {
    log('✅', colors.green, 'SUCCÈS: Réponse contient requiresConsent');
  } else {
    log('❌', colors.red, 'ÉCHEC: requiresConsent manquant dans la réponse');
  }

  if (result.response && result.response.includes('operation')) {
    log('✅', colors.green, 'SUCCÈS: Réponse contient operation details');
  } else {
    log('❌', colors.red, 'ÉCHEC: operation details manquants');
  }

  return result;
}

async function testScenario2_WithInvalidConsentId() {
  log('🧪', colors.cyan, '\n=== SCÉNARIO 2: Appel create_custom_field AVEC consentId invalide ===');

  const message = 'Utilise le tool create_custom_field avec consentId = "consent_invalid_123"';

  log('📤', colors.blue, `Envoi: "${message}"`);

  const result = await sendChatMessage(message);

  console.log('\n📥 Réponse reçue:');
  console.log(JSON.stringify(result, null, 2));

  // Vérifier que le consentId invalide est rejeté
  if (result.response && (result.response.includes('404') || result.response.includes('not found'))) {
    log('✅', colors.green, 'SUCCÈS: ConsentId invalide rejeté (404)');
  } else {
    log('⚠️', colors.yellow, 'ATTENTION: Réponse inattendue pour consentId invalide');
  }

  return result;
}

async function testScenario3_RequestConsentFirst() {
  log('🧪', colors.cyan, '\n=== SCÉNARIO 3: Workflow complet request_consent → approval → execute ===');

  // Étape 1: Demander à M.A.X. de créer un champ (il devrait appeler request_consent)
  const message = 'Peux-tu créer un champ "feedbackClient" de type text sur Lead ?';

  log('📤', colors.blue, `Envoi: "${message}"`);

  const result = await sendChatMessage(message);

  console.log('\n📥 Réponse M.A.X.:');
  console.log(JSON.stringify(result, null, 2));

  // Vérifier si M.A.X. a bien demandé le consentement
  if (result.response && result.response.includes('consentement')) {
    log('✅', colors.green, 'SUCCÈS: M.A.X. mentionne le consentement');
  } else {
    log('❌', colors.red, 'ÉCHEC: M.A.X. n\'a pas mentionné le consentement');
  }

  // Vérifier si un consentId a été généré (dans les logs d'activité)
  if (result.activityLogs && result.activityLogs.some(log => log.includes('consent_'))) {
    log('✅', colors.green, 'SUCCÈS: ConsentId généré dans les logs');
  } else {
    log('⚠️', colors.yellow, 'ATTENTION: Aucun consentId visible dans les logs');
  }

  return result;
}

async function runAllTests() {
  log('🚀', colors.cyan, '\n╔════════════════════════════════════════════════════════════╗');
  log('🚀', colors.cyan, '║   TEST SYSTÈME DE CONSENTEMENT - CONSENT GATE SERVER-SIDE ║');
  log('🚀', colors.cyan, '╚════════════════════════════════════════════════════════════╝\n');

  log('🌐', colors.blue, `API Base: ${API_BASE}`);
  log('🏢', colors.blue, `Tenant: ${TENANT}\n`);

  try {
    // Test 1: Sans consentId → 412 intelligent
    await testScenario1_NoConsentId();

    await new Promise(resolve => setTimeout(resolve, 2000)); // Pause 2s

    // Test 2: ConsentId invalide → 404
    await testScenario2_WithInvalidConsentId();

    await new Promise(resolve => setTimeout(resolve, 2000)); // Pause 2s

    // Test 3: Workflow complet
    await testScenario3_RequestConsentFirst();

    log('🎉', colors.green, '\n╔════════════════════════════════════════╗');
    log('🎉', colors.green, '║   TESTS TERMINÉS                       ║');
    log('🎉', colors.green, '╚════════════════════════════════════════╝\n');

  } catch (error) {
    log('💥', colors.red, `\nERREUR FATALE: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Exécuter les tests
runAllTests();
