/**
 * routes/activities.js
 * Routes API pour le système d'alertes vivantes M.A.X.
 * - POST /api/activities/log - Logger une activité
 * - GET /api/alerts/active - Récupérer alertes actives
 */

import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { resolveTenant } from '../core/resolveTenant.js';
import { logActivity } from '../lib/activityLogger.js';
import { generateAlertsForLead, getActiveAlerts, resolveAlert, scanDormantLeads, getActiveAlertsEnriched } from '../lib/alertGenerator.js';
import { espoFetch } from '../lib/espoClient.js';
import { supabase } from '../lib/supabaseClient.js';

const router = express.Router();

// Appliquer authMiddleware + resolveTenant à toutes les routes
router.use(authMiddleware);
router.use(resolveTenant());

/**
 * POST /api/activities/log
 * Logger une activité et déclencher génération d'alertes pour ce lead
 *
 * Body:
 * {
 *   leadId: string (required)
 *   channel: 'whatsapp' | 'email' | 'call' | 'other' (required)
 *   direction: 'in' | 'out' (required)
 *   status?: 'sent' | 'delivered' | 'failed' | 'replied' | 'no_answer'
 *   messageSnippet?: string
 *   meta?: object
 * }
 */
router.post('/log', async (req, res) => {
  try {
    // SECURITY: tenantId UNIQUEMENT depuis JWT - JAMAIS depuis X-Tenant header!
    const tenantId = req.tenantId;
    if (!tenantId) {
      console.error('🚫 [SECURITY] MISSING_TENANT - POST /activities/log sans tenantId JWT');
      return res.status(401).json({
        success: false,
        error: 'MISSING_TENANT'
      });
    }

    const { leadId, channel, direction, status, messageSnippet, meta } = req.body;

    // Validation
    if (!leadId) {
      return res.status(400).json({
        success: false,
        error: 'leadId requis'
      });
    }

    if (!channel || !['whatsapp', 'email', 'call', 'other'].includes(channel)) {
      return res.status(400).json({
        success: false,
        error: 'channel invalide (whatsapp|email|call|other)'
      });
    }

    if (!direction || !['in', 'out'].includes(direction)) {
      return res.status(400).json({
        success: false,
        error: 'direction invalide (in|out)'
      });
    }

    console.log(`[Activities] 📝 Log activité: ${leadId} - ${channel} ${direction}`);

    // Logger l'activité dans Supabase
    const activity = await logActivity({
      leadId,
      channel,
      direction,
      status,
      messageSnippet,
      meta,
      tenantId
    });

    // Générer/rafraîchir alertes pour ce lead
    let alertsResult = null;
    try {
      alertsResult = await generateAlertsForLead(leadId, tenantId);
    } catch (alertError) {
      console.error(`[Activities] ⚠️ Erreur génération alertes:`, alertError);
      // Ne pas bloquer la réponse si génération d'alertes échoue
    }

    // Récupérer alertes actives du lead
    const { data: leadAlerts } = await supabase
      .from('max_alerts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('lead_id', leadId)
      .is('resolved_at', null);

    res.json({
      success: true,
      activity,
      alerts: {
        ...alertsResult,
        active: leadAlerts || []
      }
    });

  } catch (error) {
    console.error('[Activities] ❌ Erreur /log:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/alerts/active
 * Récupérer toutes les alertes actives pour le tenant
 *
 * Query params:
 * - severity?: 'low' | 'med' | 'high' (filtre optionnel)
 * - type?: 'NoContact7d' | 'NoReply3d' (filtre optionnel)
 */
router.get('/active', async (req, res) => {
  try {
    // SECURITY: tenantId UNIQUEMENT depuis JWT - JAMAIS depuis X-Tenant header!
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, error: 'MISSING_TENANT' });
    }

    const { severity, type } = req.query;

    console.log(`[Activities] 🔔 Récupération alertes actives (tenant: ${tenantId})`);

    // Récupérer alertes depuis Supabase
    let alerts = await getActiveAlerts(tenantId);

    // Filtrer si nécessaire
    if (severity) {
      alerts = alerts.filter(a => a.severity === severity);
    }

    if (type) {
      alerts = alerts.filter(a => a.type === type);
    }

    // Enrichir avec données EspoCRM (nom, email, phone, tags, secteur)
    const enrichedAlerts = await Promise.all(
      alerts.map(async (alert) => {
        try {
          const lead = await espoFetch(`/Lead/${alert.lead_id}`);
          return {
            ...alert,
            lead_name: lead?.name || 'Inconnu',
            lead_email: lead?.emailAddress || null,
            lead_phone: lead?.phoneNumber || null,
            lead_tags: lead?.tagsIA || [],
            lead_secteur: lead?.secteurInfere || 'inconnu'
          };
        } catch (error) {
          console.warn(`[Activities] ⚠️ Lead ${alert.lead_id} introuvable dans EspoCRM`);
          return {
            ...alert,
            lead_name: 'Lead introuvable',
            lead_email: null,
            lead_phone: null,
            lead_tags: [],
            lead_secteur: 'inconnu'
          };
        }
      })
    );

    // Statistiques
    const stats = {
      total: enrichedAlerts.length,
      by_severity: {
        high: enrichedAlerts.filter(a => a.severity === 'high').length,
        med: enrichedAlerts.filter(a => a.severity === 'med').length,
        low: enrichedAlerts.filter(a => a.severity === 'low').length
      },
      by_type: {
        NoContact7d: enrichedAlerts.filter(a => a.type === 'NoContact7d').length,
        NoReply3d: enrichedAlerts.filter(a => a.type === 'NoReply3d').length
      }
    };

    res.json({
      success: true,
      stats,
      alerts: enrichedAlerts
    });

  } catch (error) {
    console.error('[Activities] ❌ Erreur /active:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/alerts/:alertId/resolve
 * Marquer une alerte comme résolue
 */
router.post('/:alertId/resolve', async (req, res) => {
  try {
    const { alertId } = req.params;
    const resolvedBy = req.body.resolvedBy || req.headers['x-role'] || 'user';

    console.log(`[Activities] ✓ Résolution alerte ${alertId} par ${resolvedBy}`);

    const resolvedAlert = await resolveAlert(alertId, resolvedBy);

    res.json({
      success: true,
      alert: resolvedAlert
    });

  } catch (error) {
    console.error('[Activities] ❌ Erreur /resolve:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/alerts/scan-dormant
 * Déclencher un scan batch des leads dormants
 * Génère des alertes NoContact7d pour les leads jamais contactés > 7j
 * Peut être appelé par CRON ou manuellement
 */
router.post('/scan-dormant', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, error: 'MISSING_TENANT' });
    }

    console.log(`[Activities] 🔍 Déclenchement scan leads dormants (tenant: ${tenantId})`);

    const result = await scanDormantLeads(tenantId);

    res.json({
      success: result.ok,
      ...result
    });

  } catch (error) {
    console.error('[Activities] ❌ Erreur /scan-dormant:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/alerts/enriched
 * Récupérer les alertes enrichies avec injection alerte bulk si applicable
 * Alternative à /active qui utilise le cache leads au lieu d'EspoCRM
 */
router.get('/enriched', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, error: 'MISSING_TENANT' });
    }

    console.log(`[Activities] 🔔 Récupération alertes enrichies (tenant: ${tenantId})`);

    const result = await getActiveAlertsEnriched(tenantId);

    res.json(result);

  } catch (error) {
    console.error('[Activities] ❌ Erreur /enriched:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
