/**
 * routes/crmPublic.js
 * ⚠️ TEMPORAIRE: Route CRM publique sans auth pour fix crash frontend
 * TODO Phase 3: Supprimer ce fichier et utiliser routes/crm.js avec auth
 */

import express from 'express';

const router = express.Router();

// Configuration EspoCRM
const ESPO_BASE_URL = process.env.ESPO_BASE_URL || 'http://127.0.0.1:8081/espocrm/api/v1';
const ESPO_API_KEY = process.env.ESPO_API_KEY;

/**
 * Fetch helper pour EspoCRM
 */
async function espoFetch(endpoint) {
  const url = `${ESPO_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Api-Key': ESPO_API_KEY,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`EspoCRM error ${response.status}: ${error}`);
  }

  return response.json();
}

/**
 * Mapper un lead EspoCRM vers le format frontend
 */
function mapEspoLeadToFrontend(espoLead) {
  return {
    id: espoLead.id,
    firstName: espoLead.firstName || '',
    lastName: espoLead.lastName || '',
    name: `${espoLead.firstName || ''} ${espoLead.lastName || ''}`.trim() || espoLead.name,
    email: espoLead.emailAddress || espoLead.email || '',
    phone: espoLead.phoneNumber || espoLead.phone || '',
    company: espoLead.accountName || espoLead.company || '',
    status: espoLead.status || 'Nouveau',
    source: espoLead.source || '',
    assignedTo: espoLead.assignedUserName || '',
    createdAt: espoLead.createdAt || new Date().toISOString(),
    updatedAt: espoLead.modifiedAt || espoLead.createdAt || new Date().toISOString(),
    notes: espoLead.description || '',
    tags: espoLead.tagsIA || espoLead.tags || [],
    score: espoLead.scoreIA || espoLead.score || 0
  };
}

/**
 * GET /api/crm-public/leads
 * Liste des leads depuis EspoCRM (sans auth)
 */
router.get('/leads', async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      status,
      search
    } = req.query;

    // Construire les paramètres EspoCRM
    const offset = (page - 1) * pageSize;
    let endpoint = `/Lead?maxSize=${pageSize}&offset=${offset}&orderBy=createdAt&order=desc`;

    // Ajouter filtres si nécessaire
    const where = [];

    if (status) {
      where.push({
        type: 'equals',
        attribute: 'status',
        value: status
      });
    }

    if (search) {
      where.push({
        type: 'or',
        value: [
          { type: 'contains', attribute: 'firstName', value: search },
          { type: 'contains', attribute: 'lastName', value: search },
          { type: 'contains', attribute: 'emailAddress', value: search },
          { type: 'contains', attribute: 'accountName', value: search }
        ]
      });
    }

    if (where.length > 0) {
      endpoint += `&where=${encodeURIComponent(JSON.stringify(where))}`;
    }

    // Appel EspoCRM
    const data = await espoFetch(endpoint);

    // Mapper les leads
    const leads = (data.list || []).map(mapEspoLeadToFrontend);
    const total = data.total || 0;

    console.log(`[CRM Public] ✅ ${leads.length} leads récupérés (total: ${total})`);

    res.json({
      ok: true,
      leads,
      list: leads, // Alias pour compatibilité
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });

  } catch (error) {
    console.error('[CRM Public] ❌ Erreur:', error.message);
    res.status(500).json({
      ok: false,
      error: 'Erreur lors de la récupération des leads',
      details: error.message
    });
  }
});

/**
 * GET /api/crm-public/leads/:id
 * Détail d'un lead depuis EspoCRM avec notes et activités (sans auth)
 */
router.get('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer le lead
    const espoLead = await espoFetch(`/Lead/${id}`);

    if (!espoLead) {
      return res.status(404).json({
        ok: false,
        error: 'Lead non trouvé'
      });
    }

    // Mapper le lead
    const lead = mapEspoLeadToFrontend(espoLead);

    // Récupérer les notes (depuis le champ description d'EspoCRM ou entité Note si elle existe)
    const notes = [];
    if (espoLead.description) {
      // Pour l'instant, créer une note par défaut depuis le champ description
      notes.push({
        id: '1',
        leadId: id,
        content: espoLead.description,
        createdBy: espoLead.assignedUserName || 'Système',
        createdAt: espoLead.createdAt || new Date().toISOString()
      });
    }

    // Récupérer les activités depuis l'historique EspoCRM (Stream)
    let activities = [];
    try {
      // EspoCRM API Stream pour l'historique des modifications
      const streamData = await espoFetch(`/Lead/${id}/stream?maxSize=20`);

      if (streamData && streamData.list) {
        activities = streamData.list.map(item => ({
          id: item.id,
          leadId: id,
          type: mapStreamTypeToActivityType(item.type),
          description: item.data?.statusValue
            ? `Statut changé : ${item.data.statusValue}`
            : item.data?.fieldName
              ? `Champ "${item.data.fieldName}" modifié`
              : 'Modification',
          createdBy: item.userName || 'Système',
          createdAt: item.createdAt || new Date().toISOString(),
          metadata: item.data || {}
        }));
      }
    } catch (streamError) {
      console.warn(`[CRM Public] Stream non disponible pour lead ${id}:`, streamError.message);
      // Créer une activité par défaut
      activities = [{
        id: '1',
        leadId: id,
        type: 'note_added',
        description: `Lead créé le ${new Date(espoLead.createdAt).toLocaleDateString('fr-FR')}`,
        createdBy: espoLead.assignedUserName || 'Système',
        createdAt: espoLead.createdAt || new Date().toISOString(),
        metadata: {}
      }];
    }

    console.log(`[CRM Public] ✅ Lead ${id} récupéré avec ${notes.length} note(s) et ${activities.length} activité(s)`);

    res.json({
      ok: true,
      lead,
      notes,
      activities
    });

  } catch (error) {
    console.error('[CRM Public] ❌ Erreur:', error.message);
    res.status(500).json({
      ok: false,
      error: 'Erreur lors de la récupération du lead',
      details: error.message
    });
  }
});

/**
 * Helper : Mapper le type de stream EspoCRM vers type d'activité frontend
 */
function mapStreamTypeToActivityType(streamType) {
  const typeMap = {
    'Status': 'status_change',
    'Update': 'status_change',
    'Create': 'note_added',
    'EmailSent': 'email_sent',
    'EmailReceived': 'email_received',
    'Call': 'call_made',
    'Meeting': 'meeting_scheduled'
  };
  return typeMap[streamType] || 'note_added';
}

/**
 * PATCH /api/crm-public/leads/:id/status
 * Changer le statut d'un lead
 */
router.patch('/leads/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        ok: false,
        error: 'Le champ "status" est requis'
      });
    }

    // Mettre à jour le lead via EspoCRM
    const updateResponse = await fetch(`${ESPO_BASE_URL}/Lead/${id}`, {
      method: 'PUT',
      headers: {
        'X-Api-Key': ESPO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: status
      })
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      throw new Error(`EspoCRM error ${updateResponse.status}: ${error}`);
    }

    const updatedEspoLead = await updateResponse.json();

    // Mapper le lead mis à jour
    const lead = mapEspoLeadToFrontend(updatedEspoLead);

    console.log(`[CRM Public] ✅ Statut du lead ${id} changé vers "${status}"`);

    res.json({
      ok: true,
      lead
    });

  } catch (error) {
    console.error('[CRM Public] ❌ Erreur changement statut:', error.message);
    res.status(500).json({
      ok: false,
      error: 'Erreur lors du changement de statut',
      details: error.message
    });
  }
});

/**
 * POST /api/crm-public/leads/:id/notes
 * Ajouter une note à un lead
 */
router.post('/leads/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        ok: false,
        error: 'Le champ "content" est requis'
      });
    }

    // Récupérer le lead actuel pour ajouter la note à la description
    const espoLead = await espoFetch(`/Lead/${id}`);

    if (!espoLead) {
      return res.status(404).json({
        ok: false,
        error: 'Lead non trouvé'
      });
    }

    // Ajouter la note à la description existante
    const timestamp = new Date().toISOString();
    const notePrefix = `[${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')}] `;
    const newDescription = espoLead.description
      ? `${espoLead.description}\n\n${notePrefix}${content}`
      : `${notePrefix}${content}`;

    // Mettre à jour le lead avec la nouvelle description
    const updateResponse = await fetch(`${ESPO_BASE_URL}/Lead/${id}`, {
      method: 'PUT',
      headers: {
        'X-Api-Key': ESPO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: newDescription
      })
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      throw new Error(`EspoCRM error ${updateResponse.status}: ${error}`);
    }

    // Créer l'objet note pour la réponse
    const note = {
      id: Date.now().toString(), // ID temporaire basé sur timestamp
      leadId: id,
      content: content,
      createdBy: espoLead.assignedUserName || 'Système',
      createdAt: timestamp
    };

    console.log(`[CRM Public] ✅ Note ajoutée au lead ${id}`);

    res.json({
      ok: true,
      note
    });

  } catch (error) {
    console.error('[CRM Public] ❌ Erreur ajout note:', error.message);
    res.status(500).json({
      ok: false,
      error: 'Erreur lors de l\'ajout de la note',
      details: error.message
    });
  }
});

/**
 * GET /api/crm-public/health
 * Test de connexion EspoCRM
 */
router.get('/health', async (req, res) => {
  try {
    const data = await espoFetch('/Lead?maxSize=1');

    res.json({
      ok: true,
      message: 'EspoCRM connecté',
      totalLeads: data.total || 0
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: 'Impossible de se connecter à EspoCRM',
      details: error.message
    });
  }
});

export default router;
