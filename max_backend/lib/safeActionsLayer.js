/**
 * safeActionsLayer.js
 *
 * Couche de compatibilité intelligente pour les boutons d'action.
 * Intercepte les actions UI, comprend leur intention, et gère les échecs gracieusement.
 *
 * Principe:
 * 1. Tout bouton cliqué passe par executeUiAction()
 * 2. Si l'API directe échoue (404, 400, etc.), on reformule en commande textuelle
 * 3. La commande est renvoyée au moteur IA pour exécution contextuelle
 * 4. Les échecs partiels (lead déjà supprimé) sont gérés comme des succès partiels
 */

import { loadConversation } from './conversationService.js';

/**
 * Mapping des actions UI vers commandes textuelles
 */
const ACTION_TO_TEXT_COMMAND = {
  // Actions de suppression
  'delete-leads': 'Supprime les leads sélectionnés',
  'delete-empty-leads': 'Supprime les leads vides',
  'cancel-import': 'Annule l\'import en cours',

  // Actions d'enrichissement
  'execute-enrichment': 'Enrichis maintenant les leads',
  'skip-enrichment': 'Passe l\'enrichissement',
  'show-enrichment-details': 'Montre les détails d\'enrichissement',

  // Actions de workflow
  'activate-workflow': 'Active le workflow proposé',
  'customize-workflow': 'Personnalise le workflow',
  'skip-workflow': 'Passe le workflow',

  // Actions d'import
  'confirm-import-espo': 'Oui, importe dans EspoCRM',
  'download-enriched': 'Télécharge le CSV enrichi',

  // Actions post-import
  'start-enrichment': 'Lance l\'enrichissement des données',
  'setup-workflows': 'Crée les workflows d\'automatisation',
  'segment-leads': 'Segmente les leads',
  'create-campaign': 'Crée une campagne',

  // Actions de gestion d'erreurs
  'retry': 'Réessaye la dernière action',
  'cancel': 'Annule l\'opération'
};

/**
 * Détecte si une action nécessite un contexte spécifique
 */
function needsContext(action) {
  const contextActions = [
    'delete-leads',
    'delete-empty-leads',
    'execute-enrichment',
    'activate-workflow',
    'confirm-import-espo'
  ];

  return contextActions.includes(action);
}

/**
 * Extrait le contexte nécessaire depuis la session
 */
function extractActionContext(sessionId, action) {
  const conversation = loadConversation(sessionId);

  if (!conversation) {
    return null;
  }

  const context = {
    sessionId,
    action,
    leadIds: [],
    metadata: {}
  };

  // Chercher les IDs de leads dans les derniers messages
  const recentMessages = conversation.messages.slice(-5);

  for (const msg of recentMessages) {
    if (msg.role === 'assistant' && msg.content) {
      // Extraire les IDs de leads (format: "6911fd063cd6b0496")
      const leadIdMatches = msg.content.match(/[a-f0-9]{17}/g);
      if (leadIdMatches) {
        context.leadIds.push(...leadIdMatches);
      }

      // Extraire le nombre de leads mentionnés
      const leadCountMatch = msg.content.match(/(\d+)\s+leads?/i);
      if (leadCountMatch) {
        context.metadata.leadCount = parseInt(leadCountMatch[1]);
      }

      // Extraire le coût d'enrichissement
      const costMatch = msg.content.match(/(\d+(?:[.,]\d+)?)\s*€/);
      if (costMatch) {
        context.metadata.enrichmentCost = parseFloat(costMatch[1].replace(',', '.'));
      }

      // Extraire le nom du workflow
      const workflowMatch = msg.content.match(/workflow[:\s]+"([^"]+)"/i);
      if (workflowMatch) {
        context.metadata.workflowName = workflowMatch[1];
      }
    }
  }

  // Dédupliquer les IDs
  context.leadIds = [...new Set(context.leadIds)];

  return context;
}

/**
 * Convertit une action UI en commande textuelle intelligente
 */
export function actionToTextCommand(action, context = {}) {
  // Commande de base depuis le mapping
  let command = ACTION_TO_TEXT_COMMAND[action] || action;

  // Enrichir avec le contexte si disponible
  if (context.leadIds && context.leadIds.length > 0) {
    command += ` (IDs: ${context.leadIds.join(', ')})`;
  }

  if (context.metadata) {
    if (context.metadata.leadCount) {
      command += ` [${context.metadata.leadCount} leads]`;
    }
    if (context.metadata.workflowName) {
      command += ` "${context.metadata.workflowName}"`;
    }
  }

  return command;
}

/**
 * Point d'entrée principal: exécute une action UI avec gestion intelligente des échecs
 *
 * @param {string} action - Action UI (ex: "delete-leads", "execute-enrichment")
 * @param {string} sessionId - ID de session
 * @param {function} directExecutor - Fonction qui exécute l'action directement (ancienne façon)
 * @param {function} aiExecutor - Fonction qui exécute via le moteur IA (fallback)
 * @returns {object} Résultat { success, data, fallbackUsed }
 */
export async function executeUiAction(action, sessionId, directExecutor, aiExecutor) {
  const SAFE_MODE = process.env.SAFE_ACTIONS_LAYER !== 'false'; // Activé par défaut

  console.log(`[SafeActionsLayer] Exécution action: ${action}, safe mode: ${SAFE_MODE}`);

  // Si le safe mode est désactivé, exécute directement
  if (!SAFE_MODE) {
    try {
      const result = await directExecutor();
      return { success: true, data: result, fallbackUsed: false };
    } catch (error) {
      return { success: false, error: error.message, fallbackUsed: false };
    }
  }

  // Tenter l'exécution directe d'abord
  try {
    const result = await directExecutor();
    console.log(`[SafeActionsLayer] Exécution directe réussie`);
    return { success: true, data: result, fallbackUsed: false };
  } catch (directError) {
    console.log(`[SafeActionsLayer] Exécution directe échouée: ${directError.message}`);

    // Si l'action nécessite du contexte, tenter de le récupérer
    const context = needsContext(action) ? extractActionContext(sessionId, action) : {};

    // Convertir l'action en commande textuelle
    const textCommand = actionToTextCommand(action, context);

    console.log(`[SafeActionsLayer] Fallback vers commande IA: "${textCommand}"`);

    try {
      // Exécuter via le moteur IA
      const aiResult = await aiExecutor(textCommand);

      return {
        success: true,
        data: aiResult,
        fallbackUsed: true,
        originalError: directError.message,
        textCommand
      };
    } catch (aiError) {
      console.error(`[SafeActionsLayer] Fallback IA échoué: ${aiError.message}`);

      return {
        success: false,
        error: aiError.message,
        fallbackUsed: true,
        originalError: directError.message
      };
    }
  }
}

/**
 * Gestion de suppression en lot avec tolérance aux erreurs
 *
 * @param {array} leadIds - IDs des leads à supprimer
 * @param {function} deleteFn - Fonction de suppression (espoFetch ou autre)
 * @returns {object} Résultat { deleted, missing, failed, details }
 */
export async function bulkDeleteWithTolerance(leadIds, deleteFn) {
  const results = {
    deleted: 0,
    missing: 0,
    failed: 0,
    details: []
  };

  for (const id of leadIds) {
    try {
      await deleteFn(id);
      results.deleted++;
      results.details.push({ id, status: 'deleted' });
    } catch (error) {
      // Si 404, le lead est déjà supprimé ou n'existe pas
      if (error.status === 404 || error.message.includes('404') || error.message.includes('Not Found')) {
        results.missing++;
        results.details.push({ id, status: 'missing', reason: 'Lead déjà supprimé ou inexistant' });
      } else {
        results.failed++;
        results.details.push({ id, status: 'failed', reason: error.message });
      }
    }
  }

  return results;
}

/**
 * Détecte si une réponse d'erreur peut être récupérée
 */
export function isRecoverableError(error) {
  const recoverableStatuses = [400, 404, 409];
  const recoverableMessages = [
    'not found',
    'already exists',
    'already deleted',
    'invalid id',
    'missing context'
  ];

  if (error.status && recoverableStatuses.includes(error.status)) {
    return true;
  }

  const errorMsg = (error.message || '').toLowerCase();
  return recoverableMessages.some(msg => errorMsg.includes(msg));
}

/**
 * Formatte un résultat pour l'affichage utilisateur
 */
export function formatActionResult(result) {
  if (!result.fallbackUsed) {
    return result.data;
  }

  // Si fallback utilisé, ajouter un message informatif
  return {
    ...result.data,
    _safeModeInfo: {
      message: 'Action exécutée via intelligence contextuelle',
      originalError: result.originalError,
      textCommand: result.textCommand
    }
  };
}
