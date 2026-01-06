import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', '..', 'n8n_local', '.n8n', 'database.sqlite');

const db = new Database(DB_PATH, { readonly: true });

console.log('\n📊 SCHÉMA DES TABLES n8n\n');

// Lister toutes les tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();

console.log('Tables disponibles:\n');
tables.forEach(t => console.log(`  - ${t.name}`));

// Chercher les tables liées aux permissions
console.log('\n\n🔍 Tables de permissions/sharing:\n');
const permTables = tables.filter(t =>
  t.name.includes('shared') ||
  t.name.includes('role') ||
  t.name.includes('credential') ||
  t.name.includes('workflow')
);

permTables.forEach(t => {
  console.log(`\n📋 ${t.name}:`);
  const cols = db.prepare(`PRAGMA table_info(${t.name})`).all();
  cols.forEach(col => {
    console.log(`   ${col.name} (${col.type})`);
  });
});

// Vérifier les entrées pour le workflow problématique
console.log('\n\n🔍 Données pour workflow HWLMlpGG8XKccR7e:\n');

try {
  const sharedWorkflows = db.prepare("SELECT * FROM shared_workflow WHERE workflowId = ?").all('HWLMlpGG8XKccR7e');
  console.log('shared_workflow:', sharedWorkflows.length > 0 ? sharedWorkflows : 'Aucune entrée');
} catch (e) {
  console.log('shared_workflow: Table inexistante');
}

db.close();
