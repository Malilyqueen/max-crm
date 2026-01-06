import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', '..', 'n8n_local', '.n8n', 'database.sqlite');

const db = new Database(DB_PATH, { readonly: true });

console.log('\n🔍 WEBHOOKS ENREGISTRÉS\n');

const webhooks = db.prepare('SELECT * FROM webhook_entity').all();

if (webhooks.length === 0) {
  console.log('Aucun webhook enregistré');
} else {
  webhooks.forEach(wh => {
    console.log(`📌 Webhook:`);
    console.log(`   workflowId: ${wh.workflowId}`);
    console.log(`   webhookPath: ${wh.webhookPath}`);
    console.log(`   method: ${wh.method}`);
    console.log('');
  });
}

db.close();
