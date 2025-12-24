/**
 * Test des actions dynamiques et boutons Allow/Skip/Auto
 */

import fetch from 'node-fetch';
import fs from 'fs';

const API_URL = 'http://127.0.0.1:3005/api/chat';

async function testChat(message, sessionId = null) {
  console.log(`\n📤 Message: "${message}"`);

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
  console.log(`\n📥 Réponse M.A.X.:`);
  console.log(data.response || data.error);

  if (data.actions) {
    console.log(`\n🔘 Actions proposées: ${data.actions.length}`);
    data.actions.forEach((action, i) => {
      console.log(`\n  ${i + 1}. ${action.label}`);
      if (action.description) {
        console.log(`     ${action.description}`);
      }
      if (action.permissionButtons) {
        console.log(`     Boutons: ${action.permissionButtons.map(b => b.label).join(' | ')}`);
      }
    });
  } else {
    console.log('\n🔘 Aucune action proposée');
  }

  return data;
}

async function createPostImportSession() {
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
          { name: 'Email', completionRate: 100, type: 'email' }
        ],
        data: []
      }
    },
    enrichedData: {
      enrichedLeads: [],
      enrichmentData: { tags: ['Cosmétique', 'Salon'] },
      stats: {},
      enrichedAt: new Date().toISOString()
    },
    imported: true,
    importedAt: new Date().toISOString()
  };

  const sessionPath = `./conversations/${sessionId}.json`;
  fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2));
  console.log(`✅ Session post-import créée: ${sessionId}`);
  return sessionId;
}

async function runTests() {
  console.log('🧪 Test des Actions Dynamiques M.A.X.\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Créer une session avec import déjà fait
    const sessionId = await createPostImportSession();

    // Test: Demander conseil post-import (M.A.X. devrait proposer des actions dynamiques)
    console.log('\n1️⃣ Test: Actions dynamiques post-import');
    console.log('─────────────────────────────────────');
    await testChat(
      'Les leads ont été importés. Que me conseilles-tu pour optimiser ma prospection ?',
      sessionId
    );

    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Test terminé!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('💡 Note: Si M.A.X. propose des actions avec boutons Allow/Skip/Auto,');
    console.log('   le système fonctionne correctement !');

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error(error);
  }
}

runTests();
