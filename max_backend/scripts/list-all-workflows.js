import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', '..', 'n8n_local', '.n8n', 'database.sqlite');

const db = new Database(DB_PATH, { readonly: true });

console.log('\n📋 TOUS LES WORKFLOWS DANS n8n\n');

const workflows = db.prepare('SELECT id, name, active FROM workflow_entity').all();

console.log(`Total: ${workflows.length} workflow(s)\n`);

workflows.forEach(wf => {
  const nodes = JSON.parse(db.prepare('SELECT nodes FROM workflow_entity WHERE id = ?').get(wf.id).nodes);
  const whatsappNode = nodes.find(n => n.type === 'n8n-nodes-base.twilio');

  console.log(`${wf.active ? '🟢' : '⚫'} ${wf.name} (ID: ${wf.id})`);

  if (whatsappNode) {
    console.log(`   📱 Message: ${whatsappNode.parameters.message.substring(0, 80)}`);
  }
  console.log('');
});

db.close();
