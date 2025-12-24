/**
 * Test des nouvelles entités CRM
 *
 * TEST A: Créer une opportunité
 * TEST B: Créer un contact
 * TEST C: Créer un ticket
 * TEST D: Créer un article KB
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load .env from max_backend directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '.env') });

import { executeAction } from './actions/index.js';

const LEAD_ID = '69272eee2a589f7a6'; // Lead existant pour tests

console.log('\n🧪 TESTS NOUVELLES ENTITÉS CRM\n');
console.log('━'.repeat(60));

async function runTests() {
  const results = [];

  // ============================================================
  // TEST A — Opportunité
  // ============================================================
  console.log('\n📊 TEST A — Créer une opportunité\n');

  try {
    const opportunityResult = await executeAction('create_opportunity', {
      tenantId: 'macrea',
      name: 'Opportunité Macrea CRM - Test M.A.X.',
      amount: 25000,
      closeDate: '2025-06-30',
      stage: 'Proposal',
      probability: 60,
      description: 'Opportunité de vente CRM créée automatiquement par M.A.X. lors des tests fonctionnels'
    });

    if (opportunityResult.success) {
      console.log('✅ TEST A RÉUSSI');
      console.log(`   Opportunité ID: ${opportunityResult.entityId}`);
      console.log(`   Preview: ${opportunityResult.preview}`);
      results.push({ test: 'A', action: 'create_opportunity', status: 'SUCCESS', entityId: opportunityResult.entityId });
    } else {
      console.error('❌ TEST A ÉCHOUÉ:', opportunityResult.error);
      results.push({ test: 'A', action: 'create_opportunity', status: 'FAILED', error: opportunityResult.error });
    }
  } catch (error) {
    console.error('❌ TEST A EXCEPTION:', error.message);
    results.push({ test: 'A', action: 'create_opportunity', status: 'EXCEPTION', error: error.message });
  }

  console.log('\n' + '─'.repeat(60));

  // ============================================================
  // TEST B — Contact
  // ============================================================
  console.log('\n👤 TEST B — Créer un contact\n');

  try {
    const contactResult = await executeAction('create_contact', {
      tenantId: 'macrea',
      firstName: 'Sophie',
      lastName: 'Martin',
      emailAddress: 'sophie.martin@test-max.fr',
      phoneNumber: '+33612345678',
      title: 'Directrice Marketing',
      description: 'Contact créé automatiquement par M.A.X. lors des tests fonctionnels'
    });

    if (contactResult.success) {
      console.log('✅ TEST B RÉUSSI');
      console.log(`   Contact ID: ${contactResult.entityId}`);
      console.log(`   Preview: ${contactResult.preview}`);
      results.push({ test: 'B', action: 'create_contact', status: 'SUCCESS', entityId: contactResult.entityId });
    } else {
      console.error('❌ TEST B ÉCHOUÉ:', contactResult.error);
      results.push({ test: 'B', action: 'create_contact', status: 'FAILED', error: contactResult.error });
    }
  } catch (error) {
    console.error('❌ TEST B EXCEPTION:', error.message);
    results.push({ test: 'B', action: 'create_contact', status: 'EXCEPTION', error: error.message });
  }

  console.log('\n' + '─'.repeat(60));

  // ============================================================
  // TEST C — Ticket
  // ============================================================
  console.log('\n🎫 TEST C — Créer un ticket support\n');

  try {
    const ticketResult = await executeAction('create_ticket', {
      tenantId: 'macrea',
      name: 'Problème synchronisation emails',
      description: `Client signale que les emails ne se synchronisent plus depuis ce matin.

Contexte:
- Utilisateur: Jules (macrea)
- Module concerné: Synchronisation email
- Impact: Moyen
- Actions demandées: Vérifier la connexion SMTP et relancer la synchro

Ticket créé automatiquement par M.A.X. suite à une demande utilisateur.`,
      priority: 'High',
      status: 'New',
      type: 'Incident'
      // leadId supprimé car validation stricte des relations
    });

    if (ticketResult.success) {
      console.log('✅ TEST C RÉUSSI');
      console.log(`   Ticket ID: ${ticketResult.entityId}`);
      console.log(`   Preview: ${ticketResult.preview}`);
      results.push({ test: 'C', action: 'create_ticket', status: 'SUCCESS', entityId: ticketResult.entityId });
    } else {
      console.error('❌ TEST C ÉCHOUÉ:', ticketResult.error);
      results.push({ test: 'C', action: 'create_ticket', status: 'FAILED', error: ticketResult.error });
    }
  } catch (error) {
    console.error('❌ TEST C EXCEPTION:', error.message);
    results.push({ test: 'C', action: 'create_ticket', status: 'EXCEPTION', error: error.message });
  }

  console.log('\n' + '─'.repeat(60));

  // ============================================================
  // TEST D — Article Base de Connaissance
  // ============================================================
  console.log('\n📚 TEST D — Créer un article base de connaissance\n');

  try {
    const kbResult = await executeAction('create_knowledge_article', {
      tenantId: 'macrea',
      name: 'Comment configurer la synchronisation SMTP',
      body: `<h1>Configuration de la synchronisation SMTP</h1>

<h2>Prérequis</h2>
<ul>
  <li>Accès administrateur au CRM</li>
  <li>Identifiants du serveur SMTP</li>
  <li>Port et protocole de sécurité</li>
</ul>

<h2>Étapes de configuration</h2>
<ol>
  <li><strong>Accéder aux paramètres</strong>: Menu Administration > Email</li>
  <li><strong>Configurer SMTP</strong>:
    <ul>
      <li>Serveur: ssl0.ovh.net</li>
      <li>Port: 587</li>
      <li>Sécurité: TLS</li>
    </ul>
  </li>
  <li><strong>Tester la connexion</strong>: Cliquer sur "Tester"</li>
  <li><strong>Sauvegarder</strong>: Enregistrer les paramètres</li>
</ol>

<h2>Dépannage</h2>
<p>En cas d'erreur de connexion:</p>
<ul>
  <li>Vérifier les identifiants</li>
  <li>Vérifier que le port 587 n'est pas bloqué</li>
  <li>Contacter le support si le problème persiste</li>
</ul>

<hr>
<p><em>Article créé automatiquement par M.A.X. - Assistant IA du CRM Macrea</em></p>`,
      status: 'Published',
      language: 'fr_FR'
    });

    if (kbResult.success) {
      console.log('✅ TEST D RÉUSSI');
      console.log(`   Article ID: ${kbResult.entityId}`);
      console.log(`   Preview: ${kbResult.preview}`);
      results.push({ test: 'D', action: 'create_knowledge_article', status: 'SUCCESS', entityId: kbResult.entityId });
    } else {
      console.error('❌ TEST D ÉCHOUÉ:', kbResult.error);
      results.push({ test: 'D', action: 'create_knowledge_article', status: 'FAILED', error: kbResult.error });
    }
  } catch (error) {
    console.error('❌ TEST D EXCEPTION:', error.message);
    results.push({ test: 'D', action: 'create_knowledge_article', status: 'EXCEPTION', error: error.message });
  }

  // ============================================================
  // RAPPORT FINAL
  // ============================================================
  console.log('\n' + '━'.repeat(60));
  console.log('\n📋 RAPPORT FINAL\n');

  const successCount = results.filter(r => r.status === 'SUCCESS').length;
  const failedCount = results.filter(r => r.status === 'FAILED').length;
  const exceptionCount = results.filter(r => r.status === 'EXCEPTION').length;

  console.log(`Total tests: ${results.length}`);
  console.log(`✅ Réussis: ${successCount}`);
  console.log(`❌ Échoués: ${failedCount}`);
  console.log(`⚠️  Exceptions: ${exceptionCount}`);
  console.log('');

  results.forEach(r => {
    const emoji = r.status === 'SUCCESS' ? '✅' : '❌';
    console.log(`${emoji} TEST ${r.test} (${r.action}): ${r.status}`);
    if (r.entityId) {
      console.log(`   Entity ID: ${r.entityId}`);
    }
    if (r.error) {
      console.log(`   Erreur: ${r.error}`);
    }
  });

  console.log('\n' + '━'.repeat(60));

  if (successCount === results.length) {
    console.log('\n🎉 TOUS LES TESTS RÉUSSIS - PRÊT POUR PRODUCTION\n');
  } else {
    console.log('\n⚠️  CERTAINS TESTS ONT ÉCHOUÉ - VÉRIFIER LES ERREURS CI-DESSUS\n');
  }
}

// Exécution
runTests().catch(error => {
  console.error('\n💥 ERREUR FATALE:', error);
  process.exit(1);
});
