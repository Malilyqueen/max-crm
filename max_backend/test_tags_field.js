/**
 * Test pour vérifier que le champ "tags" fonctionne correctement
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const ESPO_BASE = process.env.ESPO_BASE_URL || 'http://127.0.0.1:8081/espocrm/api/v1';
const ESPO_API_KEY = process.env.ESPO_API_KEY;

async function espoFetch(endpoint, options = {}) {
  const url = `${ESPO_BASE}${endpoint}`;
  const headers = {
    'X-Api-Key': ESPO_API_KEY,
    'Content-Type': 'application/json',
    ...options.headers
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${response.status} - ${error}`);
  }

  return response.json();
}

async function testTagsField() {
  console.log('🔍 Test du champ "tags" dans EspoCRM...\n');

  try {
    // 1. Récupérer un lead
    console.log('1️⃣ Récupération d\'un lead...');
    const leads = await espoFetch('/Lead?maxSize=1');

    if (!leads.list || leads.list.length === 0) {
      console.error('❌ Aucun lead trouvé');
      return;
    }

    const lead = leads.list[0];
    console.log(`✅ Lead: ${lead.name}`);
    console.log(`   ID: ${lead.id}`);
    console.log(`   Tags actuels: ${JSON.stringify(lead.tags) || '(vide)'}\n`);

    // 2. Tester PATCH avec tags
    console.log('2️⃣ Test de PATCH avec tags...');
    const testData = {
      secteur: 'Logistique',
      tags: ['Transport', 'Logistics', 'B2B']
    };

    await espoFetch(`/Lead/${lead.id}`, {
      method: 'PATCH',
      body: JSON.stringify(testData)
    });

    console.log('✅ PATCH envoyé avec succès');
    console.log(`   Données: ${JSON.stringify(testData)}\n`);

    // 3. Vérifier la mise à jour
    console.log('3️⃣ Vérification de la mise à jour...');
    const updated = await espoFetch(`/Lead/${lead.id}`);

    console.log('📊 RÉSULTAT:');
    console.log(`   secteur: ${updated.secteur}`);
    console.log(`   tags: ${JSON.stringify(updated.tags)}`);

    // 4. Vérification finale
    if (updated.secteur === 'Logistique' && Array.isArray(updated.tags) && updated.tags.length === 3) {
      console.log('\n✅ ✅ ✅ TEST RÉUSSI ! Le champ "tags" fonctionne parfaitement !');
    } else {
      console.log('\n⚠️ Problème détecté:');
      if (updated.secteur !== 'Logistique') {
        console.log('   - Secteur non mis à jour');
      }
      if (!Array.isArray(updated.tags) || updated.tags.length !== 3) {
        console.log('   - Tags non mis à jour correctement');
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testTagsField().then(() => {
  console.log('\n✅ Test terminé');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});
