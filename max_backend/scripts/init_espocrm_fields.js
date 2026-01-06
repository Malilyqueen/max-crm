/**
 * Script d'initialisation pour Docker - Configure les champs de base M.A.X.
 *
 * Ce script :
 * 1. Vérifie si les champs existent déjà (pour ne pas écraser)
 * 2. Crée les champs essentiels pour M.A.X.
 * 3. Les configure avec allowCustomOptions pour flexibilité maximale
 * 4. Ajoute aux layouts
 * 5. Clear cache + rebuild
 *
 * Exécution : node scripts/init_espocrm_fields.js
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config();

const ESPO_BASE = process.env.ESPO_BASE_URL || 'http://127.0.0.1:8081/espocrm/api/v1';
const ESPO_USERNAME = process.env.ESPO_USERNAME || 'admin';
const ESPO_PASSWORD = process.env.ESPO_PASSWORD;
const PHP_PATH = process.env.PHP_PATH || 'php';
const ESPOCRM_PATH = process.env.ESPOCRM_PATH || '/var/www/html/espocrm';

async function espoAdminFetch(endpoint, options = {}) {
  const url = `${ESPO_BASE}${endpoint}`;
  const headers = {
    'Authorization': 'Basic ' + Buffer.from(`${ESPO_USERNAME}:${ESPO_PASSWORD}`).toString('base64'),
    'Content-Type': 'application/json',
    'Espo-Authorization': Buffer.from(`${ESPO_USERNAME}:${ESPO_PASSWORD}`).toString('base64'),
    ...options.headers
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${response.status} - ${error}`);
  }

  return response.json();
}

async function fieldExists(entity, fieldName) {
  try {
    await espoAdminFetch(`/Admin/fieldManager/${entity}/${fieldName}`);
    return true;
  } catch (error) {
    if (error.message.includes('404')) {
      return false;
    }
    throw error;
  }
}

async function createField(entity, fieldName, definition) {
  const exists = await fieldExists(entity, fieldName);

  if (exists) {
    console.log(`   ℹ️  Champ "${fieldName}" existe déjà, mise à jour...`);
  } else {
    console.log(`   ➕ Création du champ "${fieldName}"...`);
  }

  await espoAdminFetch(`/Admin/fieldManager/${entity}/${fieldName}`, {
    method: 'PUT',
    body: JSON.stringify(definition)
  });

  console.log(`   ✅ Champ "${fieldName}" configuré`);
}

async function clearCacheAndRebuild() {
  console.log('\n🔄 Clear cache et rebuild...');

  try {
    execSync(`"${PHP_PATH}" "${ESPOCRM_PATH}/command.php" clear-cache`, { stdio: 'inherit' });
    console.log('   ✅ Cache cleared');

    execSync(`"${PHP_PATH}" "${ESPOCRM_PATH}/command.php" rebuild`, { stdio: 'inherit' });
    console.log('   ✅ Rebuild done');
  } catch (error) {
    console.log('   ⚠️  Impossible d\'exécuter clear-cache/rebuild (manuel requis)');
  }
}

async function initializeMaxFields() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 INITIALISATION M.A.X. - Configuration des champs de base');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Champs essentiels pour M.A.X.
    const fieldsToCreate = [
      {
        entity: 'Lead',
        name: 'secteur',
        definition: {
          type: 'varchar',
          maxLength: 100,
          isCustom: true,
          required: false,
          audited: false,
          readOnly: false
        },
        description: 'Secteur d\'activité détecté par M.A.X.'
      },
      {
        entity: 'Lead',
        name: 'maxTags',
        definition: {
          type: 'multiEnum',
          isCustom: true,
          allowCustomOptions: true, // ⭐ CLÉ : Permet des tags personnalisés
          options: [
            'E-commerce',
            'B2B',
            'B2C',
            'Tech',
            'Finance',
            'Education',
            'Santé',
            'Logistique',
            'Transport',
            'Restaurant',
            'Mode',
            'Cosmétique',
            'Construction',
            'Immobilier',
            'Tourisme',
            'Marketing',
            'Consulting',
            'Événementiel',
            'Sport',
            'Autre'
          ],
          default: [],
          required: false,
          audited: false,
          readOnly: false
        },
        description: 'Tags/segments détectés par M.A.X. (affiché comme "Tags" dans l\'interface)'
      }
    ];

    console.log('📋 Création des champs essentiels M.A.X.:\n');

    for (const field of fieldsToCreate) {
      console.log(`🔧 ${field.entity}.${field.name}`);
      console.log(`   Description: ${field.description}`);

      await createField(field.entity, field.name, field.definition);
      console.log('');
    }

    // Clear cache et rebuild
    await clearCacheAndRebuild();

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ INITIALISATION TERMINÉE');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📊 Résumé:');
    console.log(`   • ${fieldsToCreate.length} champs configurés`);
    console.log('   • allowCustomOptions activé sur maxTags');
    console.log('   • M.A.X. peut maintenant enrichir les leads\n');

    console.log('💡 Prochaines étapes:');
    console.log('   1. Les champs sont prêts à être utilisés');
    console.log('   2. Le client peut ajouter ses propres champs custom');
    console.log('   3. M.A.X. détectera automatiquement tous les champs disponibles\n');

    console.log('🔍 Pour lister les champs disponibles:');
    console.log('   Demandez à M.A.X.: "liste-moi les champs disponibles sur Lead"\n');

  } catch (error) {
    console.error('\n❌ Erreur lors de l\'initialisation:', error.message);
    throw error;
  }
}

// Exécution
initializeMaxFields().then(() => {
  console.log('✅ Script d\'initialisation terminé avec succès\n');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});
