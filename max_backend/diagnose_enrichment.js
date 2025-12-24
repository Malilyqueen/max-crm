/**
 * Script de diagnostic pour vérifier l'enrichissement des leads
 *
 * Ce script vérifie :
 * 1. Si les champs secteur et maxTags existent dans EspoCRM
 * 2. Si les leads ont des valeurs dans ces champs
 * 3. Si les layouts affichent ces champs
 */

import 'dotenv/config';
import { espoFetch } from './lib/espoClient.js';

async function diagnoseEnrichment() {
  console.log('🔍 DIAGNOSTIC - Enrichissement des leads\n');

  try {
    // 1. Vérifier les métadonnées des champs Lead
    console.log('1️⃣ Vérification des métadonnées Lead...');
    try {
      const metadata = await espoFetch('/Metadata');
      const leadFields = metadata?.entityDefs?.Lead?.fields || {};

      console.log('\n📋 Champs Lead disponibles :');
      console.log(`   - secteur: ${leadFields.secteur ? '✅ EXISTE' : '❌ MANQUANT'}`);
      console.log(`   - maxTags: ${leadFields.maxTags ? '✅ EXISTE' : '❌ MANQUANT'}`);

      if (leadFields.secteur) {
        console.log(`     Type: ${leadFields.secteur.type}`);
      }
      if (leadFields.maxTags) {
        console.log(`     Type: ${leadFields.maxTags.type}`);
        console.log(`     AllowCustomOptions: ${leadFields.maxTags.allowCustomOptions}`);
      }
    } catch (metaError) {
      console.log('   ⚠️ Impossible de récupérer les métadonnées:', metaError.message);
    }

    // 2. Récupérer les 5 derniers leads et vérifier leurs champs
    console.log('\n2️⃣ Vérification des 5 derniers leads...');
    const params = new URLSearchParams({
      maxSize: '5',
      orderBy: 'createdAt',
      order: 'desc',
      select: 'id,name,emailAddress,accountName,secteur,maxTags,description'
    });

    const result = await espoFetch(`/Lead?${params.toString()}`);

    if (!result || !result.list) {
      console.log('   ❌ Impossible de récupérer les leads');
      return;
    }

    console.log(`\n   Trouvé ${result.list.length} leads:\n`);

    result.list.forEach((lead, index) => {
      console.log(`   ${index + 1}. ${lead.name || lead.accountName || '(sans nom)'} [ID: ${lead.id}]`);
      console.log(`      📧 Email: ${lead.emailAddress || 'N/A'}`);
      console.log(`      🏢 Secteur: ${lead.secteur || '❌ VIDE'}`);

      if (lead.maxTags) {
        if (Array.isArray(lead.maxTags)) {
          console.log(`      🏷️  Tags: ${lead.maxTags.length > 0 ? lead.maxTags.join(', ') : '❌ VIDE'}`);
        } else {
          console.log(`      🏷️  Tags: ${lead.maxTags}`);
        }
      } else {
        console.log(`      🏷️  Tags: ❌ VIDE`);
      }

      if (lead.description) {
        const desc = lead.description.substring(0, 60);
        console.log(`      📝 Description: ${desc}${lead.description.length > 60 ? '...' : ''}`);
      }
      console.log('');
    });

    // 3. Compter combien de leads sont enrichis
    const enrichedCount = result.list.filter(l => l.secteur || (l.maxTags && l.maxTags.length > 0)).length;
    const totalCount = result.list.length;

    console.log('📊 RÉSUMÉ:');
    console.log(`   Leads enrichis: ${enrichedCount}/${totalCount}`);
    console.log(`   Leads avec secteur: ${result.list.filter(l => l.secteur).length}/${totalCount}`);
    console.log(`   Leads avec tags: ${result.list.filter(l => l.maxTags && l.maxTags.length > 0).length}/${totalCount}`);

    if (enrichedCount === 0) {
      console.log('\n⚠️  PROBLÈME: Aucun lead n\'est enrichi!');
      console.log('   Causes possibles:');
      console.log('   - M.A.X. n\'appelle pas analyze_and_enrich_leads');
      console.log('   - analyze_and_enrich_leads ne met pas à jour EspoCRM');
      console.log('   - Les champs ne sont pas correctement configurés');
    } else if (enrichedCount < totalCount) {
      console.log(`\n⚠️  Seulement ${enrichedCount}/${totalCount} leads enrichis`);
    } else {
      console.log('\n✅ Tous les leads sont enrichis!');
    }

    // 4. Tester l'écriture directe d'un lead
    console.log('\n3️⃣ Test d\'écriture directe...');
    if (result.list.length > 0) {
      const testLead = result.list[0];
      console.log(`   Test sur: ${testLead.name || testLead.accountName}`);

      try {
        const updateResult = await espoFetch(`/Lead/${testLead.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            secteur: 'Test Diagnostic',
            maxTags: ['DiagnosticTag', 'TestTag']
          })
        });

        if (updateResult && updateResult.id) {
          console.log('   ✅ Écriture réussie!');

          // Relire pour vérifier
          const verifyResult = await espoFetch(`/Lead/${testLead.id}`);
          console.log(`   Vérification - Secteur: ${verifyResult.secteur}`);
          console.log(`   Vérification - Tags: ${verifyResult.maxTags ? verifyResult.maxTags.join(', ') : 'vide'}`);

          // Restaurer les valeurs originales si c'était un test
          if (testLead.secteur !== 'Test Diagnostic') {
            await espoFetch(`/Lead/${testLead.id}`, {
              method: 'PUT',
              body: JSON.stringify({
                secteur: testLead.secteur || null,
                maxTags: testLead.maxTags || []
              })
            });
            console.log('   ↩️  Valeurs originales restaurées');
          }
        } else {
          console.log('   ❌ Échec de l\'écriture');
        }
      } catch (writeError) {
        console.log(`   ❌ Erreur: ${writeError.message}`);
      }
    }

  } catch (error) {
    console.error('\n❌ ERREUR GLOBALE:', error.message);
    console.error(error);
  }
}

diagnoseEnrichment();
