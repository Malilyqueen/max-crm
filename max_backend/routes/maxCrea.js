/**
 * Routes API pour M.A.X. Créa
 *
 * Endpoints pour la création de campagnes marketing avec génération IA
 */

import express from 'express';
import { generateCampaignContent } from '../lib/maxCreaService.js';
import { logAction, ACTION_TYPES, PRIORITY_LEVELS } from '../lib/maxActionLogger.js';
import { createEmailCampaign, createSmsCampaign } from '../lib/espoCampaignService.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Fichier de stockage des campagnes
const CAMPAIGNS_FILE = path.join(__dirname, '../data/max-campaigns.json');

/**
 * POST /api/max/crea/suggest
 * Générer des suggestions de contenu pour une campagne
 *
 * Body:
 * {
 *   campaignName: string,
 *   objective: string,
 *   target: string,
 *   tone: string (optional),
 *   channel: 'email' | 'sms'
 * }
 */
router.post('/suggest', async (req, res) => {
  try {
    const { campaignName, objective, target, tone, channel } = req.body;

    // Validation
    if (!campaignName || !objective || !target || !channel) {
      return res.status(400).json({
        ok: false,
        error: 'campaignName, objective, target et channel sont requis'
      });
    }

    if (!['email', 'sms'].includes(channel)) {
      return res.status(400).json({
        ok: false,
        error: 'channel doit être "email" ou "sms"'
      });
    }

    // Générer les suggestions avec Claude
    const result = await generateCampaignContent({
      campaignName,
      objective,
      target,
      tone: tone || 'professionnel',
      channel
    });

    if (!result.ok) {
      return res.status(500).json(result);
    }

    // Logger l'action
    await logAction({
      type: ACTION_TYPES.MESSAGE_GENERATED,
      title: `Messages ${channel} générés pour "${campaignName}"`,
      description: `M.A.X. a généré ${result.suggestions.length} variantes de ${channel} pour la campagne "${campaignName}"`,
      metadata: {
        campaignName,
        channel,
        variantsCount: result.suggestions.length,
        tokensUsed: result.usage.inputTokens + result.usage.outputTokens
      },
      priority: PRIORITY_LEVELS.MEDIUM,
      success: true
    });

    res.json(result);
  } catch (e) {
    console.error('Erreur génération suggestions:', e);

    await logAction({
      type: ACTION_TYPES.MESSAGE_GENERATED,
      title: `Erreur génération messages`,
      description: `M.A.X. a échoué à générer des messages: ${e.message}`,
      metadata: {},
      priority: PRIORITY_LEVELS.HIGH,
      success: false,
      error: e.message
    });

    res.status(500).json({
      ok: false,
      error: e.message
    });
  }
});

/**
 * POST /api/max/crea/campaigns
 * Créer une campagne dans EspoCRM
 *
 * Body:
 * {
 *   name: string,
 *   objective: string,
 *   target: string,
 *   channel: 'email' | 'sms',
 *   selectedVariant: Object,
 *   metadata: Object
 * }
 */
router.post('/campaigns', async (req, res) => {
  try {
    const { name, objective, target, channel, selectedVariant, metadata } = req.body;

    // Validation
    if (!name || !objective || !channel || !selectedVariant) {
      return res.status(400).json({
        ok: false,
        error: 'name, objective, channel et selectedVariant sont requis'
      });
    }

    let result;

    // Créer dans EspoCRM selon le type
    if (channel === 'email') {
      result = await createEmailCampaign({
        name,
        objective,
        target: target || '',
        emailSubject: selectedVariant.subject,
        emailBody: selectedVariant.body,
        emailCta: selectedVariant.cta
      });
    } else if (channel === 'sms') {
      result = await createSmsCampaign({
        name,
        objective,
        target: target || '',
        smsMessage: selectedVariant.message
      });
    } else {
      return res.status(400).json({
        ok: false,
        error: 'Channel doit être "email" ou "sms"'
      });
    }

    // Logger l'action
    await logAction({
      type: ACTION_TYPES.CAMPAIGN_CREATED,
      title: `Campagne "${name}" créée dans EspoCRM`,
      description: `M.A.X. a créé la campagne ${channel} "${name}" dans EspoCRM. Vous pouvez maintenant l'éditer et l'envoyer.`,
      metadata: {
        campaignId: result.campaignId,
        campaignName: name,
        channel,
        editUrl: result.editUrl
      },
      priority: PRIORITY_LEVELS.HIGH,
      success: true
    });

    res.json({
      ok: true,
      ...result
    });
  } catch (e) {
    console.error('Erreur création campagne:', e);

    await logAction({
      type: ACTION_TYPES.CAMPAIGN_CREATED,
      title: `Erreur création campagne`,
      description: `M.A.X. a échoué à créer une campagne: ${e.message}`,
      metadata: {},
      priority: PRIORITY_LEVELS.HIGH,
      success: false,
      error: e.message
    });

    res.status(500).json({
      ok: false,
      error: e.message
    });
  }
});

/**
 * GET /api/max/crea/campaigns
 * Récupérer la liste des campagnes
 *
 * Query params:
 * - limit: nombre de résultats (default: 20)
 * - offset: offset pour pagination (default: 0)
 * - status: filtrer par statut
 */
router.get('/campaigns', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status;

    let campaigns = [];
    try {
      const data = await fs.readFile(CAMPAIGNS_FILE, 'utf8');
      campaigns = JSON.parse(data);
    } catch (e) {
      // Fichier n'existe pas encore
      campaigns = [];
    }

    // Filtrer par statut si demandé
    if (status) {
      campaigns = campaigns.filter(c => c.status === status);
    }

    // Pagination
    const total = campaigns.length;
    const paginatedCampaigns = campaigns.slice(offset, offset + limit);

    res.json({
      ok: true,
      total,
      offset,
      limit,
      campaigns: paginatedCampaigns
    });
  } catch (e) {
    console.error('Erreur récupération campagnes:', e);
    res.status(500).json({
      ok: false,
      error: e.message
    });
  }
});

export default router;
