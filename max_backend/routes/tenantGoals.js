/**
 * routes/tenantGoals.js
 * Routes API pour la gestion des objectifs business (mémoire longue durée)
 */

import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  createTenantGoal,
  getTenantGoals,
  updateTenantGoal,
  archiveTenantGoal,
  getTenantGoalById,
  calculateGoalProgress,
  formatGoalForDisplay
} from '../lib/tenantGoals.js';

const router = express.Router();

// Appliquer authMiddleware à toutes les routes
router.use(authMiddleware);

/**
 * POST /api/tenant/goals
 * Créer un nouvel objectif
 */
router.post('/', async (req, res) => {
  try {
    // SECURITY: tenantId UNIQUEMENT depuis JWT
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(401).json({ ok: false, error: 'MISSING_TENANT' });
    }
    const {
      goal_text,
      goal_category,
      target_value,
      current_value,
      unit,
      deadline,
      status,
      priority,
      metadata
    } = req.body;

    // Validation
    if (!goal_text || typeof goal_text !== 'string' || !goal_text.trim()) {
      return res.status(400).json({
        ok: false,
        error: 'goal_text is required and must be a non-empty string'
      });
    }

    const result = await createTenantGoal({
      tenant_id: tenantId,
      goal_text: goal_text.trim(),
      goal_category,
      target_value,
      current_value,
      unit,
      deadline,
      status,
      priority,
      created_by: req.user?.id,
      metadata
    });

    if (!result.ok) {
      return res.status(500).json(result);
    }

    res.json({
      ok: true,
      goal_id: result.goal_id,
      goal: result.goal,
      message: 'Objectif créé avec succès'
    });

  } catch (error) {
    console.error('[tenantGoalsRoute] Erreur POST /:', error);
    res.status(500).json({
      ok: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/tenant/goals
 * Récupérer tous les objectifs du tenant
 */
router.get('/', async (req, res) => {
  try {
    // SECURITY: tenantId UNIQUEMENT depuis JWT
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(401).json({ ok: false, error: 'MISSING_TENANT' });
    }
    const {
      status,
      archived,
      category,
      orderBy,
      orderDirection,
      limit
    } = req.query;

    const filters = {
      status: status || null,
      archived: archived === 'true',
      category: category || null,
      orderBy: orderBy || 'priority',
      orderDirection: orderDirection || 'desc',
      limit: limit ? parseInt(limit, 10) : null
    };

    const result = await getTenantGoals(tenantId, filters);

    if (!result.ok) {
      return res.status(500).json(result);
    }

    // Enrichir avec progression calculée
    const enrichedGoals = result.goals.map(goal => ({
      ...goal,
      progress_percentage: calculateGoalProgress(goal),
      formatted_text: formatGoalForDisplay(goal)
    }));

    res.json({
      ok: true,
      goals: enrichedGoals,
      count: enrichedGoals.length
    });

  } catch (error) {
    console.error('[tenantGoalsRoute] Erreur GET /:', error);
    res.status(500).json({
      ok: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/tenant/goals/:goalId
 * Récupérer un objectif spécifique
 */
router.get('/:goalId', async (req, res) => {
  try {
    // SECURITY: tenantId UNIQUEMENT depuis JWT
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(401).json({ ok: false, error: 'MISSING_TENANT' });
    }
    const { goalId } = req.params;

    const result = await getTenantGoalById(goalId, tenantId);

    if (!result.ok) {
      return res.status(404).json({
        ok: false,
        error: 'Objectif non trouvé'
      });
    }

    // Enrichir avec progression
    const enrichedGoal = {
      ...result.goal,
      progress_percentage: calculateGoalProgress(result.goal),
      formatted_text: formatGoalForDisplay(result.goal)
    };

    res.json({
      ok: true,
      goal: enrichedGoal
    });

  } catch (error) {
    console.error('[tenantGoalsRoute] Erreur GET /:goalId:', error);
    res.status(500).json({
      ok: false,
      error: 'Internal server error'
    });
  }
});

/**
 * PATCH /api/tenant/goals/:goalId
 * Mettre à jour un objectif
 */
router.patch('/:goalId', async (req, res) => {
  try {
    // SECURITY: tenantId UNIQUEMENT depuis JWT
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(401).json({ ok: false, error: 'MISSING_TENANT' });
    }
    const { goalId } = req.params;
    const updates = req.body;

    // Validation: au moins un champ à mettre à jour
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'Au moins un champ à mettre à jour est requis'
      });
    }

    const result = await updateTenantGoal(goalId, tenantId, updates);

    if (!result.ok) {
      return res.status(500).json(result);
    }

    res.json({
      ok: true,
      goal: result.goal,
      message: 'Objectif mis à jour avec succès'
    });

  } catch (error) {
    console.error('[tenantGoalsRoute] Erreur PATCH /:goalId:', error);
    res.status(500).json({
      ok: false,
      error: 'Internal server error'
    });
  }
});

/**
 * DELETE /api/tenant/goals/:goalId
 * Archiver un objectif (soft delete)
 */
router.delete('/:goalId', async (req, res) => {
  try {
    // SECURITY: tenantId UNIQUEMENT depuis JWT
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(401).json({ ok: false, error: 'MISSING_TENANT' });
    }
    const { goalId } = req.params;
    const { reason } = req.query;

    const result = await archiveTenantGoal(goalId, tenantId, reason);

    if (!result.ok) {
      return res.status(500).json(result);
    }

    res.json({
      ok: true,
      message: 'Objectif archivé avec succès',
      goal: result.goal
    });

  } catch (error) {
    console.error('[tenantGoalsRoute] Erreur DELETE /:goalId:', error);
    res.status(500).json({
      ok: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/tenant/goals/:goalId/progress
 * Mettre à jour la progression d'un objectif
 */
router.post('/:goalId/progress', async (req, res) => {
  try {
    // SECURITY: tenantId UNIQUEMENT depuis JWT
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(401).json({ ok: false, error: 'MISSING_TENANT' });
    }
    const { goalId } = req.params;
    const { current_value } = req.body;

    if (typeof current_value !== 'number') {
      return res.status(400).json({
        ok: false,
        error: 'current_value doit être un nombre'
      });
    }

    // Récupérer l'objectif pour vérifier si atteint
    const goalResult = await getTenantGoalById(goalId, tenantId);
    if (!goalResult.ok) {
      return res.status(404).json({
        ok: false,
        error: 'Objectif non trouvé'
      });
    }

    const goal = goalResult.goal;
    const updates = { current_value };

    // Si objectif atteint, changer le statut
    if (goal.target_value && current_value >= goal.target_value) {
      updates.status = 'atteint';
    }

    const result = await updateTenantGoal(goalId, tenantId, updates);

    if (!result.ok) {
      return res.status(500).json(result);
    }

    const progress = calculateGoalProgress(result.goal);

    res.json({
      ok: true,
      goal: result.goal,
      progress_percentage: progress,
      message: progress === 100 ? '🎉 Objectif atteint !' : 'Progression mise à jour'
    });

  } catch (error) {
    console.error('[tenantGoalsRoute] Erreur POST /:goalId/progress:', error);
    res.status(500).json({
      ok: false,
      error: 'Internal server error'
    });
  }
});

export default router;
