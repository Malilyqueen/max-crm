/**
 * Chercher le champ "budget" dans tous les layouts Lead
 */

import fs from 'fs/promises';
import path from 'path';

const layoutDir = 'D:\\Macrea\\xampp\\htdocs\\espocrm\\custom\\Espo\\Custom\\Resources\\layouts\\Lead';

async function findBudgetInLayouts() {
  console.log('🔍 RECHERCHE DU CHAMP "budget" DANS LES LAYOUTS\n');

  try {
    const files = await fs.readdir(layoutDir);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const layoutPath = path.join(layoutDir, file);
      const content = await fs.readFile(layoutPath, 'utf-8');
      const layout = JSON.parse(content);

      console.log(`📄 ${file}:`);

      let found = false;

      if (file === 'detail.json') {
        // Detail layout - chercher dans les panels
        layout.forEach((panel, panelIdx) => {
          if (!panel.rows) return;

          panel.rows.forEach((row, rowIdx) => {
            row.forEach((cell, cellIdx) => {
              if (cell && cell.name === 'budget') {
                console.log(`   ✅ TROUVÉ dans panel ${panelIdx} (${panel.label}), row ${rowIdx}, cell ${cellIdx}`);
                found = true;
              }
            });
          });
        });
      } else if (file === 'list.json') {
        // List layout - chercher dans l'array
        layout.forEach((item, idx) => {
          if (item && item.name === 'budget') {
            console.log(`   ✅ TROUVÉ à l'index ${idx}`);
            found = true;
          }
        });
      } else if (file === 'detailSmall.json') {
        // DetailSmall layout - même structure que detail
        layout.forEach((panel, panelIdx) => {
          if (!panel.rows) return;

          panel.rows.forEach((row, rowIdx) => {
            row.forEach((cell, cellIdx) => {
              if (cell && cell.name === 'budget') {
                console.log(`   ✅ TROUVÉ dans panel ${panelIdx}, row ${rowIdx}, cell ${cellIdx}`);
                found = true;
              }
            });
          });
        });
      }

      if (!found) {
        console.log(`   ❌ Pas trouvé`);
      }

      console.log('');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

findBudgetInLayouts();
