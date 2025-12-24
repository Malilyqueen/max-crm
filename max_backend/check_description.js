import { espoFetch } from './lib/espoClient.js';

async function checkDescription() {
  console.log('🔍 Vérification du champ description pour Maison Delacour...\n');

  try {
    // Chercher Maison Delacour
    const params = new URLSearchParams({
      where: JSON.stringify([{
        type: 'contains',
        attribute: 'name',
        value: 'Maison Delacour'
      }])
    });

    const result = await espoFetch(`/Lead?${params.toString()}`);

    if (result.list && result.list.length > 0) {
      const lead = result.list[0];
      console.log('✅ Lead trouvé:', lead.name);
      console.log('📧 Email:', lead.emailAddress);
      console.log('📝 Description:', lead.description || '(vide)');
      console.log('🏷️ Max Tags:', lead.maxTags || '(vide)');
      console.log('🏢 Secteur:', lead.secteur || '(vide)');
      console.log('\n');

      if (!lead.description || !lead.description.trim()) {
        console.log('⚠️ PROBLÈME: Le champ description est VIDE!');
        console.log('💡 La remarque du CSV n\'a pas été importée dans le champ description.');
        console.log('💡 M.A.X. ne peut pas enrichir sans informations dans la description.');
      } else {
        console.log('✅ La description contient:', lead.description.substring(0, 100) + '...');
      }
    } else {
      console.log('❌ Lead "Maison Delacour" non trouvé');
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

checkDescription();
