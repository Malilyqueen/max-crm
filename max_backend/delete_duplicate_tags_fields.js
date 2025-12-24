/**
 * Supprimer les champs tags et maxTags en doublon
 * Garder uniquement segments
 */

import fs from 'fs/promises';
import { execSync } from 'child_process';

const ESPOCRM_DIR = 'D:\\Macrea\\xampp\\htdocs\\espocrm';
const PHP_PATH = 'D:\\Macrea\\xampp\\php\\php.exe';
const ENTITY = 'Lead';

const entityDefsPath = `${ESPOCRM_DIR}\\custom\\Espo\\Custom\\Resources\\metadata\\entityDefs\\${ENTITY}.json`;
const layoutsDir = `${ESPOCRM_DIR}\\custom\\Espo\\Custom\\Resources\\layouts\\${ENTITY}`;

async function deleteFields() {
  console.log('🗑️  SUPPRESSION DES CHAMPS TAGS EN DOUBLON\n');

  try {
    // 1. Supprimer de entityDefs
    console.log('📝 Lecture de entityDefs...');
    const entityDefs = JSON.parse(await fs.readFile(entityDefsPath, 'utf-8'));

    const fieldsToDelete = ['tags', 'maxTags'];
    let deletedCount = 0;

    fieldsToDelete.forEach(field => {
      if (entityDefs.fields[field]) {
        delete entityDefs.fields[field];
        console.log(`   ✅ Champ "${field}" supprimé de entityDefs`);
        deletedCount++;
      } else {
        console.log(`   ⚠️  Champ "${field}" n'existe pas dans entityDefs`);
      }
    });

    if (deletedCount > 0) {
      await fs.writeFile(entityDefsPath, JSON.stringify(entityDefs, null, 4), 'utf-8');
      console.log(`\n✅ EntityDefs mis à jour (${deletedCount} champs supprimés)\n`);
    }

    // 2. Nettoyer les layouts
    console.log('🧹 Nettoyage des layouts...');
    const layoutFiles = await fs.readdir(layoutsDir);

    for (const file of layoutFiles) {
      if (!file.endsWith('.json')) continue;

      const layoutPath = `${layoutsDir}\\${file}`;
      let layout = JSON.parse(await fs.readFile(layoutPath, 'utf-8'));
      let modified = false;

      if (file === 'detail.json' || file === 'detailSmall.json') {
        // Layout detail avec panels
        layout.forEach(panel => {
          if (!panel.rows) return;

          panel.rows = panel.rows.map(row => {
            const filteredRow = row.filter(cell => {
              if (cell && fieldsToDelete.includes(cell.name)) {
                console.log(`   🗑️  Retiré "${cell.name}" de ${file}`);
                modified = true;
                return false;
              }
              return true;
            });
            return filteredRow;
          });
        });
      } else if (file === 'list.json') {
        // Layout list (array)
        const originalLength = layout.length;
        layout = layout.filter(item => {
          if (item && fieldsToDelete.includes(item.name)) {
            console.log(`   🗑️  Retiré "${item.name}" de ${file}`);
            modified = true;
            return false;
          }
          return true;
        });

        if (layout.length < originalLength) modified = true;
      }

      if (modified) {
        await fs.writeFile(layoutPath, JSON.stringify(layout, null, 4), 'utf-8');
        console.log(`   ✅ ${file} mis à jour`);
      }
    }

    // 3. Clear cache et rebuild
    console.log('\n🔄 Clear cache et rebuild...');
    execSync(`"${PHP_PATH}" "${ESPOCRM_DIR}\\command.php" clear-cache`, { stdio: 'inherit' });
    execSync(`"${PHP_PATH}" "${ESPOCRM_DIR}\\command.php" rebuild`, { stdio: 'inherit' });

    console.log('\n✅ SUPPRESSION TERMINÉE !');
    console.log('\n📊 RÉSUMÉ :');
    console.log(`   • Champs supprimés : ${fieldsToDelete.join(', ')}`);
    console.log(`   • Champ conservé : segments`);
    console.log('\n💡 Rechargez MaCréa CRM pour voir les changements.');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

deleteFields();
