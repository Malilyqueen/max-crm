/**
 * Script pour ajouter le champ "segments" aux layouts de Lead
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

async function addSegmentsToLayouts() {
  console.log('📋 Ajout du champ "segments" aux layouts de Lead...\n');

  try {
    // 1. Récupérer le layout actuel (list)
    console.log('1️⃣ Récupération du layout "list"...');
    const listLayout = await espoAdminFetch('/Admin/layouts/Lead/list');
    console.log(`   Colonnes actuelles: ${listLayout.length}`);

    // Vérifier si segments existe déjà
    const hasSegments = listLayout.some(col => col.name === 'segments');

    if (!hasSegments) {
      console.log('   ➕ Ajout de "segments" au layout list...');
      listLayout.push({
        name: 'segments',
        width: 15,
        widthPx: null
      });

      await espoAdminFetch('/Admin/layouts/Lead/list', {
        method: 'PUT',
        body: JSON.stringify(listLayout)
      });
      console.log('   ✅ Layout "list" mis à jour');
    } else {
      console.log('   ℹ️  "segments" déjà présent dans list');
    }

    // 2. Récupérer le layout detail
    console.log('\n2️⃣ Récupération du layout "detail"...');
    const detailLayout = await espoAdminFetch('/Admin/layouts/Lead/detail');

    // Chercher si segments est déjà dans un panel
    let segmentsExists = false;
    for (const panel of detailLayout) {
      if (panel.rows) {
        for (const row of panel.rows) {
          for (const cell of row) {
            if (cell.name === 'segments') {
              segmentsExists = true;
              break;
            }
          }
        }
      }
    }

    if (!segmentsExists) {
      console.log('   ➕ Ajout de "segments" au layout detail...');

      // Ajouter dans le premier panel après la première rangée
      if (detailLayout[0] && detailLayout[0].rows) {
        detailLayout[0].rows.splice(1, 0, [
          {
            name: 'segments',
            fullWidth: true
          },
          false
        ]);

        await espoAdminFetch('/Admin/layouts/Lead/detail', {
          method: 'PUT',
          body: JSON.stringify(detailLayout)
        });
        console.log('   ✅ Layout "detail" mis à jour');
      }
    } else {
      console.log('   ℹ️  "segments" déjà présent dans detail');
    }

    console.log('\n✅ Layouts mis à jour avec succès !');
    console.log('\n📝 Prochaines étapes:');
    console.log('1. Rafraîchissez votre navigateur (F5)');
    console.log('2. Allez dans un lead pour voir le champ "segments"');
    console.log('3. Le champ devrait maintenant être visible dans la liste et le détail');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  }
}

addSegmentsToLayouts().then(() => {
  console.log('\n✅ Script terminé');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});
