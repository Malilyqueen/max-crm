/**
 * Mettre à jour le champ "segments" pour autoriser des valeurs personnalisées (allowCustomOptions)
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

async function updateSegmentsField() {
  console.log('🔧 Mise à jour du champ "segments" pour autoriser des valeurs personnalisées...\n');

  try {
    // Récupérer la définition actuelle
    console.log('1️⃣ Récupération de la définition actuelle...');
    const currentDef = await espoAdminFetch('/Admin/fieldManager/Lead/segments', {
      method: 'GET'
    });
    console.log('✅ Définition actuelle:', JSON.stringify(currentDef, null, 2));

    // Mettre à jour pour autoriser des valeurs custom
    const updatedDef = {
      ...currentDef,
      allowCustomOptions: true, // Autoriser des valeurs non présentes dans la liste
      isCustom: true
    };

    console.log('\n2️⃣ Mise à jour avec allowCustomOptions: true...');
    await espoAdminFetch('/Admin/fieldManager/Lead/segments', {
      method: 'PUT',
      body: JSON.stringify(updatedDef)
    });

    console.log('✅ Champ "segments" mis à jour avec succès !');
    console.log('   Les valeurs personnalisées (hors liste prédéfinie) sont maintenant acceptées.');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  }
}

updateSegmentsField().then(() => {
  console.log('\n✅ Script terminé');
  console.log('\n📝 Prochaines étapes:');
  console.log('1. Clear cache et rebuild EspoCRM');
  console.log('2. Tester l\'enrichissement avec des tags détectés par l\'IA');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});
