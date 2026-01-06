import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', '..', 'n8n_local', '.n8n', 'database.sqlite');

const db = new Database(DB_PATH, { readonly: true });

console.log('\n📊 SCHÉMA TABLE execution_entity\n');

const cols = db.prepare('PRAGMA table_info(execution_entity)').all();
cols.forEach(col => {
  console.log(`   ${col.name} (${col.type})`);
});

console.log('\n📋 DERNIÈRES EXÉCUTIONS:\n');

const executions = db.prepare(`
  SELECT *
  FROM execution_entity
  ORDER BY id DESC
  LIMIT 3
`).all();

executions.forEach((exec, idx) => {
  console.log(`\nExecution ${idx + 1}:`);
  Object.keys(exec).forEach(key => {
    if (key === 'data' && exec[key]) {
      console.log(`   ${key}: [JSON data - ${exec[key].length} chars]`);
    } else {
      console.log(`   ${key}: ${exec[key]}`);
    }
  });
});

db.close();
