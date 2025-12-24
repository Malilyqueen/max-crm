/**
 * routes/dashboardMvp1.js
 * Routes dashboard pour MVP1 - Connecté aux vraies actions CRM via actionLogger
 */

import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { getActionLogs, getActionStats } from '../actions/actionLogger.js';

const router = express.Router();

// Appliquer authMiddleware à toutes les routes
router.use(authMiddleware);

/**
 * GET /api/dashboard-mvp1/stats
 * Retourne les statistiques du dashboard (VRAIES données depuis actionLogger)
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user?.id || 'unknown';
    const tenantId = req.headers['x-tenant'] || 'macrea';

    console.log(`[Dashboard MVP1] Récupération stats pour user: ${userId}, tenant: ${tenantId}`);

    // ✅ VRAIES DONNÉES depuis actionLogger
    const actionLogs = getActionLogs({
      tenantId,
      limit: 20 // Dernières 20 actions
    });

    const actionStats = getActionStats(tenantId);

    // Mapper les logs vers le format recentActivity attendu par le frontend
    const recentActivity = actionLogs.map(log => ({
      id: log.id,
      type: mapActionTypeToActivityType(log.actionType),
      title: generateActivityTitle(log),
      description: log.result?.preview || log.actionType,
      timestamp: log.timestamp
    }));

    // Stats calculées depuis les vraies actions
    const successfulActions = actionLogs.filter(log => log.success).length;
    const totalActions = actionLogs.length;

    const dashboardData = {
      stats: {
        totalLeads: 25, // TODO Phase 2: Récupérer depuis EspoCRM API
        newLeadsToday: 3, // TODO Phase 2: Calculer depuis vraies données
        conversionRate: 16.0, // TODO Phase 2: Calculer depuis vraies données
        activeWorkflows: 5, // TODO Phase 2: Récupérer depuis n8n ou EspoCRM
        pendingTasks: 12, // TODO Phase 2: Récupérer depuis EspoCRM
        maxInteractions: totalActions // ✅ VRAI nombre d'actions M.A.X.
      },

      // TODO Phase 2: Remplacer par vraies données lead trends
      leadsTrend: [
        { date: formatDate(-6), count: 18, converted: 4 },
        { date: formatDate(-5), count: 22, converted: 5 },
        { date: formatDate(-4), count: 15, converted: 3 },
        { date: formatDate(-3), count: 25, converted: 7 },
        { date: formatDate(-2), count: 19, converted: 4 },
        { date: formatDate(-1), count: 21, converted: 5 },
        { date: formatDate(0), count: 8, converted: 2 }
      ],

      // ✅ VRAIES ACTIVITÉS depuis actionLogger
      recentActivity,

      // TODO Phase 2: Remplacer par vraies données leads by status
      leadsByStatus: [
        { status: 'Nouveau', count: 45, color: '#3B82F6' },
        { status: 'Contacté', count: 38, color: '#10B981' },
        { status: 'Qualifié', count: 32, color: '#F59E0B' },
        { status: 'Proposition', count: 15, color: '#8B5CF6' },
        { status: 'Gagné', count: 12, color: '#22C55E' }
      ]
    };

    console.log(`[Dashboard MVP1] ✅ Retour de ${recentActivity.length} activités réelles pour tenant ${tenantId}`);
    res.json(dashboardData);

  } catch (error) {
    console.error('[Dashboard MVP1] Erreur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
});

/**
 * Helper: Formater une date relative (YYYY-MM-DD)
 */
function formatDate(daysOffset) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
}

/**
 * Helper: Mapper actionType vers type d'activité frontend
 */
function mapActionTypeToActivityType(actionType) {
  const mapping = {
    'create_opportunity': 'max_interaction',
    'create_contact': 'max_interaction',
    'create_ticket': 'max_interaction',
    'create_knowledge_article': 'max_interaction',
    'write_crm_note': 'max_interaction',
    'send_email': 'workflow_triggered',
    'create_email_draft': 'workflow_triggered',
    'create_calendar_event': 'workflow_triggered',
    'update_crm_field': 'lead_converted'
  };
  return mapping[actionType] || 'max_interaction';
}

/**
 * Helper: Générer titre d'activité depuis log
 */
function generateActivityTitle(log) {
  const titles = {
    'create_opportunity': 'Opportunité créée',
    'create_contact': 'Contact créé',
    'create_ticket': 'Ticket support créé',
    'create_knowledge_article': 'Article KB créé',
    'write_crm_note': 'Note CRM ajoutée',
    'send_email': 'Email envoyé',
    'create_email_draft': 'Brouillon email créé',
    'create_calendar_event': 'Événement calendrier créé',
    'update_crm_field': 'Lead mis à jour'
  };

  const baseTitle = titles[log.actionType] || 'Action M.A.X.';

  // Ajouter statut si échec
  if (!log.success) {
    return `❌ ${baseTitle} (échec)`;
  }

  return baseTitle;
}

export default router;
