/**
 * Test complet Function Calling avec confirmation
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
        summary: { rowCount: 10, columnCount: 6 },
        columns: [
          { name: 'Prénom', completionRate: 100, type: 'string' },
          { name: 'Nom', completionRate: 100, type: 'string' },
          { name: 'Email', completionRate: 100, type: 'email' },
          { name: 'Téléphone', completionRate: 100, type: 'phone' },
          { name: 'Entreprise', completionRate: 100, type: 'string' },
          { name: 'Poste', completionRate: 100, type: 'string' }
        ],
        data: [
          { 'Prénom': 'Sophie', 'Nom': 'Martin', 'Email': 'sophie.martin@beaute-luxe.fr', 'Téléphone': '0601020304', 'Entreprise': 'Beauté Luxe', 'Poste': 'Directrice Marketing' },
          { 'Prénom': 'Marie', 'Nom': 'Dubois', 'Email': 'marie.d@cosmetik-pro.com', 'Téléphone': '0605060708', 'Entreprise': 'Cosmetik Pro', 'Poste': 'Acheteuse' },
          { 'Prénom': 'Jean', 'Nom': 'Durand', 'Email': 'j.durand@parfum-elite.fr', 'Téléphone': '0612131415', 'Entreprise': 'Parfum Elite', 'Poste': 'PDG' },
          { 'Prénom': 'Laura', 'Nom': 'Bernard', 'Email': 'laura@skincare-lab.com', 'Téléphone': '0698765432', 'Entreprise': 'SkinCare Lab', 'Poste': 'Responsable Produit' },
          { 'Prénom': 'Thomas', 'Nom': 'Petit', 'Email': 'thomas.p@makeup-store.fr', 'Téléphone': '0687654321', 'Entreprise': 'MakeUp Store', 'Poste': 'Gérant' }
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

async function runFullTest() {
  console.log('🧪 Test Complet Function Calling M.A.X.\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const sessionId = await createTestSession();

    // Étape 1: Fournir contexte (devrait enrichir automatiquement)
    console.log('\n1️⃣ Fourniture du contexte');
    console.log('─────────────────────────────────────');
    await testChat('Ces leads viennent du salon cosmétique Paris 2025, secteur beauté premium et luxe', sessionId);

    // Étape 2: Vérifier l'enrichissement
    console.log('\n\n2️⃣ Vérification enrichissement');
    console.log('─────────────────────────────────────');
    const sessionPath = `./conversations/${sessionId}.json`;
    let sessionContent = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));

    if (sessionContent.enrichedData) {
      console.log('✅ Enrichissement réussi!');
      console.log(`   📊 Leads enrichis: ${sessionContent.enrichedData.enrichedLeads?.length || 0}`);
      console.log(`   🏷️  Tags: ${sessionContent.enrichedData.enrichmentData?.tags?.join(', ') || 'N/A'}`);
      console.log(`   📍 Source: ${sessionContent.enrichedData.enrichmentData?.source || 'N/A'}`);
    } else {
      console.log('⚠️  Aucune donnée enrichie, M.A.X. attend probablement une confirmation explicite');
      console.log('   Réessayons avec "Oui, enrichis les leads"...\n');

      await testChat('Oui, enrichis ces leads avec ce contexte', sessionId);

      sessionContent = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
      if (sessionContent.enrichedData) {
        console.log('\n✅ Enrichissement réussi après confirmation!');
        console.log(`   📊 Leads enrichis: ${sessionContent.enrichedData.enrichedLeads?.length || 0}`);
        console.log(`   🏷️  Tags: ${sessionContent.enrichedData.enrichmentData?.tags?.join(', ') || 'N/A'}`);
        console.log(`   📍 Source: ${sessionContent.enrichedData.enrichmentData?.source || 'N/A'}`);
      } else {
        console.log('❌ Enrichissement non effectué même après confirmation');
      }
    }

    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Test complet terminé!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error(error);
  }
}

runFullTest();
