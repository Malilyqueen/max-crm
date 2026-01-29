/**
 * scripts/migrate-leads-tenant.js
 * Script de migration pour ajouter cTenantId à tous les leads existants
 *
 * Usage: node scripts/migrate-leads-tenant.js [tenantId]
 * Default tenantId: macrea
 */

const ESPO_BASE_URL = process.env.ESPO_BASE_URL || 'http://espocrm:80/api/v1';
const ESPO_API_KEY = process.env.ESPO_API_KEY || 'c306b76bd7e981305569b63e8bb4d157';

const tenantId = process.argv[2] || 'macrea';

async function espoFetch(endpoint, options = {}) {
  const url = `${ESPO_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'X-Api-Key': ESPO_API_KEY,
      'Content-Type': 'application/json'
    },
    body: options.body
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`EspoCRM error ${response.status}: ${error}`);
  }

  return response.json();
}

async function migrateLeads() {
  console.log(`\n========================================`);
  console.log(`Migration des leads vers tenant: ${tenantId}`);
  console.log(`========================================\n`);

  try {
    // 1. Récupérer tous les leads sans cTenantId ou avec cTenantId différent
    console.log('[1/3] Récupération des leads...');

    // Récupérer tous les leads (max 500 pour la migration)
    const data = await espoFetch('/Lead?maxSize=500&orderBy=createdAt&order=desc');
    const leads = data.list || [];

    console.log(`   -> ${leads.length} leads trouvés au total`);

    // Filtrer les leads qui n'ont pas encore de cTenantId
    const leadsToUpdate = leads.filter(lead => !lead.cTenantId);
    console.log(`   -> ${leadsToUpdate.length} leads à migrer (sans cTenantId)`);

    if (leadsToUpdate.length === 0) {
      console.log('\n[OK] Tous les leads ont déjà un cTenantId. Migration terminée.');
      return;
    }

    // 2. Mettre à jour chaque lead
    console.log(`\n[2/3] Mise à jour des leads avec cTenantId="${tenantId}"...`);

    let updated = 0;
    let errors = 0;

    for (const lead of leadsToUpdate) {
      try {
        await espoFetch(`/Lead/${lead.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            cTenantId: tenantId
          })
        });
        updated++;
        console.log(`   [${updated}/${leadsToUpdate.length}] Lead ${lead.id} (${lead.firstName} ${lead.lastName}) -> OK`);
      } catch (error) {
        errors++;
        console.error(`   [ERROR] Lead ${lead.id}: ${error.message}`);
      }
    }

    // 3. Résumé
    console.log(`\n[3/3] Résumé de la migration:`);
    console.log(`   -> Leads mis à jour: ${updated}`);
    console.log(`   -> Erreurs: ${errors}`);
    console.log(`   -> Tenant: ${tenantId}`);

    if (errors === 0) {
      console.log('\n[SUCCESS] Migration terminée avec succès!');
    } else {
      console.log('\n[WARNING] Migration terminée avec des erreurs.');
    }

  } catch (error) {
    console.error('\n[FATAL] Erreur lors de la migration:', error.message);
    process.exit(1);
  }
}

// Exécuter la migration
migrateLeads();