/**
 * Routes Settings - Test Connection Endpoints
 *
 * Endpoints pour tester la connexion aux providers AVANT activation.
 * Chaque provider a sa logique de test spécifique.
 *
 * POST /api/settings/providers/:id/test
 * - Teste la connexion avec les credentials du provider #id
 * - Met à jour connection_status, last_test_error, last_tested_at
 * - Retourne success/failed avec détails
 */

import express from 'express';
import { decryptCredentials } from '../lib/encryption.js';
import fetch from 'node-fetch';

const router = express.Router();

/**
 * POST /api/settings/providers/:id/test
 * Teste la connexion d'un provider
 */
router.post('/providers/:id/test', async (req, res) => {
  try {
    const { db } = req.app.locals;
    const tenantId = req.tenantId;
    const providerId = parseInt(req.params.id);

    console.log(`[Settings] TEST provider #${providerId} - Tenant: ${tenantId}`);

    // Récupérer le provider
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

    // Déchiffrer les credentials
    let credentials;
    try {
      credentials = decryptCredentials(provider.encrypted_config, tenantId);
    } catch (error) {
      console.error(`[Settings] Erreur déchiffrement provider #${providerId}:`, error.message);
      return res.status(500).json({
        success: false,
        error: 'Impossible de déchiffrer les credentials'
      });
    }

    // Tester selon le type de provider
    let testResult;
    try {
      testResult = await testProviderConnection(provider.provider_type, credentials);
    } catch (error) {
      testResult = {
        success: false,
        error: error.message
      };
    }

    // Mettre à jour le statut dans la DB
    const newStatus = testResult.success ? 'success' : 'failed';
    const lastError = testResult.success ? null : testResult.error;

    await db.query(
      `UPDATE tenant_provider_configs
       SET connection_status = $1, last_test_error = $2, last_tested_at = NOW()
       WHERE id = $3`,
      [newStatus, lastError, providerId]
    );

    console.log(`[Settings] Test provider #${providerId}: ${newStatus}`);

    res.json({
      success: testResult.success,
      status: newStatus,
      message: testResult.success ? 'Connexion réussie' : 'Échec de connexion',
      error: lastError,
      details: testResult.details
    });
  } catch (error) {
    console.error('[Settings] Erreur TEST provider:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Teste la connexion selon le type de provider
 * @param {string} providerType
 * @param {Object} credentials
 * @returns {Promise<{success: boolean, error?: string, details?: any}>}
 */
async function testProviderConnection(providerType, credentials) {
  switch (providerType) {
    case 'mailjet':
      return await testMailjet(credentials);

    case 'sendgrid':
      return await testSendGrid(credentials);

    case 'smtp':
      return await testSMTP(credentials);

    case 'gmail':
      return await testGmail(credentials);

    case 'twilio_sms':
    case 'twilio_whatsapp':
      return await testTwilio(credentials);

    case 'greenapi_whatsapp':
      return await testGreenAPI(credentials);

    default:
      throw new Error(`Type de provider non supporté: ${providerType}`);
  }
}

/**
 * Test Mailjet: Appel API pour récupérer les infos du compte
 */
async function testMailjet(credentials) {
  try {
    const { apiKey, apiSecret } = credentials;

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    const response = await fetch('https://api.mailjet.com/v3/REST/user', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    return {
      success: true,
      details: {
        email: data.Data?.[0]?.Email,
        username: data.Data?.[0]?.Username
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Mailjet: ${error.message}`
    };
  }
}

/**
 * Test SendGrid: Vérification de l'API key
 */
async function testSendGrid(credentials) {
  try {
    const { apiKey } = credentials;

    const response = await fetch('https://api.sendgrid.com/v3/user/account', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    return {
      success: true,
      details: {
        email: data.email,
        type: data.type
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `SendGrid: ${error.message}`
    };
  }
}

/**
 * Test SMTP: Tentative de connexion au serveur
 */
async function testSMTP(credentials) {
  try {
    const { host, port, user, password, secure } = credentials;

    // Import dynamique de nodemailer (si disponible)
    let nodemailer;
    try {
      nodemailer = await import('nodemailer');
    } catch (e) {
      throw new Error('nodemailer non installé (npm install nodemailer)');
    }

    const transporter = nodemailer.default.createTransport({
      host,
      port: parseInt(port),
      secure: secure || false,
      auth: {
        user,
        pass: password
      }
    });

    // Vérifier la connexion
    await transporter.verify();

    return {
      success: true,
      details: {
        host,
        port,
        user
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `SMTP: ${error.message}`
    };
  }
}

/**
 * Test Gmail OAuth: Tentative de refresh du token
 */
async function testGmail(credentials) {
  try {
    const { clientId, clientSecret, refreshToken } = credentials;

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      }),
      timeout: 10000
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${errorData.error_description || errorData.error}`);
    }

    const data = await response.json();

    return {
      success: true,
      details: {
        tokenType: data.token_type,
        expiresIn: data.expires_in
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Gmail OAuth: ${error.message}`
    };
  }
}

/**
 * Test Twilio: Récupération des infos du compte
 */
async function testTwilio(credentials) {
  try {
    const { accountSid, authToken, phoneNumber } = credentials;

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`
      },
      timeout: 10000
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    return {
      success: true,
      details: {
        accountSid: data.sid,
        friendlyName: data.friendly_name,
        status: data.status,
        phoneNumber
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Twilio: ${error.message}`
    };
  }
}

/**
 * Test Green-API WhatsApp: Récupération du statut de l'instance
 */
async function testGreenAPI(credentials) {
  try {
    const { instanceId, token } = credentials;

    const response = await fetch(
      `https://api.green-api.com/waInstance${instanceId}/getStateInstance/${token}`,
      {
        method: 'GET',
        timeout: 10000
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // Vérifier que l'instance est bien connectée
    if (data.stateInstance !== 'authorized') {
      return {
        success: false,
        error: `Instance non autorisée. Statut: ${data.stateInstance}. Veuillez scanner le QR code.`,
        details: {
          instanceId,
          state: data.stateInstance
        }
      };
    }

    return {
      success: true,
      details: {
        instanceId,
        state: data.stateInstance
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Green-API: ${error.message}`
    };
  }
}

/**
 * GET /api/settings/providers/greenapi/:instanceId/qr
 * Récupère le QR code pour Green-API WhatsApp
 */
router.get('/providers/greenapi/:instanceId/qr', async (req, res) => {
  try {
    const { db } = req.app.locals;
    const tenantId = req.tenantId;
    const instanceId = req.params.instanceId;

    console.log(`[Settings] GET QR code - Tenant: ${tenantId}, Instance: ${instanceId}`);

    // Récupérer le provider Green-API correspondant
    const result = await db.query(
      `SELECT * FROM tenant_provider_configs
       WHERE tenant_id = $1 AND provider_type = 'greenapi_whatsapp'`,
      [tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Provider Green-API non configuré'
      });
    }

    const provider = result.rows[0];

    // Déchiffrer pour récupérer le token
    let credentials;
    try {
      credentials = decryptCredentials(provider.encrypted_config, tenantId);
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Impossible de déchiffrer les credentials'
      });
    }

    const { token } = credentials;

    // Récupérer le QR code depuis Green-API
    const qrResponse = await fetch(
      `https://api.green-api.com/waInstance${instanceId}/qr/${token}`,
      {
        method: 'GET',
        timeout: 10000
      }
    );

    if (!qrResponse.ok) {
      const errorText = await qrResponse.text();
      throw new Error(`Erreur Green-API: ${errorText}`);
    }

    const qrData = await qrResponse.json();

    res.json({
      success: true,
      qrCode: qrData.message, // Base64 du QR code
      instanceId
    });
  } catch (error) {
    console.error('[Settings] Erreur GET QR code:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;