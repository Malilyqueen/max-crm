/**
 * safeActions.js
 *
 * Routes pour le Safe Actions Layer
 * Gestion intelligente et tolérante aux erreurs des actions UI
 */

import express from 'express';
import { espoFetch } from '../lib/espoClient.js';
import { bulkDeleteWithTolerance, executeUiAction, formatActionResult } from '../lib/safeActionsLayer.js';

const router = express.Router();

/**
 * POST /api/safe-actions/bulk-delete
 * Suppression en lot avec tolérance aux erreurs
 *
 * Body: { leadIds: string[], sessionId?: string }
 * Returns: { deleted, missing, failed, details, summary }
 */
router.post('/bulk-delete', async (req, res) => {
  try {
    const { leadIds, sessionId } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        error: 'leadIds requis (array non vide)'
      });
    }

    console.log(`[BulkDelete] Suppression de ${leadIds.length} leads...`);

    // Fonction de suppression EspoCRM
    const deleteFn = async (id) => {
      return await espoFetch(`/Lead/${id}`, { method: 'DELETE' });
    };

    // Exécuter la suppression avec tolérance
    const results = await bulkDeleteWithTolerance(leadIds, deleteFn);

    // Construire un résumé lisible
    const summary = [];
    if (results.deleted > 0) {
      summary.push(`✅ ${results.deleted} lead(s) supprimé(s)`);
    }
    if (results.missing > 0) {
      summary.push(`⚠️ ${results.missing} lead(s) déjà supprimé(s) ou inexistant(s)`);
    }
    if (results.failed > 0) {
      summary.push(`❌ ${results.failed} lead(s) en échec`);
    }

    const response = {
      ...results,
      summary: summary.join(', '),
      totalProcessed: leadIds.length,
      success: results.failed === 0 // Succès si aucun échec (missing est OK)
    };

    console.log(`[BulkDelete] Résultat: ${response.summary}`);

    res.json(response);
  } catch (error) {
    console.error('[BulkDelete] Erreur:', error);
    res.status(500).json({
      error: error.message,
      details: error.stack
    });
  }
});

/**
 * POST /api/safe-actions/execute
 * Point d'entrée universel pour toutes les actions UI
 *
 * Body: { action: string, sessionId: string, params?: object }
 * Returns: Résultat de l'action avec metadata fallback
 */
router.post('/execute', async (req, res) => {
  try {
    const { action, sessionId, params = {} } = req.body;

    if (!action || !sessionId) {
      return res.status(400).json({
        error: 'action et sessionId requis'
      });
    }

    console.log(`[SafeActions] Exécution action: ${action} (session: ${sessionId})`);

    // Fonction d'exécution directe (ancien comportement)
    const directExecutor = async () => {
      // Ici, appeler l'ancien handler d'action selon le type
      // Pour l'instant, on simule avec un throw si c'est une suppression
      if (action === 'delete-leads' || action === 'delete-empty-leads') {
        if (!params.leadIds || params.leadIds.length === 0) {
          throw new Error('Missing context: no leadIds in params');
        }

        const deleteFn = async (id) => {
          return await espoFetch(`/Lead/${id}`, { method: 'DELETE' });
        };

        return await bulkDeleteWithTolerance(params.leadIds, deleteFn);
      }

      // Pour les autres actions, retourner un placeholder
      return { message: `Action ${action} exécutée directement`, params };
    };

    // Fonction d'exécution via IA (fallback)
    const aiExecutor = async (textCommand) => {
      // Cette fonction serait appelée depuis routes/chat.js
      // Pour l'instant, on retourne un placeholder
      console.log(`[SafeActions] Fallback IA avec commande: "${textCommand}"`);

      return {
        message: `Action ${action} exécutée via IA`,
        textCommand,
        params
      };
    };

    // Exécuter avec le Safe Actions Layer
    const result = await executeUiAction(action, sessionId, directExecutor, aiExecutor);

    // Formater la réponse
    const formattedResult = formatActionResult(result);

    res.json({
      success: result.success,
      action,
      sessionId,
      ...formattedResult
    });
  } catch (error) {
    console.error('[SafeActions] Erreur:', error);
    res.status(500).json({
      error: error.message,
      details: error.stack
    });
  }
});

/**
 * GET /api/safe-actions/status
 * Vérifie si le Safe Actions Layer est actif
 */
router.get('/status', (req, res) => {
  const isEnabled = process.env.SAFE_ACTIONS_LAYER !== 'false';

  res.json({
    enabled: isEnabled,
    version: '1.0.0',
    features: {
      bulkDelete: true,
      intelligentFallback: true,
      contextRecovery: true
    }
  });
});

export default router;
