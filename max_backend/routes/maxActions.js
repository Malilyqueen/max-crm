/**
 * Routes API pour les actions M.A.X.
 *
 * Endpoints pour récupérer l'historique des actions autonomes de M.A.X.
 */

import express from 'express';
import { getActions, getStats, logAction, cleanOldActions } from '../lib/maxActionLogger.js';

const router = express.Router();

/**
 * GET /api/max/actions
 * Récupérer la liste des actions M.A.X.
 *
 * Query params:
 * - type: filtrer par type d'action
 * - limit: nombre de résultats (default: 50)
 * - offset: offset pour pagination (default: 0)
 * - success: filtrer par succès (true/false)
 */
router.get('/', async (req, res) => {
  try {
    const filters = {
      type: req.query.type,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0,
      success: req.query.success ? req.query.success === 'true' : undefined
    };

    const result = await getActions(filters);

    res.json({
      ok: true,
      ...result
    });
  } catch (e) {
    console.error('Erreur récupération actions M.A.X.:', e);
    res.status(500).json({
      ok: false,
      error: e.message
    });
  }
});

/**
 * GET /api/max/actions/stats
 * Récupérer les statistiques des actions M.A.X.
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getStats();

    res.json({
      ok: true,
      stats
    });
  } catch (e) {
    console.error('Erreur récupération stats M.A.X.:', e);
    res.status(500).json({
      ok: false,
      error: e.message
    });
  }
});

/**
 * POST /api/max/actions
 * Logger une nouvelle action M.A.X.
 *
 * Body:
 * {
 *   type: string,
 *   title: string,
 *   description: string,
 *   metadata: object,
 *   priority: string,
 *   success: boolean,
 *   error: string
 * }
 */
router.post('/', async (req, res) => {
  try {
    const action = req.body;

    // Validation
    if (!action.type || !action.title) {
      return res.status(400).json({
        ok: false,
        error: 'type et title sont requis'
      });
    }

    const logEntry = await logAction(action);

    res.json({
      ok: true,
      action: logEntry
    });
  } catch (e) {
    console.error('Erreur logging action M.A.X.:', e);
    res.status(500).json({
      ok: false,
      error: e.message
    });
  }
});

/**
 * DELETE /api/max/actions/old
 * Supprimer les actions de plus de 30 jours
 */
router.delete('/old', async (req, res) => {
  try {
    const deleted = await cleanOldActions();

    res.json({
      ok: true,
      deleted
    });
  } catch (e) {
    console.error('Erreur nettoyage actions M.A.X.:', e);
    res.status(500).json({
      ok: false,
      error: e.message
    });
  }
});

export default router;
