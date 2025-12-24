/**
 * Test de M.A.X. via l'API Chat pour enrichissement
 *
 * Ce script teste si M.A.X. peut enrichir les leads correctement
 * avec les prompts optimisés et l'analyzer amélioré.
 */

import 'dotenv/config';
import fetch from 'node-fetch';

const API_BASE = 'http://127.0.0.1:3005';

async function testMaxEnrichment() {
  console.log('🧪 Test de M.A.X. - Enrichissement des leads\n');
  console.log('📍 Configuration:');
  console.log(`   Provider: ${process.env.AI_PROVIDER}`);
  console.log(`   Model: ${process.env.AI_MODEL}`);
  console.log(`   API Base: ${API_BASE}\n`);

  try {
    // Créer une nouvelle session
    console.log('📝 Création d\'une nouvelle session...');
    const sessionRes = await fetch(`${API_BASE}/api/chat/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionName: 'Test Enrichissement' })
    });

    if (!sessionRes.ok) {
      throw new Error(`Échec création session: ${sessionRes.status} ${await sessionRes.text()}`);
    }

    const sessionData = await sessionRes.json();
    const sessionId = sessionData.sessionId;
    console.log(`✅ Session créée: ${sessionId}\n`);

    // Demander à M.A.X. d'enrichir les 3 derniers leads
    console.log('💬 Envoi de la demande à M.A.X.: "Enrichis les 3 derniers leads"\n');
    const chatRes = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        userMessage: 'Enrichis les 3 derniers leads'
      })
    });

    if (!chatRes.ok) {
      throw new Error(`Échec chat: ${chatRes.status} ${await chatRes.text()}`);
    }

    const chatData = await chatRes.json();

    console.log('📨 RÉPONSE DE M.A.X.:');
    console.log('═'.repeat(80));
    console.log(chatData.aiMessage || '(Réponse vide)');
    console.log('═'.repeat(80));

    if (chatData.status) {
      console.log(`\n📊 Statut: ${chatData.status}`);
    }

    // Vérifier si M.A.X. a fourni un rapport détaillé
    const hasNumbers = /\d+\/\d+|\d+ leads?/i.test(chatData.aiMessage || '');
    const hasResults = /secteur|tags|enrichi/i.test(chatData.aiMessage || '');

    console.log('\n🔍 ANALYSE DE LA RÉPONSE:');
    console.log(`   Contient des chiffres précis: ${hasNumbers ? '✅' : '❌'}`);
    console.log(`   Contient des résultats d'enrichissement: ${hasResults ? '✅' : '❌'}`);
    console.log(`   Longueur de la réponse: ${(chatData.aiMessage || '').length} caractères`);

    if (!hasNumbers || !hasResults) {
      console.log('\n⚠️  AVERTISSEMENT: La réponse de M.A.X. ne semble pas complète!');
      console.log('   Il devrait fournir des chiffres précis et des détails d\'enrichissement.');
    } else {
      console.log('\n✅ SUCCESS: M.A.X. a fourni un rapport détaillé!');
    }

  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    console.error(error);
  }
}

// Vérifier que le serveur est démarré
console.log('⏳ Vérification que le serveur M.A.X. est démarré...\n');
fetch(`${API_BASE}/api/max-status`)
  .then(res => {
    if (res.ok) {
      console.log('✅ Serveur M.A.X. est actif!\n');
      testMaxEnrichment();
    } else {
      console.error('❌ Le serveur M.A.X. ne répond pas correctement.');
      console.error('   Veuillez démarrer le serveur avec: npm start');
    }
  })
  .catch(err => {
    console.error('❌ Impossible de se connecter au serveur M.A.X.');
    console.error('   Assurez-vous que le serveur est démarré avec: npm start');
    console.error(`   Erreur: ${err.message}`);
  });
