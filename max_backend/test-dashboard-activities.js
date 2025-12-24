/**
 * Test du Quick Fix - Vérifier que le dashboard affiche les vraies actions
 *
 * Ce script :
 * 1. Exécute des actions CRM via l'API /action-layer/run
 * 2. Vérifie que les logs sont enregistrés dans actionLogger
 * 3. Vérifie que /dashboard-mvp1/stats retourne les vraies activités
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3005/api';

console.log('\n🧪 TEST QUICK FIX - DASHBOARD ACTIVITÉS\n');
console.log('━'.repeat(60));

async function runAction(actionType, params) {
  console.log(`\n📤 Exécution action: ${actionType}`);

  const response = await fetch(`${API_BASE}/action-layer/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actionType, params })
  });

  const result = await response.json();

  if (result.success) {
    console.log(`   ✅ ${result.result.preview}`);
  } else {
    console.log(`   ❌ ${result.result?.error || result.error}`);
  }

  return result;
}

async function checkActionLogs() {
  console.log('\n📊 Vérification logs actionLogger...');

  const response = await fetch(`${API_BASE}/action-layer/logs?limit=20`);
  const data = await response.json();

  console.log(`   Logs trouvés: ${data.count}`);

  if (data.count > 0) {
    console.log('\n   Dernières actions:');
    data.logs.slice(0, 5).forEach((log, index) => {
      const status = log.success ? '✅' : '❌';
      console.log(`   ${index + 1}. ${status} ${log.actionType} - ${new Date(log.timestamp).toLocaleTimeString('fr-FR')}`);
    });
  }

  return data;
}

async function checkDashboardStats(token) {
  console.log('\n📈 Vérification /dashboard-mvp1/stats...');

  const headers = {
    'Content-Type': 'application/json',
    'X-Tenant': 'macrea'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/dashboard-mvp1/stats`, { headers });

  if (!response.ok) {
    console.log(`   ❌ Erreur ${response.status}: ${response.statusText}`);
    const text = await response.text();
    console.log(`   ${text.substring(0, 200)}`);
    return null;
  }

  const data = await response.json();

  console.log(`   Stats.maxInteractions: ${data.stats.maxInteractions}`);
  console.log(`   Activités récentes: ${data.recentActivity.length}`);

  if (data.recentActivity.length > 0) {
    console.log('\n   Top 3 activités:');
    data.recentActivity.slice(0, 3).forEach((activity, index) => {
      console.log(`   ${index + 1}. ${activity.title} - ${activity.description}`);
    });
  } else {
    console.log('   ⚠️  Aucune activité retournée!');
  }

  return data;
}

async function main() {
  try {
    // Étape 1: Exécuter 3 actions de test via l'API
    console.log('\n📋 ÉTAPE 1: Créer des actions de test via API\n');

    await runAction('create_opportunity', {
      tenantId: 'macrea',
      name: 'Test Dashboard - Opportunité',
      amount: 15000,
      closeDate: '2025-07-15',
      stage: 'Prospecting'
    });

    await runAction('create_ticket', {
      tenantId: 'macrea',
      name: 'Test Dashboard - Ticket',
      description: 'Ticket de test pour vérifier affichage dashboard',
      priority: 'Normal',
      status: 'New'
    });

    await runAction('write_crm_note', {
      tenantId: 'macrea',
      entityType: 'Lead',
      entityId: '69272eee2a589f7a6',
      noteText: 'Test dashboard - Note CRM'
    });

    // Attendre 1 seconde pour que les logs soient enregistrés
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Étape 2: Vérifier les logs
    console.log('\n━'.repeat(60));
    console.log('\n📋 ÉTAPE 2: Vérifier actionLogger\n');

    const logsData = await checkActionLogs();

    // Étape 3: Vérifier le dashboard (sans auth pour l'instant)
    console.log('\n━'.repeat(60));
    console.log('\n📋 ÉTAPE 3: Vérifier dashboard-mvp1/stats\n');

    const dashboardData = await checkDashboardStats(null);

    // Rapport final
    console.log('\n━'.repeat(60));
    console.log('\n📊 RAPPORT FINAL\n');

    const logsOk = logsData.count >= 3;
    const dashboardOk = dashboardData && dashboardData.recentActivity.length >= 3;

    console.log(`✅ Actions créées: 3`);
    console.log(`${logsOk ? '✅' : '❌'} Logs actionLogger: ${logsData.count} entrées`);
    console.log(`${dashboardOk ? '✅' : '❌'} Dashboard activités: ${dashboardData?.recentActivity.length || 0} affichées`);

    if (logsOk && dashboardOk) {
      console.log('\n🎉 QUICK FIX VALIDÉ - Le cockpit affiche les vraies actions!\n');
    } else if (logsOk && !dashboardOk) {
      console.log('\n⚠️  Logs OK mais Dashboard KO - Vérifier auth ou mapping\n');
    } else {
      console.log('\n❌ ÉCHEC - Les actions ne sont pas loggées correctement\n');
    }

  } catch (error) {
    console.error('\n💥 ERREUR:', error.message);
    process.exit(1);
  }
}

main();