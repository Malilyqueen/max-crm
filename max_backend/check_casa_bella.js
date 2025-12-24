import fetch from 'node-fetch';

const API_KEY = '7b8a983aab7071bb64f18a75cf27ebbc';
const ESPO_BASE = 'http://127.0.0.1:8081/espocrm/api/v1';

async function checkLead() {
  const response = await fetch(`${ESPO_BASE}/Lead?where[0][type]=equals&where[0][attribute]=name&where[0][value]=Casa Bella Design&maxSize=1`, {
    headers: {
      'X-Api-Key': API_KEY
    }
  });

  const data = await response.json();

  if (!data.list || data.list.length === 0) {
    console.log('❌ Lead "Casa Bella Design" non trouvé');
    return;
  }

  const lead = data.list[0];
  console.log('✅ Lead trouvé:');
  console.log('   Nom:', lead.name);
  console.log('   ID:', lead.id);
  console.log('   Secteur:', lead.secteur || '(vide)');
  console.log('   maxTags:', JSON.stringify(lead.maxTags) || '(vide)');
}

checkLead().catch(console.error);
