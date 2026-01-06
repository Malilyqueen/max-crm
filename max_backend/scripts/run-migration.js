// scripts/run-migration.js
// Script pour exécuter les migrations Supabase
import { supabase } from '../lib/supabaseClient.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration(migrationFile) {
  console.log(`\n🚀 Exécution de la migration: ${migrationFile}`);

  if (!supabase) {
    console.error('❌ Supabase n\'est pas configuré. Vérifiez le .env');
    process.exit(1);
  }

  try {
    // Lire le fichier SQL
    const migrationPath = join(__dirname, '..', 'migrations', migrationFile);
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log(`📄 SQL lu: ${sql.length} caractères`);

    // Exécuter le SQL via l'API Supabase
    // Note: Supabase JS client ne supporte pas l'exécution SQL directe
    // Il faut utiliser l'API REST ou le dashboard
    console.log('\n⚠️  Le client JS Supabase ne peut pas exécuter du SQL brut.');
    console.log('📋 Veuillez copier le contenu du fichier ci-dessous dans le SQL Editor de Supabase:\n');
    console.log('🔗 https://supabase.com/dashboard/project/jcegkuyagbthpbklyawz/sql/new\n');
    console.log('─'.repeat(80));
    console.log(sql);
    console.log('─'.repeat(80));

    // Alternative: Tester la connexion en vérifiant si les tables existent
    console.log('\n🔍 Vérification de la connexion Supabase...');

    const { data, error } = await supabase
      .from('max_sessions')
      .select('count', { count: 'exact', head: true });

    if (error && error.code === 'PGRST116') {
      console.log('✅ Connexion Supabase OK');
      console.log('⚠️  Les tables n\'existent pas encore - migration nécessaire');
      console.log('\n📝 Instructions:');
      console.log('   1. Ouvrez https://supabase.com/dashboard/project/jcegkuyagbthpbklyawz/sql/new');
      console.log('   2. Copiez le contenu de: max_backend/migrations/' + migrationFile);
      console.log('   3. Collez dans l\'éditeur SQL');
      console.log('   4. Cliquez sur "Run"');
      console.log('   5. Relancez ce script pour vérifier\n');
    } else if (!error) {
      console.log('✅ Connexion Supabase OK');
      console.log('✅ Les tables existent déjà!');

      // Compter les enregistrements
      const { count: sessionsCount } = await supabase
        .from('max_sessions')
        .select('*', { count: 'exact', head: true });

      const { count: logsCount } = await supabase
        .from('max_logs')
        .select('*', { count: 'exact', head: true });

      const { count: memoryCount } = await supabase
        .from('tenant_memory')
        .select('*', { count: 'exact', head: true });

      console.log(`\n📊 État des tables:`);
      console.log(`   - max_sessions: ${sessionsCount || 0} enregistrements`);
      console.log(`   - max_logs: ${logsCount || 0} enregistrements`);
      console.log(`   - tenant_memory: ${memoryCount || 0} enregistrements\n`);
    } else {
      console.error('❌ Erreur Supabase:', error);
    }

  } catch (err) {
    console.error('❌ Erreur lors de la migration:', err);
    process.exit(1);
  }
}

// Exécuter
runMigration('001_create_max_tables.sql');
