/**
 * TEST NORMALIZATION - Teste le système de validation et normalisation des champs
 */

import { validateLeadUpdate, normalizeLeadUpdate, checkSchemaConsistency } from '../lib/fieldValidator.js';
import { healthCheck, autoHeal } from '../lib/selfHealing.js';
import { safeUpdateLead } from '../lib/espoClient.js';
import { espoFetch } from '../lib/espoClient.js';

console.log('='.repeat(80));
console.log('🧪 TEST NORMALIZATION - Validation du système M.A.X.');
console.log('='.repeat(80) + '\n');

/**
 * Test 1: Validation des champs
 */
async function testValidation() {
  console.log('📋 TEST 1 - Validation des champs\n');

  const testCases = [
    {
      name: 'Champs valides',
      data: {
        tagsIA: ['PME', 'Tech'],
        secteurInfere: 'Technologies',
        scoreIA: 85,
        description: 'Test'
      },
      shouldPass: true
    },
    {
      name: 'Champs dépréciés (auto-migration)',
      data: {
        secteur: 'Tech',  // Déprécié → doit être migré vers secteurInfere
        maxTags: ['Test'] // Déprécié → doit être migré vers tagsIA
      },
      shouldPass: true
    },
    {
      name: 'Champs interdits',
      data: {
        id: '12345',
        createdAt: new Date().toISOString()
      },
      shouldPass: false
    },
    {
      name: 'Champ inconnu',
      data: {
        champInexistant: 'valeur'
      },
      shouldPass: false
    },
    {
      name: 'Mauvais type (scoreIA doit être un int)',
      data: {
        scoreIA: 'pas un nombre'
      },
      shouldPass: false
    },
    {
      name: 'Score hors limites (0-100)',
      data: {
        scoreIA: 150
      },
      shouldPass: false
    }
  ];

  for (const testCase of testCases) {
    try {
      const result = validateLeadUpdate(testCase.data);

      if (testCase.shouldPass) {
        if (result.valid) {
          console.log(`✅ ${testCase.name}: PASS`);
          if (result.warnings.length > 0) {
            console.log(`   Warnings: ${result.warnings.map(w => w.message).join(', ')}`);
          }
          console.log(`   Normalized: ${JSON.stringify(result.normalized)}`);
        } else {
          console.log(`❌ ${testCase.name}: FAIL (devrait passer)`);
          console.log(`   Erreurs: ${JSON.stringify(result.errors)}`);
        }
      } else {
        if (!result.valid) {
          console.log(`✅ ${testCase.name}: PASS (erreur détectée comme attendu)`);
        } else {
          console.log(`❌ ${testCase.name}: FAIL (devrait échouer)`);
        }
      }
    } catch (error) {
      console.log(`❌ ${testCase.name}: EXCEPTION - ${error.message}`);
    }
    console.log('');
  }
}

/**
 * Test 2: Normalisation automatique
 */
async function testNormalization() {
  console.log('\n📋 TEST 2 - Normalisation automatique\n');

  const deprecatedData = {
    secteur: 'Technologies de l\'information',
    maxTags: ['PME', 'Tech', 'B2B'],
    description: 'Entreprise tech'
  };

  console.log('Input (avec champs dépréciés):');
  console.log(JSON.stringify(deprecatedData, null, 2));

  try {
    const normalized = normalizeLeadUpdate(deprecatedData);
    console.log('\n✅ Output (normalisé):');
    console.log(JSON.stringify(normalized, null, 2));

    // Vérifier que les anciens champs ont été migrés
    if (normalized.secteurInfere && normalized.tagsIA && !normalized.secteur && !normalized.maxTags) {
      console.log('\n✅ Migration automatique réussie!');
    } else {
      console.log('\n❌ Migration échouée');
    }
  } catch (error) {
    console.log('\n❌ Normalisation échouée:', error.message);
  }
}

/**
 * Test 3: Vérification de la cohérence du schéma
 */
async function testSchemaConsistency() {
  console.log('\n📋 TEST 3 - Cohérence du schéma EspoCRM\n');

  const result = await checkSchemaConsistency();

  if (result.consistent) {
    console.log('✅ Schéma cohérent - Tous les champs M.A.X. sont bien définis');
  } else {
    console.log('⚠️  Incohérences détectées:');
    result.issues.forEach(issue => {
      console.log(`   - [${issue.type}] ${issue.message}`);
      if (issue.action) {
        console.log(`     Action: ${issue.action}`);
      }
    });
  }
}

/**
 * Test 4: Health Check complet
 */
async function testHealthCheck() {
  console.log('\n📋 TEST 4 - Health Check système\n');

  const health = await healthCheck();

  if (health.healthy) {
    console.log('✅ Système sain');
  } else {
    console.log('❌ Problèmes détectés:');
    health.issues.forEach(issue => {
      console.log(`   - [${issue.category}]`);
      console.log(`     ${JSON.stringify(issue, null, 2)}`);
    });
  }

  if (health.warnings.length > 0) {
    console.log('\n⚠️  Avertissements:');
    health.warnings.forEach(warning => {
      console.log(`   - [${warning.category}] ${warning.message}`);
      if (warning.fix) {
        console.log(`     Fix: ${warning.fix}`);
      }
    });
  }
}

/**
 * Test 5: Mise à jour réelle (optionnel - nécessite un lead de test)
 */
async function testRealUpdate() {
  console.log('\n📋 TEST 5 - Mise à jour réelle d\'un lead (OPTIONNEL)\n');

  // Récupérer un lead de test
  try {
    const response = await espoFetch('/Lead?maxSize=1');
    if (!response.list || response.list.length === 0) {
      console.log('⏭️  Aucun lead disponible pour test - SKIP');
      return;
    }

    const testLead = response.list[0];
    console.log(`📝 Lead de test: ${testLead.name} (${testLead.id})`);

    // Test avec champs dépréciés (doivent être auto-migrés)
    const updateData = {
      secteur: 'Test - Technologies',
      maxTags: ['Test', 'Auto-Migration'],
      description: `Test normalisation - ${new Date().toISOString()}`
    };

    console.log('\n📤 Envoi avec champs dépréciés:');
    console.log(JSON.stringify(updateData, null, 2));

    const result = await safeUpdateLead(testLead.id, updateData);

    console.log('\n✅ Mise à jour réussie!');
    console.log('📥 Lead mis à jour:');
    console.log(`   secteurInfere: ${result.secteurInfere}`);
    console.log(`   tagsIA: ${JSON.stringify(result.tagsIA)}`);
    console.log(`   description: ${result.description}`);

  } catch (error) {
    console.log(`\n❌ Erreur lors de la mise à jour: ${error.message}`);
  }
}

/**
 * Exécution de tous les tests
 */
(async () => {
  try {
    await testValidation();
    await testNormalization();
    await testSchemaConsistency();
    await testHealthCheck();

    // Test réel (optionnel - commenté par défaut)
    // await testRealUpdate();

    console.log('\n' + '='.repeat(80));
    console.log('✅ TESTS TERMINÉS');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ ERREUR GLOBALE:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
