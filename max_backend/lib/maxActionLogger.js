/**
 * M.A.X. Action Logger
 *
 * Système de logging centralisé pour toutes les actions autonomes de M.A.X.
 * Permet de tracer l'historique complet des opérations IA dans le Reporting.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fichier de stockage des actions
const ACTIONS_FILE = path.join(__dirname, '../data/max-actions.json');

/**
 * Types d'actions M.A.X.
 */
export const ACTION_TYPES = {
  FIELD_CREATED: 'field_created',
  TAG_CREATED: 'tag_created',
  LEAD_IMPORTED: 'lead_imported',
  LEAD_ANALYZED: 'lead_analyzed',
  LEAD_TAGGED: 'lead_tagged',
  STRATEGY_GENERATED: 'strategy_generated',
  WORKFLOW_CREATED: 'workflow_created',
  CAMPAIGN_CREATED: 'campaign_created',
  MESSAGE_GENERATED: 'message_generated',
  BRAIN_DETECTED: 'brain_detected',
  REBUILD_CACHE: 'rebuild_cache'
};

/**
 * Niveaux de priorité
 */
export const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Logger une action M.A.X.
 *
 * @param {Object} action - Détails de l'action
 * @param {string} action.type - Type d'action (ACTION_TYPES)
 * @param {string} action.title - Titre court de l'action
 * @param {string} action.description - Description détaillée
 * @param {Object} action.metadata - Métadonnées supplémentaires
 * @param {string} action.priority - Niveau de priorité (PRIORITY_LEVELS)
 * @param {boolean} action.success - Succès ou échec
 * @param {string} action.error - Message d'erreur si échec
 * @returns {Promise<Object>} Action enregistrée
 */
export async function logAction(action) {
  const timestamp = new Date().toISOString();
  const id = `max_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const logEntry = {
    id,
    timestamp,
    type: action.type,
    title: action.title,
    description: action.description,
    metadata: action.metadata || {},
    priority: action.priority || PRIORITY_LEVELS.MEDIUM,
    success: action.success !== false,
    error: action.error || null,
    agent: 'M.A.X.'
  };

  try {
    // Lire les actions existantes
    let actions = [];
    try {
      const data = await fs.readFile(ACTIONS_FILE, 'utf8');
      actions = JSON.parse(data);
    } catch (e) {
      // Fichier n'existe pas encore, on le créera
      await fs.mkdir(path.dirname(ACTIONS_FILE), { recursive: true });
    }

    // Ajouter la nouvelle action
    actions.unshift(logEntry);

    // Limiter à 1000 actions max pour éviter un fichier trop lourd
    if (actions.length > 1000) {
      actions = actions.slice(0, 1000);
    }

    // Sauvegarder
    await fs.writeFile(ACTIONS_FILE, JSON.stringify(actions, null, 2), 'utf8');

    return logEntry;
  } catch (e) {
    console.error('❌ Erreur logging action M.A.X.:', e.message);
    return logEntry;
  }
}

/**
 * Récupérer toutes les actions
 *
 * @param {Object} filters - Filtres optionnels
 * @param {string} filters.type - Filtrer par type
 * @param {number} filters.limit - Limiter le nombre de résultats
 * @param {number} filters.offset - Offset pour pagination
 * @returns {Promise<Array>} Liste des actions
 */
export async function getActions(filters = {}) {
  try {
    const data = await fs.readFile(ACTIONS_FILE, 'utf8');
    let actions = JSON.parse(data);

    // Filtrer par type si demandé
    if (filters.type) {
      actions = actions.filter(a => a.type === filters.type);
    }

    // Filtrer par succès/échec
    if (filters.success !== undefined) {
      actions = actions.filter(a => a.success === filters.success);
    }

    // Pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;

    return {
      total: actions.length,
      offset,
      limit,
      actions: actions.slice(offset, offset + limit)
    };
  } catch (e) {
    // Fichier n'existe pas encore
    return {
      total: 0,
      offset: 0,
      limit: 50,
      actions: []
    };
  }
}

/**
 * Récupérer les statistiques des actions
 *
 * @returns {Promise<Object>} Statistiques
 */
export async function getStats() {
  try {
    const data = await fs.readFile(ACTIONS_FILE, 'utf8');
    const actions = JSON.parse(data);

    const stats = {
      total: actions.length,
      success: actions.filter(a => a.success).length,
      failed: actions.filter(a => !a.success).length,
      byType: {},
      last24h: 0,
      last7days: 0
    };

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    actions.forEach(action => {
      // Par type
      stats.byType[action.type] = (stats.byType[action.type] || 0) + 1;

      // Temporel
      const actionTime = new Date(action.timestamp).getTime();
      if (now - actionTime < day) {
        stats.last24h++;
      }
      if (now - actionTime < 7 * day) {
        stats.last7days++;
      }
    });

    return stats;
  } catch (e) {
    return {
      total: 0,
      success: 0,
      failed: 0,
      byType: {},
      last24h: 0,
      last7days: 0
    };
  }
}

/**
 * Supprimer les anciennes actions (> 30 jours)
 *
 * @returns {Promise<number>} Nombre d'actions supprimées
 */
export async function cleanOldActions() {
  try {
    const data = await fs.readFile(ACTIONS_FILE, 'utf8');
    let actions = JSON.parse(data);

    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const originalLength = actions.length;

    actions = actions.filter(action => {
      const actionTime = new Date(action.timestamp).getTime();
      return actionTime > thirtyDaysAgo;
    });

    await fs.writeFile(ACTIONS_FILE, JSON.stringify(actions, null, 2), 'utf8');

    return originalLength - actions.length;
  } catch (e) {
    return 0;
  }
}

export default {
  logAction,
  getActions,
  getStats,
  cleanOldActions,
  ACTION_TYPES,
  PRIORITY_LEVELS
};
