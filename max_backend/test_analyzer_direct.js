import 'dotenv/config';
import { analyzeEmailForEnrichment } from './lib/emailAnalyzer.js';

async function testAnalyzer() {
  console.log('🧪 Test de l\'analyseur d\'emails amélioré\n');

  // Tester avec Casa Bella Design (devrait trouver "Interior Design")
  const testCases = [
    {
      email: 'contact@casabella-design.fr',
      leadData: {
        accountName: 'Casa Bella Design',
        description: 'Décoration intérieure ; site élégant ; devis personnalisés',
        addressCity: 'Marseille'
      }
    },
    {
      email: 'contact@alphadrone-sys.com',
      leadData: {
        accountName: 'AlphaDrone Systems',
        description: 'Drones professionnels ; catalogue complet ; certifications',
        addressCity: 'Paris'
      }
    },
    {
      email: 'contact@maison-delacour.fr',
      leadData: {
        accountName: 'Maison Delacour',
        description: 'Pâtisserie artisanale ; boutique physique + e-commerce',
        addressCity: 'Lyon'
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📧 Test: ${testCase.leadData.accountName}`);
    console.log(`   Description: ${testCase.leadData.description}`);

    try {
      const result = await analyzeEmailForEnrichment(testCase.email, testCase.leadData);

      if (result.success) {
        console.log(`   ✅ Secteur détecté: ${result.secteur}`);
        console.log(`   🏷️  Tags: ${JSON.stringify(result.tags)}`);
        console.log(`   📊 Maturité: ${result.maturite_digitale || 'N/A'}`);
        console.log(`   🎯 Urgence: ${result.urgence || 'N/A'}`);
        console.log(`   💡 Stratégie: ${result.strategie_contact ? result.strategie_contact.substring(0, 60) + '...' : 'N/A'}`);
      } else {
        console.log(`   ❌ Échec: ${result.error}`);
      }
    } catch (error) {
      console.error(`   ❌ Erreur: ${error.message}`);
    }
  }
}

testAnalyzer();
