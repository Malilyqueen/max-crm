/**
 * scripts/setup-tenant-field.js
 * Créer le champ cTenantId dans EspoCRM pour l'isolation multi-tenant
 *
 * Usage: node scripts/setup-tenant-field.js
 *
 * Ce script:
 * 1. Crée le champ cTenantId sur l'entité Lead
 * 2. Backfill tous les leads existants avec cTenantId = 'macrea'
 * 3. Affiche les stats
 */

import 'dotenv/config';

const ESPO_BASE_URL = process.env.ESPO_BASE_URL || 'http://127.0.0.1:8081/espocrm/api/v1';
const ESPO_API_KEY = process.env.ESPO_API_KEY;
const ESPO_USERNAME = process.env.ESPO_USERNAME || 'admin';
const ESPO_PASSWORD = process.env.ESPO_PASSWORD;

console.log('═══════════════════════════════════════════════════════════════');
console.log('🔧 SETUP MULTI-TENANT: Création champ cTenantId');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`   ESPO_BASE_URL: ${ESPO_BASE_URL}`);
console.log(`   ESPO_USERNAME: ${ESPO_USERNAME}`);
console.log('');

/**
 * Fetch helper avec auth Basic (pour admin operations)
 */
async function espoAdminFetch(endpoint, options = {}) {
  const url = `${ESPO_BASE_URL}${endpoint}`;
  const authHeader = 'Basic ' + Buffer.from(`${ESPO_USERNAME}:${ESPO_PASSWORD}`).toString('base64');

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      'Espo-Authorization': authHeader,
      ...options.headers
    },
    body: options.body
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`EspoCRM error ${response.status}: ${error}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Fetch helper avec API Key (pour opérations standard)
 */
async function espoFetch(endpoint, options = {}) {
  const url = `${ESPO_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'X-Api-Key': ESPO_API_KEY,
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: options.body
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`EspoCRM error ${response.status}: ${error}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Étape 1: Vérifier si le champ cTenantId existe déjà
 */
async function checkFieldExists() {
  console.log('📋 Vérification du champ cTenantId...');

  try {
    const metadata = await espoAdminFetch('/Metadata/entityDefs/Lead');
    const fields = metadata?.fields || {};

    if (fields.cTenantId) {
      console.log('   ✅ Le champ cTenantId existe déjà');
      console.log(`      Type: ${fields.cTenantId.type}`);
      return true;
    }

    console.log('   ⚠️ Le champ cTenantId n\'existe pas encore');
    return false;

  } catch (error) {
    console.error('   ❌ Erreur vérification:', error.message);
    return false;
  }
}

/**
 * Étape 2: Créer le champ cTenantId
 */
async function createTenantField() {
  console.log('');
  console.log('🔨 Création du champ cTenantId sur Lead...');

  try {
    // Créer le champ via l'API Admin
    // Note: EspoCRM permet de créer des champs custom via l'API Metadata
    const fieldDef = {
      type: 'varchar',
      maxLength: 50,
      required: false,
      index: true,
      readOnly: false,
      audited: true,
      tooltip: 'Identifiant du tenant pour isolation multi-tenant'
    };

    // Méthode 1: Via EntityManager (recommandé)
    await espoAdminFetch('/Admin/fieldManager/Lead', {
      method: 'POST',
      body: JSON.stringify({
        name: 'cTenantId',
        type: 'varchar',
        label: 'Tenant ID',
        maxLength: 50,
        required: false,
        audited: true,
        index: true
      })
    });

    console.log('   ✅ Champ cTenantId créé avec succès');
    return true;

  } catch (error) {
    // Si l'erreur indique que le champ existe déjà, c'est OK
    if (error.message.includes('already exists') || error.message.includes('409')) {
      console.log('   ℹ️ Le champ existe déjà (ignoré)');
      return true;
    }

    console.error('   ❌ Erreur création champ:', error.message);
    console.log('');
    console.log('   💡 Alternative manuelle:');
    console.log('      1. Aller dans Administration > Entity Manager > Lead');
    console.log('      2. Cliquer sur "Fields"');
    console.log('      3. Créer un nouveau champ:');
    console.log('         - Name: cTenantId');
    console.log('         - Type: Varchar');
    console.log('         - Max Length: 50');
    console.log('         - Audited: Yes');
    console.log('      4. Rebuild: Administration > Rebuild');
    return false;
  }
}

/**
 * Étape 3: Backfill les leads existants
 */
async function backfillLeads() {
  console.log('');
  console.log('📊 Backfill des leads existants...');

  try {
    // Récupérer tous les leads sans cTenantId
    const leadsWithoutTenant = await espoFetch('/Lead?maxSize=200&where[0][type]=isNull&where[0][attribute]=cTenantId');
    const leadsEmpty = await espoFetch('/Lead?maxSize=200&where[0][type]=equals&where[0][attribute]=cTenantId&where[0][value]=');

    const totalWithoutTenant = (leadsWithoutTenant?.total || 0) + (leadsEmpty?.total || 0);
    const leads = [...(leadsWithoutTenant?.list || []), ...(leadsEmpty?.list || [])];

    console.log(`   📈 Leads sans cTenantId: ${totalWithoutTenant}`);

    if (leads.length === 0) {
      console.log('   ✅ Tous les leads ont déjà un cTenantId');
      return { updated: 0, total: 0 };
    }

    // Mettre à jour chaque lead
    let updated = 0;
    let errors = 0;

    for (const lead of leads) {
      try {
        await espoFetch(`/Lead/${lead.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            cTenantId: 'macrea'
          })
        });
        updated++;

        if (updated % 10 === 0) {
          console.log(`   ... ${updated}/${leads.length} leads mis à jour`);
        }
      } catch (error) {
        errors++;
        console.warn(`   ⚠️ Erreur lead ${lead.id}: ${error.message}`);
      }
    }

    console.log(`   ✅ Backfill terminé: ${updated} leads mis à jour, ${errors} erreurs`);
    return { updated, total: leads.length, errors };

  } catch (error) {
    console.error('   ❌ Erreur backfill:', error.message);
    return { updated: 0, total: 0, error: error.message };
  }
}

/**
 * Étape 4: Vérifier les stats finales
 */
async function verifyStats() {
  console.log('');
  console.log('📊 Vérification des statistiques...');

  try {
    // Total leads
    const totalLeads = await espoFetch('/Lead?maxSize=1');
    console.log(`   Total leads: ${totalLeads?.total || 0}`);

    // Leads avec cTenantId = macrea
    const macreaLeads = await espoFetch('/Lead?maxSize=1&where[0][type]=equals&where[0][attribute]=cTenantId&where[0][value]=macrea');
    console.log(`   Leads macrea: ${macreaLeads?.total || 0}`);

    // Leads sans cTenantId
    const noTenantLeads = await espoFetch('/Lead?maxSize=1&where[0][type]=isNull&where[0][attribute]=cTenantId');
    console.log(`   Leads sans tenant: ${noTenantLeads?.total || 0}`);

    return {
      total: totalLeads?.total || 0,
      macrea: macreaLeads?.total || 0,
      noTenant: noTenantLeads?.total || 0
    };

  } catch (error) {
    console.error('   ❌ Erreur stats:', error.message);
    return null;
  }
}

/**
 * Étape 5: Rebuild EspoCRM
 */
async function rebuildEspo() {
  console.log('');
  console.log('🔄 Rebuild EspoCRM...');

  try {
    await espoAdminFetch('/Admin/rebuild', {
      method: 'POST'
    });
    console.log('   ✅ Rebuild terminé');
    return true;
  } catch (error) {
    console.log('   ⚠️ Rebuild via API échoué (normal si pas admin)');
    console.log('   💡 Faites un rebuild manuel: Administration > Rebuild');
    return false;
  }
}

/**
 * Main
 */
async function main() {
  try {
    // Vérifier la connexion
    console.log('🔌 Test connexion EspoCRM...');
    const test = await espoFetch('/Lead?maxSize=1');
    console.log(`   ✅ Connexion OK (${test?.total || 0} leads trouvés)`);

    // Étape 1: Vérifier si le champ existe
    const fieldExists = await checkFieldExists();

    // Étape 2: Créer le champ si nécessaire
    if (!fieldExists) {
      const created = await createTenantField();
      if (created) {
        // Rebuild après création
        await rebuildEspo();
      }
    }

    // Étape 3: Backfill
    const backfillResult = await backfillLeads();

    // Étape 4: Stats finales
    const stats = await verifyStats();

    // Résumé
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ SETUP TERMINÉ');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('Prochaines étapes:');
    console.log('1. Vérifier dans EspoCRM Admin que le champ cTenantId existe');
    console.log('2. Mettre ESPO_HAS_TENANT_FIELD=true dans le code');
    console.log('3. Redémarrer le backend');
    console.log('4. Tester avec userdemo');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ ERREUR FATALE:', error.message);
    console.error('');
    console.error('Vérifiez:');
    console.error('- ESPO_BASE_URL est correct');
    console.error('- ESPO_API_KEY est valide');
    console.error('- ESPO_USERNAME/PASSWORD sont corrects');
    process.exit(1);
  }
}

main();
