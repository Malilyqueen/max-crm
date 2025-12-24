/**
 * Routes API - WhatsApp Instance Management (Green-API)
 *
 * Endpoints pour gérer les instances WhatsApp (QR code, statut, etc.)
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

const router = express.Router();

/**
 * POST /api/wa/instance/create
 *
 * Enregistre une nouvelle instance Green-API
 * Body: { idInstance, apiTokenInstance, tenant }
 */
router.post('/instance/create', async (req, res) => {
  try {
    const { idInstance, apiTokenInstance, tenant } = req.body;

    if (!idInstance || !apiTokenInstance) {
      return res.status(400).json({
        ok: false,
        error: 'MISSING_PARAMS',
        message: 'idInstance et apiTokenInstance requis'
      });
    }

    console.log('[WA-INSTANCE] 🆕 Création instance', { idInstance, tenant });

    const instance = await createInstance({ idInstance, apiTokenInstance });

    // Sauvegarder dans le storage
    await saveInstance({ ...instance, tenant, apiToken: apiTokenInstance });

    res.json({
      ok: true,
      instance: {
        instanceId: instance.instanceId,
        status: instance.status,
        provider: 'greenapi',
        tenant
      }
    });
  } catch (error) {
    console.error('[WA-INSTANCE] ❌ Erreur création:', error.message);
    res.status(500).json({
      ok: false,
      error: 'INSTANCE_CREATE_FAILED',
      message: error.message
    });
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