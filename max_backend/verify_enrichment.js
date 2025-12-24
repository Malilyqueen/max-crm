import { espoFetch } from './lib/espoClient.js';

async function verifyEnrichment() {
  console.log('🔍 Vérification de l\'enrichissement dans EspoCRM...\n');

  try {
    // Récupérer les 5 derniers leads
    const params = new URLSearchParams({
      maxSize: '5',
      orderBy: 'createdAt',
      order: 'desc'
    });

    const result = await espoFetch(`/Lead?${params.toString()}`);

    if (result.list && result.list.length > 0) {
      console.log(`✅ ${result.list.length} leads trouvés\n`);

      result.list.forEach((lead, index) => {
        console.log(`${index + 1}. ${lead.name || '(sans nom)'}`);
        console.log(`   📧 Email: ${lead.emailAddress || '(vide)'}`);
        console.log(`   🏢 Secteur: ${lead.secteur || '❌ VIDE'}`);
        console.log(`   🏷️  Max Tags: ${lead.maxTags ? JSON.stringify(lead.maxTags) : '❌ VIDE'}`);
        console.log(`   📝 Description: ${lead.description ? lead.description.substring(0, 80) + '...' : '❌ VIDE'}`);
        console.log('');
      });

      // Vérifier si AU MOINS UN lead a des données enrichies
      const enrichedCount = result.list.filter(l => l.secteur || (l.maxTags && l.maxTags.length > 0)).length;

      if (enrichedCount === 0) {
        console.log('⚠️ PROBLÈME: AUCUN lead n\'a de secteur ou tags!');
        console.log('💡 Les PATCH ne fonctionnent peut-être pas ou les champs n\'existent pas.');
      } else {
        console.log(`✅ ${enrichedCount}/${result.list.length} leads sont enrichis`);
      }
    } else {
      console.log('❌ Aucun lead trouvé');
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

verifyEnrichment();
