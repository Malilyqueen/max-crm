/**
 * Test d'enrichissement direct sur Casa Bella Design
 */

import 'dotenv/config';
import { analyzeAndEnrichLeads } from './lib/leadEnricher.js';

async function testEnrichCasaBella() {
  console.log('🧪 Test d\'enrichissement - Casa Bella Design\n');

  const casaBellaId = '691b2816e43817b92';

  console.log(`📍 Lead ID: ${casaBellaId}`);
  console.log('📧 Email: contact@casabella-design.fr');
  console.log('📝 Description: Décoration intérieure ; site élégant ; devis personnalisés\n');

  try {
    console.log('🔄 Appel de analyzeAndEnrichLeads...\n');

    const result = await analyzeAndEnrichLeads({
      leadIds: [casaBellaId],
      applyUpdates: true
    });

    console.log('📊 RÉSULTAT:\n');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ Enrichissement terminé!');
      console.log(`   Leads traités: ${result.processedCount || 0}`);
      console.log(`   Leads enrichis: ${result.enrichedCount || 0}`);
      console.log(`   Leads ignorés: ${result.skippedCount || 0}`);

      if (result.results && result.results.length > 0) {
        console.log('\n📋 Détails:');
        result.results.forEach(r => {
          console.log(`   - ${r.lead || r.leadId}`);
          console.log(`     Statut: ${r.success ? '✅' : '❌'}`);
          if (r.enrichment) {
            console.log(`     Secteur: ${r.enrichment.secteur || 'N/A'}`);
            console.log(`     Tags: ${r.enrichment.tags ? r.enrichment.tags.join(', ') : 'N/A'}`);
          }
          if (r.error) {
            console.log(`     Erreur: ${r.error}`);
          }
        });
      }
    } else {
      console.log('\n❌ Échec de l\'enrichissement');
      console.log(`   Erreur: ${result.error || 'Inconnue'}`);
    }

  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    console.error(error.stack);
  }
}

testEnrichCasaBella();
