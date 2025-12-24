/**
 * Test pour vérifier que les tags personnalisés (hors liste) fonctionnent
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

async function testCustomTags() {
  console.log('🔍 Test des tags personnalisés (hors liste prédéfinie)...\n');

  try {
    // 1. Récupérer un lead
    const leads = await espoFetch('/Lead?maxSize=1');
    const lead = leads.list[0];
    console.log(`✅ Lead: ${lead.name} (${lead.id})\n`);

    // 2. Tester avec des tags qui NE SONT PAS dans la liste prédéfinie
    console.log('1️⃣ Test avec tags CUSTOM (pas dans la liste)...');
    const customTags = ['Cosmetics', 'Retail', 'Online'];

    await espoFetch(`/Lead/${lead.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        secteur: 'Retail',
        segments: customTags
      })
    });

    console.log('✅ PATCH réussi avec tags custom !');
    console.log(`   Tags envoyés: ${JSON.stringify(customTags)}`);

    // 3. Vérifier
    const updated = await espoFetch(`/Lead/${lead.id}`);
    console.log(`   Tags enregistrés: ${JSON.stringify(updated.segments)}\n`);

    if (JSON.stringify(updated.segments) === JSON.stringify(customTags)) {
      console.log('🎉 SUCCESS ! Les tags personnalisés sont bien acceptés !');
      console.log('✅ L\'enrichissement IA peut maintenant utiliser n\'importe quels tags.');
    } else {
      console.log('⚠️ Les tags n\'ont pas été enregistrés correctement.');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.message.includes('valid')) {
      console.log('\n⚠️ Le champ "segments" refuse encore les valeurs custom.');
      console.log('💡 Solution: Vérifier allowCustomOptions dans la configuration du champ.');
    }
  }
}

testCustomTags().then(() => {
  console.log('\n✅ Test terminé');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});
