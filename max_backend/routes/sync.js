/**
 * routes/sync.js
 * Routes de synchronisation EspoCRM ↔ Supabase leads_cache
 *
 * SÉCURITÉ TENANT:
 * - Chaque sync est isolée au tenant de l'utilisateur connecté
 * - Authentification obligatoire (pas de sync anonyme)
 * - Filtrage EspoCRM par cTenantId si ESPO_HAS_TENANT_FIELD=true
 */

import express from 'express';
import { syncLeadsCache, getCacheStats } from '../lib/leadsCacheSync.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { resolveTenant } from '../core/resolveTenant.js';

const router = express.Router();

/**
 * POST /api/sync/leads-cache
 * Synchronise les leads EspoCRM → Supabase leads_cache
 *
 * TENANT-ONLY: Synchronise uniquement les leads du tenant courant
 *
 * Déclenchement:
 * - Manuel via bouton "Actualiser les données" (Dashboard)
 * - Cron (via /all-tenants avec clé API)
 * - Après import batch
 *
 * Auth: OBLIGATOIRE - Requiert JWT valide avec tenantId
 */
router.post('/leads-cache', authMiddleware, resolveTenant, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const tenantConfig = req.tenant;
    const asyncRequested = Boolean(req.body?.async);

    // FAIL-CLOSED: Refuser si pas de tenant identifié
    if (!tenantId) {
      console.warn('[Sync] ⚠️ Tentative de sync sans tenant - refusée');
      return res.status(401).json({
        ok: false,
        error: 'Authentification requise pour synchroniser les données'
      });
    }

    console.log(`[Sync] 🔄 Sync leads_cache tenant-only: ${tenantId}${asyncRequested ? ' (async)' : ''}`);

    if (asyncRequested) {
      // Lancer en background et répondre immédiatement pour éviter timeout UI
      setImmediate(async () => {
        try {
          const result = await syncLeadsCache(tenantId, tenantConfig);
          if (!result.ok) {
            console.error('[Sync] ❌ Async sync failed:', result.error || result);
          } else {
            console.log(`[Sync] ✅ Async sync complete: ${result.synced} contacts`);
          }
        } catch (error) {
          console.error('[Sync] ❌ Async sync error:', error);
        }
      });

      return res.json({
        ok: true,
        message: 'Sync lancée',
        synced: null
      });
    }

    const result = await syncLeadsCache(tenantId, tenantConfig);

    if (!result.ok) {
      return res.status(500).json(result);
    }

    res.json({
      ok: true,
      message: `Données actualisées: ${result.synced} contacts`,
      synced: result.synced,
      duration_ms: result.duration_ms
    });

  } catch (error) {
    console.error('[Sync] ❌ Erreur:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * GET /api/sync/leads-cache/stats
 * Retourne les stats du cache pour le tenant courant
 * Auth: OBLIGATOIRE
 */
router.get('/leads-cache/stats', authMiddleware, resolveTenant, async (req, res) => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(401).json({
        ok: false,
        error: 'Authentification requise'
      });
    }

    const result = await getCacheStats(tenantId);

    if (!result.ok) {
      return res.status(500).json(result);
    }

    res.json({
      ok: true,
      stats: result.stats
    });

  } catch (error) {
    console.error('[Sync] ❌ Erreur stats:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * POST /api/sync/leads-cache/all-tenants
 * Sync tous les tenants (admin/cron uniquement)
 * Protégé par clé API interne
 */
router.post('/leads-cache/all-tenants', async (req, res) => {
  const cronKey = req.headers['x-cron-key'];

  if (cronKey !== process.env.CRON_SECRET_KEY) {
    return res.status(403).json({
      ok: false,
      error: 'Clé cron invalide'
    });
  }

  try {
    // Liste des tenants à synchroniser
    // V1: Hardcodé, V2: Lire depuis table tenants
    const tenants = [
      { id: 'macrea', config: null }, // null = utilise config par défaut
      { id: 'default', config: null }
    ];

    const results = [];

    for (const tenant of tenants) {
      console.log(`[Sync] 🔄 Sync tenant: ${tenant.id}`);
      const result = await syncLeadsCache(tenant.id, tenant.config);
      results.push({
        tenant: tenant.id,
        ...result
      });
    }

    res.json({
      ok: true,
      results
    });

  } catch (error) {
    console.error('[Sync] ❌ Erreur sync all:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

export default router;
