/**
 * SELF-HEALING SYSTEM - Auto-détection et correction des incohérences EspoCRM
 *
 * Objectif: Détecter automatiquement les changements de schéma et proposer des corrections
 *
 * Fonctionnalités:
 * 1. Détection des modifications de metadata
 * 2. Vérification de cohérence layouts/metadata/données
 * 3. Correction automatique des problèmes détectés
 * 4. Alertes sur les incohérences critiques
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkSchemaConsistency } from './fieldValidator.js';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ESPOCRM_DIR = process.env.ESPOCRM_DIR || 'D:\\Macrea\\xampp\\htdocs\\espocrm';
const PHP_PATH = process.env.PHP_PATH || 'D:\\Macrea\\xampp\\php\\php.exe';

/**
 * État du système - Dernier snapshot connu
 */
let lastKnownState = null;
const STATE_FILE = path.join(__dirname, '../.schema_state.json');

/**
 * Charge l'état précédent du schéma
 */
function loadLastState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch (error) {
      console.error('[SELF_HEALING] ⚠️  État précédent corrompu:', error.message);
    }
  }
  return null;
}

/**
 * Sauvegarde l'état actuel du schéma
 */
function saveCurrentState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Capture l'état actuel du schéma EspoCRM
 */
function captureCurrentState() {
  const metadataPath = path.join(ESPOCRM_DIR, 'custom/Espo/Custom/Resources/metadata/entityDefs/Lead.json');
  const detailLayoutPath = path.join(ESPOCRM_DIR, 'custom/Espo/Custom/Resources/layouts/Lead/detail.json');
  const listLayoutPath = path.join(ESPOCRM_DIR, 'custom/Espo/Custom/Resources/layouts/Lead/list.json');

  const state = {
    timestamp: new Date().toISOString(),
    metadata: {},
    layouts: {
      detail: null,
      list: null
    }
  };

  // Metadata
  if (fs.existsSync(metadataPath)) {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    state.metadata.fields = Object.keys(metadata.fields || {});
    state.metadata.customFields = Object.keys(metadata.fields || {}).filter(
      k => metadata.fields[k].isCustom
    );
    state.metadata.hash = hashObject(metadata.fields);
  }

  // Detail Layout
  if (fs.existsSync(detailLayoutPath)) {
    const layout = JSON.parse(fs.readFileSync(detailLayoutPath, 'utf8'));
    state.layouts.detail = extractFieldsFromDetailLayout(layout);
  }

  // List Layout
  if (fs.existsSync(listLayoutPath)) {
    const layout = JSON.parse(fs.readFileSync(listLayoutPath, 'utf8'));
    state.layouts.list = layout.map(item => item.name).filter(Boolean);
  }

  return state;
}

/**
 * Extrait les noms de champs d'un layout detail
 */
function extractFieldsFromDetailLayout(layout) {
  const fields = [];
  for (const panel of layout) {
    if (panel.rows && Array.isArray(panel.rows)) {
      for (const row of panel.rows) {
        if (Array.isArray(row)) {
          for (const cell of row) {
            if (cell && cell.name) {
              fields.push(cell.name);
            }
          }
        }
      }
    }
  }
  return fields;
}

/**
 * Hash simple d'un objet (pour détection de changements)
 */
function hashObject(obj) {
  return JSON.stringify(obj).split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
}

/**
 * Détecte les changements entre deux états
 */
function detectChanges(oldState, newState) {
  const changes = {
    hasChanges: false,
    metadata: {
      added: [],
      removed: [],
      modified: false
    },
    layouts: {
      detail: { added: [], removed: [] },
      list: { added: [], removed: [] }
    }
  };

  if (!oldState) {
    return { hasChanges: false, reason: 'NO_PREVIOUS_STATE' };
  }

  // Changements metadata
  if (oldState.metadata.hash !== newState.metadata.hash) {
    changes.hasChanges = true;
    changes.metadata.modified = true;

    changes.metadata.added = newState.metadata.fields.filter(
      f => !oldState.metadata.fields.includes(f)
    );
    changes.metadata.removed = oldState.metadata.fields.filter(
      f => !newState.metadata.fields.includes(f)
    );
  }

  // Changements detail layout
  if (oldState.layouts.detail && newState.layouts.detail) {
    const detailAdded = newState.layouts.detail.filter(
      f => !oldState.layouts.detail.includes(f)
    );
    const detailRemoved = oldState.layouts.detail.filter(
      f => !newState.layouts.detail.includes(f)
    );

    if (detailAdded.length > 0 || detailRemoved.length > 0) {
      changes.hasChanges = true;
      changes.layouts.detail.added = detailAdded;
      changes.layouts.detail.removed = detailRemoved;
    }
  }

  // Changements list layout
  if (oldState.layouts.list && newState.layouts.list) {
    const listAdded = newState.layouts.list.filter(
      f => !oldState.layouts.list.includes(f)
    );
    const listRemoved = oldState.layouts.list.filter(
      f => !newState.layouts.list.includes(f)
    );

    if (listAdded.length > 0 || listRemoved.length > 0) {
      changes.hasChanges = true;
      changes.layouts.list.added = listAdded;
      changes.layouts.list.removed = listRemoved;
    }
  }

  return changes;
}

/**
 * Vérifie la santé globale du système
 */
export async function healthCheck() {
  const report = {
    timestamp: new Date().toISOString(),
    healthy: true,
    issues: [],
    warnings: [],
    recommendations: []
  };

  // 1. Vérifier la cohérence du schéma
  const schemaCheck = await checkSchemaConsistency();
  if (!schemaCheck.consistent) {
    report.healthy = false;
    report.issues.push({
      category: 'SCHEMA_INCONSISTENCY',
      details: schemaCheck.issues
    });
  }

  // 2. Vérifier les changements de schéma
  const currentState = captureCurrentState();
  const lastState = loadLastState();
  const changes = detectChanges(lastState, currentState);

  if (changes.hasChanges) {
    report.warnings.push({
      category: 'SCHEMA_CHANGED',
      message: 'Le schéma EspoCRM a changé depuis la dernière vérification',
      details: changes
    });

    // Si des champs ont été supprimés, c'est critique
    if (changes.metadata.removed.length > 0) {
      report.healthy = false;
      report.issues.push({
        category: 'FIELDS_REMOVED',
        message: `Champs supprimés de metadata: ${changes.metadata.removed.join(', ')}`,
        impact: 'M.A.X. ne pourra plus écrire dans ces champs'
      });
    }
  }

  // 3. Vérifier que les champs M.A.X. sont dans les layouts
  const maxFields = ['tagsIA', 'secteurInfere', 'scoreIA', 'servicesSouhaites', 'notesIA'];
  const missingFromDetail = maxFields.filter(
    f => !currentState.layouts.detail || !currentState.layouts.detail.includes(f)
  );

  if (missingFromDetail.length > 0) {
    report.warnings.push({
      category: 'MISSING_FROM_LAYOUT',
      message: `Champs M.A.X. absents du layout Detail: ${missingFromDetail.join(', ')}`,
      impact: 'Ces champs ne seront pas visibles dans l\'interface',
      fix: 'Exécuter: node tools/fix_layouts.js'
    });
  }

  // Sauvegarder l'état actuel pour la prochaine vérification
  saveCurrentState(currentState);

  return report;
}

/**
 * Auto-healing: Tente de corriger automatiquement les problèmes détectés
 */
export async function autoHeal(options = {}) {
  const report = {
    timestamp: new Date().toISOString(),
    actions: [],
    success: true
  };

  const health = await healthCheck();

  // Si le système est sain, rien à faire
  if (health.healthy && health.warnings.length === 0) {
    report.actions.push({
      action: 'NONE',
      message: 'Système sain, aucune correction nécessaire'
    });
    return report;
  }

  // Corriger les layouts manquants
  const missingLayoutWarning = health.warnings.find(w => w.category === 'MISSING_FROM_LAYOUT');
  if (missingLayoutWarning) {
    try {
      console.log('[SELF_HEALING] 🔧 Correction des layouts...');
      const fixLayoutsPath = path.join(__dirname, '../tools/fix_layouts.js');

      if (fs.existsSync(fixLayoutsPath)) {
        execSync(`node "${fixLayoutsPath}"`, {
          cwd: path.join(__dirname, '..'),
          stdio: options.verbose ? 'inherit' : 'pipe'
        });

        report.actions.push({
          action: 'FIX_LAYOUTS',
          status: 'SUCCESS',
          message: 'Layouts corrigés automatiquement'
        });
      }
    } catch (error) {
      report.success = false;
      report.actions.push({
        action: 'FIX_LAYOUTS',
        status: 'FAILED',
        message: error.message
      });
    }
  }

  // Problèmes de schéma: Nécessitent intervention manuelle
  if (!health.healthy) {
    report.success = false;
    report.actions.push({
      action: 'MANUAL_INTERVENTION_REQUIRED',
      message: 'Problèmes de schéma détectés nécessitant une intervention manuelle',
      issues: health.issues
    });
  }

  return report;
}

/**
 * Initialise le self-healing system
 */
export async function initialize() {
  console.log('[SELF_HEALING] 🔍 Initialisation du système de self-healing...');

  const currentState = captureCurrentState();
  const lastState = loadLastState();

  if (!lastState) {
    console.log('[SELF_HEALING] 📸 Premier démarrage - Capture de l\'état initial');
    saveCurrentState(currentState);
  } else {
    const changes = detectChanges(lastState, currentState);
    if (changes.hasChanges) {
      console.log('[SELF_HEALING] ⚠️  Changements de schéma détectés depuis le dernier démarrage');
      console.log(JSON.stringify(changes, null, 2));
    }
  }

  const health = await healthCheck();

  if (!health.healthy) {
    console.log('[SELF_HEALING] ❌ Problèmes détectés:');
    console.log(JSON.stringify(health.issues, null, 2));
  } else if (health.warnings.length > 0) {
    console.log('[SELF_HEALING] ⚠️  Avertissements:');
    console.log(JSON.stringify(health.warnings, null, 2));
  } else {
    console.log('[SELF_HEALING] ✅ Système sain');
  }

  return health;
}

export default {
  healthCheck,
  autoHeal,
  initialize,
  captureCurrentState,
  detectChanges
};
