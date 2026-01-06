import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', '..', 'n8n_local', '.n8n', 'database.sqlite');

const db = new Database(DB_PATH);

console.log('\n🔧 CORRECTION DU PROPRIÉTAIRE DU WORKFLOW\n');

// Trouver le premier utilisateur
const user = db.prepare('SELECT id, email FROM user LIMIT 1').get();

if (!user) {
  console.error('❌ Aucun utilisateur trouvé dans n8n!');
  console.log('\n💡 Créez d\'abord un compte sur http://localhost:5678');
  db.close();
  process.exit(1);
}

console.log(`👤 Utilisateur trouvé: ${user.email} (ID: ${user.id})\n`);

// Vérifier les workflows sans propriétaire
const workflows = db.prepare('SELECT id, name FROM workflow_entity WHERE id = ?').all('HWLMlpGG8XKccR7e');

if (workflows.length === 0) {
  console.log('✅ Aucun workflow sans propriétaire');
  db.close();
  process.exit(0);
}

console.log('📋 Workflows à corriger:\n');
workflows.forEach(wf => {
  console.log(`   - ${wf.name} (${wf.id})`);
});

// Vérifier si la colonne userId existe dans workflow_entity
const tableInfo = db.prepare('PRAGMA table_info(workflow_entity)').all();
const hasUserId = tableInfo.some(col => col.name === 'userId');

if (!hasUserId) {
  console.log('\n⚠️  La table workflow_entity n\'a pas de colonne userId');
  console.log('   n8n gère probablement les permissions différemment dans cette version');
} else {
  // Assigner le workflow à l'utilisateur
  console.log(`\n🔄 Attribution du workflow à ${user.email}...`);
  db.prepare('UPDATE workflow_entity SET userId = ? WHERE id = ?').run(user.id, 'HWLMlpGG8XKccR7e');
  console.log('✅ Propriétaire assigné');
}

console.log('\n✅ Correction terminée!\n');
console.log('⚠️  Redémarrez n8n pour que les changements prennent effet.\n');

db.close();
