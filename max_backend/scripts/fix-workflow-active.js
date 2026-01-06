import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', '..', 'n8n_local', '.n8n', 'database.sqlite');

const db = new Database(DB_PATH);

console.log('\n🔧 CORRECTION DES WORKFLOWS ACTIFS\n');

// Désactiver le mauvais workflow
console.log('⚫ Désactivation du workflow 3zUCHIjBv2zcOpXk (ancien avec "test message")');
db.prepare('UPDATE workflow_entity SET active = 0 WHERE id = ?').run('3zUCHIjBv2zcOpXk');

// Activer le bon workflow
console.log('🟢 Activation du workflow HWLMlpGG8XKccR7e (correct avec messageSuggestion)');
db.prepare('UPDATE workflow_entity SET active = 1 WHERE id = ?').run('HWLMlpGG8XKccR7e');

console.log('\n✅ Correction terminée!\n');
console.log('⚠️  Redémarrez n8n pour que les changements prennent effet.\n');

db.close();
