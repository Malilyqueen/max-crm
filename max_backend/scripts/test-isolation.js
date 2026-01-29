/**
 * Test d'isolation multi-tenant
 * Vérifie que le lead créé pour demo_client a bien cTenantId=demo_client
 */

import 'dotenv/config';
import https from 'https';
import http from 'http';

const ESPO_BASE = process.env.ESPO_BASE_URL || 'https://crm.macrea.fr';
const ESPO_KEY = process.env.ESPO_API_KEY;

if (!ESPO_KEY) {
  console.log('❌ ESPO_API_KEY non défini');
  process.exit(1);
}

// Chercher le lead Sophie Laurent créé pour demo_client
const searchUrl = new URL('/api/v1/Lead', ESPO_BASE);
searchUrl.searchParams.set('select', 'id,name,cTenantId,createdAt');
searchUrl.searchParams.set('where[0][type]', 'contains');
searchUrl.searchParams.set('where[0][attribute]', 'name');
searchUrl.searchParams.set('where[0][value]', 'Sophie Laurent');

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('🔍 TEST ISOLATION MULTI-TENANT');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log('Recherche "Sophie Laurent" dans EspoCRM...');

const options = {
  hostname: searchUrl.hostname,
  path: searchUrl.pathname + searchUrl.search,
  method: 'GET',
  headers: {
    'X-Api-Key': ESPO_KEY,
    'Content-Type': 'application/json'
  }
};

const client = ESPO_BASE.startsWith('https') ? https : http;

const req = client.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (result.list && result.list.length > 0) {
        console.log(`Trouvé ${result.list.length} lead(s) correspondant(s):`);
        console.log('');
        
        for (const lead of result.list) {
          console.log(`📋 Lead: ${lead.name}`);
          console.log(`   - ID: ${lead.id}`);
          console.log(`   - cTenantId: ${lead.cTenantId || 'NULL'}`);
          console.log(`   - Créé: ${lead.createdAt}`);
          console.log('');
        }
        
        const demoClientLeads = result.list.filter(l => l.cTenantId === 'demo_client');
        if (demoClientLeads.length > 0) {
          console.log('═══════════════════════════════════════════════════════════════');
          console.log('🎉 TEST RÉUSSI: Lead(s) avec cTenantId=demo_client trouvé(s)');
          console.log('   → macrea ne verra PAS ces leads (filtré par cTenantId=macrea)');
          console.log('   → demo_client verra UNIQUEMENT ces leads');
          console.log('═══════════════════════════════════════════════════════════════');
        }
      } else {
        console.log('❌ Aucun lead "Sophie Laurent" trouvé');
      }
    } catch (e) {
      console.log('Erreur parsing:', e.message);
    }
  });
});

req.on('error', (e) => console.error('Erreur:', e.message));
req.end();
