/**
 * apply-supabase-migration.js
 * Applique la migration Supabase pour le système d'alertes M.A.X.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERREUR: Variables Supabase manquantes dans .env');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 APPLICATION MIGRATION SUPABASE - Système d\'Alertes M.A.X.');
console.log('═══════════════════════════════════════════════════════════');
console.log('');
console.log('📍 Supabase URL:', supabaseUrl);
console.log('');

// Lire le fichier SQL de migration
const migrationPath = path.join(__dirname, 'migrations', 'supabase_create_lead_activities.sql');

if (!fs.existsSync(migrationPath)) {
  console.error('❌ Fichier migration introuvable:', migrationPath);
  process.exit(1);
}

const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

// Séparer les commandes SQL (par point-virgule + saut de ligne)
const sqlCommands = sqlContent
  .split(/;\s*\n/)
  .map(cmd => cmd.trim())
  .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

console.log(`📋 ${sqlCommands.length} commandes SQL à exécuter`);
console.log('');

let successCount = 0;
let errorCount = 0;

for (let i = 0; i < sqlCommands.length; i++) {
  const command = sqlCommands[i];
  const firstLine = command.split('\n')[0].substring(0, 60);

  console.log(`[${i + 1}/${sqlCommands.length}] Exécution: ${firstLine}...`);

  try {
    // Exécuter la commande SQL via Supabase
    const { data, error } = await supabase.rpc('exec_sql', { query: command });

    if (error) {
      // Si la fonction RPC n'existe pas, essayer avec la méthode alternative
      if (error.message.includes('function') || error.code === '42883') {
        console.log('   ⚠️  Méthode RPC non disponible, utiliser Supabase Dashboard SQL Editor');
        console.log('');
        console.log('📋 INSTRUCTIONS MANUELLES:');
        console.log('1. Ouvrir Supabase Dashboard:', supabaseUrl.replace('https://', 'https://app.supabase.com/project/').replace('.supabase.co', ''));
        console.log('2. Aller dans SQL Editor');
        console.log('3. Copier/coller le contenu de:', migrationPath);
        console.log('4. Exécuter');
        console.log('');
        console.log('ℹ️  Vous pouvez aussi exécuter commande par commande:');
        console.log('');

        // Afficher toutes les commandes
        sqlCommands.forEach((cmd, idx) => {
          console.log(`-- Commande ${idx + 1}:`);
          console.log(cmd + ';');
          console.log('');
        });

        process.exit(0);
      } else {
        throw error;
      }
    }

    console.log('   ✅ OK');
    successCount++;
  } catch (err) {
    console.error('   ❌ ERREUR:', err.message);
    errorCount++;
  }
}

console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log(`✅ Migration terminée: ${successCount} succès, ${errorCount} erreurs`);
console.log('═══════════════════════════════════════════════════════════');
console.log('');

if (errorCount === 0) {
  console.log('🎉 Tables créées avec succès:');
  console.log('   • lead_activities');
  console.log('   • max_alerts');
  console.log('   • active_alerts (vue)');
  console.log('');
  console.log('📋 Prochaine étape: Tester avec ./test-alerts-mvp.ps1');
} else {
  console.log('⚠️  Certaines commandes ont échoué');
  console.log('   Vérifier manuellement dans Supabase Dashboard');
}
