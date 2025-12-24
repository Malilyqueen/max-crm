/**
 * Ajouter un panel "Tâches M.A.X." dans le layout Lead
 * et y déplacer secteur, maxTags, segments
 */

import fs from 'fs/promises';
import path from 'path';

const layoutPath = 'D:\\Macrea\\xampp\\htdocs\\espocrm\\custom\\Espo\\Custom\\Resources\\layouts\\Lead\\detail.json';

async function addTasksPanel() {
  console.log('🎯 AJOUT DU PANEL "TÂCHES M.A.X."\n');

  try {
    // 1. Lire le layout actuel
    const content = await fs.readFile(layoutPath, 'utf-8');
    const layout = JSON.parse(content);

    console.log(`Layout actuel: ${layout.length} panels\n`);

    // 2. Vérifier si le panel "Tâches M.A.X." existe déjà
    const tasksPanelIndex = layout.findIndex(panel =>
      panel.label === 'Tâches M.A.X.' || panel.label === 'M.A.X. Tasks'
    );

    if (tasksPanelIndex !== -1) {
      console.log(`✅ Panel "Tâches M.A.X." existe déjà à l'index ${tasksPanelIndex}`);
      return;
    }

    // 3. Créer le nouveau panel "Tâches M.A.X."
    const tasksPanel = {
      label: 'Tâches M.A.X.',
      style: 'default',
      rows: [
        [
          { name: 'secteur', fullWidth: false },
          { name: 'maxTags', fullWidth: false }
        ],
        [
          { name: 'segments', fullWidth: true },
          false
        ]
      ]
    };

    // 4. Supprimer secteur, maxTags, segments des autres panels (s'ils y sont)
    const fieldsToMove = ['secteur', 'maxTags', 'segments'];

    layout.forEach((panel, panelIdx) => {
      if (!panel.rows) return;

      panel.rows = panel.rows.filter(row => {
        // Garder la row seulement si elle ne contient pas les champs à déplacer
        return !row.some(cell => cell && fieldsToMove.includes(cell.name));
      });

      console.log(`Panel ${panelIdx}: ${panel.label} - rows restantes: ${panel.rows.length}`);
    });

    // 5. Ajouter le nouveau panel en position 1 (après Overview, avant Address)
    layout.splice(1, 0, tasksPanel);

    console.log(`\n✅ Panel "Tâches M.A.X." ajouté à l'index 1`);
    console.log(`   Total panels: ${layout.length}`);

    // 6. Écrire le layout modifié
    const jsonContent = JSON.stringify(layout, null, 2);
    await fs.writeFile(layoutPath, jsonContent, 'utf-8');

    console.log('\n✅ Layout sauvegardé!');
    console.log('\n⚠️  PROCHAINES ÉTAPES:');
    console.log('   1. Lancez: cd max_backend && node ../xampp/php/php.exe ../xampp/htdocs/espocrm/command.php clear-cache');
    console.log('   2. Lancez: cd max_backend && node ../xampp/php/php.exe ../xampp/htdocs/espocrm/command.php rebuild');
    console.log('   3. Rafraîchissez EspoCRM dans votre navigateur');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  }
}

addTasksPanel();
