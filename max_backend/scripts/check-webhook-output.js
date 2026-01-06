import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', '..', 'n8n_local', '.n8n', 'database.sqlite');

const db = new Database(DB_PATH, { readonly: true });

console.log('\n🔍 DERNIÈRES EXÉCUTIONS DU WEBHOOK\n');

// Trouver le workflow
const workflow = db.prepare("SELECT id, name FROM workflow_entity WHERE name LIKE '%relance-j3-whatsapp%'").get();

if (!workflow) {
  console.log('❌ Workflow non trouvé');
  db.close();
  process.exit(1);
}

console.log(`✅ Workflow trouvé: ${workflow.name} (${workflow.id})\n`);

// Récupérer les dernières exécutions
const executions = db.prepare(`
  SELECT id, data, startedAt, stoppedAt, finished, mode, status
  FROM execution_entity
  WHERE workflowId = ?
  ORDER BY startedAt DESC
  LIMIT 3
`).all(workflow.id);

if (executions.length === 0) {
  console.log('❌ Aucune exécution trouvée');
} else {
  executions.forEach((exec, idx) => {
    console.log(`\n📋 Exécution ${idx + 1} (${exec.id}):`);
    console.log(`   Démarré: ${exec.startedAt}`);
    console.log(`   Status: ${exec.status || 'N/A'}`);
    console.log(`   Mode: ${exec.mode}`);
    console.log(`   Finished: ${exec.finished}`);

    if (exec.data) {
      try {
        const data = JSON.parse(exec.data);

        // Afficher les données du webhook
        if (data.resultData?.runData?.Webhook) {
          console.log('\n   📨 DONNÉES REÇUES PAR LE WEBHOOK:');
          const webhookData = data.resultData.runData.Webhook[0]?.data?.main?.[0]?.[0]?.json;
          if (webhookData) {
            console.log(JSON.stringify(webhookData, null, 2));

            // Vérifier spécifiquement leadPhone
            console.log('\n   🔍 CHEMINS POSSIBLES POUR leadPhone:');
            console.log(`      webhookData.data.leadPhone = ${webhookData.data?.leadPhone}`);
            console.log(`      webhookData.body.data.leadPhone = ${webhookData.body?.data?.leadPhone}`);
            console.log(`      webhookData.leadPhone = ${webhookData.leadPhone}`);
          } else {
            console.log('   ⚠️  Structure inattendue');
          }
        }

        // Afficher les erreurs
        if (data.resultData?.error) {
          console.log('\n   ❌ ERREUR:');
          console.log(`      ${data.resultData.error.message}`);
        }

      } catch (e) {
        console.log(`   ⚠️  Impossible de parser les données: ${e.message}`);
      }
    }
  });
}

db.close();
