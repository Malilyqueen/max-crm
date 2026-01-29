/**
 * scripts/check-tenants.js
 * Diagnostic rapide pour vérifier les tenants en DB
 *
 * Usage: node scripts/check-tenants.js
 */

import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : false
});

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔍 DIAGNOSTIC TENANTS - Vérification DB');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  try {
    // Test connexion
    console.log('📋 Test connexion DB...');
    const testResult = await pool.query('SELECT NOW() as now');
    console.log(`   ✅ Connexion OK - ${testResult.rows[0].now}`);
    console.log('');

    // Lister les tenants
    console.log('📋 Liste des tenants:');
    const tenantsResult = await pool.query(`
      SELECT
        id,
        slug,
        name,
        plan,
        crm_url,
        crm_status,
        is_provisioned,
        created_at
      FROM tenants
      ORDER BY created_at DESC
    `);

    if (tenantsResult.rows.length === 0) {
      console.log('   ⚠️ Aucun tenant trouvé en DB !');
      console.log('   → Exécuter la migration 021_self_service_auth.sql');
    } else {
      console.log(`   Trouvé ${tenantsResult.rows.length} tenant(s):`);
      console.log('');

      for (const tenant of tenantsResult.rows) {
        console.log(`   📁 ${tenant.slug}`);
        console.log(`      - Name: ${tenant.name}`);
        console.log(`      - Plan: ${tenant.plan}`);
        console.log(`      - CRM URL: ${tenant.crm_url ? tenant.crm_url.substring(0, 40) + '...' : 'NULL'}`);
        console.log(`      - CRM Status: ${tenant.crm_status || 'pending'}`);
        console.log(`      - Is Provisioned: ${tenant.is_provisioned}`);
        console.log('');
      }
    }

    // Lister les users
    console.log('📋 Liste des users:');
    const usersResult = await pool.query(`
      SELECT
        u.id,
        u.email,
        u.name,
        t.slug as tenant_slug,
        m.role
      FROM users u
      LEFT JOIN memberships m ON m.user_id = u.id
      LEFT JOIN tenants t ON t.id = m.tenant_id
      ORDER BY u.created_at DESC
    `);

    if (usersResult.rows.length === 0) {
      console.log('   ⚠️ Aucun user trouvé en DB !');
    } else {
      console.log(`   Trouvé ${usersResult.rows.length} user(s):`);
      console.log('');

      for (const user of usersResult.rows) {
        console.log(`   👤 ${user.email}`);
        console.log(`      - Name: ${user.name}`);
        console.log(`      - Tenant: ${user.tenant_slug || 'AUCUN'}`);
        console.log(`      - Role: ${user.role || 'N/A'}`);
        console.log('');
      }
    }

    // Vérifier si les colonnes CRM existent
    console.log('📋 Vérification colonnes CRM:');
    const columnsResult = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'tenants'
      AND column_name IN ('crm_url', 'crm_api_key', 'crm_status', 'crm_provisioned_at', 'is_provisioned')
    `);

    if (columnsResult.rows.length === 0) {
      console.log('   ❌ Colonnes CRM manquantes ! Migration 021 non exécutée.');
    } else {
      console.log(`   ✅ ${columnsResult.rows.length} colonnes CRM trouvées:`);
      columnsResult.rows.forEach(col => {
        console.log(`      - ${col.column_name} (${col.data_type})`);
      });
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ DIAGNOSTIC TERMINÉ');
    console.log('═══════════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('');
    console.error('❌ ERREUR:', error.message);
    console.error('');
    console.error('Vérifiez:');
    console.error('- DATABASE_URL ou SUPABASE_DB_URL dans .env');
    console.error('- Connexion réseau à Supabase');
    console.error('');
  } finally {
    await pool.end();
  }
}

main();
