import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', '..', 'n8n_local', '.n8n', 'database.sqlite');

const db = new Database(DB_PATH, { readonly: true });

console.log('\n🔍 VÉRIFICATION DES WEBHOOKS\n');

const workflows = db.prepare('SELECT id, name, nodes FROM workflow_entity').all();

workflows.forEach(wf => {
  const nodes = JSON.parse(wf.nodes);
  const webhookNode = nodes.find(n => n.type === 'n8n-nodes-base.webhook');

  if (webhookNode) {
    console.log(`📋 ${wf.name} (ID: ${wf.id})`);
    console.log(`   Webhook Path: ${webhookNode.parameters.path}`);
    console.log(`   Webhook ID: ${webhookNode.webhookId || 'N/A'}\n`);
  }
});

db.close();
