import 'dotenv/config';
import { espoFetch } from './lib/espoClient.js';

const result = await espoFetch('/Lead?select=id,name,accountName,emailAddress,secteur&maxSize=20&orderBy=createdAt&order=desc');

const noSecteur = result.list.filter(l => !l.secteur);

console.log(`📊 Total leads: ${result.list.length}`);
console.log(`❌ Leads sans secteur: ${noSecteur.length}\n`);

if (noSecteur.length > 0) {
  console.log('Leads à enrichir:');
  noSecteur.forEach(l => {
    console.log(`  - ${l.name || l.accountName || '(sans nom)'}`);
    console.log(`    ID: ${l.id}`);
    console.log(`    Email: ${l.emailAddress || 'N/A'}\n`);
  });
} else {
  console.log('✅ Tous les leads ont un secteur !');
}
