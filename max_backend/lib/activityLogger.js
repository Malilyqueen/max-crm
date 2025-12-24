/**
 * activityLogger.js
 * Système de logging des actions M.A.X. pour l'onglet Reporting
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ACTIVITY_LOG_FILE = path.join(__dirname, '..', 'logs', 'max_activity.jsonl');

/**
 * Log une action M.A.X. dans le fichier d'activité
 * @param {Object} action - L'action à logger
 * @param {string} action.type - Type d'action: 'field_created', 'layout_modified', 'data_updated', 'data_listed', 'data_deleted'
 * @param {string} action.tool - Nom de l'outil utilisé
 * @param {string} action.entity - Entité concernée (Lead, Contact, etc.)
 * @param {Object} action.details - Détails de l'action
 * @param {string} action.sessionId - ID de session
 * @param {boolean} action.success - Succès ou échec
 * @param {string} action.error - Message d'erreur si échec
 */
export function logMaxActivity(action) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    actor: 'M.A.X.',
    ...action
  };

  // Créer le dossier logs si nécessaire
  const logsDir = path.dirname(ACTIVITY_LOG_FILE);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Ajouter au fichier JSONL (une ligne JSON par action)
  fs.appendFileSync(ACTIVITY_LOG_FILE, JSON.stringify(logEntry) + '\n');

  console.log(`[ActivityLogger] Action logged: ${action.type} on ${action.entity}`);
}

/**
 * Récupère les N dernières actions M.A.X.
 * @param {number} limit - Nombre d'actions à récupérer
 * @returns {Array} Liste des actions
 */
export function getRecentMaxActivity(limit = 50) {
  if (!fs.existsSync(ACTIVITY_LOG_FILE)) {
    return [];
  }

  const lines = fs.readFileSync(ACTIVITY_LOG_FILE, 'utf-8')
    .split('\n')
    .filter(line => line.trim());

  // Prendre les N dernières lignes
  const recentLines = lines.slice(-limit);

  return recentLines
    .map(line => {
      try {
        return JSON.parse(line);
      } catch (error) {
        console.error('[ActivityLogger] Failed to parse line:', line);
        return null;
      }
    })
    .filter(entry => entry !== null)
    .reverse(); // Plus récent en premier
}

/**
 * Récupère les actions M.A.X. filtrées
 * @param {Object} filters - Filtres
 * @param {string} filters.type - Type d'action
 * @param {string} filters.entity - Entité
 * @param {string} filters.sessionId - ID de session
 * @param {Date} filters.since - Date de début
 * @param {number} filters.limit - Nombre max de résultats
 * @returns {Array} Liste des actions filtrées
 */
export function getMaxActivity(filters = {}) {
  const { type, entity, sessionId, since, limit = 100 } = filters;

  let activities = getRecentMaxActivity(limit * 2); // Prendre plus pour filtrer

  if (type) {
    activities = activities.filter(a => a.type === type);
  }

  if (entity) {
    activities = activities.filter(a => a.entity === entity);
  }

  if (sessionId) {
    activities = activities.filter(a => a.sessionId === sessionId);
  }

  if (since) {
    const sinceTime = new Date(since).getTime();
    activities = activities.filter(a => new Date(a.timestamp).getTime() >= sinceTime);
  }

  return activities.slice(0, limit);
}

/**
 * Formate une action pour l'affichage dans le Reporting
 * @param {Object} action - Action brute
 * @returns {Object} Action formatée pour le frontend
 */
export function formatActivityForReporting(action) {
  const typeLabels = {
    field_created: '🔧 Champ créé',
    layout_modified: '📋 Layout modifié',
    data_updated: '✏️ Données mises à jour',
    data_listed: '📊 Données listées',
    data_deleted: '🗑️ Données supprimées',
    rebuild: '🔨 Rebuild exécuté',
    cache_cleared: '🧹 Cache nettoyé'
  };

  let title = typeLabels[action.type] || '⚙️ Action';

  // Utiliser les données directes de l'action
  if (action.fieldName) {
    title += ` : ${action.fieldName}`;
    if (action.fieldType) {
      title += ` (${action.fieldType})`;
    }
  } else if (action.count) {
    title += ` (${action.count} éléments)`;
  }

  // Ajouter les détails si disponibles
  const details = action.details || `${action.entity || 'Entity'} - ${action.type}`;

  return {
    ts: new Date(action.timestamp).getTime(),
    type: action.type,
    title: title,
    meta: {
      entityType: action.entity || 'Lead',
      entityId: action.leadIds?.[0] || action.fieldName || 'unknown',
      details: details,
      count: action.count || 0,
      actor: action.actor || 'M.A.X.',
      // Compatibilité avec l'ancien format
      entity: action.entity || 'Lead'
    }
  };
}
