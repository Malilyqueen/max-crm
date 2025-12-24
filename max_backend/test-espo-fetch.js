/**
 * Test direct de fetch vers EspoCRM pour débugger le 401
 */

import 'dotenv/config';

const ESPO_BASE = process.env.ESPO_BASE_URL;
const ESPO_API_KEY = process.env.ESPO_API_KEY;

console.log('\n🧪 Test direct fetch vers EspoCRM\n');
console.log('URL:', ESPO_BASE);
console.log('API Key:', ESPO_API_KEY ? `${ESPO_API_KEY.substring(0, 15)}...` : 'EMPTY');
console.log('');

const url = `${ESPO_BASE}/Note`;
const headers = {
  'Content-Type': 'application/json',
  'X-Api-Key': ESPO_API_KEY
};

const body = JSON.stringify({
  name: 'Test fetch direct Node.js',
  post: 'Test de debugging fetch - 2025-12-23',
  parentType: 'Lead',
  parentId: '69272eee2a489f7a6'
});

console.log('🚀 Envoi POST vers:', url);
console.log('Headers:', headers);
console.log('');

try {
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body
  });

  console.log('📊 Response status:', res.status, res.statusText);
  console.log('');

  if (!res.ok) {
    const text = await res.text();
    console.error('❌ Erreur:', text);
  } else {
    const data = await res.json();
    console.log('✅ Succès! Note créée:');
    console.log('   ID:', data.id);
    console.log('   Name:', data.name);
  }
} catch (error) {
  console.error('❌ Exception:', error.message);
}
