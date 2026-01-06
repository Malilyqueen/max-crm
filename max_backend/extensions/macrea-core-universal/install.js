#!/usr/bin/env node

/**
 * Script d'installation de l'extension MaCréa CORE Universal
 *
 * Ce script :
 * 1. Copie les entityDefs dans EspoCRM
 * 2. Exécute rebuild
 * 3. Exécute clear-cache
 *
 * Usage: node install.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const EXTENSION_DIR = __dirname;
const ESPOCRM_DIR = 'D:/Macrea/xampp/htdocs/espocrm';
const PHP_PATH = 'D:/Macrea/xampp/php/php.exe';

console.log('🚀 Installation Extension MaCréa CORE Universal\n');

// Vérifier que les répertoires existent
if (!fs.existsSync(ESPOCRM_DIR)) {
  console.error(`❌ Erreur : Répertoire EspoCRM introuvable: ${ESPOCRM_DIR}`);
  process.exit(1);
}

if (!fs.existsSync(PHP_PATH)) {
  console.error(`❌ Erreur : PHP introuvable: ${PHP_PATH}`);
  process.exit(1);
}

// Fonction pour copier récursivement
function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`⚠️  Source inexistante: ${src}`);
    return;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`  ✓ ${path.relative(EXTENSION_DIR, srcPath)} → ${path.relative(ESPOCRM_DIR, destPath)}`);
    }
  }
}

try {
  // Étape 1 : Copier les entityDefs
  console.log('📦 Étape 1/3 : Copie des entityDefs...');

  const metadataSource = path.join(EXTENSION_DIR, 'metadata');
  const metadataDest = path.join(ESPOCRM_DIR, 'custom', 'Espo', 'Custom', 'Resources', 'metadata');

  if (fs.existsSync(metadataSource)) {
    copyRecursive(metadataSource, metadataDest);
  } else {
    console.warn('⚠️  Aucun dossier metadata trouvé dans l\'extension');
  }

  console.log('✅ EntityDefs copiés\n');

  // Étape 2 : Rebuild EspoCRM
  console.log('🔧 Étape 2/3 : Rebuild EspoCRM...');

  const rebuildCmd = `"${PHP_PATH}" "${path.join(ESPOCRM_DIR, 'command.php')}" rebuild`;
  console.log(`  Exécution : ${rebuildCmd}`);

  execSync(rebuildCmd, {
    cwd: ESPOCRM_DIR,
    stdio: 'inherit'
  });

  console.log('✅ Rebuild terminé\n');

  // Étape 3 : Clear cache
  console.log('🧹 Étape 3/3 : Clear cache EspoCRM...');

  const clearCacheCmd = `"${PHP_PATH}" "${path.join(ESPOCRM_DIR, 'command.php')}" clear-cache`;
  console.log(`  Exécution : ${clearCacheCmd}`);

  execSync(clearCacheCmd, {
    cwd: ESPOCRM_DIR,
    stdio: 'inherit'
  });

  console.log('✅ Cache nettoyé\n');

  // Résumé
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Installation terminée avec succès !');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📋 Entités ajoutées :');
  console.log('  • Lead (13 champs CORE enrichis)');
  console.log('  • MissionMAX (nouvelle entité)');
  console.log('  • DiagnosticIA (nouvelle entité)');
  console.log('\n🛠️  Tools disponibles dans M.A.X. :');
  console.log('  • enrich_lead_universal');
  console.log('  • create_mission_max');
  console.log('  • generate_diagnostic_ia');
  console.log('\n🌍 Extension CORE Universelle activée !');
  console.log('   Adaptative à TOUS les secteurs sans bridage.\n');

} catch (error) {
  console.error('\n❌ Erreur lors de l\'installation:', error.message);
  process.exit(1);
}
