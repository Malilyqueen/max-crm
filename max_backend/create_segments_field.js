/**
 * Script pour créer le champ "segments" de type Multi-Enum dans EspoCRM
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const ESPO_BASE = process.env.ESPO_BASE_URL || 'http://127.0.0.1:8081/espocrm/api/v1';
const ESPO_USERNAME = process.env.ESPO_USERNAME || 'admin';
const ESPO_PASSWORD = process.env.ESPO_PASSWORD;

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

async function createSegmentsField() {
  console.log('🔧 Création du champ "segments" (Multi-Enum) sur Lead...\n');

  try {
    const fieldDefinition = {
      type: 'multiEnum',
      isCustom: true,
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
        'Autre'
      ],
      default: [],
      required: false,
      audited: false,
      readOnly: false,
      tooltip: false
    };

    console.log('📋 Définition du champ:');
    console.log(JSON.stringify(fieldDefinition, null, 2));
    console.log('\n🚀 Envoi de la requête...\n');

    await espoAdminFetch('/Admin/fieldManager/Lead/segments', {
      method: 'PUT',
      body: JSON.stringify(fieldDefinition)
    });

    console.log('✅ Champ "segments" créé avec succès !');
    console.log('\n📝 Prochaines étapes:');
    console.log('1. Ajouter le champ aux layouts (via configure_entity_layout ou manuellement)');
    console.log('2. Clear cache: php command.php clear-cache');
    console.log('3. Rebuild: php command.php rebuild');

  } catch (error) {
    if (error.message.includes('409') || error.message.includes('exists')) {
      console.log('✅ Le champ "segments" existe déjà.');
    } else {
      console.error('❌ Erreur:', error.message);
      console.error('\n💡 Vérifiez:');
      console.error('- Que ESPO_USERNAME et ESPO_PASSWORD sont corrects dans .env');
      console.error('- Que l\'utilisateur a les droits admin');
      throw error;
    }
  }
}

createSegmentsField().then(() => {
  console.log('\n✅ Script terminé');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});
