/**
 * Inspecter la structure du layout Lead pour trouver le panel "Tâches"
 */

import fs from 'fs/promises';
import path from 'path';

const layoutPath = 'D:\\Macrea\\xampp\\htdocs\\espocrm\\custom\\Espo\\Custom\\Resources\\layouts\\Lead\\detail.json';

async function inspectLayout() {
  console.log('📋 INSPECTION DU LAYOUT LEAD\n');

  try {
    const content = await fs.readFile(layoutPath, 'utf-8');
    const layout = JSON.parse(content);

    console.log(`Total panels: ${layout.length}\n`);

    layout.forEach((panel, index) => {
      const label = panel.label || panel.name || '(sans label)';
      const rowCount = panel.rows ? panel.rows.length : 0;
      const style = panel.style || 'default';

      console.log(`Panel ${index}: "${label}"`);
      console.log(`  Style: ${style}`);
      console.log(`  Rows: ${rowCount}`);

      if (panel.rows && panel.rows.length > 0) {
        console.log(`  Champs:`);
        panel.rows.slice(0, 3).forEach((row, rowIdx) => {
          const fields = row.filter(cell => cell && cell.name).map(cell => cell.name);
          if (fields.length > 0) {
            console.log(`    Row ${rowIdx}: ${fields.join(', ')}`);
          }
        });
        if (panel.rows.length > 3) {
          console.log(`    ... et ${panel.rows.length - 3} autres rows`);
        }
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

inspectLayout();
