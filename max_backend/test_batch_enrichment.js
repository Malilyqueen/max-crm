/**
 * Test du batch enrichment sur les 3 leads non-enrichis
 */

import 'dotenv/config';
import { batchAnalyzeLeads, formatEnrichedLeadsForUpdate } from './lib/emailAnalyzer.js';
import { espoFetch } from './lib/espoClient.js';

async function testBatchEnrichment() {
  console.log('🧪 Test du batch enrichment sur les leads non-enrichis\n');

  const leadIds = [
    '691b2816e43817b92', // Casa Bella Design
    '691b2816315c8857e', // AlphaDrone Systems
    '691b28141e3008b8c'  // MonJardin Vert
  ];

  try {
    // 1. Charger les leads depuis EspoCRM
    console.log('📥 Chargement des leads depuis EspoCRM...\n');
    const leads = [];
    for (const id of leadIds) {
      const lead = await espoFetch(`/Lead/${id}`);
      leads.push(lead);
      console.log(`   ✓ ${lead.accountName || lead.name}`);
      console.log(`     Email: ${lead.emailAddress || 'N/A'}`);
      console.log(`     Description: ${lead.description || 'N/A'}\n`);
    }

    // 2. Analyser les leads
    console.log('🔍 Analyse en cours...\n');
    const analysisResults = await batchAnalyzeLeads(leads);

    console.log('📊 RÉSULTATS DE L\'ANALYSE:\n');
    console.log(`   Analysés: ${analysisResults.analyzed}`);
    console.log(`   Enrichis: ${analysisResults.enriched}`);
    console.log(`   Ignorés: ${analysisResults.skipped}\n`);

    if (analysisResults.details && analysisResults.details.length > 0) {
      console.log('📋 DÉTAILS PAR LEAD:\n');
      analysisResults.details.forEach((detail, index) => {
        console.log(`   ${index + 1}. ${detail.name}`);
        console.log(`      Statut: ${detail.status}`);
        if (detail.status === 'enriched') {
          console.log(`      Secteur: ${detail.secteur || 'N/A'}`);
          console.log(`      Tags: ${detail.tags ? detail.tags.join(', ') : 'N/A'}`);
          console.log(`      Maturité: ${detail.maturite_digitale || 'N/A'}`);
          console.log(`      Urgence: ${detail.urgence || 'N/A'}`);
          if (detail.strategie_contact) {
            console.log(`      Stratégie: ${detail.strategie_contact.substring(0, 60)}...`);
          }
        } else {
          console.log(`      Raison: ${detail.reason || 'N/A'}`);
        }
        console.log('');
      });
    }

    // 3. Formater pour mise à jour
    console.log('🔧 Formatage pour mise à jour EspoCRM...\n');
    const formattedLeads = formatEnrichedLeadsForUpdate(analysisResults.details);

    console.log(`   Leads formatés pour update: ${formattedLeads.length}\n`);

    if (formattedLeads.length > 0) {
      console.log('📝 DONNÉES PRÊTES POUR ESPOCRM:\n');
      formattedLeads.forEach((lead, index) => {
        console.log(`   ${index + 1}. Lead ID: ${lead.id}`);
        console.log(`      Secteur: ${lead.secteur || 'N/A'}`);
        console.log(`      Tags: ${lead.maxTags ? lead.maxTags.join(', ') : 'N/A'}`);
        if (lead.description) {
          console.log(`      Description: ${lead.description.substring(0, 80)}...`);
        }
        console.log('');
      });

      // 4. Appliquer les mises à jour (optionnel)
      console.log('💾 APPLICATION DES MISES À JOUR...\n');

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
          console.log(`   ✅ ${lead.id} mis à jour`);
        } catch (error) {
          console.log(`   ❌ ${lead.id} échec: ${error.message}`);
        }
      }

      console.log('\n✅ ENRICHISSEMENT TERMINÉ!');
      console.log('   Vérifiez dans EspoCRM que les champs sont maintenant remplis.');

    } else {
      console.log('⚠️  AUCUN LEAD À METTRE À JOUR');
      console.log('   Raisons possibles:');
      console.log('   - Secteur = "Non déterminé" (filtré)');
      console.log('   - Tags vides');
      console.log('   - Erreurs lors de l\'analyse IA');
    }

  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    console.error(error.stack);
  }
}

testBatchEnrichment();
