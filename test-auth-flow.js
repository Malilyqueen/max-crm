/**
 * Test du flow complet d'authentification LOCAL
 * 1. Login → récupère token JWT
 * 2. Appel /api/crm-public/leads avec token
 * 3. Vérifier 200 OK (pas 401)
 */

const API_BASE = 'http://127.0.0.1:3005';

async function testAuthFlow() {
  console.log('\n🧪 TEST AUTH FLOW LOCAL\n');
  console.log('========================================\n');

  try {
    // STEP 1: Login
    console.log('📝 STEP 1: Login avec admin@macrea.fr...');
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@macrea.fr',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    console.log(`✅ Login OK - Token reçu: ${loginData.token.substring(0, 30)}...`);
    console.log(`   User: ${loginData.user.email}`);
    console.log(`   Role: ${loginData.user.role}`);
    console.log(`   TenantId: ${loginData.user.tenantId}`);

    const token = loginData.token;
    const tenantId = loginData.user.tenantId;

    // STEP 2: Test /api/crm-public/leads avec token
    console.log('\n📝 STEP 2: Appel /api/crm-public/leads avec JWT + X-Tenant...');
    const leadsResponse = await fetch(`${API_BASE}/api/crm-public/leads?page=1&pageSize=5`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant': tenantId,
        'X-Role': 'admin',
        'X-Preview': 'false'
      }
    });

    console.log(`   Status: ${leadsResponse.status} ${leadsResponse.statusText}`);

    if (!leadsResponse.ok) {
      const errorText = await leadsResponse.text();
      console.error(`❌ ÉCHEC: ${leadsResponse.status}`);
      console.error(`   Response: ${errorText}`);
      throw new Error(`CRM leads request failed: ${leadsResponse.status}`);
    }

    const leadsData = await leadsResponse.json();
    console.log(`✅ Leads récupérés: ${leadsData.total || 0} total, ${leadsData.leads?.length || 0} dans cette page`);

    if (leadsData.leads && leadsData.leads.length > 0) {
      console.log(`   Exemple lead: ${leadsData.leads[0].name || 'N/A'}`);
    }

    // STEP 3: Vérifier que le tenant est bien "macrea"
    console.log('\n📝 STEP 3: Vérification tenant...');
    if (tenantId === 'macrea') {
      console.log('✅ Tenant "macrea" confirmé (local dev)');
    } else {
      console.warn(`⚠️  Tenant inattendu: ${tenantId} (attendu: "macrea")`);
    }

    console.log('\n========================================');
    console.log('✅ TEST RÉUSSI - Auth flow local fonctionne!\n');
    return true;

  } catch (error) {
    console.error('\n========================================');
    console.error('❌ TEST ÉCHOUÉ');
    console.error(`   Erreur: ${error.message}`);
    console.error('========================================\n');
    return false;
  }
}

// Exécuter le test
testAuthFlow().then(success => {
  process.exit(success ? 0 : 1);
});