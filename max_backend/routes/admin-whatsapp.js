/**
 * Routes Admin WhatsApp - Provisioning & Management
 *
 * REGLES:
 * - JWT + role admin obligatoires
 * - Provisioning: admin entre instanceId + apiToken achetés manuellement
 * - Logout hard: admin uniquement (appelle Green-API logout)
 * - Recyclage instance: detach from tenant A, attach to tenant B
 * - Toutes les actions cross-tenant
 */

import express from 'express';
import pg from 'pg';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { encryptCredentials, decryptCredentials } from '../lib/encryption.js';
import {
  getQrCode,
  getInstanceStatus,
  createInstance
} from '../providers/greenapi/greenapi.service.js';
import { greenApiRequest } from '../providers/greenapi/greenapi.client.js';

const { Pool } = pg;
const router = express.Router();

// JWT obligatoire
router.use(authMiddleware);

// Admin-only gate
router.use((req, res, next) => {
  if (req.user?.role !== 'admin') {
    console.warn(`[ADMIN-WA] Access denied for ${req.user?.email} (role: ${req.user?.role})`);
    return res.status(403).json({
      ok: false,
      error: 'Accès réservé aux administrateurs'
    });
  }
  next();
});

/**
 * Helper: get DB pool
 */
function getPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('supabase')
      ? { rejectUnauthorized: false }
      : false
  });
}

/**
 * GET /api/admin/whatsapp/requests
 *
 * Liste toutes les demandes WhatsApp (tous tenants)
 * Section 1: Demandes pending
 * Section 2: Instances actives
 */
router.get('/requests', async (req, res) => {
  const pool = getPool();

  try {
    console.log('[ADMIN-WA] Listing all WhatsApp requests');

    // Récupérer tous les providers WhatsApp avec info tenant
    const result = await pool.query(
      `SELECT
        tpc.id,
        tpc.tenant_id,
        tpc.whatsapp_status,
        tpc.phone_number,
        tpc.connection_status,
        tpc.is_active,
        tpc.provisioned_at,
        tpc.expires_at,
        tpc.created_at,
        tpc.updated_at,
        tpc.created_by,
        t.company_name as tenant_name,
        u.email as owner_email
      FROM tenant_provider_configs tpc
      LEFT JOIN tenants t ON t.slug = tpc.tenant_id
      LEFT JOIN users u ON u.tenant_id = tpc.tenant_id AND u.role IN ('owner', 'admin')
      WHERE tpc.provider_type = 'greenapi_whatsapp'
      ORDER BY
        CASE tpc.whatsapp_status
          WHEN 'pending_provisioning' THEN 1
          WHEN 'qr_ready' THEN 2
          WHEN 'connected' THEN 3
          WHEN 'disabled' THEN 4
          WHEN 'expired' THEN 5
          ELSE 6
        END,
        tpc.updated_at DESC`
    );

    const pending = result.rows.filter(r => r.whatsapp_status === 'pending_provisioning');
    const active = result.rows.filter(r => ['qr_ready', 'connected', 'disabled'].includes(r.whatsapp_status));
    const expired = result.rows.filter(r => r.whatsapp_status === 'expired');

    res.json({
      ok: true,
      pending,
      active,
      expired,
      total: result.rows.length
    });

  } catch (error) {
    console.error('[ADMIN-WA] List requests error:', error);
    res.status(500).json({ ok: false, error: 'Erreur serveur' });
  } finally {
    await pool.end();
  }
});

/**
 * POST /api/admin/whatsapp/provision
 *
 * Admin provisionne une instance Green-API pour un tenant
 * Input: { tenantId, instanceId, apiToken, expiresAt? }
 * Action: Chiffre credentials, stocke en DB, status = qr_ready
 */
router.post('/provision', async (req, res) => {
  const pool = getPool();

  try {
    const { tenantId, instanceId, apiToken, expiresAt } = req.body;

    console.log('[ADMIN-WA] Provisioning instance for tenant:', tenantId, 'instance:', instanceId);

    // Validation
    if (!tenantId || !instanceId || !apiToken) {
      return res.status(400).json({
        ok: false,
        error: 'tenantId, instanceId et apiToken sont obligatoires'
      });
    }

    // Vérifier que l'instance est accessible sur Green-API
    try {
      const instanceCheck = await createInstance({
        idInstance: instanceId,
        apiTokenInstance: apiToken
      });
      console.log('[ADMIN-WA] Instance validated:', instanceCheck.status);
    } catch (checkError) {
      console.error('[ADMIN-WA] Instance validation failed:', checkError.message);
      return res.status(400).json({
        ok: false,
        error: `Instance Green-API inaccessible: ${checkError.message}`
      });
    }

    // Chiffrer credentials per-tenant
    const credentials = { instanceId, token: apiToken };
    const encryptedConfig = encryptCredentials(credentials, tenantId);

    // Calculer expires_at (défaut: 3 mois)
    const expDate = expiresAt
      ? new Date(expiresAt)
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 jours

    // Upsert provider
    const result = await pool.query(
      `INSERT INTO tenant_provider_configs
        (tenant_id, provider_type, provider_name, encrypted_config, connection_status, is_active,
         whatsapp_status, provisioned_at, expires_at, created_by)
       VALUES ($1, 'greenapi_whatsapp', 'WhatsApp Pro', $2, 'non_testé', false,
               'qr_ready', NOW(), $3, $4)
       ON CONFLICT (tenant_id, provider_type, provider_name)
       DO UPDATE SET
         encrypted_config = EXCLUDED.encrypted_config,
         connection_status = 'non_testé',
         is_active = false,
         whatsapp_status = 'qr_ready',
         provisioned_at = NOW(),
         expires_at = EXCLUDED.expires_at,
         updated_at = NOW()
       RETURNING id`,
      [tenantId, encryptedConfig, expDate.toISOString(), req.user?.email || 'admin']
    );

    // Activer le feature flag whatsapp_enabled
    await pool.query(
      `INSERT INTO tenant_features (tenant_id, whatsapp_enabled)
       VALUES ($1, true)
       ON CONFLICT (tenant_id)
       DO UPDATE SET whatsapp_enabled = true`,
      [tenantId]
    );

    console.log('[ADMIN-WA] Instance provisioned successfully:', result.rows[0].id);

    res.json({
      ok: true,
      message: `Instance ${instanceId} provisionnée pour ${tenantId}. Le client peut maintenant scanner le QR code.`,
      providerId: result.rows[0].id,
      whatsapp_status: 'qr_ready',
      expires_at: expDate.toISOString()
    });

  } catch (error) {
    console.error('[ADMIN-WA] Provision error:', error);
    res.status(500).json({ ok: false, error: 'Erreur serveur' });
  } finally {
    await pool.end();
  }
});

/**
 * POST /api/admin/whatsapp/logout
 *
 * Admin fait un logout HARD Green-API pour un tenant
 * Input: { tenantId }
 * Action: Appelle Green-API logout, status = qr_ready
 */
router.post('/logout', async (req, res) => {
  const pool = getPool();

  try {
    const { tenantId } = req.body;

    console.log('[ADMIN-WA] Hard logout for tenant:', tenantId);

    if (!tenantId) {
      return res.status(400).json({ ok: false, error: 'tenantId obligatoire' });
    }

    // Récupérer provider
    const result = await pool.query(
      `SELECT id, encrypted_config FROM tenant_provider_configs
       WHERE tenant_id = $1 AND provider_type = 'greenapi_whatsapp'
       LIMIT 1`,
      [tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Aucun provider WhatsApp pour ce tenant' });
    }

    const { id, encrypted_config } = result.rows[0];

    // Déchiffrer credentials
    if (encrypted_config) {
      try {
        const credentials = decryptCredentials(encrypted_config, tenantId);

        // Appeler Green-API logout
        const logoutEndpoint = `/waInstance${credentials.instanceId}/logout/${credentials.token}`;
        await greenApiRequest(logoutEndpoint, { method: 'GET' }, 5000);
        console.log('[ADMIN-WA] Green-API logout successful for tenant:', tenantId);
      } catch (logoutError) {
        console.warn('[ADMIN-WA] Green-API logout failed (continuing):', logoutError.message);
      }
    }

    // Mettre à jour status = qr_ready (pas supprimer les credentials)
    await pool.query(
      `UPDATE tenant_provider_configs
       SET whatsapp_status = 'qr_ready', connection_status = 'non_testé', is_active = false, updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    res.json({
      ok: true,
      message: `Logout hard effectué pour ${tenantId}. Le client peut re-scanner le QR code.`,
      whatsapp_status: 'qr_ready'
    });

  } catch (error) {
    console.error('[ADMIN-WA] Logout error:', error);
    res.status(500).json({ ok: false, error: 'Erreur serveur' });
  } finally {
    await pool.end();
  }
});

/**
 * POST /api/admin/whatsapp/reassign
 *
 * Recyclage instance: transférer d'un tenant vers un autre
 * Input: { fromTenantId, toTenantId }
 * Action: Logout, détacher from, attacher to, qr_ready
 */
router.post('/reassign', async (req, res) => {
  const pool = getPool();

  try {
    const { fromTenantId, toTenantId } = req.body;

    console.log('[ADMIN-WA] Reassign from', fromTenantId, 'to', toTenantId);

    if (!fromTenantId || !toTenantId) {
      return res.status(400).json({ ok: false, error: 'fromTenantId et toTenantId obligatoires' });
    }

    if (fromTenantId === toTenantId) {
      return res.status(400).json({ ok: false, error: 'fromTenantId et toTenantId doivent être différents' });
    }

    // Récupérer provider source
    const sourceResult = await pool.query(
      `SELECT id, encrypted_config FROM tenant_provider_configs
       WHERE tenant_id = $1 AND provider_type = 'greenapi_whatsapp'
       LIMIT 1`,
      [fromTenantId]
    );

    if (sourceResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: `Aucun provider WhatsApp pour ${fromTenantId}` });
    }

    const { encrypted_config } = sourceResult.rows[0];

    // 1. Déchiffrer avec l'ancien tenant
    let credentials;
    try {
      credentials = decryptCredentials(encrypted_config, fromTenantId);
    } catch (decryptError) {
      return res.status(500).json({ ok: false, error: 'Erreur déchiffrement credentials source' });
    }

    // 2. Logout Green-API (best effort)
    try {
      const logoutEndpoint = `/waInstance${credentials.instanceId}/logout/${credentials.token}`;
      await greenApiRequest(logoutEndpoint, { method: 'GET' }, 5000);
      console.log('[ADMIN-WA] Green-API logout for reassign');
    } catch (logoutError) {
      console.warn('[ADMIN-WA] Logout failed during reassign (continuing):', logoutError.message);
    }

    // 3. Supprimer provider source
    await pool.query(
      `DELETE FROM tenant_provider_configs
       WHERE tenant_id = $1 AND provider_type = 'greenapi_whatsapp'`,
      [fromTenantId]
    );

    // 4. Re-chiffrer avec le nouveau tenant
    const newEncryptedConfig = encryptCredentials(credentials, toTenantId);

    // 5. Créer provider pour nouveau tenant
    const expDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO tenant_provider_configs
        (tenant_id, provider_type, provider_name, encrypted_config, connection_status, is_active,
         whatsapp_status, provisioned_at, expires_at, created_by)
       VALUES ($1, 'greenapi_whatsapp', 'WhatsApp Pro', $2, 'non_testé', false,
               'qr_ready', NOW(), $3, $4)
       ON CONFLICT (tenant_id, provider_type, provider_name)
       DO UPDATE SET
         encrypted_config = EXCLUDED.encrypted_config,
         connection_status = 'non_testé',
         is_active = false,
         whatsapp_status = 'qr_ready',
         provisioned_at = NOW(),
         expires_at = EXCLUDED.expires_at,
         updated_at = NOW()`,
      [toTenantId, newEncryptedConfig, expDate.toISOString(), req.user?.email || 'admin']
    );

    // 6. Activer feature flag pour nouveau tenant
    await pool.query(
      `INSERT INTO tenant_features (tenant_id, whatsapp_enabled)
       VALUES ($1, true)
       ON CONFLICT (tenant_id)
       DO UPDATE SET whatsapp_enabled = true`,
      [toTenantId]
    );

    console.log('[ADMIN-WA] Instance reassigned from', fromTenantId, 'to', toTenantId);

    res.json({
      ok: true,
      message: `Instance transférée de ${fromTenantId} vers ${toTenantId}. Le nouveau client peut scanner le QR code.`,
      whatsapp_status: 'qr_ready'
    });

  } catch (error) {
    console.error('[ADMIN-WA] Reassign error:', error);
    res.status(500).json({ ok: false, error: 'Erreur serveur' });
  } finally {
    await pool.end();
  }
});

/**
 * GET /api/admin/whatsapp/status/:tenantId
 *
 * Admin vérifie le statut Green-API d'un tenant spécifique
 */
router.get('/status/:tenantId', async (req, res) => {
  const pool = getPool();

  try {
    const { tenantId } = req.params;
    console.log('[ADMIN-WA] Status check for tenant:', tenantId);

    const result = await pool.query(
      `SELECT id, encrypted_config, whatsapp_status, phone_number, expires_at, provisioned_at
       FROM tenant_provider_configs
       WHERE tenant_id = $1 AND provider_type = 'greenapi_whatsapp'
       LIMIT 1`,
      [tenantId]
    );

    if (result.rows.length === 0) {
      return res.json({
        ok: true,
        whatsapp_status: 'not_configured',
        greenApiState: null
      });
    }

    const provider = result.rows[0];

    // Vérifier statut Green-API si credentials existent
    if (provider.encrypted_config) {
      try {
        const credentials = decryptCredentials(provider.encrypted_config, tenantId);
        const status = await getInstanceStatus({
          idInstance: credentials.instanceId,
          apiTokenInstance: credentials.token
        });

        return res.json({
          ok: true,
          whatsapp_status: provider.whatsapp_status,
          greenApiState: status.stateInstance,
          phone_number: provider.phone_number,
          expires_at: provider.expires_at,
          provisioned_at: provider.provisioned_at,
          instanceId: credentials.instanceId
        });
      } catch (apiError) {
        console.warn('[ADMIN-WA] Green-API status check failed:', apiError.message);
      }
    }

    res.json({
      ok: true,
      whatsapp_status: provider.whatsapp_status,
      greenApiState: 'unknown',
      phone_number: provider.phone_number,
      expires_at: provider.expires_at,
      provisioned_at: provider.provisioned_at
    });

  } catch (error) {
    console.error('[ADMIN-WA] Status check error:', error);
    res.status(500).json({ ok: false, error: 'Erreur serveur' });
  } finally {
    await pool.end();
  }
});

/**
 * GET /api/admin/whatsapp/qr/:tenantId
 *
 * Admin affiche le QR code d'un tenant spécifique
 */
router.get('/qr/:tenantId', async (req, res) => {
  const pool = getPool();

  try {
    const { tenantId } = req.params;
    console.log('[ADMIN-WA] QR code for tenant:', tenantId);

    const result = await pool.query(
      `SELECT encrypted_config FROM tenant_provider_configs
       WHERE tenant_id = $1 AND provider_type = 'greenapi_whatsapp'
       LIMIT 1`,
      [tenantId]
    );

    if (result.rows.length === 0 || !result.rows[0].encrypted_config) {
      return res.status(404).json({ ok: false, error: 'Pas de credentials pour ce tenant' });
    }

    const credentials = decryptCredentials(result.rows[0].encrypted_config, tenantId);
    const qrResponse = await getQrCode({
      idInstance: credentials.instanceId,
      apiTokenInstance: credentials.token
    });

    res.json({
      ok: true,
      qrCode: qrResponse.qrCode,
      expiresIn: qrResponse.expiresIn
    });

  } catch (error) {
    console.error('[ADMIN-WA] QR code error:', error);
    res.status(500).json({ ok: false, error: 'Erreur génération QR code' });
  } finally {
    await pool.end();
  }
});

export default router;
