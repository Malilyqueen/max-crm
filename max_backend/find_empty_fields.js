/**
 * Trouver tous les champs vides dans les leads
 */

import 'dotenv/config';
import { espoFetch } from './lib/espoClient.js';

async function findEmptyFields() {
  console.log('🔍 ANALYSE DES CHAMPS VIDES DANS LES LEADS\n');

  try {
    // Récupérer les 20 premiers leads avec tous les champs
    const result = await espoFetch('/Lead?maxSize=20&orderBy=createdAt&order=desc');

    if (result.list.length === 0) {
      console.log('❌ Aucun lead trouvé');
      return;
    }

    // Analyser les champs pour identifier lesquels sont souvent vides
    const fieldStats = {};

    result.list.forEach(lead => {
      Object.keys(lead).forEach(field => {
        if (!fieldStats[field]) {
          fieldStats[field] = { empty: 0, filled: 0, total: 0 };
        }

        fieldStats[field].total++;

        const value = lead[field];
        const isEmpty = value === null ||
                       value === undefined ||
                       value === '' ||
                       (Array.isArray(value) && value.length === 0);

        if (isEmpty) {
          fieldStats[field].empty++;
        } else {
          fieldStats[field].filled++;
        }
      });
    });

    // Trier par nombre de champs vides (du plus vide au plus rempli)
    const sortedFields = Object.entries(fieldStats)
      .sort((a, b) => b[1].empty - a[1].empty);

    console.log(`📊 STATISTIQUES SUR ${result.list.length} LEADS\n`);
    console.log('Champs les plus souvent vides:\n');

    let count = 0;
    for (const [field, stats] of sortedFields) {
      if (stats.empty > 0) {
        const emptyPercent = ((stats.empty / stats.total) * 100).toFixed(0);
        console.log(`  ${field.padEnd(25)} ${stats.empty}/${stats.total} vides (${emptyPercent}%)`);
        count++;
      }
    }

    console.log(`\n📋 Total: ${count} champs avec au moins une valeur vide\n`);

    // Afficher les champs importants qui sont vides
    console.log('🎯 CHAMPS CRITIQUES SOUVENT VIDES:\n');

    const criticalFields = [
      'phoneNumber',
      'website',
      'addressCity',
      'addressStreet',
      'addressCountry',
      'description',
      'assignedUserId',
      'budget'
    ];

    criticalFields.forEach(field => {
      if (fieldStats[field]) {
        const stats = fieldStats[field];
        const emptyPercent = ((stats.empty / stats.total) * 100).toFixed(0);
        const icon = stats.empty > stats.filled ? '⚠️' : '✅';
        console.log(`  ${icon} ${field.padEnd(20)} ${stats.empty}/${stats.total} vides (${emptyPercent}%)`);
      }
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

findEmptyFields();
