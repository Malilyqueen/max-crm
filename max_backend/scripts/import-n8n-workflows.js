/**
 * Script d'import automatique des workflows n8n
 *
 * Usage: node scripts/import-n8n-workflows.js
 *
 * Ce script:
 * 1. Lit tous les workflows dans n8n_workflows/*.json
 * 2. Les importe/met à jour dans n8n via l'API REST
 * 3. Les active automatiquement
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://127.0.0.1:5678';
const WORKFLOWS_DIR = path.join(__dirname, '..', 'n8n_workflows');

/**
 * Récupère tous les workflows existants dans n8n
 */
async function getAllWorkflows() {
  try {
    const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      // Si l'API n'est pas accessible, retourner tableau vide
      console.warn(`⚠️  API n8n non accessible (${response.status}), on continue sans vérification`);
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.warn(`⚠️  Erreur lors de la récupération des workflows:`, error.message);
    return [];
  }
}

/**
 * Crée ou met à jour un workflow dans n8n
 */
async function upsertWorkflow(workflowData, existingWorkflows) {
  const workflowName = workflowData.name;

  // Chercher si le workflow existe déjà
  const existing = existingWorkflows.find(w => w.name === workflowName);

  try {
    if (existing) {
      // Mise à jour
      console.log(`🔄 Mise à jour du workflow: ${workflowName}`);

      const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${existing.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(workflowData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Workflow mis à jour: ${workflowName} (ID: ${result.data.id})`);
      return { success: true, action: 'updated', id: result.data.id };

    } else {
      // Création
      console.log(`➕ Création du workflow: ${workflowName}`);

      const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(workflowData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Workflow créé: ${workflowName} (ID: ${result.data.id})`);
      return { success: true, action: 'created', id: result.data.id };
    }
  } catch (error) {
    console.error(`❌ Erreur pour ${workflowName}:`, error.message);
    return { success: false, action: 'failed', error: error.message };
  }
}

/**
 * Active un workflow
 */
async function activateWorkflow(workflowId, workflowName) {
  try {
    const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${workflowId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ active: true })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    console.log(`🟢 Workflow activé: ${workflowName}`);
    return true;
  } catch (error) {
    console.warn(`⚠️  Impossible d'activer ${workflowName}:`, error.message);
    return false;
  }
}

/**
 * Import principal
 */
async function main() {
  console.log('\n================================================================================');
  console.log('🔄 IMPORT DES WORKFLOWS N8N');
  console.log('================================================================================\n');
  console.log(`📁 Répertoire: ${WORKFLOWS_DIR}`);
  console.log(`🌐 n8n URL: ${N8N_BASE_URL}\n`);

  // Vérifier que le répertoire existe
  if (!fs.existsSync(WORKFLOWS_DIR)) {
    console.error(`❌ Répertoire ${WORKFLOWS_DIR} introuvable`);
    process.exit(1);
  }

  // Lire tous les fichiers JSON
  const files = fs.readdirSync(WORKFLOWS_DIR)
    .filter(file => file.endsWith('.json'));

  if (files.length === 0) {
    console.log('⚠️  Aucun workflow trouvé');
    process.exit(0);
  }

  console.log(`📋 ${files.length} workflow(s) trouvé(s):\n`);
  files.forEach(file => console.log(`   - ${file}`));
  console.log('');

  // Récupérer les workflows existants
  const existingWorkflows = await getAllWorkflows();
  console.log(`📊 ${existingWorkflows.length} workflow(s) déjà dans n8n\n`);

  // Importer chaque workflow
  const results = {
    created: 0,
    updated: 0,
    failed: 0,
    activated: 0
  };

  for (const file of files) {
    const filePath = path.join(WORKFLOWS_DIR, file);

    try {
      console.log(`\n📄 Traitement: ${file}`);

      // Lire le fichier
      const content = fs.readFileSync(filePath, 'utf-8');
      const workflowData = JSON.parse(content);

      // Importer/mettre à jour
      const result = await upsertWorkflow(workflowData, existingWorkflows);

      if (result.success) {
        if (result.action === 'created') results.created++;
        if (result.action === 'updated') results.updated++;

        // Activer le workflow
        const activated = await activateWorkflow(result.id, workflowData.name);
        if (activated) results.activated++;
      } else {
        results.failed++;
      }

    } catch (error) {
      console.error(`❌ Erreur lors de la lecture de ${file}:`, error.message);
      results.failed++;
    }
  }

  // Résumé
  console.log('\n================================================================================');
  console.log('📊 RÉSUMÉ DE L\'IMPORT');
  console.log('================================================================================\n');
  console.log(`✅ Créés:      ${results.created}`);
  console.log(`🔄 Mis à jour: ${results.updated}`);
  console.log(`🟢 Activés:    ${results.activated}`);
  console.log(`❌ Échecs:     ${results.failed}`);
  console.log('\n================================================================================\n');

  if (results.failed > 0) {
    console.error('⚠️  Certains workflows ont échoué. Vérifiez les logs ci-dessus.');
    process.exit(1);
  } else {
    console.log('✅ Tous les workflows ont été importés avec succès!\n');
    process.exit(0);
  }
}

// Exécution
main().catch(error => {
  console.error('\n❌ ERREUR FATALE:', error);
  process.exit(1);
});
