/**
 * Test direct de l'enrichissement - appelle analyze_and_enrich_leads avec le vrai ID
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE = 'http://127.0.0.1:3005';

async function testDirectEnrichment() {
  console.log('🧪 TEST DIRECT ENRICHISSEMENT\n');

  // ID réel de Casa Bella Design
  const casaBellaId = '691b2816e43817b92';

  console.log('1. Appel de analyze_and_enrich_leads avec ID réel...');
  console.log(`   Lead ID: ${casaBellaId}`);
  console.log(`   applyUpdates: true\n`);

  const response = await fetch(`${API_BASE}/test-tool`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      toolName: 'analyze_and_enrich_leads',
      args: {
        leadIds: [casaBellaId],
        applyUpdates: true
      }
    })
  });

  const result = await response.json();

  console.log('📊 Résultat:');
  console.log(JSON.stringify(result, null, 2));

  // Vérifier si le lead a été enrichi
  console.log('\n2. Vérification dans le CRM...');

  const espoResponse = await fetch(`http://127.0.0.1:8081/espocrm/api/v1/Lead/${casaBellaId}`, {
    headers: {
      'X-Api-Key': '7b8a983aab7071bb64f18a75cf27ebbc'
    }
  });

  const lead = await espoResponse.json();

  console.log(`\n✅ Lead: ${lead.name}`);
  console.log(`   Secteur: ${lead.secteur || '(vide)'}`);
  console.log(`   maxTags: ${JSON.stringify(lead.maxTags) || '(vide)'}`);
}

testDirectEnrichment().catch(console.error);
