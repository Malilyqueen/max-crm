/**
 * Vérifier si le champ Budget existe dans EspoCRM
 */

import 'dotenv/config';
import { espoFetch } from './lib/espoClient.js';

async function checkBudgetField() {
  console.log('🔍 VÉRIFICATION DU CHAMP BUDGET\n');

  try {
    // Récupérer un lead pour voir si le champ budget existe
    const result = await espoFetch('/Lead?maxSize=1&select=id,name,accountName,budget');

    if (result.list.length > 0) {
      const lead = result.list[0];
      const name = lead.name || lead.accountName || lead.id;

      console.log(`📋 Lead testé: ${name}`);
      console.log(`   Champ "budget": ${lead.budget !== undefined ? '✅ EXISTE' : '❌ N\'EXISTE PAS'}`);

      if (lead.budget !== undefined) {
        console.log(`   Valeur actuelle: ${lead.budget || '(vide)'}`);
        console.log('\n✅ Le champ Budget est bien créé dans EspoCRM !');
      } else {
        console.log('\n❌ Le champ Budget n\'existe pas dans la base de données.');
      }
    } else {
      console.log('❌ Aucun lead trouvé pour tester');
    }

  } catch (error) {
    if (error.message.includes('400') && error.message.includes('budget')) {
      console.log('❌ Le champ "budget" n\'existe pas dans EspoCRM');
      console.log('   L\'API a retourné une erreur 400 car le champ est inconnu.');
    } else {
      console.error('❌ Erreur:', error.message);
    }
  }
}

checkBudgetField();
