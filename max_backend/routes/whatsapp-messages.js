/**
 * Routes API pour les messages WhatsApp (Phase 1 MVP)
 *
 * Endpoints CRUD pour gérer les messages WhatsApp configurables.
 * L'utilisateur peut créer, lister, modifier et envoyer des messages.
 *
 * Routes disponibles:
 * - POST   /api/whatsapp/messages              Créer un nouveau message
 * - GET    /api/whatsapp/messages              Lister les messages du tenant
 * - GET    /api/whatsapp/messages/:id          Récupérer un message
 * - PUT    /api/whatsapp/messages/:id          Modifier un message
 * - DELETE /api/whatsapp/messages/:id          Supprimer un message
 * - POST   /api/whatsapp/messages/:id/send     Envoyer un message
 * - GET    /api/whatsapp/presets               Lister les messages pré-configurés
 * - POST   /api/whatsapp/presets/:id/use       Créer un message depuis un preset
 */

import express from 'express';
import WhatsAppMessage from '../models/WhatsAppMessage.js';
import { WHATSAPP_MESSAGE_PRESETS, getPresetByName, getPresetsByType } from '../config/whatsapp-message-presets.js';
import { listAvailableActions } from '../config/whatsapp-actions.js';
import { sendWhatsAppMessage } from '../services/whatsappSendService.js';
import { logActivity } from '../lib/activityLogger.js';

const router = express.Router();

/**
 * POST /api/whatsapp/messages
 * Crée un nouveau message WhatsApp
 *
 * Body:
 * {
 *   "tenantId": "macrea",
 *   "name": "Confirmation RDV Salon",
 *   "type": "appointment",
 *   "messageText": "Bonjour {{prenom}}, RDV le {{date}} à {{heure}}",
 *   "variables": ["prenom", "date", "heure"],
 *   "buttons": [
 *     { "action": "confirm", "label": "Confirmer" },
 *     { "action": "cancel", "label": "Annuler" }
 *   ],
 *   "contentSid": "HXabc123..." (optionnel)
 * }
 */
router.post('/messages', async (req, res) => {
  try {
    console.log('\n📝 POST /api/whatsapp/messages');

    const { tenantId, name, type, messageText, variables, buttons, contentSid, metadata } = req.body;

    // Valider les champs obligatoires
    if (!tenantId || !name || !type || !messageText) {
      return res.status(400).json({
        error: 'Champs obligatoires manquants: tenantId, name, type, messageText'
      });
    }

    // Créer le message
    const message = WhatsAppMessage.create({
      tenantId,
      name,
      type,
      messageText,
      variables: variables || [],
      buttons: buttons || [],
      contentSid: contentSid || null,
      status: 'draft',
      metadata: metadata || {}
    });

    console.log(`   ✅ Message créé: ${message.id} (${message.name})`);

    res.status(201).json({
      success: true,
      message: message.toJSON()
    });

  } catch (error) {
    console.error('   ❌ Erreur:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/whatsapp/messages
 * Liste les messages du tenant
 *
 * Query params:
 * - tenantId (obligatoire): ID du tenant
 * - type (optionnel): Filtrer par type (appointment, cart, event, follow_up)
 * - status (optionnel): Filtrer par statut (draft, active, archived)
 */
router.get('/messages', async (req, res) => {
  try {
    console.log('\n📋 GET /api/whatsapp/messages');

    const { tenantId, type, status } = req.query;

    if (!tenantId) {
      return res.status(400).json({
        error: 'Query param obligatoire: tenantId'
      });
    }

    const filters = {};
    if (type) filters.type = type;
    if (status) filters.status = status;

    const messages = WhatsAppMessage.findByTenant(tenantId, filters);

    console.log(`   ✅ ${messages.length} message(s) trouvé(s) pour ${tenantId}`);

    res.json({
      success: true,
      count: messages.length,
      messages: messages.map(msg => msg.toJSON())
    });

  } catch (error) {
    console.error('   ❌ Erreur:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/whatsapp/messages/:id
 * Récupère un message par son ID
 */
router.get('/messages/:id', async (req, res) => {
  try {
    console.log(`\n🔍 GET /api/whatsapp/messages/${req.params.id}`);

    const message = WhatsAppMessage.findById(req.params.id);

    if (!message) {
      console.log(`   ⚠️  Message ${req.params.id} introuvable`);
      return res.status(404).json({
        success: false,
        error: 'Message introuvable'
      });
    }

    console.log(`   ✅ Message trouvé: ${message.name}`);

    res.json({
      success: true,
      message: message.toJSON()
    });

  } catch (error) {
    console.error('   ❌ Erreur:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/whatsapp/messages/:id
 * Modifie un message existant
 *
 * Body: Champs à modifier (name, messageText, variables, buttons, contentSid, status, etc.)
 */
router.put('/messages/:id', async (req, res) => {
  try {
    console.log(`\n✏️  PUT /api/whatsapp/messages/${req.params.id}`);

    const message = WhatsAppMessage.findById(req.params.id);

    if (!message) {
      console.log(`   ⚠️  Message ${req.params.id} introuvable`);
      return res.status(404).json({
        success: false,
        error: 'Message introuvable'
      });
    }

    // Mettre à jour les champs fournis
    const updatedMessage = WhatsAppMessage.update(req.params.id, req.body);

    console.log(`   ✅ Message mis à jour: ${updatedMessage.name}`);

    res.json({
      success: true,
      message: updatedMessage.toJSON()
    });

  } catch (error) {
    console.error('   ❌ Erreur:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/whatsapp/messages/:id
 * Supprime un message
 */
router.delete('/messages/:id', async (req, res) => {
  try {
    console.log(`\n🗑️  DELETE /api/whatsapp/messages/${req.params.id}`);

    const message = WhatsAppMessage.findById(req.params.id);

    if (!message) {
      console.log(`   ⚠️  Message ${req.params.id} introuvable`);
      return res.status(404).json({
        success: false,
        error: 'Message introuvable'
      });
    }

    WhatsAppMessage.deleteById(req.params.id);

    console.log(`   ✅ Message supprimé: ${message.name}`);

    res.json({
      success: true,
      message: 'Message supprimé avec succès'
    });

  } catch (error) {
    console.error('   ❌ Erreur:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/whatsapp/messages/:id/send
 * Envoie un message WhatsApp à un lead
 *
 * Body:
 * {
 *   "toPhoneNumber": "+33648662734",
 *   "leadId": "lead-abc123",
 *   "variables": {
 *     "prenom": "Jean",
 *     "date": "15/12/2025",
 *     "heure": "14h30"
 *   }
 * }
 */
router.post('/messages/:id/send', async (req, res) => {
  try {
    console.log(`\n📤 POST /api/whatsapp/messages/${req.params.id}/send`);

    const { toPhoneNumber, leadId, variables } = req.body;

    if (!toPhoneNumber || !leadId) {
      return res.status(400).json({
        error: 'Champs obligatoires manquants: toPhoneNumber, leadId'
      });
    }

    // Vérifier que le message existe
    const message = WhatsAppMessage.findById(req.params.id);
    if (!message) {
      console.log(`   ⚠️  Message ${req.params.id} introuvable`);
      return res.status(404).json({
        success: false,
        error: 'Message introuvable'
      });
    }

    console.log(`   Message: ${message.name}`);
    console.log(`   Destinataire: ${toPhoneNumber}`);
    console.log(`   Lead: ${leadId}`);

    // Envoyer le message via le service
    const result = await sendWhatsAppMessage(
      req.params.id,
      toPhoneNumber,
      leadId,
      variables || {}
    );

    if (result.success) {
      console.log(`   ✅ Message envoyé (SID: ${result.messageSid})`);

      // Logger l'activité sortante (best effort - ne bloque jamais l'envoi)
      try {
        const finalMessageText = result.finalMessageText || message.messageText || '';
        await logActivity({
          leadId,
          channel: 'whatsapp',
          direction: 'out',
          status: 'sent',
          messageSnippet: finalMessageText.substring(0, 100),
          meta: {
            messageId: req.params.id,
            messageName: message.name,
            twilioSid: result.messageSid
          },
          tenantId: message.tenantId
        });
        console.log(`   📝 Activité loggée pour lead ${leadId}`);
      } catch (logError) {
        console.warn(`   ⚠️  Erreur log activité (non bloquant):`, logError.message);
      }

      res.json({
        success: true,
        messageSid: result.messageSid,
        status: result.status,
        to: result.to
      });
    } else {
      console.log(`   ❌ Échec de l'envoi: ${result.error}`);
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('   ❌ Erreur:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/whatsapp/messages/:id/activate
 * Active un message (passe le statut de draft à active)
 */
router.post('/messages/:id/activate', async (req, res) => {
  try {
    console.log(`\n✅ POST /api/whatsapp/messages/${req.params.id}/activate`);

    const message = WhatsAppMessage.findById(req.params.id);

    if (!message) {
      console.log(`   ⚠️  Message ${req.params.id} introuvable`);
      return res.status(404).json({
        success: false,
        error: 'Message introuvable'
      });
    }

    const updatedMessage = WhatsAppMessage.activate(req.params.id);

    console.log(`   ✅ Message activé: ${updatedMessage.name}`);

    res.json({
      success: true,
      message: updatedMessage.toJSON()
    });

  } catch (error) {
    console.error('   ❌ Erreur:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/whatsapp/messages/:id/archive
 * Archive un message (passe le statut à archived)
 */
router.post('/messages/:id/archive', async (req, res) => {
  try {
    console.log(`\n📦 POST /api/whatsapp/messages/${req.params.id}/archive`);

    const message = WhatsAppMessage.findById(req.params.id);

    if (!message) {
      console.log(`   ⚠️  Message ${req.params.id} introuvable`);
      return res.status(404).json({
        success: false,
        error: 'Message introuvable'
      });
    }

    const updatedMessage = WhatsAppMessage.archive(req.params.id);

    console.log(`   ✅ Message archivé: ${updatedMessage.name}`);

    res.json({
      success: true,
      message: updatedMessage.toJSON()
    });

  } catch (error) {
    console.error('   ❌ Erreur:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// PRESETS - Messages pré-configurés
// ============================================================================

/**
 * GET /api/whatsapp/presets
 * Liste tous les presets disponibles
 *
 * Query params:
 * - type (optionnel): Filtrer par type (appointment, cart, event, follow_up)
 * - category (optionnel): Filtrer par catégorie
 */
router.get('/presets', async (req, res) => {
  try {
    console.log('\n📚 GET /api/whatsapp/presets');

    const { type, category } = req.query;

    let presets = WHATSAPP_MESSAGE_PRESETS;

    // Filtrer par type si demandé
    if (type) {
      presets = getPresetsByType(type);
    }

    console.log(`   ✅ ${presets.length} preset(s) trouvé(s)`);

    res.json({
      success: true,
      count: presets.length,
      presets
    });

  } catch (error) {
    console.error('   ❌ Erreur:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/whatsapp/presets/:id
 * Récupère un preset par son ID
 */
router.get('/presets/:id', async (req, res) => {
  try {
    console.log(`\n🔍 GET /api/whatsapp/presets/${req.params.id}`);

    const preset = WHATSAPP_MESSAGE_PRESETS.find(p => p.id === req.params.id);

    if (!preset) {
      return res.status(404).json({
        success: false,
        error: `Preset ${req.params.id} introuvable`
      });
    }

    console.log(`   ✅ Preset trouvé: ${preset.name}`);

    res.json({
      success: true,
      preset: {
        id: req.params.id,
        ...preset
      }
    });

  } catch (error) {
    console.error('   ❌ Erreur:', error.message);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/whatsapp/presets/:id/use
 * Crée un nouveau message à partir d'un preset
 *
 * Body:
 * {
 *   "tenantId": "macrea",
 *   "name": "Mon message personnalisé" (optionnel),
 *   "messageText": "Texte modifié..." (optionnel),
 *   "buttons": [...] (optionnel)
 * }
 */
router.post('/presets/:id/use', async (req, res) => {
  try {
    console.log(`\n🎯 POST /api/whatsapp/presets/${req.params.id}/use`);

    const { tenantId, ...customizations } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        error: 'Champ obligatoire manquant: tenantId'
      });
    }

    // Trouver le preset
    const preset = WHATSAPP_MESSAGE_PRESETS.find(p => p.id === req.params.id);

    if (!preset) {
      return res.status(404).json({
        success: false,
        error: `Preset ${req.params.id} introuvable`
      });
    }

    // Créer le message depuis le preset avec customizations
    const messageData = {
      tenantId,
      name: customizations.name || preset.name,
      type: preset.type,
      messageText: customizations.messageText || preset.messageText,
      variables: preset.variables,
      buttons: customizations.buttons || preset.buttons || [],
      contentSid: preset.contentSid,
      status: 'draft',
      metadata: {
        ...preset.metadata,
        templateName: preset.templateName,
        mode: preset.mode,
        preset: true,
        presetId: preset.id
      }
    };

    const message = WhatsAppMessage.create(messageData);

    console.log(`   ✅ Message créé depuis preset: ${message.id} (${message.name})`);

    res.status(201).json({
      success: true,
      message: message.toJSON()
    });

  } catch (error) {
    console.error('   ❌ Erreur:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// ACTIONS - Liste des actions disponibles
// ============================================================================

/**
 * GET /api/whatsapp/actions
 * Liste toutes les actions disponibles (pour introspection)
 */
router.get('/actions', async (req, res) => {
  try {
    console.log('\n⚡ GET /api/whatsapp/actions');

    const actions = listAvailableActions();

    console.log(`   ✅ ${actions.length} action(s) disponible(s)`);

    res.json({
      success: true,
      count: actions.length,
      actions
    });

  } catch (error) {
    console.error('   ❌ Erreur:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
