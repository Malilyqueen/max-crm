/**
 * API Actions - Endpoint pour tester les actions manuellement
 *
 * POST /api/actions/run - Exécuter une action
 * GET /api/actions/logs - Récupérer les logs
 * GET /api/actions/stats - Statistiques des actions
 */

import express from 'express';
import { executeAction } from '../actions/index.js';
import { getActionLogs, getActionStats } from '../actions/actionLogger.js';

const router = express.Router();

/**
 * POST /api/actions/run
 * Exécute une action manuellement
 *
 * Body:
 * {
 *   "actionType": "write_crm_note" | "send_email" | "create_calendar_event" | etc.,
 *   "params": { ... }
 * }
 */
router.post('/run', async (req, res) => {
  const { actionType, params } = req.body;

  if (!actionType) {
    return res.status(400).json({
      success: false,
      error: 'actionType est obligatoire'
    });
  }

  console.log(`\n📡 API /actions/run - ${actionType}`);

  try {
    const result = await executeAction(actionType, params || {});

    res.json({
      success: result.success,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erreur API /actions/run:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/actions/logs
 * Récupère les logs d'actions
 *
 * Query params:
 * - tenantId: string (optionnel)
 * - actionType: string (optionnel)
 * - success: boolean (optionnel)
 * - limit: number (optionnel, défaut 50)
 */
router.get('/logs', (req, res) => {
  const { tenantId, actionType, success, limit } = req.query;

  const filters = {
    tenantId,
    actionType,
    success: success !== undefined ? success === 'true' : undefined,
    limit: limit ? parseInt(limit) : 50
  };

  const logs = getActionLogs(filters);

  res.json({
    success: true,
    count: logs.length,
    logs
  });
});

/**
 * GET /api/actions/stats
 * Statistiques des actions
 *
 * Query params:
 * - tenantId: string (optionnel)
 */
router.get('/stats', (req, res) => {
  const { tenantId } = req.query;

  const stats = getActionStats(tenantId);

  res.json({
    success: true,
    stats
  });
});

/**
 * GET /api/actions/available
 * Liste des actions disponibles
 */
router.get('/available', (req, res) => {
  const actions = [
    {
      type: 'send_email',
      name: 'Envoyer un email',
      params: {
        to: 'string | array (obligatoire)',
        subject: 'string (obligatoire)',
        body: 'string (obligatoire)',
        from: 'string (optionnel)',
        cc: 'string | array (optionnel)',
        bcc: 'string | array (optionnel)',
        parentType: 'Lead | Account | Contact (optionnel)',
        parentId: 'string (optionnel)'
      },
      example: {
        actionType: 'send_email',
        params: {
          to: 'contact@example.com',
          subject: 'Confirmation RDV',
          body: 'Bonjour, votre RDV est confirmé...',
          parentType: 'Lead',
          parentId: 'lead123'
        }
      }
    },
    {
      type: 'create_email_draft',
      name: 'Créer un brouillon d\'email',
      params: {
        to: 'string | array (obligatoire)',
        subject: 'string (obligatoire)',
        body: 'string (optionnel)',
        parentType: 'Lead | Account | Contact (optionnel)',
        parentId: 'string (optionnel)'
      },
      example: {
        actionType: 'create_email_draft',
        params: {
          to: 'contact@example.com',
          subject: 'Proposition commerciale',
          body: 'Bonjour...'
        }
      }
    },
    {
      type: 'create_calendar_event',
      name: 'Créer un événement calendrier',
      params: {
        type: 'meeting | call (défaut: meeting)',
        subject: 'string (obligatoire)',
        dateStart: 'ISO string (obligatoire)',
        dateEnd: 'ISO string (optionnel)',
        duration: 'number en minutes (optionnel, défaut 60)',
        parentType: 'Lead | Account | Contact (optionnel)',
        parentId: 'string (optionnel)',
        assignedUserId: 'string (optionnel)'
      },
      example: {
        actionType: 'create_calendar_event',
        params: {
          type: 'meeting',
          subject: 'RDV Client Macrea',
          dateStart: '2025-12-20T14:00:00.000Z',
          duration: 60,
          parentType: 'Lead',
          parentId: 'lead123'
        }
      }
    },
    {
      type: 'write_crm_note',
      name: 'Créer une note CRM',
      params: {
        parentType: 'Lead | Account | Contact | Opportunity (obligatoire)',
        parentId: 'string (obligatoire)',
        subject: 'string (obligatoire)',
        body: 'string (obligatoire)'
      },
      example: {
        actionType: 'write_crm_note',
        params: {
          parentType: 'Lead',
          parentId: 'lead123',
          subject: 'Appel téléphonique',
          body: 'Le client a confirmé son intérêt pour le produit X'
        }
      }
    },
    {
      type: 'update_crm_field',
      name: 'Mettre à jour un champ CRM',
      params: {
        entityType: 'Lead | Account | Contact | Meeting | Call (obligatoire)',
        entityId: 'string (obligatoire)',
        field: 'string (obligatoire)',
        value: 'any (obligatoire)'
      },
      example: {
        actionType: 'update_crm_field',
        params: {
          entityType: 'Lead',
          entityId: 'lead123',
          field: 'status',
          value: 'Qualified'
        }
      }
    },
    {
      type: 'create_opportunity',
      name: 'Créer une opportunité',
      params: {
        name: 'string (obligatoire)',
        amount: 'number (obligatoire)',
        closeDate: 'YYYY-MM-DD (obligatoire)',
        stage: 'string (optionnel, défaut: Prospecting)',
        accountId: 'string (optionnel)',
        contactId: 'string (optionnel)',
        probability: 'number (optionnel)',
        description: 'string (optionnel)'
      },
      example: {
        actionType: 'create_opportunity',
        params: {
          name: 'Vente CRM Entreprise X',
          amount: 15000,
          closeDate: '2025-03-31',
          stage: 'Proposal',
          accountId: 'account123',
          probability: 70
        }
      }
    },
    {
      type: 'create_contact',
      name: 'Créer un contact',
      params: {
        firstName: 'string (obligatoire)',
        lastName: 'string (obligatoire)',
        emailAddress: 'string (optionnel)',
        phoneNumber: 'string (optionnel)',
        accountId: 'string (optionnel)',
        title: 'string (optionnel)',
        description: 'string (optionnel)'
      },
      example: {
        actionType: 'create_contact',
        params: {
          firstName: 'Marie',
          lastName: 'Dubois',
          emailAddress: 'marie.dubois@example.com',
          phoneNumber: '+33612345678',
          accountId: 'account123',
          title: 'Directrice Commerciale'
        }
      }
    },
    {
      type: 'create_ticket',
      name: 'Créer un ticket support',
      params: {
        name: 'string (obligatoire)',
        description: 'string (obligatoire)',
        status: 'New | Assigned | Pending | Closed (optionnel, défaut: New)',
        priority: 'Low | Normal | High | Urgent (optionnel, défaut: Normal)',
        type: 'string (optionnel)',
        accountId: 'string (optionnel)',
        contactId: 'string (optionnel)',
        leadId: 'string (optionnel)'
      },
      example: {
        actionType: 'create_ticket',
        params: {
          name: 'Problème connexion CRM',
          description: 'Le client ne peut pas se connecter à son compte CRM',
          priority: 'High',
          status: 'New',
          contactId: 'contact123'
        }
      }
    },
    {
      type: 'create_knowledge_article',
      name: 'Créer un article base de connaissance',
      params: {
        name: 'string (obligatoire)',
        body: 'string HTML (obligatoire)',
        status: 'Draft | In Review | Published | Archived (optionnel, défaut: Draft)',
        language: 'string (optionnel, défaut: fr_FR)',
        categoryId: 'string (optionnel)'
      },
      example: {
        actionType: 'create_knowledge_article',
        params: {
          name: 'Comment réinitialiser son mot de passe',
          body: '<h2>Procédure de réinitialisation</h2><ol><li>Cliquer sur "Mot de passe oublié"</li><li>Saisir votre email</li><li>Suivre le lien reçu par email</li></ol>',
          status: 'Published',
          language: 'fr_FR'
        }
      }
    }
  ];

  res.json({
    success: true,
    actions,
    usage: 'POST /api/actions/run avec { actionType, params }'
  });
});

export default router;