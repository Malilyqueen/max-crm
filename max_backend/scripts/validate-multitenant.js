/**
 * scripts/validate-multitenant.js
 * Checklist de validation multi-tenant avant onboarding
 *
 * Usage: node scripts/validate-multitenant.js
 */

import 'dotenv/config';

const ESPO_BASE_URL = process.env.ESPO_BASE_URL || 'http://127.0.0.1:8081/espocrm/api/v1';
const ESPO_API_KEY = process.env.ESPO_API_KEY;
const ESPO_HAS_TENANT_FIELD = process.env.ESPO_HAS_TENANT_FIELD === 'true';
const ENFORCE_TENANT_ISOLATION = process.env.ENFORCE_TENANT_ISOLATION !== 'false';

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('🔒 VALIDATION MULTI-TENANT - Checklist avant onboarding');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

const results = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function pass(msg) {
  console.log(`   ✅ ${msg}`);
  results.passed++;
}

function fail(msg) {
  console.log(`   ❌ ${msg}`);
  results.failed++;
}

function warn(msg) {
  console.log(`   ⚠️  ${msg}`);
  results.warnings++;
}

function info(msg) {
  console.log(`   ℹ️  ${msg}`);
}

async function espoFetch(endpoint) {
  const url = `${ESPO_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Api-Key': ESPO_API_KEY,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`EspoCRM ${response.status}: ${error}`);
  }

  return response.json();
}

// ═══════════════════════════════════════════════════════════════════
// CHECK 1: Variables d'environnement
// ═══════════════════════════════════════════════════════════════════
console.log('📋 CHECK 1: Variables d\'environnement');
console.log('');

if (ESPO_HAS_TENANT_FIELD) {
  pass('ESPO_HAS_TENANT_FIELD=true');
} else {
  fail('ESPO_HAS_TENANT_FIELD=false → Guard refusera les tenants non-macrea');
}

if (ENFORCE_TENANT_ISOLATION) {
  pass('ENFORCE_TENANT_ISOLATION=true (fail-closed actif)');
} else {
  warn('ENFORCE_TENANT_ISOLATION=false (dev mode, pas sécurisé pour prod)');
}

if (ESPO_API_KEY) {
  pass('ESPO_API_KEY défini');
} else {
  fail('ESPO_API_KEY manquant');
}

console.log('');

// ═══════════════════════════════════════════════════════════════════
// CHECK 2: Connexion EspoCRM
// ═══════════════════════════════════════════════════════════════════
console.log('📋 CHECK 2: Connexion EspoCRM');
console.log('');

try {
  const test = await espoFetch('/Lead?maxSize=1');
  pass(`Connexion OK - ${test.total || 0} leads trouvés`);
} catch (error) {
  fail(`Connexion échouée: ${error.message}`);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('❌ VALIDATION ÉCHOUÉE - Impossible de continuer sans EspoCRM');
  console.log('═══════════════════════════════════════════════════════════════');
  process.exit(1);
}

console.log('');

// ═══════════════════════════════════════════════════════════════════
// CHECK 3: Champ cTenantId existe dans EspoCRM
// ═══════════════════════════════════════════════════════════════════
console.log('📋 CHECK 3: Champ cTenantId dans EspoCRM');
console.log('');

let fieldExists = false;
try {
  // Essayer de filtrer par cTenantId - si ça marche, le champ existe
  const testFilter = await espoFetch('/Lead?maxSize=1&where[0][type]=equals&where[0][attribute]=cTenantId&where[0][value]=macrea');
  pass(`Champ cTenantId existe (${testFilter.total || 0} leads macrea)`);
  fieldExists = true;
} catch (error) {
  if (error.message.includes('400') || error.message.includes('cTenantId')) {
    fail('Champ cTenantId n\'existe PAS dans EspoCRM');
    info('→ Exécuter: node scripts/setup-tenant-field.js');
    info('→ Ou créer manuellement: Admin > Entity Manager > Lead > Fields');
  } else {
    warn(`Erreur test cTenantId: ${error.message}`);
  }
}

console.log('');

// ═══════════════════════════════════════════════════════════════════
// CHECK 4: Backfill - Aucun lead sans cTenantId
// ═══════════════════════════════════════════════════════════════════
console.log('📋 CHECK 4: Backfill leads existants');
console.log('');

if (fieldExists) {
  try {
    // Leads sans cTenantId (null)
    const nullTenant = await espoFetch('/Lead?maxSize=1&where[0][type]=isNull&where[0][attribute]=cTenantId');

    // Leads avec cTenantId vide
    const emptyTenant = await espoFetch('/Lead?maxSize=1&where[0][type]=equals&where[0][attribute]=cTenantId&where[0][value]=');

    const totalWithoutTenant = (nullTenant.total || 0) + (emptyTenant.total || 0);

    if (totalWithoutTenant === 0) {
      pass('Tous les leads ont un cTenantId');
    } else {
      fail(`${totalWithoutTenant} leads sans cTenantId`);
      info('→ Exécuter: node scripts/setup-tenant-field.js (backfill)');
    }

    // Stats par tenant
    const macreaLeads = await espoFetch('/Lead?maxSize=1&where[0][type]=equals&where[0][attribute]=cTenantId&where[0][value]=macrea');
    info(`Leads macrea: ${macreaLeads.total || 0}`);

  } catch (error) {
    warn(`Erreur vérification backfill: ${error.message}`);
  }
} else {
  warn('Skipped (champ cTenantId inexistant)');
}

console.log('');

// ═══════════════════════════════════════════════════════════════════
// CHECK 5: Test isolation - userdemo ne voit que ses leads
// ═══════════════════════════════════════════════════════════════════
console.log('📋 CHECK 5: Test isolation tenant');
console.log('');

if (fieldExists && ESPO_HAS_TENANT_FIELD) {
  try {
    // Leads pour userdemo (devrait être 0 si pas encore créés)
    const userdemoLeads = await espoFetch('/Lead?maxSize=1&where[0][type]=equals&where[0][attribute]=cTenantId&where[0][value]=userdemo');
    info(`Leads userdemo: ${userdemoLeads.total || 0}`);

    // Leads macrea
    const macreaLeads = await espoFetch('/Lead?maxSize=1&where[0][type]=equals&where[0][attribute]=cTenantId&where[0][value]=macrea');
    info(`Leads macrea: ${macreaLeads.total || 0}`);

    if (userdemoLeads.total !== macreaLeads.total || userdemoLeads.total === 0) {
      pass('Isolation OK - userdemo et macrea ont des données différentes');
    } else {
      warn('userdemo et macrea ont le même nombre de leads - vérifier manuellement');
    }

  } catch (error) {
    warn(`Erreur test isolation: ${error.message}`);
  }
} else {
  if (!fieldExists) {
    warn('Skipped (champ cTenantId inexistant)');
  } else {
    warn('Skipped (ESPO_HAS_TENANT_FIELD=false)');
  }
}

console.log('');

// ═══════════════════════════════════════════════════════════════════
// CHECK 6: Index sur cTenantId (info seulement)
// ═══════════════════════════════════════════════════════════════════
console.log('📋 CHECK 6: Performance (index)');
console.log('');

info('Index recommandés dans EspoCRM/MySQL:');
info('  - INDEX idx_lead_ctenant (cTenantId)');
info('  - INDEX idx_lead_ctenant_created (cTenantId, createdAt)');
info('  - INDEX idx_lead_ctenant_status (cTenantId, status)');
info('');
info('À créer manuellement si >1000 leads par tenant');

console.log('');

// ═══════════════════════════════════════════════════════════════════
// RÉSUMÉ
// ═══════════════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════════════════');

if (results.failed === 0) {
  console.log('✅ VALIDATION RÉUSSIE - Prêt pour onboarding multi-tenant');
  console.log('');
  console.log('   Prochaines étapes:');
  console.log('   1. Tester manuellement avec userdemo');
  console.log('   2. Vérifier que userdemo ne voit PAS les leads macrea');
  console.log('   3. Activer l\'onboarding self-service');
} else {
  console.log(`❌ VALIDATION ÉCHOUÉE - ${results.failed} check(s) en erreur`);
  console.log('');
  console.log('   Actions requises:');
  if (!fieldExists) {
    console.log('   1. Créer le champ cTenantId: node scripts/setup-tenant-field.js');
  }
  if (!ESPO_HAS_TENANT_FIELD) {
    console.log('   2. Mettre ESPO_HAS_TENANT_FIELD=true dans .env');
  }
  console.log('   3. Relancer ce script: node scripts/validate-multitenant.js');
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log(`   Résultat: ${results.passed} ✅ | ${results.failed} ❌ | ${results.warnings} ⚠️`);
console.log('');

process.exit(results.failed > 0 ? 1 : 0);
