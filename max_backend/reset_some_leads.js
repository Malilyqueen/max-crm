/**
 * Vider le secteur de 5 leads pour tester M.A.X.
 */

import 'dotenv/config';
import { espoFetch } from './lib/espoClient.js';

async function resetSomeLeads() {
  console.log('🔄 Réinitialisation de 5 leads pour test M.A.X.\n');

  // IDs de 5 leads à réinitialiser
  const leadIds = [
    '691b2816e43817b92', // Casa Bella Design
    '691b2816315c8857e', // AlphaDrone Systems
    '691b28141e3008b8c', // MonJardin Vert
    '690fa5aec2cfd585b', // Jean-Pierre Martin
    '690fa5adcb724e7c2'  // Mohamed Ben Salah
  ];

  for (const id of leadIds) {
    try {
      const lead = await espoFetch(`/Lead/${id}`);

      await espoFetch(`/Lead/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          secteur: null,
          maxTags: []
        })
      });

      console.log(`✅ ${lead.name || lead.accountName} - secteur vidé`);
    } catch (error) {
      console.log(`❌ ${id} - Erreur: ${error.message}`);
    }
  }

  console.log('\n✅ 5 leads réinitialisés. M.A.X. peut maintenant les enrichir!');
}

resetSomeLeads();
