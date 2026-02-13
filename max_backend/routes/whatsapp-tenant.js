/**
 * Routes WhatsApp Tenant - Client-facing API
 *
 * REGLES:
 * - JWT + resolveTenant obligatoires
 * - Pas de whatsappGate ici (le client peut demander activation meme si feature pas active)
 * - Statuts: not_requested → pending_provisioning → qr_ready → connected → disabled/expired
 * - Le client ne peut PAS faire logout hard (admin only)
 * - Le client peut soft-disable (status = disabled, PAS de logout Green-API)
 */

import express from 'express';
import pg from 'pg';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { resolveTenant } from '../core/resolveTenant.js';
import { decryptCredentials } from '../lib/encryption.js';
import { getQrCode, getInstanceStatus } from '../providers/greenapi/greenapi.service.js';

const { Pool } = pg;
const router = express.Router();

// JWT + tenant resolution sur toutes les routes
router.use(authMiddleware);
router.use(resolveTenant());

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
 * Helper: get tenant WhatsApp provider
 */
async function getTenantWhatsApp(pool, tenantId) {
  const result = await pool.query(
    `SELECT id, encrypted_config, connection_status, is_active, whatsapp_status,
            provisioned_at, expires_at, phone_number
     FROM tenant_provider_configs
     WHERE tenant_id = $1 AND provider_type = 'greenapi_whatsapp'
     ORDER BY updated_at DESC
     LIMIT 1`,
    [tenantId]
  );
  return result.rows[0] || null;
}

/**
 * GET /api/whatsapp/status
 *
 * Retourne le statut WhatsApp complet du tenant
 * Appelle Green-API si credentials existent pour vérifier statut réel
 */
router.get('/status', async (req, res) => {
  const pool = getPool();

  try {
    const tenantId = req.tenantId;
    console.log('[WA-TENANT] Status check for tenant:', tenantId);

    const provider = await getTenantWhatsApp(pool, tenantId);

    // Pas de provider = not_requested
    if (!provider) {
      return res.json({
        ok: true,
        whatsapp_status: 'not_requested',
        connected: false,
        phone_number: null
      });
    }

    let { whatsapp_status, phone_number, expires_at } = provider;

    // Check expiration
    if (expires_at && new Date(expires_at) < new Date()) {
      if (whatsapp_status !== 'expired') {
        await pool.query(
          `UPDATE tenant_provider_configs
           SET whatsapp_status = 'expired', is_active = false, updated_at = NOW()
           WHERE id = $1`,
          [provider.id]
        );
        whatsapp_status = 'expired';
      }
    }

    // Si qr_ready ou connected, vérifier statut réel Green-API
    if ((whatsapp_status === 'qr_ready' || whatsapp_status === 'connected') && provider.encrypted_config) {
      try {
        const credentials = decryptCredentials(provider.encrypted_config, tenantId);
        const status = await getInstanceStatus({
          idInstance: credentials.instanceId,
          apiTokenInstance: credentials.token
        });

        const isConnected = status.stateInstance === 'authorized';

        // Mettre à jour si changement
        if (isConnected && whatsapp_status !== 'connected') {
          await pool.query(
            `UPDATE tenant_provider_configs
             SET whatsapp_status = 'connected', connection_status = 'success', is_active = true, updated_at = NOW()
             WHERE id = $1`,
            [provider.id]
          );
          whatsapp_status = 'connected';
        } else if (!isConnected && whatsapp_status === 'connected') {
          await pool.query(
            `UPDATE tenant_provider_configs
             SET whatsapp_status = 'qr_ready', connection_status = 'non_testé', is_active = false, updated_at = NOW()
             WHERE id = $1`,
            [provider.id]
          );
          whatsapp_status = 'qr_ready';
        }

        return res.json({
          ok: true,
          whatsapp_status,
          connected: isConnected,
          phone_number: phone_number || status.rawResponse?.phone || null,
          greenApiState: status.stateInstance,
          expires_at
        });
      } catch (apiError) {
        console.warn('[WA-TENANT] Green-API status check failed:', apiError.message);
        // Return DB status if Green-API unreachable
      }
    }

    return res.json({
      ok: true,
      whatsapp_status,
      connected: whatsapp_status === 'connected',
      phone_number,
      expires_at
    });

  } catch (error) {
    console.error('[WA-TENANT] Status error:', error);
    res.status(500).json({ ok: false, error: 'Erreur serveur' });
  } finally {
    await pool.end();
  }
});

/**
 * POST /api/whatsapp/request-activation
 *
 * Client demande activation WhatsApp
 * Input: { phone_number: "+33612345678" }
 * Action: Crée un provider avec status = pending_provisioning
 */
router.post('/request-activation', async (req, res) => {
  const pool = getPool();

  try {
    const tenantId = req.tenantId;
    const { phone_number } = req.body;

    console.log('[WA-TENANT] Activation request from tenant:', tenantId, 'phone:', phone_number);

    // Validation numéro E.164
    if (!phone_number || !/^\+[1-9]\d{6,14}$/.test(phone_number)) {
      return res.status(400).json({
        ok: false,
        error: 'Numéro de téléphone invalide. Format attendu: +33612345678'
      });
    }

    // Vérifier si déjà un provider existe
    const existing = await getTenantWhatsApp(pool, tenantId);

    if (existing) {
      // Si déjà connected ou qr_ready, pas besoin de redemander
      if (['connected', 'qr_ready'].includes(existing.whatsapp_status)) {
        return res.status(400).json({
          ok: false,
          error: `WhatsApp est déjà en statut: ${existing.whatsapp_status}`
        });
      }

      // Mettre à jour le provider existant
      await pool.query(
        `UPDATE tenant_provider_configs
         SET whatsapp_status = 'pending_provisioning',
             phone_number = $1,
             connection_status = 'non_testé',
             is_active = false,
             updated_at = NOW()
         WHERE id = $2`,
        [phone_number, existing.id]
      );
    } else {
      // Créer un nouveau provider en attente (pas de credentials encore)
      await pool.query(
        `INSERT INTO tenant_provider_configs
          (tenant_id, provider_type, provider_name, encrypted_config, connection_status, is_active, whatsapp_status, phone_number, created_by)
         VALUES ($1, 'greenapi_whatsapp', 'WhatsApp Pro', '', 'non_testé', false, 'pending_provisioning', $2, $3)`,
        [tenantId, phone_number, req.user?.email || 'system']
      );
    }

    console.log('[WA-TENANT] Activation requested successfully for tenant:', tenantId);

    res.json({
      ok: true,
      message: 'Demande d\'activation enregistrée. L\'admin va provisionner votre instance.',
      whatsapp_status: 'pending_provisioning'
    });

  } catch (error) {
    console.error('[WA-TENANT] Request activation error:', error);
    res.status(500).json({ ok: false, error: 'Erreur serveur' });
  } finally {
    await pool.end();
  }
});

/**
 * GET /api/whatsapp/qr
 *
 * Récupère le QR code pour le tenant (credentials du tenant uniquement)
 * Disponible uniquement si status = qr_ready
 */
router.get('/qr', async (req, res) => {
  const pool = getPool();

  try {
    const tenantId = req.tenantId;
    console.log('[WA-TENANT] QR code request for tenant:', tenantId);

    const provider = await getTenantWhatsApp(pool, tenantId);

    if (!provider) {
      return res.status(400).json({
        ok: false,
        error: 'WhatsApp non configuré. Demandez l\'activation d\'abord.'
      });
    }

    if (provider.whatsapp_status !== 'qr_ready') {
      return res.status(400).json({
        ok: false,
        error: `QR code non disponible (statut: ${provider.whatsapp_status})`,
        whatsapp_status: provider.whatsapp_status
      });
    }

    if (!provider.encrypted_config) {
      return res.status(400).json({
        ok: false,
        error: 'Instance non provisionnée. Contactez l\'admin.'
      });
    }

    // Déchiffrer credentials du tenant
    const credentials = decryptCredentials(provider.encrypted_config, tenantId);

    // Appeler Green-API pour QR code
    const qrResponse = await getQrCode({
      idInstance: credentials.instanceId,
      apiTokenInstance: credentials.token
    });

    console.log('[WA-TENANT] QR code generated for tenant:', tenantId);

    res.json({
      ok: true,
      qrCode: qrResponse.qrCode,
      expiresIn: qrResponse.expiresIn
    });

  } catch (error) {
    console.error('[WA-TENANT] QR code error:', error);
    res.status(500).json({
      ok: false,
      error: 'Impossible de générer le QR code. Réessayez dans quelques instants.'
    });
  } finally {
    await pool.end();
  }
});

/**
 * POST /api/whatsapp/disable
 *
 * Client soft-disable WhatsApp (PAS de logout Green-API)
 * status = disabled, is_active = false
 */
router.post('/disable', async (req, res) => {
  const pool = getPool();

  try {
    const tenantId = req.tenantId;
    console.log('[WA-TENANT] Disable request from tenant:', tenantId);

    const provider = await getTenantWhatsApp(pool, tenantId);

    if (!provider) {
      return res.status(400).json({ ok: false, error: 'WhatsApp non configuré' });
    }

    // Soft disable: juste changer le statut, PAS de logout Green-API
    await pool.query(
      `UPDATE tenant_provider_configs
       SET whatsapp_status = 'disabled', is_active = false, updated_at = NOW()
       WHERE id = $1`,
      [provider.id]
    );

    console.log('[WA-TENANT] WhatsApp disabled for tenant:', tenantId);

    res.json({
      ok: true,
      message: 'WhatsApp désactivé dans MAX.',
      whatsapp_status: 'disabled'
    });

  } catch (error) {
    console.error('[WA-TENANT] Disable error:', error);
    res.status(500).json({ ok: false, error: 'Erreur serveur' });
  } finally {
    await pool.end();
  }
});

/**
 * POST /api/whatsapp/enable
 *
 * Client re-enable WhatsApp (après disable)
 * Vérifie si credentials existent encore et Green-API est authorized
 */
router.post('/enable', async (req, res) => {
  const pool = getPool();

  try {
    const tenantId = req.tenantId;
    console.log('[WA-TENANT] Enable request from tenant:', tenantId);

    const provider = await getTenantWhatsApp(pool, tenantId);

    if (!provider) {
      return res.status(400).json({ ok: false, error: 'WhatsApp non configuré' });
    }

    if (provider.whatsapp_status !== 'disabled') {
      return res.status(400).json({
        ok: false,
        error: `Impossible de réactiver (statut actuel: ${provider.whatsapp_status})`
      });
    }

    // Check expiration
    if (provider.expires_at && new Date(provider.expires_at) < new Date()) {
      await pool.query(
        `UPDATE tenant_provider_configs
         SET whatsapp_status = 'expired', updated_at = NOW()
         WHERE id = $1`,
        [provider.id]
      );
      return res.status(400).json({
        ok: false,
        error: 'Votre abonnement WhatsApp a expiré. Contactez le support pour renouveler.',
        whatsapp_status: 'expired'
      });
    }

    // Vérifier statut Green-API
    if (provider.encrypted_config) {
      try {
        const credentials = decryptCredentials(provider.encrypted_config, tenantId);
        const status = await getInstanceStatus({
          idInstance: credentials.instanceId,
          apiTokenInstance: credentials.token
        });

        const isConnected = status.stateInstance === 'authorized';
        const newStatus = isConnected ? 'connected' : 'qr_ready';

        await pool.query(
          `UPDATE tenant_provider_configs
           SET whatsapp_status = $1, is_active = $2, connection_status = $3, updated_at = NOW()
           WHERE id = $4`,
          [newStatus, isConnected, isConnected ? 'success' : 'non_testé', provider.id]
        );

        return res.json({
          ok: true,
          whatsapp_status: newStatus,
          connected: isConnected,
          message: isConnected ? 'WhatsApp réactivé' : 'WhatsApp réactivé. Scannez le QR code pour reconnecter.'
        });
      } catch (apiError) {
        console.warn('[WA-TENANT] Green-API check failed on enable:', apiError.message);
      }
    }

    // Fallback: set to qr_ready
    await pool.query(
      `UPDATE tenant_provider_configs
       SET whatsapp_status = 'qr_ready', is_active = false, updated_at = NOW()
       WHERE id = $1`,
      [provider.id]
    );

    res.json({
      ok: true,
      whatsapp_status: 'qr_ready',
      message: 'WhatsApp réactivé. Scannez le QR code pour reconnecter.'
    });

  } catch (error) {
    console.error('[WA-TENANT] Enable error:', error);
    res.status(500).json({ ok: false, error: 'Erreur serveur' });
  } finally {
    await pool.end();
  }
});

/**
 * POST /api/whatsapp/change-number
 *
 * Client demande changement de numéro
 * => status = pending_provisioning (admin doit reprovisionner)
 */
router.post('/change-number', async (req, res) => {
  const pool = getPool();

  try {
    const tenantId = req.tenantId;
    const { phone_number } = req.body;

    console.log('[WA-TENANT] Change number request from tenant:', tenantId, 'new phone:', phone_number);

    // Validation numéro E.164
    if (!phone_number || !/^\+[1-9]\d{6,14}$/.test(phone_number)) {
      return res.status(400).json({
        ok: false,
        error: 'Numéro de téléphone invalide. Format attendu: +33612345678'
      });
    }

    const provider = await getTenantWhatsApp(pool, tenantId);

    if (!provider) {
      return res.status(400).json({ ok: false, error: 'WhatsApp non configuré' });
    }

    // Mettre en pending_provisioning avec le nouveau numéro
    await pool.query(
      `UPDATE tenant_provider_configs
       SET whatsapp_status = 'pending_provisioning',
           phone_number = $1,
           is_active = false,
           connection_status = 'non_testé',
           updated_at = NOW()
       WHERE id = $2`,
      [phone_number, provider.id]
    );

    console.log('[WA-TENANT] Number change requested for tenant:', tenantId);

    res.json({
      ok: true,
      message: 'Demande de changement de numéro enregistrée. L\'admin va mettre à jour votre instance.',
      whatsapp_status: 'pending_provisioning'
    });

  } catch (error) {
    console.error('[WA-TENANT] Change number error:', error);
    res.status(500).json({ ok: false, error: 'Erreur serveur' });
  } finally {
    await pool.end();
  }
});

export default router;
