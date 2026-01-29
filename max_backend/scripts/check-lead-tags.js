/**
 * Script pour vérifier les champs tags d'un lead
 */
import dotenv from 'dotenv';
dotenv.config();

const ESPO_BASE = process.env.ESPO_BASE_URL;
const ESPO_KEY = process.env.ESPO_API_KEY;

async function test() {
  try {
    // Chercher Casa Bella
    const url = ESPO_BASE + '/Lead?where[0][type]=contains&where[0][attribute]=accountName&where[0][value]=Casa';
    console.log('Searching for Casa Bella...');

    const res = await fetch(url, {
      headers: { 'X-Api-Key': ESPO_KEY }
    });

    const data = await res.json();

    if (data.list && data.list[0]) {
      const lead = data.list[0];
      console.log('\nLead found:', lead.accountName || lead.firstName);
      console.log('\n=== TOUS les champs (non-vides) ===');

      Object.keys(lead).sort().forEach(key => {
        const val = lead[key];
        if (val !== null && val !== undefined && val !== '' && val !== false) {
          const display = typeof val === 'object' ? JSON.stringify(val) : String(val).substring(0, 100);
          console.log('  ' + key + ': ' + display);
        }
      });

      // Chercher spécifiquement les champs avec "tag" dans le nom
      console.log('\n=== Champs contenant "tag" ===');
      Object.keys(lead).forEach(key => {
        if (key.toLowerCase().includes('tag')) {
          console.log('  ' + key + ':', JSON.stringify(lead[key]));
        }
      });

    } else {
      console.log('Lead not found, trying email search...');

      // Essayer par email
      const url2 = ESPO_BASE + '/Lead?where[0][type]=contains&where[0][attribute]=emailAddress&where[0][value]=casabella';
      const res2 = await fetch(url2, { headers: { 'X-Api-Key': ESPO_KEY } });
      const data2 = await res2.json();

      if (data2.list && data2.list[0]) {
        console.log('Found by email:', data2.list[0]);
      }
    }

  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
