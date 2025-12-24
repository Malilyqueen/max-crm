/**
 * Test simple Function Calling de M.A.X.
 */

import fetch from 'node-fetch';
import fs from 'fs';

const API_URL = 'http://127.0.0.1:3005/api/chat';

async function testChat(message, sessionId = null) {
  console.log(`\n📤 Envoi: "${message}"`);

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
  console.log(`📥 Réponse M.A.X.: ${data.response || data.error}`);

  if (data.actions) {
    console.log(`🔘 Actions: ${data.actions.map(a => a.label).join(', ')}`);
  }

  return data;
}

async function createTestSession() {
  // Créer manuellement une session avec un fichier uploadé
  const sessionId = `session_${Date.now()}_test`;
  const sessionData = {
    id: sessionId,
    mode: 'assisté',
    createdAt: new Date().toISOString(),
    messages: [],
    uploadedFile: {
      filename: 'leads_salon_cosmetique.csv',
      path: 'test_path.csv',
      uploadedAt: new Date().toISOString(),
      analysis: {
        summary: {
          rowCount: 10,
          columnCount: 6
        },
        columns: [
          { name: 'Prénom', completionRate: 100, type: 'string' },
          { name: 'Nom', completionRate: 100, type: 'string' },
          { name: 'Email', completionRate: 100, type: 'email' },
          { name: 'Téléphone', completionRate: 100, type: 'phone' },
          { name: 'Entreprise', completionRate: 100, type: 'string' },
          { name: 'Poste', completionRate: 100, type: 'string' }
        ],
        data: [
          {
            'Prénom': 'Sophie',
            'Nom': 'Martin',
            'Email': 'sophie.martin@beaute-luxe.fr',
            'Téléphone': '0601020304',
            'Entreprise': 'Beauté Luxe',
            'Poste': 'Directrice Marketing'
          },
          {
            'Prénom': 'Marie',
            'Nom': 'Dubois',
            'Email': 'marie.d@cosmetik-pro.com',
            'Téléphone': '0605060708',
            'Entreprise': 'Cosmetik Pro',
            'Poste': 'Acheteuse'
          },
          {
            'Prénom': 'Jean',
            'Nom': 'Durand',
            'Email': 'j.durand@parfum-elite.fr',
            'Téléphone': '0612131415',
            'Entreprise': 'Parfum Elite',
            'Poste': 'PDG'
          },
          {
            'Prénom': 'Laura',
            'Nom': 'Bernard',
            'Email': 'laura@skincare-lab.com',
            'Téléphone': '0698765432',
            'Entreprise': 'SkinCare Lab',
            'Poste': 'Responsable Produit'
          },
          {
            'Prénom': 'Thomas',
            'Nom': 'Petit',
            'Email': 'thomas.p@makeup-store.fr',
            'Téléphone': '0687654321',
            'Entreprise': 'MakeUp Store',
            'Poste': 'Gérant'
          }
        ],
        missingFields: []
      }
    }
  };

  const sessionPath = `./conversations/${sessionId}.json`;
  fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2));
  console.log(`✅ Session de test créée: ${sessionId}`);

  return sessionId;
}

async function runTests() {
  console.log('🧪 Test Function Calling M.A.X.\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Créer une session avec un fichier uploadé
    const sessionId = await createTestSession();

    // Test 1: Demander les données du fichier (devrait utiliser get_uploaded_file_data)
    console.log('\n1️⃣ Test: get_uploaded_file_data()');
    console.log('─────────────────────────────────────');
    await testChat('Montre-moi les données du fichier que j\'ai uploadé', sessionId);

    // Test 2: Fournir du contexte pour enrichissement (devrait utiliser enrich_and_import_leads)
    console.log('\n\n2️⃣ Test: enrich_and_import_leads()');
    console.log('─────────────────────────────────────');
    await testChat('Ces leads viennent du salon cosmétique Paris 2025, secteur beauté premium', sessionId);

    // Test 3: Vérifier l'enrichissement
    console.log('\n\n3️⃣ Vérification de la session');
    console.log('─────────────────────────────────────');
    const sessionPath = `./conversations/${sessionId}.json`;
    const sessionContent = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));

    if (sessionContent.enrichedData) {
      console.log('✅ Enrichissement réussi!');
      console.log(`   📊 Leads enrichis: ${sessionContent.enrichedData.enrichedLeads?.length || 0}`);
      console.log(`   🏷️  Tags: ${sessionContent.enrichedData.enrichmentData?.tags?.join(', ') || 'N/A'}`);
      console.log(`   📍 Source: ${sessionContent.enrichedData.enrichmentData?.source || 'N/A'}`);
      console.log(`   📌 Statut: ${sessionContent.enrichedData.enrichmentData?.status || 'N/A'}`);
    } else {
      console.log('⚠️  Aucune donnée enrichie trouvée');
    }

    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Tests terminés!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Erreur lors des tests:', error.message);
    console.error(error);
  }
}

runTests();
