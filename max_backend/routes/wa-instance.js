/**
 * Routes API - WhatsApp Instance Management (Green-API)
 *
 * Endpoints pour gérer les instances WhatsApp (QR code, statut, etc.)
 *
 * SÉCURITÉ:
 * - authMiddleware: JWT requis sur toutes les routes
 * - resolveTenant: Résolution tenant depuis JWT (pas depuis body)
 * - whatsappGate: Vérification whatsapp_enabled=true
 */

import express from 'express';
import {
  createInstance,
  getQrCode,
  getInstanceStatus,
  refreshQrCode,
  sendTestMessage
} from '../providers/greenapi/greenapi.service.js';
import {
  saveInstance,
  getInstance,
  getInstancesByTenant,
  updateInstanceStatus
} from '../lib/waInstanceStorage.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { resolveTenant } from '../core/resolveTenant.js';
import { whatsappGate } from '../middleware/whatsappGate.js';
import { encryptCredentials } from '../lib/encryption.js';
import pg from 'pg';
const { Pool } = pg;

const router = express.Router();

// Appliquer JWT + tenant resolution + WhatsApp gate sur TOUTES les routes
router.use(authMiddleware);
router.use(resolveTenant());
router.use(whatsappGate);

/**
 * POST /api/wa/instance/create
 *
 * Enregistre une nouvelle instance Green-API dans tenant_provider_configs (DB chiffrée)
 * Body: { idInstance, apiTokenInstance, providerName }
 * SÉCURITÉ: tenant résolu depuis JWT (req.tenantId), pas depuis body
 *
 * NOUVEAU FLOW (Phase SaaS):
 * - Écrit dans tenant_provider_configs (DB chiffrée per-tenant)
 * - Fallback: sauvegarde aussi dans wa-instances.json (legacy, à supprimer Phase 2)
 */
router.post('/instance/create', async (req, res) => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('supabase')
      ? { rejectUnauthorized: false }
      : false
  });

  try {
    const { idInstance, apiTokenInstance, providerName } = req.body;
    const tenantId = req.tenantId; // Depuis resolveTenant middleware

    if (!idInstance || !apiTokenInstance) {
      return res.status(400).json({
        ok: false,
        error: 'MISSING_PARAMS',
        message: 'idInstance et apiTokenInstance requis'
      });
    }

    console.log('[WA-INSTANCE] 🆕 Création instance', { idInstance, tenant: tenantId });

    // 1. Vérifier statut sur Green-API
    const instance = await createInstance({ idInstance, apiTokenInstance });

    // 2. Chiffrer credentials per-tenant
    const credentials = {
      instanceId: idInstance,
      token: apiTokenInstance
    };
    const encryptedConfig = encryptCredentials(credentials, tenantId);

    // 3. Insérer/Mettre à jour dans tenant_provider_configs (DB)
    const finalProviderName = providerName || `WhatsApp ${idInstance}`;

    await pool.query(
      `INSERT INTO tenant_provider_configs
        (tenant_id, provider_type, provider_name, encrypted_config, connection_status, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tenant_id, provider_type, provider_name)
       DO UPDATE SET
         encrypted_config = EXCLUDED.encrypted_config,
         connection_status = EXCLUDED.connection_status,
         is_active = EXCLUDED.is_active,
         updated_at = NOW()
       RETURNING id`,
      [
        tenantId,
        'greenapi_whatsapp',
        finalProviderName,
        encryptedConfig,
        instance.status === 'authorized' ? 'success' : 'non_testé',
        true, // Activer automatiquement
        req.user?.email || 'system'
      ]
    );

    console.log('[WA-INSTANCE] ✅ Instance sauvegardée en DB chiffrée (per-tenant)');

    // 4. LEGACY: Sauvegarder aussi dans wa-instances.json (fallback temporaire)
    await saveInstance({ ...instance, tenant: tenantId, apiToken: apiTokenInstance });
    console.log('[WA-INSTANCE] ⚠️ Fallback JSON sauvegardé (legacy)');

    res.json({
      ok: true,
      instance: {
        instanceId: instance.instanceId,
        status: instance.status,
        provider: 'greenapi',
        tenant: tenantId,
        storage: 'encrypted_db' // Indique que c'est en DB chiffrée
      }
    });

  } catch (error) {
    console.error('[WA-INSTANCE] ❌ Erreur création:', error.message);
    res.status(500).json({
      ok: false,
      error: 'INSTANCE_CREATE_FAILED',
      message: error.message
    });
  } finally {
    await pool.end();
  }
});

/**
 * GET /api/wa/instance/:id/qr
 *
 * Récupère le QR code pour une instance
 * Query params: ?apiToken=xxx
 */
router.get('/instance/:id/qr', async (req, res) => {
  try {
    const { id: idInstance } = req.params;
    const { apiToken: apiTokenInstance } = req.query;

    if (!apiTokenInstance) {
      return res.status(400).json({
        ok: false,
        error: 'MISSING_API_TOKEN',
        message: 'Query param ?apiToken=xxx requis'
      });
    }

    console.log('[WA-INSTANCE] 📷 Récupération QR', { idInstance });

    const qrData = await getQrCode({ idInstance, apiTokenInstance });

    res.json({
      ok: true,
      qr: qrData
    });
  } catch (error) {
    console.error('[WA-INSTANCE] ❌ Erreur QR:', error.message);
    res.status(500).json({
      ok: false,
      error: 'QR_FETCH_FAILED',
      message: error.message
    });
  }
});

/**
 * GET /api/wa/instance/:id/status
 *
 * Récupère le statut d'une instance
 * Query params: ?apiToken=xxx
 */
router.get('/instance/:id/status', async (req, res) => {
  try {
    const { id: idInstance } = req.params;
    const { apiToken: apiTokenInstance } = req.query;

    if (!apiTokenInstance) {
      return res.status(400).json({
        ok: false,
        error: 'MISSING_API_TOKEN'
      });
    }

    console.log('[WA-INSTANCE] 🔍 Vérification statut', { idInstance });

    const status = await getInstanceStatus({ idInstance, apiTokenInstance });

    res.json({
      ok: true,
      status: {
        state: status.stateInstance,
        isAuthorized: status.isAuthorized
      }
    });
  } catch (error) {
    console.error('[WA-INSTANCE] ❌ Erreur statut:', error.message);
    res.status(500).json({
      ok: false,
      error: 'STATUS_FETCH_FAILED',
      message: error.message
    });
  }
});

/**
 * POST /api/wa/instance/:id/refresh-qr
 *
 * Rafraîchit le QR code (déconnexion + nouveau QR)
 * Body: { apiTokenInstance }
 */
router.post('/instance/:id/refresh-qr', async (req, res) => {
  try {
    const { id: idInstance } = req.params;
    const { apiTokenInstance } = req.body;

    if (!apiTokenInstance) {
      return res.status(400).json({
        ok: false,
        error: 'MISSING_API_TOKEN'
      });
    }

    console.log('[WA-INSTANCE] 🔄 Rafraîchissement QR', { idInstance });

    const qrData = await refreshQrCode({ idInstance, apiTokenInstance });

    res.json({
      ok: true,
      qr: qrData
    });
  } catch (error) {
    console.error('[WA-INSTANCE] ❌ Erreur refresh:', error.message);
    res.status(500).json({
      ok: false,
      error: 'QR_REFRESH_FAILED',
      message: error.message
    });
  }
});

/**
 * POST /api/wa/instance/:id/send-test
 *
 * Envoie un message de test
 * Body: { apiTokenInstance, phoneNumber, message }
 */
router.post('/instance/:id/send-test', async (req, res) => {
  try {
    const { id: idInstance } = req.params;
    const { apiTokenInstance, phoneNumber, message } = req.body;

    if (!apiTokenInstance || !phoneNumber || !message) {
      return res.status(400).json({
        ok: false,
        error: 'MISSING_PARAMS',
        message: 'apiTokenInstance, phoneNumber et message requis'
      });
    }

    console.log('[WA-INSTANCE] 📤 Envoi message test', { idInstance, phoneNumber });

    const result = await sendTestMessage({
      idInstance,
      apiTokenInstance,
      phoneNumber,
      message
    });

    res.json({
      ok: true,
      result
    });
  } catch (error) {
    console.error('[WA-INSTANCE] ❌ Erreur envoi:', error.message);
    res.status(500).json({
      ok: false,
      error: 'SEND_MESSAGE_FAILED',
      message: error.message
    });
  }
});

export default router;