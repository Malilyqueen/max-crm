/**
 * Vérifier tous les champs "tags" dans Lead
 */

import 'dotenv/config';
import { espoFetch } from './lib/espoClient.js';

async function checkTagsFields() {
  console.log('🔍 VÉRIFICATION DES CHAMPS TAGS DANS LEAD\n');

  try {
    // Récupérer un lead avec tous les champs
    const result = await espoFetch('/Lead?maxSize=1');

    if (result.list.length === 0) {
      console.log('❌ Aucun lead trouvé');
      return;
    }

    const lead = result.list[0];
    console.log(`📋 Lead testé: ${lead.name || lead.accountName || lead.id}\n`);

    // Chercher tous les champs contenant "tag"
    const tagsFields = Object.keys(lead).filter(key =>
      key.toLowerCase().includes('tag')
    );

    console.log('🏷️  CHAMPS CONTENANT "TAG":\n');

    if (tagsFields.length === 0) {
      console.log('   ❌ Aucun champ tag trouvé');
    } else {
      tagsFields.forEach(field => {
        const value = lead[field];
        const isEmpty = value === null || value === undefined || value === '' ||
                       (Array.isArray(value) && value.length === 0);

        console.log(`   • ${field}:`);
        console.log(`     Type: ${Array.isArray(value) ? 'Array' : typeof value}`);
        console.log(`     Valeur: ${isEmpty ? '(vide)' : JSON.stringify(value)}`);
        console.log('');
      });
    }

    // Afficher aussi segments
    console.log('📊 AUTRES CHAMPS PERTINENTS:\n');
    ['segments', 'secteur', 'maxTags'].forEach(field => {
      if (lead.hasOwnProperty(field)) {
        const value = lead[field];
        const isEmpty = value === null || value === undefined || value === '' ||
                       (Array.isArray(value) && value.length === 0);

        console.log(`   • ${field}:`);
        console.log(`     Type: ${Array.isArray(value) ? 'Array' : typeof value}`);
        console.log(`     Valeur: ${isEmpty ? '(vide)' : JSON.stringify(value)}`);
        console.log('');
      }
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

checkTagsFields();
