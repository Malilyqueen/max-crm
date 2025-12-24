/**
 * Script de test pour vérifier si les champs secteur et segments existent dans EspoCRM
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

async function testFields() {
  console.log('🔍 Test des champs EspoCRM pour enrichissement...\n');

  try {
    // 1. Récupérer un lead pour voir ses champs disponibles
    console.log('1️⃣ Récupération d\'un lead exemple...');
    const leads = await espoFetch('/Lead?maxSize=1');

    if (!leads.list || leads.list.length === 0) {
      console.error('❌ Aucun lead trouvé dans EspoCRM');
      return;
    }

    const leadExample = leads.list[0];
    console.log(`✅ Lead trouvé: ${leadExample.name || leadExample.firstName} ${leadExample.lastName}`);
    console.log(`   ID: ${leadExample.id}`);
    console.log(`   Champs disponibles:`, Object.keys(leadExample));

    // 2. Vérifier si 'secteur' existe
    console.log('\n2️⃣ Vérification du champ "secteur"...');
    if ('secteur' in leadExample) {
      console.log(`✅ Champ "secteur" existe: ${leadExample.secteur || '(vide)'}`);
    } else {
      console.log('❌ Champ "secteur" N\'EXISTE PAS');
      console.log('   → Il faut créer ce champ custom dans EspoCRM');
    }

    // 3. Vérifier si 'segments' existe
    console.log('\n3️⃣ Vérification du champ "segments"...');
    if ('segments' in leadExample) {
      console.log(`✅ Champ "segments" existe: ${JSON.stringify(leadExample.segments) || '(vide)'}`);
    } else {
      console.log('❌ Champ "segments" N\'EXISTE PAS');
      console.log('   → Il faut créer ce champ custom dans EspoCRM');
    }

    // 4. Test de mise à jour avec PATCH
    console.log('\n4️⃣ Test de PATCH sur ce lead...');
    try {
      const testData = {
        secteur: 'Logistique',
        segments: ['Logistique', 'Transport', 'B2B']
      };

      await espoFetch(`/Lead/${leadExample.id}`, {
        method: 'PATCH',
        body: JSON.stringify(testData)
      });

      console.log('✅ PATCH réussi !');
      console.log(`   Données envoyées:`, testData);

      // Vérifier que ça a bien été sauvegardé
      const updated = await espoFetch(`/Lead/${leadExample.id}`);
      console.log(`   Valeurs après PATCH:`);
      console.log(`     secteur: ${updated.secteur}`);
      console.log(`     segments: ${JSON.stringify(updated.segments)}`);

    } catch (error) {
      console.error('❌ PATCH échoué:', error.message);

      if (error.message.includes('secteur')) {
        console.log('\n💡 Solution: Le champ "secteur" doit être créé dans EspoCRM');
        console.log('   1. Aller dans Admin → Entity Manager → Lead');
        console.log('   2. Créer un nouveau champ "secteur" de type Enum ou Varchar');
        console.log('   3. L\'ajouter aux layouts');
      }

      if (error.message.includes('segments')) {
        console.log('\n💡 Solution: Le champ "segments" doit être créé dans EspoCRM');
        console.log('   1. Aller dans Admin → Entity Manager → Lead');
        console.log('   2. Créer un nouveau champ "segments" de type Multi-Enum');
        console.log('   3. L\'ajouter aux layouts');
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Exécuter le test
testFields().then(() => {
  console.log('\n✅ Test terminé');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});
