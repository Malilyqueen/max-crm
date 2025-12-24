/**
 * Test des performances du backend
 * Mesure le temps de réponse des actions
 */

import fetch from 'node-fetch';

const API_URL = 'http://127.0.0.1:3005';

async function testActionPerformance(action, sessionId) {
  console.log(`\n📊 Test: ${action}`);
  console.log('─'.repeat(50));

  const startTime = Date.now();

  try {
    const response = await fetch(`${API_URL}/api/chat/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        action
      })
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    const data = await response.json();

    console.log(`✅ Temps de réponse: ${duration}ms`);

    if (duration < 100) {
      console.log('   ✅ EXCELLENT (< 100ms)');
    } else if (duration < 300) {
      console.log('   ✅ FLUIDE (< 300ms)');
    } else if (duration < 1000) {
      console.log('   ⚠️  LENT (< 1000ms)');
    } else {
      console.log('   ❌ TRÈS LENT (> 1000ms)');
    }

    console.log(`   Message: ${data.message?.substring(0, 80)}...`);

    return { action, duration, success: data.ok };

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`❌ Erreur: ${error.message}`);
    console.log(`   Temps écoulé: ${duration}ms`);

    return { action, duration, success: false, error: error.message };
  }
}

async function runPerformanceTests() {
  console.log('\n🧪 Test de Performance Backend M.A.X.');
  console.log('═'.repeat(50));

  const sessionId = `test_perf_${Date.now()}`;

  // Créer une session de test
  console.log(`\nSession de test: ${sessionId}`);

  // Tester différentes actions
  const actions = [
    'start-enrichment',
    'execute-enrichment',
    'skip-enrichment',
    'setup-workflows',
    'segment-leads',
    'create-campaign'
  ];

  const results = [];

  for (const action of actions) {
    const result = await testActionPerformance(action, sessionId);
    results.push(result);

    // Petit délai entre les tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Statistiques globales
  console.log('\n\n📈 STATISTIQUES GLOBALES');
  console.log('═'.repeat(50));

  const successfulTests = results.filter(r => r.success);
  const avgDuration = successfulTests.reduce((sum, r) => sum + r.duration, 0) / successfulTests.length;
  const maxDuration = Math.max(...results.map(r => r.duration));
  const minDuration = Math.min(...results.map(r => r.duration));

  console.log(`✅ Tests réussis: ${successfulTests.length}/${results.length}`);
  console.log(`⏱️  Temps moyen: ${avgDuration.toFixed(0)}ms`);
  console.log(`🚀 Temps min: ${minDuration}ms`);
  console.log(`🐌 Temps max: ${maxDuration}ms`);

  console.log('\n💡 ANALYSE');
  console.log('─'.repeat(50));

  if (avgDuration < 100) {
    console.log('✅ Backend très performant - Problème probablement côté FRONTEND');
    console.log('   → Vérifier les click handlers dans React');
    console.log('   → Ajouter async/await');
    console.log('   → Ajouter loading states');
  } else if (avgDuration < 500) {
    console.log('✅ Backend acceptable - Optimisation possible mais pas urgente');
  } else {
    console.log('❌ Backend lent - Optimisation BACKEND nécessaire');
    console.log('   → Vérifier les appels API EspoCRM');
    console.log('   → Optimiser les requêtes base de données');
  }

  console.log('\n');
}

runPerformanceTests().catch(error => {
  console.error('❌ Erreur globale:', error);
  process.exit(1);
});
