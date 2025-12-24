/**
 * Supprimer segments avec options prédéfinies
 * et créer un champ tags libre pour M.A.X.
 */

import fs from 'fs/promises';
import { execSync } from 'child_process';

const ESPOCRM_DIR = 'D:\\Macrea\\xampp\\htdocs\\espocrm';
const PHP_PATH = 'D:\\Macrea\\xampp\\php\\php.exe';
const ENTITY = 'Lead';

const entityDefsPath = `${ESPOCRM_DIR}\\custom\\Espo\\Custom\\Resources\\metadata\\entityDefs\\${ENTITY}.json`;

async function fixSegments() {
  console.log('🔧 CORRECTION: Segments → Tags Libres\n');

  try {
    // 1. Lire entityDefs
    const entityDefs = JSON.parse(await fs.readFile(entityDefsPath, 'utf-8'));

    // 2. Supprimer l'ancien champ segments avec options fixes
    if (entityDefs.fields.segments) {
      console.log('🗑️  Suppression de "segments" (options prédéfinies)...');
      delete entityDefs.fields.segments;
    }

    // 3. Créer un nouveau champ "tags" complètement libre
    console.log('✨ Création du champ "tags" (JSON array libre)...');
    entityDefs.fields.tags = {
      type: 'jsonArray',
      isCustom: true,
      storeArrayValues: true,
      displayAsList: true
    };

    // 4. Sauvegarder
    await fs.writeFile(entityDefsPath, JSON.stringify(entityDefs, null, 4), 'utf-8');
    console.log('✅ EntityDefs mis à jour\n');

    // 5. Clear cache et rebuild
    console.log('🔄 Clear cache...');
    execSync(`"${PHP_PATH}" "${ESPOCRM_DIR}\\command.php" clear-cache`, { stdio: 'inherit' });

    console.log('🔄 Rebuild...');
    execSync(`"${PHP_PATH}" "${ESPOCRM_DIR}\\command.php" rebuild`, { stdio: 'inherit' });

    console.log('\n✅ TERMINÉ !');
    console.log('\n📋 Changements:');
    console.log('   ❌ segments (multiEnum avec options fixes) → SUPPRIMÉ');
    console.log('   ✅ tags (jsonArray libre) → CRÉÉ');
    console.log('\n💡 M.A.X. peut maintenant créer n\'importe quel tag sans limitation !');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

fixSegments();
