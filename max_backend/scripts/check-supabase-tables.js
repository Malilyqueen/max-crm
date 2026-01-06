// scripts/check-supabase-tables.js
// Vérifie quelles tables sont disponibles dans Supabase

import { supabase } from '../lib/supabaseClient.js';

async function checkTables() {
  console.log('\n🔍 Vérification des tables Supabase disponibles\n');

  if (!supabase) {
    console.error('❌ Supabase non configuré');
    process.exit(1);
  }

  // Test 1: Essayer de lire max_sessions
  console.log('1️⃣  Test lecture max_sessions...');
  const { data: sessions, error: sessionsError } = await supabase
    .from('max_sessions')
    .select('*')
    .limit(1);

  if (sessionsError) {
    console.log('   ❌ Erreur:', sessionsError.code, '-', sessionsError.message);
  } else {
    console.log('   ✅ Table accessible, données:', sessions);
  }

  // Test 2: Essayer de lire max_logs
  console.log('\n2️⃣  Test lecture max_logs...');
  const { data: logs, error: logsError } = await supabase
    .from('max_logs')
    .select('*')
    .limit(1);

  if (logsError) {
    console.log('   ❌ Erreur:', logsError.code, '-', logsError.message);
  } else {
    console.log('   ✅ Table accessible, données:', logs);
  }

  // Test 3: Essayer de lire tenant_memory
  console.log('\n3️⃣  Test lecture tenant_memory...');
  const { data: memory, error: memoryError } = await supabase
    .from('tenant_memory')
    .select('*')
    .limit(1);

  if (memoryError) {
    console.log('   ❌ Erreur:', memoryError.code, '-', memoryError.message);
  } else {
    console.log('   ✅ Table accessible, données:', memory);
  }

  // Test 4: Essayer une insertion simple
  console.log('\n4️⃣  Test insertion dans max_sessions...');
  const { data: insertData, error: insertError } = await supabase
    .from('max_sessions')
    .insert([{
      session_id: 'test_' + Date.now(),
      tenant_id: 'macrea-admin',
      message_count: 0
    }])
    .select();

  if (insertError) {
    console.log('   ❌ Erreur insertion:', insertError.code, '-', insertError.message);
    console.log('   📋 Détails:', insertError);
  } else {
    console.log('   ✅ Insertion réussie:', insertData);
  }

  console.log('\n');
}

checkTables().catch(console.error);
