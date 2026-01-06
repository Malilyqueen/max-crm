/**
 * FIX LAYOUTS - Ajoute automatiquement les champs custom M.A.X. aux layouts EspoCRM
 * Cible: Lead entity
 * Layouts modifiés: detail, list
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ESPOCRM_DIR = process.env.ESPOCRM_DIR || 'D:\\Macrea\\xampp\\htdocs\\espocrm';
const LAYOUTS_DIR = path.join(ESPOCRM_DIR, 'custom/Espo/Custom/Resources/layouts/Lead');
const PHP_PATH = process.env.PHP_PATH || 'D:\\Macrea\\xampp\\php\\php.exe';

/**
 * Champs M.A.X. essentiels qui doivent être visibles
 */
const ESSENTIAL_FIELDS = {
  tagsIA: { label: 'Tags IA', priority: 1 },
  secteurInfere: { label: 'Secteur Inféré (IA)', priority: 2 },
  scoreIA: { label: 'Score IA', priority: 3 },
  servicesSouhaites: { label: 'Services Souhaités', priority: 4 },
  notesIA: { label: 'Notes IA (M.A.X.)', priority: 5 }
};

/**
 * Lit un fichier layout JSON
 */
function readLayout(layoutType) {
  const layoutPath = path.join(LAYOUTS_DIR, `${layoutType}.json`);

  if (fs.existsSync(layoutPath)) {
    return JSON.parse(fs.readFileSync(layoutPath, 'utf8'));
  }

  return null;
}

/**
 * Écrit un fichier layout JSON
 */
function writeLayout(layoutType, content) {
  const layoutPath = path.join(LAYOUTS_DIR, `${layoutType}.json`);

  // Créer le répertoire si nécessaire
  fs.mkdirSync(path.dirname(layoutPath), { recursive: true });

  fs.writeFileSync(layoutPath, JSON.stringify(content, null, 2), 'utf8');
  console.log(`✅ Layout ${layoutType} mis à jour: ${layoutPath}`);
}

/**
 * Vérifie si un champ existe déjà dans un layout
 */
function fieldExistsInLayout(layout, fieldName, layoutType = 'detail') {
  if (!layout) return false;

  // Pour detail layout (structure avec panels et rows)
  if (layoutType === 'detail' && Array.isArray(layout)) {
    for (const panel of layout) {
      if (panel.rows && Array.isArray(panel.rows)) {
        for (const row of panel.rows) {
          if (Array.isArray(row)) {
            for (const cell of row) {
              if (cell && (cell.name === fieldName || cell === fieldName)) {
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  }

  // Pour list layout (structure simple array)
  if (Array.isArray(layout)) {
    return layout.some(item =>
      item && (item.name === fieldName || item === fieldName)
    );
  }

  return false;
}

/**
 * Ajoute les champs M.A.X. au layout Detail
 */
function fixDetailLayout() {
  console.log('\n📝 Mise à jour du layout Detail...');

  let layout = readLayout('detail');

  if (!layout) {
    console.log('⚠️  Layout detail n\'existe pas, création d\'un nouveau...');
    layout = [];
  }

  // Compter les champs manquants
  const missingFields = Object.keys(ESSENTIAL_FIELDS).filter(
    fieldName => !fieldExistsInLayout(layout, fieldName, 'detail')
  );

  if (missingFields.length === 0) {
    console.log('✅ Tous les champs essentiels sont déjà dans le layout detail');
    return { added: 0, total: Object.keys(ESSENTIAL_FIELDS).length };
  }

  console.log(`📋 ${missingFields.length} champs à ajouter:`, missingFields);

  // Trouver ou créer le panel "Tâches M.A.X."
  let maxPanel = layout.find(panel => panel.label === 'Tâches M.A.X.');

  if (!maxPanel) {
    maxPanel = {
      label: 'Informations M.A.X.',
      style: 'default',
      rows: []
    };
    // Insérer le panel après le premier panel (Overview)
    layout.splice(1, 0, maxPanel);
  }

  // Ajouter les champs M.A.X. manquants au panel
  const maxRows = [
    [
      { name: 'tagsIA', fullWidth: false },
      { name: 'secteurInfere', fullWidth: false }
    ],
    [
      { name: 'scoreIA', fullWidth: false },
      { name: 'servicesSouhaites', fullWidth: false }
    ],
    [
      { name: 'notesIA', fullWidth: true },
      false
    ]
  ];

  // Remplacer les rows du panel avec les nouvelles rows incluant tous les champs M.A.X.
  maxPanel.rows = maxRows;

  writeLayout('detail', layout);

  return { added: missingFields.length, total: Object.keys(ESSENTIAL_FIELDS).length };
}

/**
 * Ajoute les champs M.A.X. au layout List
 */
function fixListLayout() {
  console.log('\n📝 Mise à jour du layout List...');

  let layout = readLayout('list');

  if (!layout) {
    console.log('⚠️  Layout list n\'existe pas, création d\'un nouveau...');
    layout = [];
  }

  // Champs essentiels pour la vue liste
  const listFields = ['tagsIA', 'secteurInfere', 'scoreIA'];

  const missingFields = listFields.filter(
    fieldName => !fieldExistsInLayout(layout, fieldName, 'list')
  );

  if (missingFields.length === 0) {
    console.log('✅ Tous les champs essentiels sont déjà dans le layout list');
    return { added: 0, total: listFields.length };
  }

  console.log(`📋 ${missingFields.length} champs à ajouter:`, missingFields);

  // Ajouter les champs manquants
  for (const fieldName of missingFields) {
    layout.push({
      name: fieldName,
      width: fieldName === 'tagsIA' ? 20 : 15
    });
  }

  writeLayout('list', layout);

  return { added: missingFields.length, total: listFields.length };
}

/**
 * Clear cache EspoCRM
 */
function clearEspoCache() {
  console.log('\n🔄 Nettoyage du cache EspoCRM...');

  try {
    const cmd = `"${PHP_PATH}" command.php clear-cache`;
    execSync(cmd, {
      cwd: ESPOCRM_DIR,
      stdio: 'inherit'
    });
    console.log('✅ Cache nettoyé');
    return true;
  } catch (error) {
    console.error('⚠️  Erreur lors du nettoyage du cache:', error.message);
    return false;
  }
}

/**
 * Rebuild EspoCRM
 */
function rebuildEspo() {
  console.log('\n🔨 Rebuild EspoCRM...');

  try {
    const cmd = `"${PHP_PATH}" command.php rebuild`;
    execSync(cmd, {
      cwd: ESPOCRM_DIR,
      stdio: 'inherit'
    });
    console.log('✅ Rebuild terminé');
    return true;
  } catch (error) {
    console.error('⚠️  Erreur lors du rebuild:', error.message);
    return false;
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log('='.repeat(80));
  console.log('🛠️  FIX LAYOUTS ESPOCRM - Ajout des champs M.A.X.');
  console.log('='.repeat(80));

  try {
    // 1. Fixer le layout Detail
    const detailResult = fixDetailLayout();

    // 2. Fixer le layout List
    const listResult = fixListLayout();

    // 3. Clear cache
    clearEspoCache();

    // 4. Rebuild
    rebuildEspo();

    // Résumé
    console.log('\n' + '='.repeat(80));
    console.log('✅ LAYOUTS CORRIGÉS AVEC SUCCÈS');
    console.log('='.repeat(80));
    console.log(`📝 Layout Detail: ${detailResult.added} champs ajoutés sur ${detailResult.total}`);
    console.log(`📝 Layout List: ${listResult.added} champs ajoutés sur ${listResult.total}`);
    console.log('\n💡 Rafraîchissez EspoCRM (Ctrl+F5) pour voir les changements');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Exécution
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  main();
}

export { fixDetailLayout, fixListLayout, clearEspoCache, rebuildEspo };
