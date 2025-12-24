/**
 * Action Logger
 *
 * Log toutes les actions exécutées par M.A.X. pour traçabilité et debug
 *
 * Stockage :
 * - En mémoire pour MVP (Map)
 * - TODO: Migrer vers Supabase ou EspoCRM custom entity
 */

const actionLogs = new Map();
let logCounter = 0;

/**
 * Log une action exécutée
 *
 * @param {Object} logEntry
 * @param {string} logEntry.tenantId
 * @param {string} logEntry.actionType
 * @param {Object} logEntry.payload
 * @param {Object} logEntry.result
 * @param {boolean} logEntry.success
 * @param {number} logEntry.duration - en ms
 */
export async function logAction(logEntry) {
  const logId = `action_${++logCounter}_${Date.now()}`;

  const fullLog = {
    id: logId,
    timestamp: new Date().toISOString(),
    ...logEntry
  };

  // Stocker en mémoire
  actionLogs.set(logId, fullLog);

  // Conserver seulement les 1000 derniers logs
  if (actionLogs.size > 1000) {
    const firstKey = actionLogs.keys().next().value;
    actionLogs.delete(firstKey);
  }

  // Log console pour debug
  const icon = logEntry.success ? '✅' : '❌';
  console.log(`   ${icon} [LOG] ${logEntry.actionType} - ${logEntry.duration}ms`);

  // TODO: Persister dans Supabase ou EspoCRM
  // await saveToSupabase(fullLog);

  return logId;
}

/**
 * Récupère les logs récents
 *
 * @param {Object} filters
 * @param {string} filters.tenantId
 * @param {string} filters.actionType
 * @param {boolean} filters.success
 * @param {number} filters.limit
 */
export function getActionLogs(filters = {}) {
  let logs = Array.from(actionLogs.values());

  // Filtrer par tenantId
  if (filters.tenantId) {
    logs = logs.filter(log => log.tenantId === filters.tenantId);
  }

  // Filtrer par actionType
  if (filters.actionType) {
    logs = logs.filter(log => log.actionType === filters.actionType);
  }

  // Filtrer par success
  if (filters.success !== undefined) {
    logs = logs.filter(log => log.success === filters.success);
  }

  // Trier par timestamp décroissant (plus récent en premier)
  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Limiter les résultats
  if (filters.limit) {
    logs = logs.slice(0, filters.limit);
  }

  return logs;
}

/**
 * Récupère un log par ID
 */
export function getActionLog(logId) {
  return actionLogs.get(logId);
}

/**
 * Statistiques des actions
 */
export function getActionStats(tenantId = null) {
  let logs = Array.from(actionLogs.values());

  if (tenantId) {
    logs = logs.filter(log => log.tenantId === tenantId);
  }

  const stats = {
    total: logs.length,
    success: logs.filter(l => l.success).length,
    failed: logs.filter(l => !l.success).length,
    avgDuration: logs.length > 0
      ? Math.round(logs.reduce((sum, l) => sum + l.duration, 0) / logs.length)
      : 0,
    byType: {}
  };

  // Stats par type d'action
  logs.forEach(log => {
    if (!stats.byType[log.actionType]) {
      stats.byType[log.actionType] = { total: 0, success: 0, failed: 0 };
    }
    stats.byType[log.actionType].total++;
    if (log.success) {
      stats.byType[log.actionType].success++;
    } else {
      stats.byType[log.actionType].failed++;
    }
  });

  return stats;
}