/**
 * routes/automationMvp1.js
 * Routes automation/workflows pour MVP1 - Données mockées
 */

import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Appliquer authMiddleware à toutes les routes
router.use(authMiddleware);

// Mock workflows data
const mockWorkflows = [
  {
    id: '1',
    name: 'Confirmation RDV WhatsApp automatique',
    description: 'Envoie une confirmation WhatsApp instantanée après la prise de rendez-vous',
    status: 'active',
    trigger: {
      type: 'lead_created',
      label: 'Nouveau lead créé',
      config: {}
    },
    actions: [
      {
        id: 'a1',
        type: 'wait',
        label: 'Attendre 2 minutes',
        description: 'Délai pour permettre la validation du RDV',
        config: { duration: 2, unit: 'minutes' },
        order: 1
      },
      {
        id: 'a2',
        type: 'send_email',
        label: 'Envoyer WhatsApp de confirmation',
        description: 'Template WhatsApp: Confirmation RDV - TEXT only',
        config: {
          template: 'msg_d2813bb1ec2be305',
          channel: 'whatsapp',
          contentSid: 'Hxb52bb079e24d459e6b3962a49213096e'
        },
        order: 2
      },
      {
        id: 'a3',
        type: 'add_tag',
        label: 'Ajouter tag "rdv_confirmé"',
        description: 'Marquer le lead comme ayant reçu la confirmation',
        config: { tags: ['rdv_confirmé'] },
        order: 3
      }
    ],
    stats: {
      totalExecutions: 247,
      successRate: 99.2,
      lastExecuted: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      averageDuration: 180
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    createdBy: 'Admin MaCréa'
  },
  {
    id: '2',
    name: 'Rappel RDV WhatsApp J-1',
    description: 'Rappel automatique par WhatsApp 24h avant le rendez-vous',
    status: 'active',
    trigger: {
      type: 'time_based',
      label: 'Tous les jours à 9h00',
      config: { schedule: '0 9 * * *', timezone: 'Europe/Paris' }
    },
    actions: [
      {
        id: 'b1',
        type: 'send_email',
        label: 'Envoyer WhatsApp de rappel',
        description: 'Template WhatsApp: Rappel RDV',
        config: {
          template: 'msg_4bd47f36d5a81cef',
          channel: 'whatsapp',
          contentSid: 'HX43ff9d92de715f0d410727f0287d47b7'
        },
        order: 1
      },
      {
        id: 'b2',
        type: 'create_task',
        label: 'Créer tâche de suivi',
        description: 'Préparer le dossier pour le RDV',
        config: {
          title: 'Préparer dossier client pour RDV demain',
          dueIn: 1,
          dueUnit: 'hours'
        },
        order: 2
      },
      {
        id: 'b3',
        type: 'add_tag',
        label: 'Ajouter tag "rappel_envoyé"',
        description: 'Marquer que le rappel a été envoyé',
        config: { tags: ['rappel_envoyé'] },
        order: 3
      }
    ],
    stats: {
      totalExecutions: 183,
      successRate: 97.8,
      lastExecuted: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
      averageDuration: 240
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    createdBy: 'Admin MaCréa'
  },
  {
    id: '3',
    name: 'Relance WhatsApp J+1 sans réponse',
    description: 'Relance automatique par WhatsApp si aucune réponse après 24h',
    status: 'active',
    trigger: {
      type: 'time_based',
      label: 'Vérification toutes les heures',
      config: { schedule: '0 * * * *', timezone: 'Europe/Paris' }
    },
    actions: [
      {
        id: 'c1',
        type: 'send_email',
        label: 'Envoyer WhatsApp Relance J+1',
        description: 'Template WhatsApp: Relance J+1',
        config: {
          template: 'msg_c5b9c04d3d99ffd7',
          channel: 'whatsapp',
          contentSid: 'HX8edc734256e6b70b5d73bc61a7921505'
        },
        order: 1
      },
      {
        id: 'c2',
        type: 'update_field',
        label: 'Marquer comme "relancé"',
        description: 'Changer statut en "Relancé J+1"',
        config: { field: 'status', value: 'relanced_d1' },
        order: 2
      },
      {
        id: 'c3',
        type: 'add_tag',
        label: 'Ajouter tag "relance_j1"',
        description: 'Identifier les leads relancés après 24h',
        config: { tags: ['relance_j1'] },
        order: 3
      }
    ],
    stats: {
      totalExecutions: 156,
      successRate: 95.5,
      lastExecuted: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      averageDuration: 200
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 35).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    createdBy: 'Admin MaCréa'
  },
  {
    id: '4',
    name: 'Relance WhatsApp J+3 insistante',
    description: 'Dernière relance WhatsApp si toujours aucune réponse après 3 jours',
    status: 'active',
    trigger: {
      type: 'time_based',
      label: 'Vérification quotidienne à 14h',
      config: { schedule: '0 14 * * *', timezone: 'Europe/Paris' }
    },
    actions: [
      {
        id: 'd1',
        type: 'send_email',
        label: 'Envoyer WhatsApp Relance J+3',
        description: 'Template WhatsApp: Relance J+3',
        config: {
          template: 'msg_5d2653309b7207a9',
          channel: 'whatsapp',
          contentSid: 'HX70f182f65f2ebd94b9cd80679bf039e1'
        },
        order: 1
      },
      {
        id: 'd2',
        type: 'create_task',
        label: 'Créer tâche appel manuel',
        description: 'Si pas de réponse après J+3, prévoir appel téléphonique',
        config: {
          title: 'Appeler le lead - Dernière tentative',
          dueIn: 2,
          dueUnit: 'hours'
        },
        order: 2
      },
      {
        id: 'd3',
        type: 'add_tag',
        label: 'Ajouter tag "relance_j3"',
        description: 'Marquer comme relancé J+3',
        config: { tags: ['relance_j3'] },
        order: 3
      }
    ],
    stats: {
      totalExecutions: 89,
      successRate: 92.1,
      lastExecuted: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
      averageDuration: 220
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    createdBy: 'Admin MaCréa'
  },
  {
    id: '5',
    name: 'Panier abandonné WhatsApp',
    description: 'Relance WhatsApp automatique pour les paniers abandonnés sur le site',
    status: 'active',
    trigger: {
      type: 'lead_status_changed',
      label: 'Statut → Panier abandonné',
      config: { fromStatus: 'En cours', toStatus: 'Panier abandonné' }
    },
    actions: [
      {
        id: 'e1',
        type: 'send_email',
        label: 'Envoyer WhatsApp panier abandonné',
        description: 'Template WhatsApp: Panier abandonné - simple',
        config: {
          template: 'msg_ade34fbb749a144c',
          channel: 'whatsapp',
          contentSid: 'HX61f249a45e5bbb10e7c26efce55c6446'
        },
        order: 1
      },
      {
        id: 'e2',
        type: 'create_task',
        label: 'Créer tâche de suivi commercial',
        description: 'Prévoir un suivi personnalisé pour ce prospect',
        config: {
          title: 'Appeler pour comprendre le blocage panier',
          dueIn: 1,
          dueUnit: 'days'
        },
        order: 2
      },
      {
        id: 'e3',
        type: 'add_tag',
        label: 'Ajouter tag "panier_abandonné"',
        description: 'Identifier pour analyse des abandons',
        config: { tags: ['panier_abandonné'] },
        order: 3
      }
    ],
    stats: {
      totalExecutions: 78,
      successRate: 88.5,
      lastExecuted: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      averageDuration: 190
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    createdBy: 'Admin MaCréa'
  },
  {
    id: '6',
    name: 'Inscription événement WhatsApp',
    description: 'Confirmation automatique par WhatsApp après inscription à un événement',
    status: 'inactive',
    trigger: {
      type: 'lead_status_changed',
      label: 'Statut → Inscrit événement',
      config: { toStatus: 'event_registered' }
    },
    actions: [
      {
        id: 'f1',
        type: 'send_email',
        label: 'Envoyer WhatsApp confirmation inscription',
        description: 'Template WhatsApp: Inscription événement',
        config: {
          template: 'msg_caab3cc83cf72d39',
          channel: 'whatsapp',
          contentSid: 'HXf257b92197254aaae707f913a137a76e'
        },
        order: 1
      },
      {
        id: 'f2',
        type: 'add_tag',
        label: 'Ajouter tag "événement_2025"',
        description: 'Identifier les participants événement',
        config: { tags: ['événement_2025'] },
        order: 2
      },
      {
        id: 'f3',
        type: 'create_task',
        label: 'Préparer matériel événement',
        description: 'Tâche pour l\'équipe logistique',
        config: {
          title: 'Préparer badge et documentation participant',
          dueIn: 2,
          dueUnit: 'days'
        },
        order: 3
      }
    ],
    stats: {
      totalExecutions: 0,
      successRate: 0,
      lastExecuted: undefined,
      averageDuration: 0
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
    createdBy: 'Admin MaCréa'
  }
];

/**
 * GET /api/automation-mvp1/workflows
 * Retourne la liste des workflows (avec filtres optionnels)
 */
router.get('/workflows', async (req, res) => {
  try {
    const userId = req.user?.id || 'unknown';
    console.log(`[Automation MVP1] Récupération workflows pour user: ${userId}`);

    const { status, triggerType, search } = req.query;

    let filteredWorkflows = [...mockWorkflows];

    // Filter by status
    if (status) {
      const statusList = status.split(',');
      filteredWorkflows = filteredWorkflows.filter(w => statusList.includes(w.status));
    }

    // Filter by trigger type
    if (triggerType) {
      const triggerList = triggerType.split(',');
      filteredWorkflows = filteredWorkflows.filter(w => triggerList.includes(w.trigger.type));
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      filteredWorkflows = filteredWorkflows.filter(w =>
        w.name.toLowerCase().includes(searchLower) ||
        w.description.toLowerCase().includes(searchLower)
      );
    }

    res.json({
      workflows: filteredWorkflows,
      total: filteredWorkflows.length
    });

  } catch (error) {
    console.error('[Automation MVP1] Erreur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des workflows'
    });
  }
});

/**
 * GET /api/automation-mvp1/workflows/:id
 * Retourne le détail d'un workflow
 */
router.get('/workflows/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 'unknown';
    console.log(`[Automation MVP1] Récupération workflow ${id} pour user: ${userId}`);

    const workflow = mockWorkflows.find(w => w.id === id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow non trouvé'
      });
    }

    res.json(workflow);

  } catch (error) {
    console.error('[Automation MVP1] Erreur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du workflow'
    });
  }
});

/**
 * POST /api/automation-mvp1/workflows/:id/toggle
 * Active/désactive un workflow (MVP1: mock, juste change le statut)
 */
router.post('/workflows/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 'unknown';
    console.log(`[Automation MVP1] Toggle workflow ${id} pour user: ${userId}`);

    const workflow = mockWorkflows.find(w => w.id === id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow non trouvé'
      });
    }

    // Toggle status (sauf si draft)
    if (workflow.status === 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Impossible d\'activer un workflow en mode brouillon'
      });
    }

    workflow.status = workflow.status === 'active' ? 'inactive' : 'active';
    workflow.updatedAt = new Date().toISOString();

    res.json({
      success: true,
      status: workflow.status
    });

  } catch (error) {
    console.error('[Automation MVP1] Erreur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la modification du workflow'
    });
  }
});

export default router;
