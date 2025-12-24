/**
 * routes/crmMvp1.js
 * Routes CRM pour MVP1 - Données mockées
 */

import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Appliquer authMiddleware à toutes les routes
router.use(authMiddleware);

// Données mockées
const mockLeads = [
  {
    id: '1',
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'jean.dupont@example.com',
    phone: '+33 6 12 34 56 78',
    company: 'TechCorp',
    status: 'Nouveau',
    source: 'Site web',
    assignedTo: 'Marie Martin',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    notes: 'Contact initial établi',
    tags: ['prioritaire', 'web'],
    score: 85
  },
  {
    id: '2',
    firstName: 'Sophie',
    lastName: 'Bernard',
    email: 'sophie.bernard@company.fr',
    phone: '+33 6 98 76 54 32',
    company: 'InnovateLtd',
    status: 'Contacté',
    source: 'Référencement',
    assignedTo: 'Paul Durant',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    notes: 'Premier appel effectué',
    tags: ['ref', 'intéressé'],
    score: 72
  },
  {
    id: '3',
    firstName: 'Pierre',
    lastName: 'Leroy',
    email: 'p.leroy@startup.io',
    phone: '+33 7 11 22 33 44',
    company: 'Startup Innov',
    status: 'Qualifié',
    source: 'LinkedIn',
    assignedTo: 'Marie Martin',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    notes: 'Budget confirmé',
    tags: ['linkedin', 'budget-ok'],
    score: 90
  },
  {
    id: '4',
    firstName: 'Marie',
    lastName: 'Dubois',
    email: 'marie.dubois@group.com',
    phone: '+33 6 55 44 33 22',
    company: 'Group Solutions',
    status: 'Proposition',
    source: 'Salon professionnel',
    assignedTo: 'Paul Durant',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
    notes: 'Proposition envoyée le 01/12',
    tags: ['salon', 'devis-envoyé'],
    score: 78
  },
  {
    id: '5',
    firstName: 'Thomas',
    lastName: 'Petit',
    email: 'thomas.petit@business.fr',
    phone: '+33 6 77 88 99 00',
    company: 'Business Consulting',
    status: 'Gagné',
    source: 'Recommandation',
    assignedTo: 'Marie Martin',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    notes: 'Client depuis 3 jours',
    tags: ['recommandation', 'client'],
    score: 95
  },
  {
    id: '6',
    firstName: 'Claire',
    lastName: 'Rousseau',
    email: 'c.rousseau@digital.fr',
    phone: '+33 6 11 22 33 44',
    company: 'Digital Agency',
    status: 'Nouveau',
    source: 'Site web',
    assignedTo: 'Paul Durant',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    tags: ['web', 'digital'],
    score: 65
  },
  {
    id: '7',
    firstName: 'Luc',
    lastName: 'Martin',
    email: 'luc.martin@tech.io',
    phone: '+33 7 22 33 44 55',
    company: 'Tech Solutions',
    status: 'Contacté',
    source: 'LinkedIn',
    assignedTo: 'Marie Martin',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    tags: ['linkedin', 'tech'],
    score: 70
  },
  {
    id: '8',
    firstName: 'Emma',
    lastName: 'Durand',
    email: 'emma.durand@startup.com',
    phone: '+33 6 33 44 55 66',
    company: 'StartupCo',
    status: 'Qualifié',
    source: 'Recommandation',
    assignedTo: 'Paul Durant',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    tags: ['recommandation', 'startup'],
    score: 88
  },
  {
    id: '9',
    firstName: 'Nicolas',
    lastName: 'Blanc',
    email: 'n.blanc@entreprise.fr',
    phone: '+33 7 44 55 66 77',
    company: 'Entreprise SA',
    status: 'Nouveau',
    source: 'Salon professionnel',
    assignedTo: 'Marie Martin',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
    tags: ['salon'],
    score: 60
  },
  {
    id: '10',
    firstName: 'Amélie',
    lastName: 'Roux',
    email: 'amelie.roux@group.fr',
    phone: '+33 6 55 66 77 88',
    company: 'Group International',
    status: 'Proposition',
    source: 'Site web',
    assignedTo: 'Paul Durant',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    tags: ['web', 'international'],
    score: 82
  },
  {
    id: '11',
    firstName: 'Alexandre',
    lastName: 'Moreau',
    email: 'a.moreau@consulting.com',
    phone: '+33 7 66 77 88 99',
    company: 'Consulting Pro',
    status: 'Contacté',
    source: 'Référencement',
    assignedTo: 'Marie Martin',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(),
    tags: ['ref', 'consulting'],
    score: 68
  },
  {
    id: '12',
    firstName: 'Julie',
    lastName: 'Simon',
    email: 'julie.simon@business.io',
    phone: '+33 6 77 88 99 00',
    company: 'Business Partners',
    status: 'Gagné',
    source: 'Recommandation',
    assignedTo: 'Paul Durant',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    tags: ['recommandation', 'client'],
    score: 92
  },
  {
    id: '13',
    firstName: 'François',
    lastName: 'Laurent',
    email: 'f.laurent@tech.fr',
    phone: '+33 7 88 99 00 11',
    company: 'TechWorld',
    status: 'Nouveau',
    source: 'LinkedIn',
    assignedTo: 'Marie Martin',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    tags: ['linkedin', 'tech'],
    score: 75
  },
  {
    id: '14',
    firstName: 'Camille',
    lastName: 'Petit',
    email: 'camille.petit@digital.com',
    phone: '+33 6 99 00 11 22',
    company: 'Digital Partners',
    status: 'Qualifié',
    source: 'Site web',
    assignedTo: 'Paul Durant',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    tags: ['web', 'digital'],
    score: 85
  },
  {
    id: '15',
    firstName: 'Vincent',
    lastName: 'Girard',
    email: 'v.girard@startup.fr',
    phone: '+33 7 00 11 22 33',
    company: 'Startup Lab',
    status: 'Contacté',
    source: 'Salon professionnel',
    assignedTo: 'Marie Martin',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
    tags: ['salon', 'startup'],
    score: 72
  },
  {
    id: '16',
    firstName: 'Laura',
    lastName: 'Bonnet',
    email: 'laura.bonnet@company.fr',
    phone: '+33 6 11 22 33 44',
    company: 'Company Solutions',
    status: 'Perdu',
    source: 'Référencement',
    assignedTo: 'Paul Durant',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    tags: ['ref'],
    score: 45
  },
  {
    id: '17',
    firstName: 'Antoine',
    lastName: 'Faure',
    email: 'antoine.faure@group.io',
    phone: '+33 7 22 33 44 55',
    company: 'Group Tech',
    status: 'Proposition',
    source: 'LinkedIn',
    assignedTo: 'Marie Martin',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
    tags: ['linkedin', 'tech'],
    score: 80
  },
  {
    id: '18',
    firstName: 'Manon',
    lastName: 'Muller',
    email: 'manon.muller@business.fr',
    phone: '+33 6 33 44 55 66',
    company: 'Business Corp',
    status: 'Nouveau',
    source: 'Recommandation',
    assignedTo: 'Paul Durant',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 11).toISOString(),
    tags: ['recommandation'],
    score: 78
  },
  {
    id: '19',
    firstName: 'Maxime',
    lastName: 'Lefevre',
    email: 'm.lefevre@digital.io',
    phone: '+33 7 44 55 66 77',
    company: 'Digital Group',
    status: 'Contacté',
    source: 'Site web',
    assignedTo: 'Marie Martin',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    tags: ['web', 'digital'],
    score: 69
  },
  {
    id: '20',
    firstName: 'Sarah',
    lastName: 'Mercier',
    email: 'sarah.mercier@tech.com',
    phone: '+33 6 55 66 77 88',
    company: 'TechVision',
    status: 'Qualifié',
    source: 'Salon professionnel',
    assignedTo: 'Paul Durant',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    tags: ['salon', 'tech'],
    score: 86
  },
  {
    id: '21',
    firstName: 'Julien',
    lastName: 'Gauthier',
    email: 'julien.gauthier@startup.com',
    phone: '+33 7 66 77 88 99',
    company: 'Startup Innovation',
    status: 'Gagné',
    source: 'LinkedIn',
    assignedTo: 'Marie Martin',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 35).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    tags: ['linkedin', 'client', 'startup'],
    score: 94
  },
  {
    id: '22',
    firstName: 'Léa',
    lastName: 'Perrin',
    email: 'lea.perrin@consulting.fr',
    phone: '+33 6 77 88 99 00',
    company: 'Consulting Expert',
    status: 'Nouveau',
    source: 'Référencement',
    assignedTo: 'Paul Durant',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(),
    tags: ['ref', 'consulting'],
    score: 62
  },
  {
    id: '23',
    firstName: 'Hugo',
    lastName: 'Morel',
    email: 'hugo.morel@group.fr',
    phone: '+33 7 88 99 00 11',
    company: 'Group Digital',
    status: 'Proposition',
    source: 'Recommandation',
    assignedTo: 'Marie Martin',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 13).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    tags: ['recommandation', 'digital'],
    score: 79
  },
  {
    id: '24',
    firstName: 'Chloé',
    lastName: 'Fournier',
    email: 'chloe.fournier@business.io',
    phone: '+33 6 99 00 11 22',
    company: 'Business Tech',
    status: 'Contacté',
    source: 'Site web',
    assignedTo: 'Paul Durant',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    tags: ['web', 'tech'],
    score: 71
  },
  {
    id: '25',
    firstName: 'Lucas',
    lastName: 'Giraud',
    email: 'lucas.giraud@digital.fr',
    phone: '+33 7 00 11 22 33',
    company: 'Digital Pro',
    status: 'Qualifié',
    source: 'LinkedIn',
    assignedTo: 'Marie Martin',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    tags: ['linkedin', 'digital'],
    score: 87
  }
];

const mockNotes = [
  {
    id: 'n1',
    leadId: '1',
    content: 'Premier contact établi par email, intéressé par nos services',
    createdBy: 'Marie Martin',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString()
  },
  {
    id: 'n2',
    leadId: '2',
    content: 'Appel effectué, à rappeler la semaine prochaine',
    createdBy: 'Paul Durant',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString()
  },
  {
    id: 'n3',
    leadId: '3',
    content: 'Rendez-vous physique prévu jeudi prochain',
    createdBy: 'Marie Martin',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
  }
];

const mockActivities = [
  {
    id: 'a1',
    leadId: '1',
    type: 'status_change',
    description: 'Statut changé de "Nouveau" à "Contacté"',
    createdBy: 'Marie Martin',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString()
  },
  {
    id: 'a2',
    leadId: '1',
    type: 'note_added',
    description: 'Note ajoutée: Premier contact établi',
    createdBy: 'Marie Martin',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString()
  },
  {
    id: 'a3',
    leadId: '2',
    type: 'email_sent',
    description: 'Email de suivi envoyé',
    createdBy: 'Paul Durant',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString()
  }
];

/**
 * GET /api/crm-mvp1/leads
 * Liste des leads avec filtres et pagination
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
      tags,
      minScore,
      maxScore
    } = req.query;

    let filteredLeads = [...mockLeads];

    // Filtrer par statut
    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      filteredLeads = filteredLeads.filter(lead => statuses.includes(lead.status));
    }

    // Recherche full-text
    if (search) {
      const searchLower = search.toLowerCase();
      filteredLeads = filteredLeads.filter(lead =>
        lead.firstName.toLowerCase().includes(searchLower) ||
        lead.lastName.toLowerCase().includes(searchLower) ||
        lead.email.toLowerCase().includes(searchLower) ||
        (lead.company && lead.company.toLowerCase().includes(searchLower))
      );
    }

    // Filtrer par score
    if (minScore) {
      filteredLeads = filteredLeads.filter(lead => lead.score >= parseInt(minScore));
    }
    if (maxScore) {
      filteredLeads = filteredLeads.filter(lead => lead.score <= parseInt(maxScore));
    }

    // Pagination
    const total = filteredLeads.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + parseInt(pageSize);
    const paginatedLeads = filteredLeads.slice(startIndex, endIndex);

    res.json({
      leads: paginatedLeads,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });

  } catch (error) {
    console.error('[CRM MVP1] Erreur liste leads:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des leads'
    });
  }
});

/**
 * GET /api/crm-mvp1/leads/:id
 * Détail d'un lead avec notes et activités
 */
router.get('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const lead = mockLeads.find(l => l.id === id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead non trouvé'
      });
    }

    const notes = mockNotes.filter(n => n.leadId === id);
    const activities = mockActivities.filter(a => a.leadId === id);

    res.json({
      lead,
      notes,
      activities
    });

  } catch (error) {
    console.error('[CRM MVP1] Erreur détail lead:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du lead'
    });
  }
});

/**
 * PATCH /api/crm-mvp1/leads/:id/status
 * Changer le statut d'un lead
 */
router.patch('/leads/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const leadIndex = mockLeads.findIndex(l => l.id === id);
    if (leadIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Lead non trouvé'
      });
    }

    const oldStatus = mockLeads[leadIndex].status;
    mockLeads[leadIndex].status = status;
    mockLeads[leadIndex].updatedAt = new Date().toISOString();

    // Ajouter une activité
    const activity = {
      id: `a${Date.now()}`,
      leadId: id,
      type: 'status_change',
      description: `Statut changé de "${oldStatus}" à "${status}"`,
      createdBy: req.user?.name || 'Utilisateur',
      createdAt: new Date().toISOString()
    };
    mockActivities.push(activity);

    res.json({
      lead: mockLeads[leadIndex],
      activity
    });

  } catch (error) {
    console.error('[CRM MVP1] Erreur changement statut:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du changement de statut'
    });
  }
});

/**
 * POST /api/crm-mvp1/leads/:id/notes
 * Ajouter une note à un lead
 */
router.post('/leads/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const lead = mockLeads.find(l => l.id === id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead non trouvé'
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Le contenu de la note est requis'
      });
    }

    // Créer la note
    const note = {
      id: `n${Date.now()}`,
      leadId: id,
      content: content.trim(),
      createdBy: req.user?.name || 'Utilisateur',
      createdAt: new Date().toISOString()
    };
    mockNotes.push(note);

    // Ajouter une activité
    const activity = {
      id: `a${Date.now()}`,
      leadId: id,
      type: 'note_added',
      description: `Note ajoutée: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
      createdBy: req.user?.name || 'Utilisateur',
      createdAt: new Date().toISOString()
    };
    mockActivities.push(activity);

    // Mettre à jour le lead
    const leadIndex = mockLeads.findIndex(l => l.id === id);
    mockLeads[leadIndex].updatedAt = new Date().toISOString();

    res.json({
      note,
      activity
    });

  } catch (error) {
    console.error('[CRM MVP1] Erreur ajout note:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout de la note'
    });
  }
});

export default router;
