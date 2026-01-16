/**
 * Routes Settings - Self-Service Provider Configuration
 *
 * Permet aux tenants de configurer leurs propres credentials pour:
 * - Email: Mailjet, SendGrid, SMTP, Gmail
 * - SMS: Twilio
 * - WhatsApp: Green-API, Twilio
 *
 * Sécurité:
 * - Credentials chiffrés en AES-256-GCM avant stockage
 * - Isolation par tenant_id
 * - Jamais de logs avec credentials en clair
 */

import express from 'express';
import { encryptCredentials, decryptCredentials, redactCredentials } from '../lib/encryption.js';

const router = express.Router();

/**
 * GET /api/settings/providers
 * Liste tous les providers configurés pour le tenant authentifié
 */
router.get('/providers', async (req, res) => {
  try {
    const { db } = req.app.locals;
    const tenantId = req.tenantId;

    console.log(`[Settings] GET providers - Tenant: ${tenantId}`);

    const result = await db.query(
      `SELECT
        id,
        tenant_id,
        provider_type,
        provider_name,
        connection_status,
        last_test_error,
        last_tested_at,
        is_active,
        created_at,
        updated_at
       FROM tenant_provider_configs
       WHERE tenant_id = $1
       ORDER BY provider_type, created_at DESC`,
      [tenantId]
    );

    // Note: on ne retourne PAS les credentials chiffrés dans la liste
    // Ils seront récupérés uniquement en GET /providers/:id si nécessaire

    res.json({
      success: true,
      providers: result.rows
    });
  } catch (error) {
    console.error('[Settings] Erreur GET providers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/settings/providers/:id
 * Récupère les détails d'un provider spécifique (AVEC credentials déchiffrés)
 */
router.get('/providers/:id', async (req, res) => {
  try {
    const { db } = req.app.locals;
    const tenantId = req.tenantId;
    const providerId = parseInt(req.params.id);

    console.log(`[Settings] GET provider #${providerId} - Tenant: ${tenantId}`);

    const result = await db.query(
      'SELECT * FROM tenant_provider_configs WHERE id = $1 AND tenant_id = $2',
      [providerId, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Provider non trouvé'
      });
    }

    const provider = result.rows[0];

    // Déchiffrer les credentials avec la clé du tenant
    let credentials = null;
    try {
      credentials = decryptCredentials(provider.encrypted_config, tenantId);
    } catch (error) {
      console.error(`[Settings] Erreur déchiffrement provider #${providerId}:`, error.message);
      return res.status(500).json({
        success: false,
        error: 'Impossible de déchiffrer les credentials (clé invalide ou données corrompues)'
      });
    }

    // Retourner avec credentials déchiffrés
    res.json({
      success: true,
      provider: {
        ...provider,
        credentials, // ⚠️ Sensible! Ne logger JAMAIS
        encrypted_config: undefined // Retirer le blob chiffré de la réponse
      }
    });
  } catch (error) {
    console.error('[Settings] Erreur GET provider:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/settings/providers
 * Créer une nouvelle configuration de provider
 *
 * Body:
 * {
 *   provider_type: 'mailjet' | 'twilio_sms' | 'greenapi_whatsapp' | ...,
 *   provider_name: 'Mailjet Production' (optionnel),
 *   credentials: { apiKey: "...", apiSecret: "...", ... },
 *   is_active: true/false (optionnel, default: false)
 * }
 */
router.post('/providers', async (req, res) => {
  try {
    const { db } = req.app.locals;
    const tenantId = req.tenantId;
    const userId = req.user?.id;
    const { provider_type, provider_name, credentials, is_active } = req.body;

    console.log(`[Settings] POST provider - Tenant: ${tenantId}, Type: ${provider_type}`);

    // Validation
    if (!provider_type || !credentials) {
      return res.status(400).json({
        success: false,
        error: 'provider_type et credentials obligatoires'
      });
    }

    // Valider provider_type
    const validProviders = [
      'mailjet',
      'sendgrid',
      'smtp',
      'gmail',
      'twilio_sms',
      'twilio_whatsapp',
      'greenapi_whatsapp'
    ];

    if (!validProviders.includes(provider_type)) {
      return res.status(400).json({
        success: false,
        error: `provider_type invalide. Accepté: ${validProviders.join(', ')}`
      });
    }

    // Valider les credentials selon le provider_type
    const validationError = validateProviderCredentials(provider_type, credentials);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError
      });
    }

    // Chiffrer les credentials
    let encryptedConfig;
    try {
      encryptedConfig = encryptCredentials(credentials, tenantId);
    } catch (error) {
      console.error('[Settings] Erreur chiffrement credentials:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Échec du chiffrement des credentials'
      });
    }

    // Si is_active=true, désactiver les autres providers du même type
    if (is_active) {
      await db.query(
        'UPDATE tenant_provider_configs SET is_active = false WHERE tenant_id = $1 AND provider_type = $2',
        [tenantId, provider_type]
      );
    }

    // Insérer le nouveau provider
    const result = await db.query(
      `INSERT INTO tenant_provider_configs
       (tenant_id, provider_type, provider_name, encrypted_config, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, tenant_id, provider_type, provider_name, connection_status, is_active, created_at`,
      [tenantId, provider_type, provider_name, encryptedConfig, is_active || false, userId]
    );

    console.log(`[Settings] Provider créé: #${result.rows[0].id} (${provider_type})`);

    res.status(201).json({
      success: true,
      provider: result.rows[0]
    });
  } catch (error) {
    console.error('[Settings] Erreur POST provider:', error);

    // Gérer l'erreur de contrainte UNIQUE
    if (error.code === '23505') { // PostgreSQL unique violation
      return res.status(409).json({
        success: false,
        error: 'Un provider avec ce type et ce nom existe déjà pour ce tenant'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/settings/providers/:id
 * Mettre à jour un provider existant
 *
 * Body:
 * {
 *   provider_name: 'Nouveau nom' (optionnel),
 *   credentials: { apiKey: "...", ... } (optionnel),
 *   is_active: true/false (optionnel)
 * }
 */
router.put('/providers/:id', async (req, res) => {
  try {
    const { db } = req.app.locals;
    const tenantId = req.tenantId;
    const userId = req.user?.id;
    const providerId = parseInt(req.params.id);
    const { provider_name, credentials, is_active } = req.body;

    console.log(`[Settings] PUT provider #${providerId} - Tenant: ${tenantId}`);

    // Vérifier que le provider existe et appartient au tenant
    const existingResult = await db.query(
      'SELECT * FROM tenant_provider_configs WHERE id = $1 AND tenant_id = $2',
      [providerId, tenantId]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Provider non trouvé'
      });
    }

    const existing = existingResult.rows[0];

    // Construire l'update dynamiquement
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (provider_name !== undefined) {
      updates.push(`provider_name = $${paramIndex++}`);
      values.push(provider_name);
    }

    if (credentials) {
      // Valider les nouveaux credentials
      const validationError = validateProviderCredentials(existing.provider_type, credentials);
      if (validationError) {
        return res.status(400).json({
          success: false,
          error: validationError
        });
      }

      // Chiffrer les nouveaux credentials
      let encryptedConfig;
      try {
        encryptedConfig = encryptCredentials(credentials, tenantId);
      } catch (error) {
        console.error('[Settings] Erreur chiffrement credentials:', error.message);
        return res.status(500).json({
          success: false,
          error: 'Échec du chiffrement des credentials'
        });
      }

      updates.push(`encrypted_config = $${paramIndex++}`);
      values.push(encryptedConfig);

      // Reset le statut de test si credentials changés
      updates.push(`connection_status = 'non_testé'`);
      updates.push(`last_test_error = NULL`);
      updates.push(`last_tested_at = NULL`);
    }

    if (is_active !== undefined) {
      // Si on active ce provider, désactiver les autres du même type
      if (is_active) {
        await db.query(
          'UPDATE tenant_provider_configs SET is_active = false WHERE tenant_id = $1 AND provider_type = $2 AND id != $3',
          [tenantId, existing.provider_type, providerId]
        );
      }

      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucune modification fournie'
      });
    }

    // Ajouter updated_by
    updates.push(`updated_by = $${paramIndex++}`);
    values.push(userId);

    // Ajouter les conditions WHERE
    values.push(providerId);
    values.push(tenantId);

    const updateQuery = `
      UPDATE tenant_provider_configs
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++}
      RETURNING id, tenant_id, provider_type, provider_name, connection_status, is_active, updated_at
    `;

    const result = await db.query(updateQuery, values);

    console.log(`[Settings] Provider #${providerId} mis à jour`);

    res.json({
      success: true,
      provider: result.rows[0]
    });
  } catch (error) {
    console.error('[Settings] Erreur PUT provider:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/settings/providers/:id
 * Supprimer un provider
 */
router.delete('/providers/:id', async (req, res) => {
  try {
    const { db } = req.app.locals;
    const tenantId = req.tenantId;
    const providerId = parseInt(req.params.id);

    console.log(`[Settings] DELETE provider #${providerId} - Tenant: ${tenantId}`);

    // Supprimer (vérification tenant_id pour sécurité)
    const result = await db.query(
      'DELETE FROM tenant_provider_configs WHERE id = $1 AND tenant_id = $2 RETURNING *',
      [providerId, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Provider non trouvé'
      });
    }

    console.log(`[Settings] Provider #${providerId} supprimé`);

    res.json({
      success: true,
      message: 'Provider supprimé avec succès'
    });
  } catch (error) {
    console.error('[Settings] Erreur DELETE provider:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Valide les credentials selon le type de provider
 * @param {string} providerType
 * @param {Object} credentials
 * @returns {string|null} Message d'erreur ou null si valide
 */
function validateProviderCredentials(providerType, credentials) {
  if (!credentials || typeof credentials !== 'object') {
    return 'credentials doit être un objet';
  }

  switch (providerType) {
    case 'mailjet':
      if (!credentials.apiKey || !credentials.apiSecret) {
        return 'Mailjet requiert apiKey et apiSecret';
      }
      break;

    case 'sendgrid':
      if (!credentials.apiKey) {
        return 'SendGrid requiert apiKey';
      }
      break;

    case 'smtp':
      if (!credentials.host || !credentials.port || !credentials.user || !credentials.password) {
        return 'SMTP requiert host, port, user et password';
      }
      break;

    case 'gmail':
      if (!credentials.clientId || !credentials.clientSecret || !credentials.refreshToken) {
        return 'Gmail OAuth requiert clientId, clientSecret et refreshToken';
      }
      break;

    case 'twilio_sms':
    case 'twilio_whatsapp':
      if (!credentials.accountSid || !credentials.authToken || !credentials.phoneNumber) {
        return 'Twilio requiert accountSid, authToken et phoneNumber';
      }
      break;

    case 'greenapi_whatsapp':
      if (!credentials.instanceId || !credentials.token) {
        return 'Green-API requiert instanceId et token';
      }
      break;

    default:
      return `Type de provider inconnu: ${providerType}`;
  }

  return null; // Valide
}

/**
 * GET /api/settings/features
 * Retourne les feature flags pour le tenant (billing)
 */
router.get('/features', async (req, res) => {
  try {
    const { db } = req.app.locals;
    const tenantId = req.tenantId;

    console.log(`[Settings] GET features - Tenant: ${tenantId}`);

    const result = await db.query(
      `SELECT whatsapp_enabled, sms_enabled, email_enabled, campaigns_enabled
       FROM tenant_features
       WHERE tenant_id = $1`,
      [tenantId]
    );

    // Si pas de row, retourner defaults (tout désactivé sauf email)
    if (result.rows.length === 0) {
      return res.json({
        whatsapp_enabled: false,
        sms_enabled: false,
        email_enabled: true, // Email inclus de base
        campaigns_enabled: false
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Settings] Erreur GET features:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;