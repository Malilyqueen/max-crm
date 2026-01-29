/**
 * routes/dashboardMvp1.js
 * Routes dashboard pour MVP1 - 100% DONNÉES RÉELLES (EspoCRM + actionLogger)
 */

import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { getActionLogs, getActionStats } from '../actions/actionLogger.js';
import { resolveTenant } from '../core/resolveTenant.js';

const router = express.Router();

/**
 * Fetch helper pour EspoCRM - MULTI-TENANT AWARE
 * Utilise la config CRM du tenant résolu (req.tenant.espo)
 */
async function espoFetchForTenant(endpoint, tenant) {
  // SÉCURITÉ: Vérifier que le tenant a une config CRM valide
  if (!tenant?.espo?.baseUrl) {
    throw new Error('CRM_NOT_CONFIGURED: Ce tenant n\'a pas de CRM configuré');
  }

  const url = `${tenant.espo.baseUrl}${endpoint}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Api-Key': tenant.espo.apiKey || '',
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`EspoCRM error ${response.status}: ${error}`);
  }

  return response.json();
}

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION MULTI-TENANT
// ═══════════════════════════════════════════════════════════════════

// Flag: true si le champ cTenantId existe dans EspoCRM
// IMPORTANT: Mettre à true UNIQUEMENT après avoir:
// 1. Créé le champ cTenantId dans EspoCRM (node scripts/setup-tenant-field.js)
// 2. Backfill tous les leads existants avec cTenantId='macrea'
const ESPO_HAS_TENANT_FIELD = process.env.ESPO_HAS_TENANT_FIELD === 'true';

// SÉCURITÉ FAIL-CLOSED: Refuser les requêtes shared-mode sans filtre tenant
// Si true: un tenant autre que 'macrea' sur un CRM partagé DOIT avoir cTenantId actif
const ENFORCE_TENANT_ISOLATION = process.env.ENFORCE_TENANT_ISOLATION !== 'false'; // true par défaut

/**
 * Helper: Construire le filtre tenant si disponible
 */
function buildTenantFilter(tenantId, whereIndex = 0) {
  if (!ESPO_HAS_TENANT_FIELD) return '';
  return `&where[${whereIndex}][type]=equals&where[${whereIndex}][attribute]=cTenantId&where[${whereIndex}][value]=${encodeURIComponent(tenantId)}`;
}

/**
 * GUARD FAIL-CLOSED: Vérifier l'isolation multi-tenant
 * Refuse la requête si:
 * - Le tenant utilise un CRM partagé (usingFallback ou pas de crm_url propre)
 * - ET le champ cTenantId n'est pas actif
 * - ET ce n'est pas le tenant legacy 'macrea'
 */
function checkTenantIsolation(tenant, tenantId) {
  // Si isolation non enforced, on laisse passer (dev mode)
  if (!ENFORCE_TENANT_ISOLATION) {
    return { allowed: true };
  }

  // Le tenant legacy 'macrea' peut toujours accéder (propriétaire du CRM)
  if (tenantId === 'macrea') {
    return { allowed: true };
  }

  // Si le tenant a son propre CRM dédié, pas besoin d'isolation par cTenantId
  if (tenant?.crm?.isConfigured && !tenant?.crm?.usingFallback) {
    return { allowed: true };
  }

  // Tenant sur CRM partagé: le champ cTenantId DOIT être actif
  if (!ESPO_HAS_TENANT_FIELD) {
    return {
      allowed: false,
      error: 'TENANT_ISOLATION_REQUIRED',
      message: 'L\'isolation multi-tenant n\'est pas encore configurée. Veuillez patienter.'
    };
  }

  return { allowed: true };
}

// Appliquer authMiddleware + resolveTenant à toutes les routes
router.use(authMiddleware);
router.use(resolveTenant());

/**
 * GET /api/dashboard-mvp1/stats
 * Retourne les statistiques du dashboard - 100% DONNÉES RÉELLES
 *
 * Sources:
 * - totalLeads, newLeadsToday, leadsByStatus, leadsToFollowUp: EspoCRM
 * - recentActivity, maxInteractions: actionLogger
 * - leadsTrend: EspoCRM (7 derniers jours)
 */
router.get('/stats', async (req, res) => {
  try {
    // SECURITY: tenantId UNIQUEMENT depuis JWT - JAMAIS depuis X-Tenant header!
    const tenantId = req.tenantId;
    const tenant = req.tenant;

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'MISSING_TENANT'
      });
    }

    const userId = req.user?.id || 'unknown';

    // ═══════════════════════════════════════════════════════════════════
    // GUARD FAIL-CLOSED: Vérifier isolation multi-tenant
    // ═══════════════════════════════════════════════════════════════════
    const isolationCheck = checkTenantIsolation(tenant, tenantId);
    if (!isolationCheck.allowed) {
      console.error(`[Dashboard MVP1] 🚫 ISOLATION REFUSÉE: ${tenantId} - ${isolationCheck.error}`);
      return res.status(403).json({
        success: false,
        error: isolationCheck.error,
        message: isolationCheck.message,
        resolve: {
          action: 'wait',
          message: 'L\'isolation multi-tenant est en cours de configuration.',
          retry: true,
          retryAfter: 300
        }
      });
    }

    // ═══════════════════════════════════════════════════════════════════
    // LOGS DÉTAILLÉS MULTI-TENANT (pour debug)
    // ═══════════════════════════════════════════════════════════════════
    console.log(`[Dashboard MVP1] ════════════════════════════════════════════`);
    console.log(`[Dashboard MVP1] 🔒 REQUÊTE STATS MULTI-TENANT`);
    console.log(`[Dashboard MVP1]    • ESPO_HAS_TENANT_FIELD: ${ESPO_HAS_TENANT_FIELD}`);
    console.log(`[Dashboard MVP1]    • ENFORCE_TENANT_ISOLATION: ${ENFORCE_TENANT_ISOLATION}`);
    console.log(`[Dashboard MVP1]    • JWT User ID: ${userId}`);
    console.log(`[Dashboard MVP1]    • JWT Tenant ID: ${tenantId}`);
    console.log(`[Dashboard MVP1]    • Resolved Tenant: ${tenant?.id || 'NULL'}`);
    console.log(`[Dashboard MVP1]    • CRM Status: ${tenant?.crm?.status || 'N/A'}`);
    console.log(`[Dashboard MVP1]    • CRM URL: ${tenant?.espo?.baseUrl ? tenant.espo.baseUrl.substring(0, 40) + '...' : 'NULL'}`);
    console.log(`[Dashboard MVP1]    • Using Fallback: ${tenant?.crm?.usingFallback || false}`);
    console.log(`[Dashboard MVP1] ════════════════════════════════════════════`);

    // SÉCURITÉ: Vérifier que le tenant a un CRM configuré
    if (!tenant?.espo?.baseUrl) {
      console.error(`[Dashboard MVP1] ❌ TENANT_NOT_PROVISIONED: ${tenantId} n'a pas de CRM configuré!`);
      return res.status(409).json({
        success: false,
        error: 'TENANT_NOT_PROVISIONED',
        message: 'Votre espace CRM n\'est pas encore activé.',
        resolve: {
          action: 'activate_crm',
          message: 'Activez votre CRM pour commencer à gérer vos prospects.',
          redirect: '/crm-setup'
        }
      });
    }

    // ═══════════════════════════════════════════════════════════════════
    // 1. DONNÉES ESPOCRM - Stats CRM réelles
    // ═══════════════════════════════════════════════════════════════════

    // 1a. Total leads pour ce tenant
    let totalLeads = 0;
    try {
      const totalEndpoint = `/Lead?maxSize=1${buildTenantFilter(tenantId, 0)}`;
      const totalData = await espoFetchForTenant(totalEndpoint, tenant);
      totalLeads = totalData.total || 0;
    } catch (err) {
      console.warn(`[Dashboard MVP1] ⚠️ Erreur EspoCRM totalLeads:`, err.message);
    }

    // 1b. Nouveaux leads aujourd'hui
    let newLeadsToday = 0;
    try {
      const today = new Date().toISOString().split('T')[0];
      const todayStart = `${today} 00:00:00`;
      let whereIdx = 0;
      let newTodayEndpoint = `/Lead?maxSize=1${buildTenantFilter(tenantId, whereIdx)}`;
      if (ESPO_HAS_TENANT_FIELD) whereIdx++;
      newTodayEndpoint += `&where[${whereIdx}][type]=after&where[${whereIdx}][attribute]=createdAt&where[${whereIdx}][value]=${encodeURIComponent(todayStart)}`;
      const newTodayData = await espoFetchForTenant(newTodayEndpoint, tenant);
      newLeadsToday = newTodayData.total || 0;
    } catch (err) {
      console.warn(`[Dashboard MVP1] ⚠️ Erreur EspoCRM newLeadsToday:`, err.message);
    }

    // 1c. Leads par statut
    const statuses = ['New', 'Assigned', 'In Process', 'Converted', 'Recycled', 'Dead'];
    const statusColors = {
      'New': '#3B82F6',
      'Assigned': '#10B981',
      'In Process': '#F59E0B',
      'Converted': '#22C55E',
      'Recycled': '#6B7280',
      'Dead': '#EF4444'
    };

    const leadsByStatus = [];
    for (const status of statuses) {
      try {
        let whereIdx = 0;
        let statusEndpoint = `/Lead?maxSize=1${buildTenantFilter(tenantId, whereIdx)}`;
        if (ESPO_HAS_TENANT_FIELD) whereIdx++;
        statusEndpoint += `&where[${whereIdx}][type]=equals&where[${whereIdx}][attribute]=status&where[${whereIdx}][value]=${encodeURIComponent(status)}`;
        const statusData = await espoFetchForTenant(statusEndpoint, tenant);
        if (statusData.total > 0) {
          leadsByStatus.push({
            status,
            count: statusData.total,
            color: statusColors[status] || '#6B7280'
          });
        }
      } catch (err) {
        console.warn(`[Dashboard MVP1] ⚠️ Erreur comptage status ${status}:`, err.message);
      }
    }

    // 1d. Leads à relancer (New/Assigned créés il y a >3 jours)
    let leadsToFollowUp = 0;
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0] + ' 00:00:00';

      let whereIdx = 0;
      let followUpEndpoint = `/Lead?maxSize=1${buildTenantFilter(tenantId, whereIdx)}`;
      if (ESPO_HAS_TENANT_FIELD) whereIdx++;
      followUpEndpoint += `&where[${whereIdx}][type]=or`;
      followUpEndpoint += `&where[${whereIdx}][value][0][type]=equals&where[${whereIdx}][value][0][attribute]=status&where[${whereIdx}][value][0][value]=New`;
      followUpEndpoint += `&where[${whereIdx}][value][1][type]=equals&where[${whereIdx}][value][1][attribute]=status&where[${whereIdx}][value][1][value]=Assigned`;
      whereIdx++;
      followUpEndpoint += `&where[${whereIdx}][type]=before&where[${whereIdx}][attribute]=createdAt&where[${whereIdx}][value]=${encodeURIComponent(threeDaysAgoStr)}`;
      const followUpData = await espoFetchForTenant(followUpEndpoint, tenant);
      leadsToFollowUp = followUpData.total || 0;
    } catch (err) {
      console.warn(`[Dashboard MVP1] ⚠️ Erreur EspoCRM leadsToFollowUp:`, err.message);
    }

    // 1e. Trends 7 derniers jours
    const leadsTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayStart = `${dateStr} 00:00:00`;
      const dayEnd = `${dateStr} 23:59:59`;

      let count = 0;
      let converted = 0;

      try {
        // Leads créés ce jour
        let whereIdx = 0;
        let createdEndpoint = `/Lead?maxSize=1${buildTenantFilter(tenantId, whereIdx)}`;
        if (ESPO_HAS_TENANT_FIELD) whereIdx++;
        createdEndpoint += `&where[${whereIdx}][type]=between&where[${whereIdx}][attribute]=createdAt&where[${whereIdx}][value][]=${encodeURIComponent(dayStart)}&where[${whereIdx}][value][]=${encodeURIComponent(dayEnd)}`;
        const createdData = await espoFetchForTenant(createdEndpoint, tenant);
        count = createdData.total || 0;
      } catch (err) {
        console.warn(`[Dashboard MVP1] ⚠️ Erreur trends count ${dateStr}:`, err.message);
      }

      try {
        // Leads convertis ce jour
        let whereIdx = 0;
        let convertedEndpoint = `/Lead?maxSize=1${buildTenantFilter(tenantId, whereIdx)}`;
        if (ESPO_HAS_TENANT_FIELD) whereIdx++;
        convertedEndpoint += `&where[${whereIdx}][type]=equals&where[${whereIdx}][attribute]=status&where[${whereIdx}][value]=Converted`;
        whereIdx++;
        convertedEndpoint += `&where[${whereIdx}][type]=between&where[${whereIdx}][attribute]=modifiedAt&where[${whereIdx}][value][]=${encodeURIComponent(dayStart)}&where[${whereIdx}][value][]=${encodeURIComponent(dayEnd)}`;
        const convertedData = await espoFetchForTenant(convertedEndpoint, tenant);
        converted = convertedData.total || 0;
      } catch (err) {
        console.warn(`[Dashboard MVP1] ⚠️ Erreur trends converted ${dateStr}:`, err.message);
      }

      leadsTrend.push({ date: dateStr, count, converted });
    }

    // ═══════════════════════════════════════════════════════════════════
    // 2. DONNÉES ACTIONLOGGER - Activités M.A.X.
    // ═══════════════════════════════════════════════════════════════════

    const actionLogs = getActionLogs({
      tenantId,
      limit: 20
    });

    const recentActivity = actionLogs.map(log => ({
      id: log.id,
      type: mapActionTypeToActivityType(log.actionType),
      title: generateActivityTitle(log),
      description: log.result?.preview || log.actionType,
      timestamp: log.timestamp
    }));

    const totalActions = actionLogs.length;

    // ═══════════════════════════════════════════════════════════════════
    // 3. CALCUL MÉTRIQUES DÉRIVÉES
    // ═══════════════════════════════════════════════════════════════════

    // Taux de conversion = leads convertis / total leads
    const convertedCount = leadsByStatus.find(s => s.status === 'Converted')?.count || 0;
    const conversionRate = totalLeads > 0 ? Math.round((convertedCount / totalLeads) * 100) : 0;

    // Workflows actifs - TODO: connecter à automations Supabase
    // Pour l'instant on compte les automations actives
    let activeWorkflows = 0;
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
      const { count } = await supabaseClient
        .from('automations')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'active');
      activeWorkflows = count || 0;
    } catch (err) {
      console.warn(`[Dashboard MVP1] ⚠️ Erreur comptage workflows:`, err.message);
    }

    // Tâches en attente - leads à relancer = pendingTasks
    const pendingTasks = leadsToFollowUp;

    // ═══════════════════════════════════════════════════════════════════
    // 4. ASSEMBLAGE RÉPONSE - 100% DONNÉES RÉELLES
    // ═══════════════════════════════════════════════════════════════════

    const dashboardData = {
      stats: {
        totalLeads,           // ✅ RÉEL - EspoCRM
        newLeadsToday,        // ✅ RÉEL - EspoCRM
        conversionRate,       // ✅ RÉEL - calculé depuis EspoCRM
        activeWorkflows,      // ✅ RÉEL - Supabase automations
        pendingTasks,         // ✅ RÉEL - EspoCRM leads à relancer
        maxInteractions: totalActions  // ✅ RÉEL - actionLogger
      },
      leadsTrend,             // ✅ RÉEL - EspoCRM 7 jours
      recentActivity,         // ✅ RÉEL - actionLogger
      leadsByStatus           // ✅ RÉEL - EspoCRM
    };

    console.log(`[Dashboard MVP1] ✅ 100% REAL DATA - Tenant ${tenantId}: ${totalLeads} leads, ${newLeadsToday} new, ${leadsToFollowUp} followup, ${recentActivity.length} activities`);
    res.json(dashboardData);

  } catch (error) {
    console.error('[Dashboard MVP1] ❌ Erreur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
});

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
