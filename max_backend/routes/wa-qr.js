/**
 * Routes WhatsApp QR Code - Mode QR-Only Strict
 *
 * RÈGLES:
 * - JWT + resolveTenant obligatoires
 * - Vérification whatsapp_enabled avant toute action
 * - Green-API mutualisé (credentials depuis env)
 * - DB chiffrée = seule source of truth
 * - Aucun JSON legacy
 */

import express from 'express';
import pg from 'pg';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { resolveTenant } from '../core/resolveTenant.js';
import { whatsappGate } from '../middleware/whatsappGate.js';
import { encryptCredentials, decryptCredentials } from '../lib/encryption.js';
import {
  getQrCode,
  getInstanceStatus
} from '../providers/greenapi/greenapi.service.js';
import { greenApiRequest } from '../providers/greenapi/greenapi.client.js';

const { Pool } = pg;
const router = express.Router();

// Appliquer JWT + tenant resolution + WhatsApp gate sur TOUTES les routes
router.use(authMiddleware);
router.use(resolveTenant());
router.use(whatsappGate);

/**
 * POST /api/wa/qr/generate
 *
 * Génère un QR code pour connexion WhatsApp
 * Backend utilise Green-API mutualisé (credentials env)
 * Sauvegarde immédiatement en DB chiffrée
 */
router.post('/generate', async (req, res) => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('supabase')
      ? { rejectUnauthorized: false }
      : false
  });

  try {
    const tenantId = req.tenantId;

    console.log('[WA-QR] 🆕 Génération QR pour tenant:', tenantId);

    // 1. Récupérer credentials Green-API mutualisés depuis env
    const instanceId = process.env.GREENAPI_INSTANCE_ID;
    const apiToken = process.env.GREENAPI_API_TOKEN;

    if (!instanceId || !apiToken) {
      console.error('[WA-QR] ❌ Credentials Green-API manquants dans env');
      return res.status(500).json({
        ok: false,
        error: 'Configuration serveur incorrecte'
      });
    }

    console.log('[WA-QR] ✅ Credentials Green-API chargés:', { instanceId });

    // 2. Appeler Green-API pour obtenir QR code
    let qrCode;
    try {
      const qrResponse = await getQrCode({ idInstance: instanceId, apiTokenInstance: apiToken });
      qrCode = qrResponse.qrCode;
      console.log('[WA-QR] ✅ QR code généré');
    } catch (error) {
      console.error('[WA-QR] ❌ Erreur Green-API getQrCode:', error.message);
      return res.status(500).json({
        ok: false,
        error: 'Impossible de générer le QR code. Réessayez dans quelques instants.'
      });
    }

    // 3. Chiffrer credentials per-tenant
    const credentials = { instanceId, token: apiToken };
    const encryptedConfig = encryptCredentials(credentials, tenantId);

    console.log('[WA-QR] 🔐 Credentials chiffrés per-tenant');

    // 4. Sauvegarder en DB (source of truth)
    try {
      await pool.query(
        `INSERT INTO tenant_provider_configs
          (tenant_id, provider_type, provider_name, encrypted_config, connection_status, is_active, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (tenant_id, provider_type, provider_name)
         DO UPDATE SET
           encrypted_config = EXCLUDED.encrypted_config,
           connection_status = 'non_testé',
           updated_at = NOW()
         RETURNING id`,
        [
          tenantId,
          'greenapi_whatsapp',
          'WhatsApp Pro',
          encryptedConfig,
          'non_testé', // En attente de scan
          false, // Pas encore actif
          req.user?.email || 'system'
        ]
      );

      console.log('[WA-QR] 💾 Provider sauvegardé en DB chiffrée');
    } catch (dbError) {
      console.error('[WA-QR] ❌ Erreur DB:', dbError.message);
      return res.status(500).json({
        ok: false,
        error: 'Erreur lors de la sauvegarde'
      });
    }

    // 5. Retourner QR code au client
    res.json({
      ok: true,
      qrCode
    });

  } catch (error) {
    console.error('[WA-QR] ❌ Erreur globale:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Erreur serveur'
    });
  } finally {
    await pool.end();
  }
});

/**
 * GET /api/wa/qr/status
 *
 * Vérifie le statut de connexion WhatsApp (polling)
 * Lit credentials depuis DB chiffrée
 */
router.get('/status', async (req, res) => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('supabase')
      ? { rejectUnauthorized: false }
      : false
  });

  try {
    const tenantId = req.tenantId;

    console.log('[WA-QR] 🔍 Vérification statut pour tenant:', tenantId);

    // 1. Lire provider depuis DB
    const result = await pool.query(
      `SELECT encrypted_config, connection_status FROM tenant_provider_configs
       WHERE tenant_id = $1 AND provider_type = 'greenapi_whatsapp'
       ORDER BY updated_at DESC
       LIMIT 1`,
      [tenantId]
    );

    if (result.rows.length === 0) {
      console.log('[WA-QR] ⚠️ Aucun provider trouvé pour tenant:', tenantId);
      return res.json({
        connected: false,
        status: 'not_configured'
      });
    }

    const { encrypted_config, connection_status } = result.rows[0];

    // 2. Déchiffrer credentials
    let credentials;
    try {
      credentials = decryptCredentials(encrypted_config, tenantId);
    } catch (decryptError) {
      console.error('[WA-QR] ❌ Erreur déchiffrement:', decryptError.message);
      return res.status(500).json({
        ok: false,
        error: 'Erreur lecture configuration'
      });
    }

    // 3. Vérifier statut sur Green-API
    let status;
    try {
      status = await getInstanceStatus({
        idInstance: credentials.instanceId,
        apiTokenInstance: credentials.token
      });
      console.log('[WA-QR] ✅ Statut Green-API:', status.stateInstance);
    } catch (apiError) {
      console.error('[WA-QR] ❌ Erreur Green-API status:', apiError.message);
      return res.json({
        connected: false,
        status: 'error',
        error: apiError.message
      });
    }

    // 4. Mettre à jour DB si statut a changé
    const isConnected = status.stateInstance === 'authorized';
    const newConnectionStatus = isConnected ? 'success' : 'non_testé';

    if (connection_status !== newConnectionStatus) {
      await pool.query(
        `UPDATE tenant_provider_configs
         SET connection_status = $1, is_active = $2, updated_at = NOW()
         WHERE tenant_id = $3 AND provider_type = 'greenapi_whatsapp'`,
        [newConnectionStatus, isConnected, tenantId]
      );
      console.log('[WA-QR] 💾 Statut mis à jour en DB:', newConnectionStatus);
    }

    // 5. Retourner statut au client
    res.json({
      connected: isConnected,
      status: status.stateInstance,
      phoneNumber: status.phoneNumber || null
    });

  } catch (error) {
    console.error('[WA-QR] ❌ Erreur globale:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Erreur serveur'
    });
  } finally {
    await pool.end();
  }
});

/**
 * POST /api/wa/test
 *
 * Envoie un message test WhatsApp au numéro connecté
 * Valide que la connexion fonctionne de bout en bout
 */
router.post('/test', async (req, res) => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('supabase')
      ? { rejectUnauthorized: false }
      : false
  });

  try {
    const tenantId = req.tenantId;

    console.log('[WA-TEST] 📤 Envoi message test pour tenant:', tenantId);

    // 1. Lire provider depuis DB
    const result = await pool.query(
      `SELECT encrypted_config, connection_status FROM tenant_provider_configs
       WHERE tenant_id = $1 AND provider_type = 'greenapi_whatsapp'
       LIMIT 1`,
      [tenantId]
    );

    if (result.rows.length === 0) {
      console.log('[WA-TEST] ⚠️ Aucun provider trouvé');
      return res.status(404).json({
        ok: false,
        error: 'WhatsApp non configuré'
      });
    }

    const { encrypted_config, connection_status } = result.rows[0];

    if (connection_status !== 'success') {
      console.log('[WA-TEST] ⚠️ WhatsApp non connecté:', connection_status);
      return res.status(400).json({
        ok: false,
        error: 'WhatsApp non connecté. Veuillez scanner le QR code.'
      });
    }

    // 2. Déchiffrer credentials
    let credentials;
    try {
      credentials = decryptCredentials(encrypted_config, tenantId);
    } catch (decryptError) {
      console.error('[WA-TEST] ❌ Erreur déchiffrement:', decryptError.message);
      return res.status(500).json({
        ok: false,
        error: 'Erreur lecture configuration'
      });
    }

    // 3. Obtenir statut pour récupérer le numéro
    let status;
    try {
      status = await getInstanceStatus({
        idInstance: credentials.instanceId,
        apiTokenInstance: credentials.token
      });
    } catch (apiError) {
      console.error('[WA-TEST] ❌ Erreur récupération statut:', apiError.message);
      return res.status(500).json({
        ok: false,
        error: 'Impossible de vérifier le statut WhatsApp'
      });
    }

    if (!status.phoneNumber) {
      console.error('[WA-TEST] ❌ Numéro de téléphone non disponible');
      return res.status(400).json({
        ok: false,
        error: 'Numéro de téléphone non disponible'
      });
    }

    // 4. Envoyer message test via Green-API
    const testMessage = `✅ *Connexion réussie!*\n\nVotre WhatsApp Pro est maintenant connecté à MAX CRM.\n\nVous pouvez désormais envoyer des messages à vos contacts directement depuis MAX.`;

    try {
      const sendEndpoint = `/waInstance${credentials.instanceId}/sendMessage/${credentials.token}`;
      await greenApiRequest(sendEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          chatId: `${status.phoneNumber}@c.us`,
          message: testMessage
        })
      }, 10000);

      console.log('[WA-TEST] ✅ Message test envoyé au:', status.phoneNumber);

      res.json({
        ok: true,
        message: 'Message test envoyé avec succès',
        phoneNumber: status.phoneNumber
      });

    } catch (sendError) {
      console.error('[WA-TEST] ❌ Erreur envoi message:', sendError.message);
      return res.status(500).json({
        ok: false,
        error: 'Impossible d\'envoyer le message test'
      });
    }

  } catch (error) {
    console.error('[WA-TEST] ❌ Erreur globale:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Erreur serveur'
    });
  } finally {
    await pool.end();
  }
});

/**
 * POST /api/wa/disconnect
 *
 * Déconnecte WhatsApp
 * - Appelle Green-API logout
 * - Supprime provider de DB (source of truth)
 */
router.post('/disconnect', async (req, res) => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('supabase')
      ? { rejectUnauthorized: false }
      : false
  });

  try {
    const tenantId = req.tenantId;

    console.log('[WA-QR] 🔌 Déconnexion WhatsApp pour tenant:', tenantId);

    // 1. Lire provider depuis DB
    const result = await pool.query(
      `SELECT encrypted_config FROM tenant_provider_configs
       WHERE tenant_id = $1 AND provider_type = 'greenapi_whatsapp'
       LIMIT 1`,
      [tenantId]
    );

    if (result.rows.length === 0) {
      console.log('[WA-QR] ⚠️ Aucun provider à déconnecter');
      return res.json({
        ok: true,
        message: 'Aucune connexion WhatsApp active'
      });
    }

    // 2. Déchiffrer credentials
    let credentials;
    try {
      credentials = decryptCredentials(result.rows[0].encrypted_config, tenantId);
    } catch (decryptError) {
      console.error('[WA-QR] ❌ Erreur déchiffrement:', decryptError.message);
      // Continuer quand même pour supprimer de la DB
    }

    // 3. Appeler Green-API logout (best effort)
    if (credentials) {
      try {
        const logoutEndpoint = `/waInstance${credentials.instanceId}/logout/${credentials.token}`;
        await greenApiRequest(logoutEndpoint, { method: 'GET' }, 5000);
        console.log('[WA-QR] ✅ Logout Green-API réussi');
      } catch (logoutError) {
        console.warn('[WA-QR] ⚠️ Erreur logout Green-API (ignorée):', logoutError.message);
        // Ne pas échouer si logout Green-API échoue
      }
    }

    // 4. Supprimer provider de DB (source of truth)
    await pool.query(
      `DELETE FROM tenant_provider_configs
       WHERE tenant_id = $1 AND provider_type = 'greenapi_whatsapp'`,
      [tenantId]
    );

    console.log('[WA-QR] 💾 Provider supprimé de la DB');

    res.json({
      ok: true,
      message: 'WhatsApp déconnecté avec succès'
    });

  } catch (error) {
    console.error('[WA-QR] ❌ Erreur globale:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Erreur lors de la déconnexion'
    });
  } finally {
    await pool.end();
  }
});

export default router;