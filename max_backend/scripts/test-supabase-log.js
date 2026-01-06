// scripts/test-supabase-log.js
// Script de test pour vérifier l'enregistrement des logs dans Supabase

import { logMaxAction, upsertSession, setTenantMemory, getTenantMemory } from '../lib/maxLogger.js';

async function testSupabaseLogs() {
  console.log('\n🧪 Test d\'enregistrement dans Supabase\n');

  // 1. Créer une session de test
  console.log('1️⃣  Test upsert session...');
  const sessionResult = await upsertSession({
    session_id: 'test_session_' + Date.now(),
    tenant_id: 'macrea-admin',
    user_email: 'test@macrea.com',
    message_count: 1,
    metadata: { source: 'test_script', environment: 'dev' }
  });

  if (sessionResult.ok) {
    console.log('   ✅ Session créée:', sessionResult.data.session_id);
  } else {
    console.error('   ❌ Erreur session:', sessionResult.error);
    return;
  }

  // 2. Logger une action CRM
  console.log('\n2️⃣  Test log action CRM...');
  const logResult = await logMaxAction({
    action_type: 'lead_status_changed',
    action_category: 'crm',
    tenant_id: 'macrea-admin',
    session_id: sessionResult.data.session_id,
    entity_type: 'Lead',
    entity_id: 'test_lead_123',
    description: 'Changement de statut: New → Assigned',
    input_data: { old_status: 'New', new_status: 'Assigned' },
    output_data: { success: true },
    success: true,
    execution_time_ms: 150
  });

  if (logResult.ok) {
    console.log('   ✅ Log enregistré:', logResult.data.id);
  } else {
    console.error('   ❌ Erreur log:', logResult.error);
    return;
  }

  // 3. Enregistrer une mémoire tenant
  console.log('\n3️⃣  Test set tenant memory...');
  const memoryResult = await setTenantMemory({
    tenant_id: 'macrea-admin',
    memory_key: 'preferred_language',
    memory_type: 'preference',
    memory_value: { language: 'fr', timezone: 'Europe/Paris' },
    scope: 'global',
    priority: 10
  });

  if (memoryResult.ok) {
    console.log('   ✅ Mémoire enregistrée:', memoryResult.data.memory_key);
  } else {
    console.error('   ❌ Erreur mémoire:', memoryResult.error);
    return;
  }

  // 4. Récupérer la mémoire
  console.log('\n4️⃣  Test get tenant memory...');
  const retrievedMemory = await getTenantMemory('macrea-admin', 'preferred_language', 'global');

  if (retrievedMemory.ok && retrievedMemory.data) {
    console.log('   ✅ Mémoire récupérée:', retrievedMemory.data.memory_value);
    console.log('   📊 Access count:', retrievedMemory.data.access_count);
  } else {
    console.error('   ❌ Erreur récupération:', retrievedMemory.error);
    return;
  }

  console.log('\n🎉 Tous les tests Supabase ont réussi!\n');
  console.log('📊 Récapitulatif:');
  console.log('   - Session créée et trackée');
  console.log('   - Action CRM loggée avec métadonnées');
  console.log('   - Mémoire tenant enregistrée et récupérée');
  console.log('   - Système de logging opérationnel ✅\n');
}

// Exécuter les tests
testSupabaseLogs().catch((err) => {
  console.error('💥 Erreur globale:', err);
  process.exit(1);
});
