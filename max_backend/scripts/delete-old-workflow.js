import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', '..', 'n8n_local', '.n8n', 'database.sqlite');

const db = new Database(DB_PATH);

console.log('\n🗑️  SUPPRESSION DE L\'ANCIEN WORKFLOW\n');

// Supprimer le vieux workflow avec "test message"
console.log('❌ Suppression du workflow 3zUCHIjBv2zcOpXk (ancien avec "test message")');
const result = db.prepare('DELETE FROM workflow_entity WHERE id = ?').run('3zUCHIjBv2zcOpXk');

if (result.changes > 0) {
  console.log('✅ Workflow supprimé');
} else {
  console.log('⚠️  Workflow déjà supprimé ou introuvable');
}

// Activer le bon workflow
console.log('\n🟢 Activation du workflow HWLMlpGG8XKccR7e (correct avec messageSuggestion)');
db.prepare('UPDATE workflow_entity SET active = 1 WHERE id = ?').run('HWLMlpGG8XKccR7e');

console.log('\n✅ Nettoyage terminé!\n');

// Lister les workflows restants
console.log('📋 Workflows restants:\n');
const workflows = db.prepare('SELECT id, name, active FROM workflow_entity').all();
workflows.forEach(wf => {
  console.log(`${wf.active ? '🟢' : '⚫'} ${wf.name} (ID: ${wf.id})`);
});

console.log('\n⚠️  Redémarrez n8n pour que les changements prennent effet.\n');

db.close();
