/**
 * Test script pour vérifier le Function Calling de M.A.X.
 */

import fetch from 'node-fetch';

const API_URL = 'http://127.0.0.1:3005/api/chat';

async function testChat(message, sessionId = null) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      message,
      mode: 'assisté'
    })
  });

  const data = await response.json();
  return data;
}

async function testUpload(filePath, sessionId) {
  const FormData = (await import('form-data')).default;
  const fs = (await import('fs')).default;

  const form = new FormData();
  form.append('sessionId', sessionId);
  form.append('file', fs.createReadStream(filePath));

  const response = await fetch('http://127.0.0.1:3005/api/chat/upload', {
    method: 'POST',
    body: form,
    headers: form.getHeaders()
  });

  return await response.json();
}

async function runTests() {
  console.log('🧪 Test Function Calling M.A.X.\n');

  try {
    // 1. Créer une session
    console.log('1️⃣ Création de session...');
    const session1 = await testChat('Bonjour M.A.X.');
    const sessionId = session1.sessionId;
    console.log(`✅ Session créée: ${sessionId}`);
    console.log(`📝 Réponse: ${session1.response}\n`);

    // 2. Uploader un fichier CSV (si disponible)
    console.log('2️⃣ Upload fichier CSV...');
    const testCsvPath = 'd:\\Macrea\\CRM\\max_backend\\test_leads.csv';
    const fs = (await import('fs')).default;

    if (!fs.existsSync(testCsvPath)) {
      // Créer un fichier CSV de test
      const csvContent = `Prénom,Nom,Email,Téléphone,Entreprise,Poste
Sophie,Martin,sophie.martin@beaute-luxe.fr,0601020304,Beauté Luxe,Directrice Marketing
Marie,Dubois,marie.d@cosmetik-pro.com,0605060708,Cosmetik Pro,Acheteuse
Jean,Durand,j.durand@parfum-elite.fr,0612131415,Parfum Elite,PDG
Laura,Bernard,laura@skincare-lab.com,0698765432,SkinCare Lab,Responsable Produit
Thomas,Petit,thomas.p@makeup-store.fr,0687654321,MakeUp Store,Gérant
Claire,Robert,claire.r@beautyshop.fr,0676543210,Beauty Shop,Chef de Produit
Nicolas,Richard,n.richard@cosmo-france.com,0665432109,Cosmo France,Directeur Commercial
Isabelle,Simon,isabelle@glamour-beauty.fr,0654321098,Glamour Beauty,Propriétaire
Pierre,Laurent,pierre.l@soin-visage.com,0643210987,Soin Visage,Responsable Ventes
Camille,Lefebvre,camille@natural-cosm.fr,0632109876,Natural Cosm,Fondatrice`;

      fs.writeFileSync(testCsvPath, csvContent, 'utf-8');
      console.log('✅ Fichier CSV de test créé');
    }

    const uploadResult = await testUpload(testCsvPath, sessionId);
    console.log(`✅ Fichier uploadé: ${uploadResult.analysis?.summary.rowCount || 0} leads`);
    console.log(`📝 Message M.A.X.: ${uploadResult.message}\n`);

    // 3. Test Function Calling - Demander analyse du fichier
    console.log('3️⃣ Test get_uploaded_file_data...');
    const analysisResponse = await testChat('Peux-tu me résumer les données du fichier ?', sessionId);
    console.log(`📝 Réponse: ${analysisResponse.response}\n`);

    // 4. Test Function Calling - Enrichissement avec contexte
    console.log('4️⃣ Test enrich_and_import_leads...');
    const enrichResponse = await testChat('Ces leads viennent du salon cosmétique Paris 2025, ce sont des marques premium beauté et maquillage.', sessionId);
    console.log(`📝 Réponse: ${enrichResponse.response}`);
    if (enrichResponse.actions) {
      console.log(`🔘 Actions disponibles: ${enrichResponse.actions.map(a => a.label).join(', ')}`);
    }
    console.log('');

    // 5. Vérifier que l'enrichissement a fonctionné
    console.log('5️⃣ Vérification session...');
    const sessionResponse = await fetch(`http://127.0.0.1:3005/api/chat/session/${sessionId}`);
    const sessionData = await sessionResponse.json();

    if (sessionData.conversation?.enrichedData) {
      console.log('✅ Données enrichies présentes dans la session');
      console.log(`   - Leads enrichis: ${sessionData.conversation.enrichedData.enrichedLeads?.length || 0}`);
      console.log(`   - Tags: ${sessionData.conversation.enrichedData.enrichmentData?.tags?.join(', ') || 'N/A'}`);
      console.log(`   - Source: ${sessionData.conversation.enrichedData.enrichmentData?.source || 'N/A'}`);
    } else {
      console.log('❌ Aucune donnée enrichie dans la session');
    }

    console.log('\n✅ Tests terminés avec succès!');

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error.message);
    console.error(error);
  }
}

runTests();
