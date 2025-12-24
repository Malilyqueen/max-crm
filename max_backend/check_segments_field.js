/**
 * Vérifier si le champ segments existe et a des valeurs
 */

import 'dotenv/config';
import { espoFetch } from './lib/espoClient.js';

async function checkSegmentsField() {
  console.log('🔍 VÉRIFICATION DU CHAMP SEGMENTS\n');

  try {
    // Récupérer quelques leads pour vérifier
    const result = await espoFetch('/Lead?maxSize=10&select=id,name,accountName,segments');

    console.log(`Leads récupérés: ${result.list.length}\n`);

    result.list.forEach(lead => {
      const name = lead.name || lead.accountName || lead.id;
      const segments = lead.segments;

      console.log(`📋 ${name}`);
      console.log(`   Champ segments: ${segments !== undefined ? '✅ Existe' : '❌ N\'existe pas'}`);
      if (segments !== undefined) {
        console.log(`   Valeur: ${segments || '(vide)'}`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

checkSegmentsField();
