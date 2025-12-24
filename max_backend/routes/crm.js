/**
 * routes/crm.js
 * Routes CRM pour Phase 2A - Connexion réelle à EspoCRM
 */

import express from 'express';
import { espoFetch, safeUpdateLead } from '../lib/espoClient.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { logMaxAction } from '../lib/maxLogger.js';

const router = express.Router();

// Note: DEFAULT_TENANT_ID n'est plus utilisé - on utilise req.user?.tenantId || 'macrea' partout
// (Conservé temporairement pour compatibilité si besoin, mais non utilisé)

// ⚠️ TEMPORAIRE : Désactiver authMiddleware pour permettre accès depuis frontend
// TODO Phase 3: Réactiver authMiddleware une fois JWT implémenté côté frontend
// router.use(authMiddleware);

/**
 * Mapper un lead EspoCRM vers le format frontend attendu
 */
function mapEspoLeadToFrontend(espoLead) {
  return {
    id: espoLead.id,
    firstName: espoLead.firstName || '',
    lastName: espoLead.lastName || '',
    email: espoLead.emailAddress || espoLead.email || '',
    phone: espoLead.phoneNumber || espoLead.phone || '',
    company: espoLead.accountName || espoLead.company || '',
    status: espoLead.status || 'Nouveau',
    source: espoLead.source || '',
    assignedTo: espoLead.assignedUserName || '',
    createdAt: espoLead.createdAt || new Date().toISOString(),
    updatedAt: espoLead.modifiedAt || espoLead.createdAt || new Date().toISOString(),
    notes: espoLead.description || '',
    tags: espoLead.tags || [],
    score: espoLead.score || 0
  };
}

/**
 * GET /api/crm/leads
 * Liste des leads avec filtres et pagination - VRAI EspoCRM
 */
router.get('/leads', async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      status,
      search,
      assignedTo,
      source,
      minScore,
      maxScore
    } = req.query;

    // Construire les filtres EspoCRM
    const where = [];

    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      where.push({
        type: 'in',
        attribute: 'status',
        value: statuses
      });
    }

    if (search) {
      where.push({
        type: 'or',
        value: [
          {
            type: 'contains',
            attribute: 'firstName',
            value: search
          },
          {
            type: 'contains',
            attribute: 'lastName',
            value: search
          },
          {
            type: 'contains',
            attribute: 'emailAddress',
            value: search
          },
          {
            type: 'contains',
            attribute: 'accountName',
            value: search
          }
        ]
      });
    }

    if (minScore) {
      where.push({
        type: 'greaterThanOrEquals',
        attribute: 'score',
        value: parseInt(minScore)
      });
    }

    if (maxScore) {
      where.push({
        type: 'lessThanOrEquals',
        attribute: 'score',
        value: parseInt(maxScore)
      });
    }

    // Paramètres de requête EspoCRM
    const offset = (page - 1) * pageSize;
    const params = new URLSearchParams({
      maxSize: pageSize,
      offset: offset,
      orderBy: 'createdAt',
      order: 'desc'
    });

    // Ajouter le filtre where si nécessaire
    if (where.length > 0) {
      params.append('where', JSON.stringify(where));
    }

    // Appel à EspoCRM
    const data = await espoFetch(`/Lead?${params.toString()}`);

    // Mapper les leads
    const leads = (data.list || []).map(mapEspoLeadToFrontend);
    const total = data.total || 0;

    res.json({
      leads,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });

  } catch (error) {
    console.error('[CRM] Erreur liste leads EspoCRM:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des leads depuis EspoCRM',
      details: error.message
    });
  }
});

/**
 * GET /api/crm/leads/:id
 * Détail d'un lead avec notes et activités - VRAI EspoCRM
 */
router.get('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer le lead depuis EspoCRM
    const espoLead = await espoFetch(`/Lead/${id}`);

    if (!espoLead) {
      return res.status(404).json({
        success: false,
        error: 'Lead non trouvé dans EspoCRM'
      });
    }

    // Récupérer les notes (Stream) du lead
    let notes = [];
    try {
      const notesData = await espoFetch(`/Lead/${id}/stream`);
      notes = (notesData.list || [])
        .filter(item => item.type === 'Post' || item.type === 'Create')
        .map(item => ({
          id: item.id,
          leadId: id,
          content: item.data?.message || item.post || 'Note sans contenu',
          createdBy: item.createdByName || 'Système',
          createdAt: item.createdAt
        }));
    } catch (error) {
      console.warn('[CRM] Impossible de récupérer les notes:', error.message);
    }

    // Récupérer les activités (historique) du lead
    let activities = [];
    try {
      const activitiesData = await espoFetch(`/Lead/${id}/stream`);
      activities = (activitiesData.list || []).map(item => ({
        id: item.id,
        leadId: id,
        type: item.type?.toLowerCase() || 'unknown',
        description: item.data?.message || `${item.type} - ${item.createdByName || 'Système'}`,
        createdBy: item.createdByName || 'Système',
        createdAt: item.createdAt
      }));
    } catch (error) {
      console.warn('[CRM] Impossible de récupérer les activités:', error.message);
    }

    const lead = mapEspoLeadToFrontend(espoLead);

    // Logger la consultation dans Supabase (non-bloquant)
    logMaxAction({
      action_type: 'lead_viewed',
      action_category: 'crm',
      tenant_id: req.user?.tenantId || 'macrea',
      user_id: req.user?.id,
      entity_type: 'Lead',
      entity_id: id,
      description: `Consultation du lead ${lead.firstName} ${lead.lastName}`,
      input_data: { lead_id: id },
      output_data: {
        notes_count: notes.length,
        activities_count: activities.length,
        lead_status: lead.status
      },
      success: true,
      metadata: { source: 'crm_ui', route: 'GET /api/crm/leads/:id' }
    }).catch(err => console.warn('[CRM] Logging Supabase échoué:', err.message));

    res.json({
      lead,
      notes,
      activities
    });

  } catch (error) {
    console.error('[CRM] Erreur détail lead EspoCRM:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du lead depuis EspoCRM',
      details: error.message
    });
  }
});

/**
 * PATCH /api/crm/leads/:id/status
 * Changer le statut d'un lead - VRAI EspoCRM
 */
router.patch('/leads/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log('[CRM] PATCH /leads/:id/status - ID:', id, 'Status:', status);

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Le statut est requis'
      });
    }

    // Mettre à jour le statut dans EspoCRM
    console.log('[CRM] Appel safeUpdateLead avec:', { id, status });
    const updatedLead = await safeUpdateLead(id, { status });
    console.log('[CRM] Lead mis à jour:', updatedLead?.id);

    // Créer une note dans le stream pour tracer le changement
    try {
      await espoFetch('/Note', {
        method: 'POST',
        body: JSON.stringify({
          parentType: 'Lead',
          parentId: id,
          post: `Statut changé vers "${status}"`,
          type: 'Post'
        })
      });
    } catch (error) {
      console.warn('[CRM] Impossible de créer la note de traçabilité:', error.message);
    }

    const lead = mapEspoLeadToFrontend(updatedLead);

    // Logger l'action dans Supabase (non-bloquant)
    logMaxAction({
      action_type: 'lead_status_changed',
      action_category: 'crm',
      tenant_id: req.user?.tenantId || 'macrea',
      user_id: req.user?.id,
      entity_type: 'Lead',
      entity_id: id,
      description: `Statut changé vers "${status}"`,
      input_data: { new_status: status },
      output_data: { success: true },
      success: true,
      metadata: { source: 'crm_ui', route: 'PATCH /api/crm/leads/:id/status' }
    }).catch(err => console.warn('[CRM] Logging Supabase échoué:', err.message));

    res.json({
      lead,
      activity: {
        id: Date.now().toString(),
        leadId: id,
        type: 'status_change',
        description: `Statut changé vers "${status}"`,
        createdBy: req.user?.name || 'Utilisateur',
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[CRM] Erreur changement statut EspoCRM:', error);

    // Logger l'échec dans Supabase (non-bloquant)
    logMaxAction({
      action_type: 'lead_status_changed',
      action_category: 'crm',
      tenant_id: req.user?.tenantId || 'macrea',
      user_id: req.user?.id,
      entity_type: 'Lead',
      entity_id: id,
      description: `Échec changement statut vers "${status}"`,
      input_data: { new_status: status },
      success: false,
      error_message: error.message,
      metadata: { source: 'crm_ui', route: 'PATCH /api/crm/leads/:id/status' }
    }).catch(err => console.warn('[CRM] Logging Supabase échoué:', err.message));

    res.status(500).json({
      success: false,
      error: 'Erreur lors du changement de statut dans EspoCRM',
      details: error.message
    });
  }
});

/**
 * POST /api/crm/leads/:id/notes
 * Ajouter une note à un lead - VRAI EspoCRM
 */
router.post('/leads/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Le contenu de la note est requis'
      });
    }

    // Vérifier que le lead existe
    const lead = await espoFetch(`/Lead/${id}`);
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead non trouvé dans EspoCRM'
      });
    }

    // Créer la note dans EspoCRM (via Stream/Note)
    const noteData = await espoFetch('/Note', {
      method: 'POST',
      body: JSON.stringify({
        parentType: 'Lead',
        parentId: id,
        post: content.trim(),
        type: 'Post'
      })
    });

    const note = {
      id: noteData.id,
      leadId: id,
      content: content.trim(),
      createdBy: req.user?.name || 'Utilisateur',
      createdAt: noteData.createdAt || new Date().toISOString()
    };

    // Logger l'action dans Supabase (non-bloquant)
    logMaxAction({
      action_type: 'note_added',
      action_category: 'crm',
      tenant_id: req.user?.tenantId || 'macrea',
      user_id: req.user?.id,
      entity_type: 'Lead',
      entity_id: id,
      description: `Note ajoutée: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
      input_data: { note_content: content.trim() },
      output_data: { note_id: noteData.id, success: true },
      success: true,
      metadata: { source: 'crm_ui', route: 'POST /api/crm/leads/:id/notes' }
    }).catch(err => console.warn('[CRM] Logging Supabase échoué:', err.message));

    res.json({
      note,
      activity: {
        id: Date.now().toString(),
        leadId: id,
        type: 'note_added',
        description: `Note ajoutée: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
        createdBy: req.user?.name || 'Utilisateur',
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[CRM] Erreur ajout note EspoCRM:', error);

    // Logger l'échec dans Supabase (non-bloquant)
    logMaxAction({
      action_type: 'note_added',
      action_category: 'crm',
      tenant_id: req.user?.tenantId || 'macrea',
      user_id: req.user?.id,
      entity_type: 'Lead',
      entity_id: id,
      description: `Échec ajout note`,
      input_data: { note_content: content?.trim() },
      success: false,
      error_message: error.message,
      metadata: { source: 'crm_ui', route: 'POST /api/crm/leads/:id/notes' }
    }).catch(err => console.warn('[CRM] Logging Supabase échoué:', err.message));

    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout de la note dans EspoCRM',
      details: error.message
    });
  }
});

/**
 * GET /api/crm/metadata/lead-statuses
 * Récupérer les valeurs valides du champ status depuis EspoCRM
 */
router.get('/metadata/lead-statuses', async (req, res) => {
  try {
    console.log('[CRM] Récupération metadata statuts Lead depuis EspoCRM');

    // Récupérer les métadonnées du champ status de l'entité Lead
    const metadata = await espoFetch('/Metadata/entityDefs/Lead');

    const statusField = metadata?.fields?.status;

    if (!statusField || !statusField.options) {
      console.warn('[CRM] Pas de champ status trouvé dans les métadonnées Lead');
      // Valeurs par défaut EspoCRM standard
      return res.json({
        options: ['New', 'Assigned', 'In Process', 'Converted', 'Recycled', 'Dead'],
        default: 'New'
      });
    }

    console.log('[CRM] Statuts disponibles:', statusField.options);

    res.json({
      options: statusField.options,
      default: statusField.default || statusField.options[0]
    });

  } catch (error) {
    console.error('[CRM] Erreur récupération metadata statuts:', error);
    // Fallback sur valeurs standards
    res.json({
      options: ['New', 'Assigned', 'In Process', 'Converted', 'Recycled', 'Dead'],
      default: 'New'
    });
  }
});

/**
 * Legacy endpoint /contact (pour compatibilité)
 */
router.get("/contact", (req, res) => {
  res.json({
    ok: true,
    contact: {
      id: "c-001",
      fullname: "Jean Dupont",
      email: "jean.dupont@entreprise.com",
      phone: "+33 1 23 45 67 89",
      company: "Entreprise SAS",
      status: "Lead chaud",
      score: 94,
      lastInteraction: "2025-11-05T11:02:00Z"
    },
    tasks: [
      { id: "t-01", title: "Envoyer un email de suivi personnalisé", badge: "Suggéré par M.A.X.", priority: "haute", type: "workflow" },
      { id: "t-02", title: "Planifier appel de qualification", badge: "Suggéré par M.A.X.", priority: "moyenne", type: "manual" },
      { id: "t-03", title: "Mettre à jour le score d'engagement", badge: "Automatique", priority: "basse", type: "auto" }
    ]
  });
});

export default router;
