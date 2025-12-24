/**
 * Enrichir tous les leads sans secteur
 */

import 'dotenv/config';
import { espoFetch } from './lib/espoClient.js';
import { batchAnalyzeLeads, formatEnrichedLeadsForUpdate } from './lib/emailAnalyzer.js';

async function enrichAllMissing() {
  console.log('🔍 Recherche des leads sans secteur...\n');

  // Récupérer tous les leads sans secteur
  const result = await espoFetch('/Lead?select=id,name,accountName,emailAddress,phoneNumber,addressCity,website,description,secteur&maxSize=50&orderBy=createdAt&order=desc');

  const leadsWithoutSecteur = result.list.filter(l => !l.secteur);

  console.log(`📊 Leads trouvés: ${result.list.length}`);
  console.log(`❌ Leads sans secteur: ${leadsWithoutSecteur.length}\n`);

  if (leadsWithoutSecteur.length === 0) {
    console.log('✅ Tous les leads ont déjà un secteur !');
    return;
  }

  console.log('📋 Leads à enrichir:\n');
  leadsWithoutSecteur.forEach((l, i) => {
    console.log(`   ${i + 1}. ${l.name || l.accountName || '(sans nom)'}`);
    console.log(`      Email: ${l.emailAddress || 'N/A'}`);
    console.log(`      Description: ${l.description ? l.description.substring(0, 50) + '...' : 'N/A'}\n`);
  });

  console.log('🔄 Démarrage de l\'enrichissement...\n');

  // Analyser les leads
  const analysisResults = await batchAnalyzeLeads(leadsWithoutSecteur);

  console.log('\n📊 RÉSULTATS DE L\'ANALYSE:');
  console.log(`   ✅ Enrichis: ${analysisResults.enriched}`);
  console.log(`   ⏭️  Ignorés: ${analysisResults.skipped}\n`);

  // Formater pour mise à jour
  const formattedLeads = formatEnrichedLeadsForUpdate(analysisResults.details);

  if (formattedLeads.length === 0) {
    console.log('⚠️  Aucun lead n\'a pu être enrichi.');
    return;
  }

  console.log(`💾 Application des mises à jour (${formattedLeads.length} leads)...\n`);

  let successCount = 0;
  let failCount = 0;

  for (const lead of formattedLeads) {
    try {
      await espoFetch(`/Lead/${lead.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          secteur: lead.secteur,
          maxTags: lead.maxTags,
          description: lead.description
        })
      });

      const leadName = analysisResults.details.find(d => d.leadId === lead.id)?.name || lead.id;
      console.log(`   ✅ ${leadName}`);
      console.log(`      Secteur: ${lead.secteur}`);
      console.log(`      Tags: ${lead.maxTags ? lead.maxTags.join(', ') : 'N/A'}\n`);

      successCount++;
    } catch (error) {
      console.log(`   ❌ ${lead.id} - Erreur: ${error.message}\n`);
      failCount++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('✅ ENRICHISSEMENT TERMINÉ !');
  console.log('═══════════════════════════════════════════════════');
  console.log(`   Succès: ${successCount}`);
  console.log(`   Échecs: ${failCount}`);
  console.log(`   Total: ${successCount + failCount}/${leadsWithoutSecteur.length} leads`);
  console.log('\n💡 Vérifiez dans EspoCRM que les champs sont maintenant remplis.');
}

enrichAllMissing().catch(err => {
  console.error('\n❌ ERREUR:', err.message);
  console.error(err.stack);
});
