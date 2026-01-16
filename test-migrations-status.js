/**
 * Test: Vérifier si les migrations Phase 2 sont appliquées
 * Vérifie l'existence des 3 tables dans Supabase
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jcegkuyagbthpbklyawz.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZWdrdXlhZ2J0aHBia2x5YXd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NTYzNDksImV4cCI6MjA1MDUzMjM0OX0.WTvPWRYGDXq3KrdgT28MXaF7XF4PD55aScrzTf1_IwQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkMigrations() {
  console.log('🔍 Vérification des migrations Phase 2...\n');

  const tables = [
    'tenant_settings',
    'tenant_email_domains',
    'email_quota_usage',
    'tenant_provider_configs' // Table Phase 1
  ];

  const results = {};

  for (const table of tables) {
    try {
      // Essayer de compter les lignes (vérifie existence + permissions)
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        if (error.message.includes('does not exist')) {
          results[table] = '❌ TABLE MANQUANTE';
        } else if (error.message.includes('permission denied')) {
          results[table] = '⚠️  EXISTE (permissions manquantes)';
        } else {
          results[table] = `⚠️  ERREUR: ${error.message}`;
        }
      } else {
        results[table] = `✅ EXISTE (${count || 0} lignes)`;
      }
    } catch (err) {
      results[table] = `❌ ERREUR: ${err.message}`;
    }
  }

  console.log('📊 RÉSULTATS:\n');
  Object.entries(results).forEach(([table, status]) => {
    console.log(`  ${table.padEnd(30)} ${status}`);
  });

  const allExist = Object.values(results).every(status => status.startsWith('✅') || status.startsWith('⚠️'));

  console.log('\n' + '='.repeat(60));
  if (allExist) {
    console.log('✅ Toutes les tables existent - Migrations appliquées');
  } else {
    console.log('❌ Tables manquantes - Migrations NON appliquées');
    console.log('\nAction requise:');
    console.log('  1. Ouvrir: https://supabase.com/dashboard/project/jcegkuyagbthpbklyawz');
    console.log('  2. SQL Editor → New Query');
    console.log('  3. Exécuter dans l\'ordre:');
    console.log('     - 010_tenant_settings.sql');
    console.log('     - 009_tenant_email_domains.sql');
    console.log('     - 011_email_quota_usage.sql');
  }
  console.log('='.repeat(60));
}

checkMigrations().catch(console.error);
