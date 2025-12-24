import fetch from 'node-fetch';

const API_KEY = '7b8a983aab7071bb64f18a75cf27ebbc';
const ESPO_BASE = 'http://127.0.0.1:8081/espocrm/api/v1';

async function displayLeads() {
  const response = await fetch(`${ESPO_BASE}/Lead?maxSize=5&orderBy=createdAt&order=desc`, {
    headers: {
      'X-Api-Key': API_KEY
    }
  });

  const data = await response.json();

  console.log('📊 5 DERNIERS LEADS:\n');

  data.list.slice(0, 5).forEach((lead, i) => {
    console.log(`${i + 1}. ${lead.name}`);
    console.log(`   Secteur: ${lead.secteur || '(vide)'}`);
    console.log(`   Max Tag: ${JSON.stringify(lead.maxTags) || '(vide)'}`);
    console.log('');
  });
}

displayLeads().catch(console.error);
