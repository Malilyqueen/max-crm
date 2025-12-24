import fetch from 'node-fetch';

const API_KEY = '7b8a983aab7071bb64f18a75cf27ebbc';
const ESPO_BASE = 'http://127.0.0.1:8081/espocrm/api/v1';

async function checkEmails() {
  const response = await fetch(`${ESPO_BASE}/Lead?maxSize=5&orderBy=createdAt&order=desc`, {
    headers: {
      'X-Api-Key': API_KEY
    }
  });

  const data = await response.json();

  console.log('📧 5 DERNIERS LEADS - Vérification des emails:\n');

  data.list.forEach((lead, i) => {
    console.log(`${i + 1}. ${lead.name}`);
    console.log(`   Email: ${lead.emailAddress || '(VIDE)'}`);
    console.log(`   Description: ${lead.description ? lead.description.substring(0, 50) + '...' : '(vide)'}`);
    console.log('');
  });
}

checkEmails().catch(console.error);
