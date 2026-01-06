/**
 * Script de vérification du contenu du workflow dans la DB n8n
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', '..', 'n8n_local', '.n8n', 'database.sqlite');

const db = new Database(DB_PATH, { readonly: true });

console.log('\n🔍 VÉRIFICATION DU WORKFLOW DANS LA DB n8n\n');

const workflow = db.prepare('SELECT id, name, nodes FROM workflow_entity WHERE name = ?').get('wf-relance-j3-whatsapp');

if (!workflow) {
  console.error('❌ Workflow introuvable dans la DB');
  process.exit(1);
}

console.log(`📋 Workflow: ${workflow.name}`);
console.log(`🆔 ID: ${workflow.id}\n`);

const nodes = JSON.parse(workflow.nodes);

// Chercher le nœud "Envoyer WhatsApp"
const whatsappNode = nodes.find(n => n.name === 'Envoyer WhatsApp' || n.type === 'n8n-nodes-base.twilio');

if (!whatsappNode) {
  console.error('❌ Nœud Twilio WhatsApp introuvable');
  process.exit(1);
}

console.log('📱 Nœud Twilio WhatsApp:');
console.log(`   ID: ${whatsappNode.id}`);
console.log(`   Name: ${whatsappNode.name}`);
console.log(`   Type: ${whatsappNode.type}\n`);

console.log('📝 Paramètres:');
console.log(JSON.stringify(whatsappNode.parameters, null, 2));

console.log('\n🎯 MESSAGE CONFIGURÉ:');
console.log(`   ${whatsappNode.parameters.message}\n`);

if (whatsappNode.parameters.message.includes('messageSuggestion')) {
  console.log('✅ Le workflow utilise bien {{ $json.data.messageSuggestion }}');
} else {
  console.log('❌ Le workflow N\'utilise PAS messageSuggestion!');
  console.log(`   Message actuel: ${whatsappNode.parameters.message}`);
}

db.close();
