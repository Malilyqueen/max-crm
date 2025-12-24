/**
 * Mettre à jour le champ maxTags pour qu'il accepte les tags détectés par l'IA
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

async function updateMaxTagsOptions() {
  console.log('🔧 Mise à jour du champ "maxTags" (Tags) avec allowCustomOptions...\n');

  try {
    // Récupérer la définition actuelle
    console.log('1️⃣ Récupération de la définition actuelle...');
    const currentDef = await espoAdminFetch('/Admin/fieldManager/Lead/maxTags', {
      method: 'GET'
    });
    console.log('✅ Type actuel:', currentDef.type);
    console.log('   Options actuelles:', currentDef.options || '(vide)');

    // Mettre à jour avec des options + allowCustomOptions
    const updatedDef = {
      ...currentDef,
      allowCustomOptions: true, // IMPORTANT: Autoriser des valeurs personnalisées
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
      isCustom: true
    };

    console.log('\n2️⃣ Mise à jour avec allowCustomOptions: true...');
    await espoAdminFetch('/Admin/fieldManager/Lead/maxTags', {
      method: 'PUT',
      body: JSON.stringify(updatedDef)
    });

    console.log('✅ Champ "maxTags" mis à jour !');
    console.log('   ✓ allowCustomOptions: true');
    console.log('   ✓ Options prédéfinies: 20 valeurs');
    console.log('\n💡 L\'IA peut maintenant utiliser ces valeurs + n\'importe quel tag personnalisé');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  }
}

updateMaxTagsOptions().then(() => {
  console.log('\n✅ Script terminé');
  console.log('\n📝 Prochaines étapes:');
  console.log('1. Clear cache: php command.php clear-cache');
  console.log('2. Rebuild: php command.php rebuild');
  console.log('3. Tester l\'enrichissement');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});
