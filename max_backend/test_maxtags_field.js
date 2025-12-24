/**
 * Test pour vérifier le champ "maxTags" ou autre champ de type Multi-Enum
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

async function testMultipleTagFields() {
  console.log('🔍 Test des différents champs de tags...\n');

  try {
    // 1. Récupérer un lead
    const leads = await espoFetch('/Lead?maxSize=1');
    if (!leads.list || leads.list.length === 0) {
      console.error('❌ Aucun lead trouvé');
      return;
    }

    const lead = leads.list[0];
    console.log(`✅ Lead: ${lead.name} (${lead.id})\n`);

    // Tester différents champs
    const fieldsToTest = [
      { name: 'maxTags', value: ['Transport', 'Logistics', 'B2B'] },
      { name: 'categorie', value: ['Prospect', 'Client'] },
      { name: 'tags', value: 'Transport,Logistics,B2B' }, // Peut-être une string séparée par virgules ?
    ];

    for (const field of fieldsToTest) {
      console.log(`\n━━━ Test du champ "${field.name}" ━━━`);

      try {
        // Test 1: Array
        console.log(`\n1️⃣ Test avec Array: ${JSON.stringify(field.value)}`);
        await espoFetch(`/Lead/${lead.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            [field.name]: field.value
          })
        });

        // Vérifier
        const updated = await espoFetch(`/Lead/${lead.id}`);
        console.log(`✅ ${field.name}: ${JSON.stringify(updated[field.name])}`);

        if (updated[field.name] !== null && updated[field.name] !== undefined) {
          console.log(`\n🎉 SUCCÈS ! Le champ "${field.name}" fonctionne avec ce format !`);
          return { field: field.name, format: 'array', success: true };
        }

      } catch (error) {
        console.log(`❌ ${field.name} avec array: ${error.message}`);
      }
    }

    console.log('\n⚠️ Aucun champ de tags ne fonctionne avec un format array simple.');
    console.log('💡 Solution: Créer un champ Multi-Enum custom nommé "segments"');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testMultipleTagFields().then(() => {
  console.log('\n✅ Test terminé');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});
