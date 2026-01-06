/**
 * Script de synchronisation directe dans la base SQLite de n8n
 *
 * Ce script met à jour directement les workflows dans la base de données n8n
 * sans passer par l'API (qui nécessite une clé)
 *
 * Usage: node scripts/sync-n8n-db.js
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', '..', 'n8n_local', '.n8n', 'database.sqlite');
const WORKFLOWS_DIR = path.join(__dirname, '..', 'n8n_workflows');

console.log('\n================================================================================');
console.log('🔄 SYNCHRONISATION DES WORKFLOWS N8N (SQLite Direct)');
console.log('================================================================================\n');
console.log(`📁 Base de données: ${DB_PATH}`);
console.log(`📁 Workflows: ${WORKFLOWS_DIR}\n`);

// Vérifier que la base existe
if (!fs.existsSync(DB_PATH)) {
  console.error(`❌ Base de données n8n introuvable: ${DB_PATH}`);
  console.error('Assurez-vous que n8n a été lancé au moins une fois.');
  process.exit(1);
}

// Ouvrir la base de données
const db = new Database(DB_PATH);

// Lire les workflows à importer
const files = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.json'));

console.log(`📋 ${files.length} workflow(s) à synchroniser:\n`);

const results = {
  created: 0,
  updated: 0,
  failed: 0
};

for (const file of files) {
  const filePath = path.join(WORKFLOWS_DIR, file);

  try {
    console.log(`📄 ${file}`);

    // Lire le workflow
    const content = fs.readFileSync(filePath, 'utf-8');
    const workflow = JSON.parse(content);

    const workflowName = workflow.name;

    // Vérifier si le workflow existe déjà
    const existing = db.prepare('SELECT id FROM workflow_entity WHERE name = ?').get(workflowName);

    if (existing) {
      // Mise à jour
      console.log(`   🔄 Mise à jour (ID: ${existing.id})`);

      db.prepare(`
        UPDATE workflow_entity
        SET
          nodes = ?,
          connections = ?,
          settings = ?,
          staticData = ?,
          updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        JSON.stringify(workflow.nodes),
        JSON.stringify(workflow.connections),
        JSON.stringify(workflow.settings || {}),
        JSON.stringify(workflow.staticData || null),
        existing.id
      );

      results.updated++;
      console.log(`   ✅ Mis à jour`);

    } else {
      // Création
      console.log(`   ➕ Création`);

      const result = db.prepare(`
        INSERT INTO workflow_entity (
          name,
          active,
          nodes,
          connections,
          settings,
          staticData,
          createdAt,
          updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        workflowName,
        1, // Active par défaut
        JSON.stringify(workflow.nodes),
        JSON.stringify(workflow.connections),
        JSON.stringify(workflow.settings || {}),
        JSON.stringify(workflow.staticData || null)
      );

      results.created++;
      console.log(`   ✅ Créé (ID: ${result.lastInsertRowid})`);
    }

  } catch (error) {
    console.error(`   ❌ Erreur: ${error.message}`);
    results.failed++;
  }
}

db.close();

console.log('\n================================================================================');
console.log('📊 RÉSUMÉ');
console.log('================================================================================\n');
console.log(`✅ Créés:      ${results.created}`);
console.log(`🔄 Mis à jour: ${results.updated}`);
console.log(`❌ Échecs:     ${results.failed}\n`);

if (results.failed > 0) {
  console.error('⚠️  Certains workflows ont échoué.');
  process.exit(1);
} else {
  console.log('✅ Synchronisation terminée!\n');
  console.log('⚠️  IMPORTANT: Redémarrez n8n pour que les changements prennent effet.\n');
  process.exit(0);
}
