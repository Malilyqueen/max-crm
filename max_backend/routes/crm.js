/**
 * routes/crm.js
 * Routes CRM pour Phase 2A - Connexion réelle à EspoCRM
 *
 * SÉCURITÉ MULTI-TENANT:
 * - Toutes les requêtes EspoCRM DOIVENT filtrer par cTenantId
 * - Le guard fail-closed refuse l'accès si le filtre n'est pas actif
 * - La route /request-activation est exemptée (onboarding)
 */

import express from 'express';
import { espoFetch, safeUpdateLead } from '../lib/espoClient.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { logMaxAction } from '../lib/maxLogger.js';
import { getTagsFromCache, updateLeadInCache, syncLeadsCache } from '../lib/leadsCacheSync.js';
import { supabase } from '../lib/supabaseClient.js';

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION MULTI-TENANT
// ═══════════════════════════════════════════════════════════════════

// Flag: true si le champ cTenantId existe dans EspoCRM
const ESPO_HAS_TENANT_FIELD = process.env.ESPO_HAS_TENANT_FIELD === 'true';

// SÉCURITÉ FAIL-CLOSED: Refuser les requêtes shared-mode sans filtre tenant
const ENFORCE_TENANT_ISOLATION = process.env.ENFORCE_TENANT_ISOLATION !== 'false';

/**
 * GUARD FAIL-CLOSED: Vérifier l'isolation multi-tenant
 * Refuse l'accès aux tenants non-macrea sur CRM partagé si cTenantId pas actif
 */
function checkTenantIsolation(tenantId) {
  if (!ENFORCE_TENANT_ISOLATION) return { allowed: true };
  if (tenantId === 'macrea') return { allowed: true };
  if (!ESPO_HAS_TENANT_FIELD) {
    return {
      allowed: false,
      error: 'TENANT_ISOLATION_REQUIRED',
      message: 'L\'isolation multi-tenant n\'est pas encore configurée.'
    };
  }
  return { allowed: true };
}

/**
 * Middleware: Injecter le filtre tenant dans les requêtes
 * EXEMPTE: /request-activation (onboarding)
 */
function tenantGuardMiddleware(req, res, next) {
  // Route d'activation exemptée (onboarding)
  if (req.path === '/request-activation') {
    return next();
  }

  const tenantId = req.tenantId;

  // Vérifier isolation
  const isolationCheck = checkTenantIsolation(tenantId);
  if (!isolationCheck.allowed) {
    console.error(`[CRM] 🚫 ISOLATION REFUSÉE: ${tenantId} - ${isolationCheck.error}`);
    return res.status(403).json({
      success: false,
      error: isolationCheck.error,
      message: isolationCheck.message
    });
  }

  // Injecter le tenantId dans req pour les routes
  req.tenantFilter = ESPO_HAS_TENANT_FIELD ? tenantId : null;
  next();
}

// SECURITY: authMiddleware OBLIGATOIRE pour req.tenantId
router.use(authMiddleware);
router.use(tenantGuardMiddleware);

/**
 * Mapper un lead EspoCRM vers le format frontend attendu
 */
function mapEspoLeadToFrontend(espoLead) {
  // Fusionner tagsIA, maxTags et tags (sans doublons)
  const tagsIA = Array.isArray(espoLead.tagsIA) ? espoLead.tagsIA : [];
  let maxTags = [];
  if (Array.isArray(espoLead.maxTags)) {
    maxTags = espoLead.maxTags;
  } else if (typeof espoLead.maxTags === 'string') {
    maxTags = espoLead.maxTags
      .split(/[\s,]+/)
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  }

  let baseTags = [];
  if (Array.isArray(espoLead.tags)) {
    baseTags = espoLead.tags;
  } else if (typeof espoLead.tags === 'string') {
    baseTags = espoLead.tags
      .split(/[\s,]+/)
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  }

  const allTags = [...new Set([...tagsIA, ...maxTags, ...baseTags])];

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
    tags: allTags,  // Fusion de tagsIA + maxTags
    score: espoLead.scoreIA || espoLead.score || 0,
    // V1 Starter - 3 nouveaux champs (lecture)
    industry: espoLead.industry || espoLead.secteurInfere || '',
    website: espoLead.website || '',
    address: espoLead.addressStreet || espoLead.addressCity || ''
  };
}

/**
 * GET /api/crm/leads
 * Liste des leads avec filtres et pagination - VRAI EspoCRM
 * SÉCURITÉ: Filtre automatique par cTenantId si ESPO_HAS_TENANT_FIELD=true
 */
router.get('/leads', async (req, res) => {
  try {
    const tenantId = req.tenantId;
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

    console.log(`[CRM] 📋 GET /leads - tenant: ${tenantId}, filter: ${req.tenantFilter || 'NONE'}`);

    // Construire les filtres EspoCRM
    const where = [];

    // ═══════════════════════════════════════════════════════════════════
    // SÉCURITÉ: Filtre tenant OBLIGATOIRE en premier
    // ═══════════════════════════════════════════════════════════════════
    if (req.tenantFilter) {
      where.push({
        type: 'equals',
        attribute: 'cTenantId',
        value: req.tenantFilter
      });
      console.log(`[CRM] 🔒 Filtre tenant actif: cTenantId=${req.tenantFilter}`);
    }

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
      order: 'desc',
      // Inclure explicitement les champs nécessaires (tagsIA + maxTags + scoreIA)
      select: 'id,firstName,lastName,emailAddress,phoneNumber,accountName,status,source,assignedUserName,createdAt,modifiedAt,description,tagsIA,maxTags,score,scoreIA,industry,secteurInfere,website,addressStreet,addressCity'
    });

    // Ajouter le filtre where si nécessaire
    if (where.length > 0) {
      params.append('where', JSON.stringify(where));
    }

    // Appel à EspoCRM
    const data = await espoFetch(`/Lead?${params.toString()}`);

    // Mapper les leads
    let leads = (data.list || []).map(mapEspoLeadToFrontend);

    // Fallback tags: enrichir depuis Supabase si tags vides
    const crmEnv = process.env.CRM_ENV || 'prod';
    const missingTagsIds = leads
      .filter(l => !l.tags || l.tags.length === 0)
      .map(l => l.id)
      .filter(Boolean);

    if (missingTagsIds.length > 0) {
      const { data: cacheRows, error: cacheError } = await supabase
        .from('leads_cache')
        .select('espo_id,tags')
        .eq('tenant_id', tenantId)
        .eq('crm_env', crmEnv)
        .in('espo_id', missingTagsIds);

      if (cacheError) {
        console.warn('[CRM] ⚠️ Fallback cache tags error:', cacheError.message);
      } else if (cacheRows && cacheRows.length > 0) {
        const tagsById = new Map(cacheRows.map(r => [r.espo_id, Array.isArray(r.tags) ? r.tags : []]));
        leads = leads.map(l => {
          const cachedTags = tagsById.get(l.id);
          return cachedTags && cachedTags.length > 0
            ? { ...l, tags: cachedTags }
            : l;
        });
      }
    }
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
 * SÉCURITÉ: Vérifie que le lead appartient au tenant
 */
router.get('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    console.log(`[CRM] 📋 GET /leads/${id} - tenant: ${tenantId}`);

    // Récupérer le lead depuis EspoCRM
    const espoLead = await espoFetch(`/Lead/${id}`);

    if (!espoLead) {
      return res.status(404).json({
        success: false,
        error: 'Lead non trouvé dans EspoCRM'
      });
    }

    // ═══════════════════════════════════════════════════════════════════
    // SÉCURITÉ: Vérifier que le lead appartient au tenant
    // ═══════════════════════════════════════════════════════════════════
    if (req.tenantFilter && espoLead.cTenantId !== req.tenantFilter) {
      console.error(`[CRM] 🚫 ACCÈS REFUSÉ: Lead ${id} appartient à ${espoLead.cTenantId}, pas à ${req.tenantFilter}`);
      return res.status(404).json({
        success: false,
        error: 'Lead non trouvé'
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
      tenant_id: req.tenantId,
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
 * SÉCURITÉ: Vérifie que le lead appartient au tenant avant modification
 */
router.patch('/leads/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const tenantId = req.tenantId;

    console.log(`[CRM] PATCH /leads/${id}/status - tenant: ${tenantId}, status: ${status}`);

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Le statut est requis'
      });
    }

    // ═══════════════════════════════════════════════════════════════════
    // SÉCURITÉ: Vérifier que le lead appartient au tenant AVANT modification
    // ═══════════════════════════════════════════════════════════════════
    if (req.tenantFilter) {
      const existingLead = await espoFetch(`/Lead/${id}`);
      if (!existingLead || existingLead.cTenantId !== req.tenantFilter) {
        console.error(`[CRM] 🚫 ACCÈS REFUSÉ: Lead ${id} n'appartient pas à ${req.tenantFilter}`);
        return res.status(404).json({
          success: false,
          error: 'Lead non trouvé'
        });
      }
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
      tenant_id: req.tenantId,
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
      tenant_id: req.tenantId,
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

// ═══════════════════════════════════════════════════════════════════
// WHITELIST CRM STARTER V1 - Contrat produit
// ═══════════════════════════════════════════════════════════════════
const CRM_STARTER_WHITELIST = {
  // Frontend field → Espo field mapping
  firstName: { espoField: 'firstName', type: 'string' },
  lastName: { espoField: 'lastName', type: 'string' },
  email: { espoField: 'emailAddress', type: 'string' },
  phone: { espoField: 'phoneNumber', type: 'string' },
  company: { espoField: 'accountName', type: 'string' },
  status: { espoField: 'status', type: 'string' },
  source: { espoField: 'source', type: 'string' },
  notes: { espoField: 'description', type: 'string' },
  tags: { espoField: 'tagsIA', type: 'array' },  // Champ EspoCRM: tagsIA
  score: { espoField: 'score', type: 'number', min: 0, max: 100 },
  industry: { espoField: 'industry', type: 'string' },
  website: { espoField: 'website', type: 'string' },
  address: { espoField: 'addressStreet', type: 'string' }
  // assignedTo: display-only pour V1 (nécessite assignedUserId)
};

/**
 * Valide et mappe les champs frontend → Espo selon la whitelist
 * @returns {{ valid: boolean, espoData: Object, errors: string[] }}
 */
function validateAndMapToEspo(frontendData) {
  const errors = [];
  const espoData = {};

  for (const [field, value] of Object.entries(frontendData)) {
    // Ignorer les champs vides/null
    if (value === undefined || value === null) continue;

    // Vérifier whitelist
    const mapping = CRM_STARTER_WHITELIST[field];
    if (!mapping) {
      errors.push(`Champ "${field}" non autorisé (whitelist CRM Starter V1)`);
      continue;
    }

    // Valider le type
    if (mapping.type === 'string' && typeof value !== 'string') {
      errors.push(`Champ "${field}" doit être une chaîne`);
      continue;
    }
    if (mapping.type === 'number') {
      const num = Number(value);
      if (isNaN(num)) {
        errors.push(`Champ "${field}" doit être un nombre`);
        continue;
      }
      if (mapping.min !== undefined && num < mapping.min) {
        errors.push(`Champ "${field}" doit être >= ${mapping.min}`);
        continue;
      }
      if (mapping.max !== undefined && num > mapping.max) {
        errors.push(`Champ "${field}" doit être <= ${mapping.max}`);
        continue;
      }
    }
    if (mapping.type === 'array' && !Array.isArray(value)) {
      errors.push(`Champ "${field}" doit être un tableau`);
      continue;
    }

    // Mapper vers le nom Espo
    espoData[mapping.espoField] = mapping.type === 'number' ? Number(value) : value;
  }

  return {
    valid: errors.length === 0,
    espoData,
    errors
  };
}

/**
 * PATCH /api/crm/leads/:id
 * Mise à jour générique d'un lead - WHITELIST CRM STARTER V1
 *
 * SÉCURITÉ:
 * - Whitelist-only: seuls les 13 champs du contrat sont acceptés
 * - Fail-closed multi-tenant: vérifie cTenantId AVANT modification
 * - Logging Supabase pour audit
 */
router.patch('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const tenantId = req.tenantId;

    console.log(`[CRM] PATCH /leads/${id} - tenant: ${tenantId}`);
    console.log('[CRM] Données reçues:', Object.keys(updateData));

    // Validation input
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucune donnée à mettre à jour'
      });
    }

    // ═══════════════════════════════════════════════════════════════════
    // WHITELIST VALIDATION - Rejeter les champs non autorisés
    // ═══════════════════════════════════════════════════════════════════
    const validation = validateAndMapToEspo(updateData);
    if (!validation.valid) {
      console.warn('[CRM] ❌ Validation whitelist échouée:', validation.errors);
      return res.status(400).json({
        success: false,
        error: 'Champs non autorisés',
        details: validation.errors
      });
    }

    if (Object.keys(validation.espoData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucun champ valide à mettre à jour'
      });
    }

    // ═══════════════════════════════════════════════════════════════════
    // SÉCURITÉ FAIL-CLOSED: Vérifier que le lead appartient au tenant
    // ═══════════════════════════════════════════════════════════════════
    if (req.tenantFilter) {
      const existingLead = await espoFetch(`/Lead/${id}`);
      if (!existingLead) {
        return res.status(404).json({
          success: false,
          error: 'Lead non trouvé'
        });
      }
      if (existingLead.cTenantId !== req.tenantFilter) {
        console.error(`[CRM] 🚫 ACCÈS REFUSÉ: Lead ${id} n'appartient pas à ${req.tenantFilter}`);
        return res.status(404).json({
          success: false,
          error: 'Lead non trouvé'
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // MISE À JOUR ESPOCRM
    // ═══════════════════════════════════════════════════════════════════
    console.log('[CRM] Envoi à EspoCRM:', validation.espoData);
    const updatedLead = await espoFetch(`/Lead/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(validation.espoData)
    });

    const lead = mapEspoLeadToFrontend(updatedLead);

    // Logger l'action (non-bloquant)
    logMaxAction({
      action_type: 'lead_updated',
      action_category: 'crm',
      tenant_id: tenantId,
      user_id: req.user?.id,
      entity_type: 'Lead',
      entity_id: id,
      description: `Lead mis à jour: ${Object.keys(updateData).join(', ')}`,
      input_data: updateData,
      output_data: { success: true, fields: Object.keys(validation.espoData) },
      success: true,
      metadata: { source: 'crm_ui', route: 'PATCH /api/crm/leads/:id' }
    }).catch(err => console.warn('[CRM] Logging Supabase échoué:', err.message));

    console.log(`[CRM] ✅ Lead ${id} mis à jour avec succès`);

    res.json({
      success: true,
      lead,
      updatedFields: Object.keys(validation.espoData)
    });

  } catch (error) {
    console.error('[CRM] ❌ Erreur PATCH /leads/:id:', error);

    logMaxAction({
      action_type: 'lead_updated',
      action_category: 'crm',
      tenant_id: req.tenantId,
      entity_type: 'Lead',
      entity_id: req.params.id,
      success: false,
      error_message: error.message,
      metadata: { source: 'crm_ui', route: 'PATCH /api/crm/leads/:id' }
    }).catch(err => console.warn('[CRM] Logging Supabase échoué:', err.message));

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du lead',
      details: error.message
    });
  }
});

/**
 * POST /api/crm/leads/:id/notes
 * Ajouter une note à un lead - VRAI EspoCRM
 * SÉCURITÉ: Vérifie que le lead appartient au tenant
 */
router.post('/leads/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const tenantId = req.tenantId;

    console.log(`[CRM] POST /leads/${id}/notes - tenant: ${tenantId}`);

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

    // ═══════════════════════════════════════════════════════════════════
    // SÉCURITÉ: Vérifier que le lead appartient au tenant
    // ═══════════════════════════════════════════════════════════════════
    if (req.tenantFilter && lead.cTenantId !== req.tenantFilter) {
      console.error(`[CRM] 🚫 ACCÈS REFUSÉ: Lead ${id} n'appartient pas à ${req.tenantFilter}`);
      return res.status(404).json({
        success: false,
        error: 'Lead non trouvé'
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
      tenant_id: req.tenantId,
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
      tenant_id: req.tenantId,
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
 * Normalise un tag pour éviter les doublons
 * @param {string} tag - Tag brut
 * @returns {string} - Tag normalisé (slug)
 */
function normalizeTagSlug(tag) {
  if (!tag || typeof tag !== 'string') return '';
  return tag.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * POST /api/crm/leads/:id/tags
 * Ajouter/créer un tag sur un lead
 * SÉCURITÉ: Vérifie que le lead appartient au tenant
 * SOURCE: Unifié avec GET /api/crm/tags (PROD-only via leads_cache)
 */
router.post('/leads/:id/tags', async (req, res) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;
    const tenantId = req.tenantId;

    console.log(`[CRM] POST /leads/${id}/tags - tenant: ${tenantId}`);

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Au moins un tag est requis (tableau non vide)'
      });
    }

    // Normaliser les tags (éviter doublons)
    const normalizedTags = tags.map(normalizeTagSlug).filter(t => t.length > 0);
    
    if (normalizedTags.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucun tag valide fourni'
      });
    }

    // Vérifier que le lead existe et appartient au tenant
    const lead = await espoFetch(`/Lead/${id}`);
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead non trouvé dans EspoCRM'
      });
    }

    // ═══════════════════════════════════════════════════════════════════
    // SÉCURITÉ: Vérifier que le lead appartient au tenant
    // ═══════════════════════════════════════════════════════════════════
    if (req.tenantFilter && lead.cTenantId !== req.tenantFilter) {
      console.error(`[CRM] 🚫 ACCÈS REFUSÉ: Lead ${id} n'appartient pas à ${req.tenantFilter}`);
      return res.status(404).json({
        success: false,
        error: 'Lead non trouvé'
      });
    }

    // Récupérer les tags actuels du lead (fusion maxTags + tagsIA + tags)
    const currentTagsIA = Array.isArray(lead.tagsIA) ? lead.tagsIA : [];
    let currentMaxTags = [];
    if (Array.isArray(lead.maxTags)) {
      currentMaxTags = lead.maxTags;
    } else if (typeof lead.maxTags === 'string') {
      currentMaxTags = lead.maxTags.split(/[\s,]+/).map(t => t.trim()).filter(Boolean);
    }
    let currentTags = [];
    if (Array.isArray(lead.tags)) {
      currentTags = lead.tags;
    } else if (typeof lead.tags === 'string') {
      currentTags = lead.tags.split(/[\s,]+/).map(t => t.trim()).filter(Boolean);
    }
    const existingTags = [...new Set([...currentTagsIA, ...currentMaxTags, ...currentTags])];

    // Fusionner avec les nouveaux tags (éviter doublons)
    const existingNormalized = existingTags.map(normalizeTagSlug);
    const newTags = normalizedTags.filter(tag => !existingNormalized.includes(tag));
    const updatedTags = [...existingTags, ...newTags];

    console.log(`[CRM] Tags - Existants: ${existingTags.length}, Nouveaux: ${newTags.length}, Total: ${updatedTags.length}`);

    // Mettre à jour EspoCRM (maxTags + tagsIA pour compatibilité)
    const updateData = {
      maxTags: updatedTags,
      tagsIA: updatedTags
    };

    const updatedLead = await espoFetch(`/Lead/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData)
    });

    // Mettre à jour le cache Supabase (source officielle pour Campaign/SegmentBuilder)
    try {
      await updateLeadInCache(tenantId, { ...lead, maxTags: updatedTags, tagsIA: updatedTags });
      console.log(`[CRM] ✅ Cache Supabase mis à jour pour lead ${id}`);
    } catch (cacheError) {
      console.warn(`[CRM] ⚠️ Erreur mise à jour cache:`, cacheError.message);
      // Non-bloquant : l'update EspoCRM a réussi
    }

    // Logger l'action dans Supabase (non-bloquant)
    logMaxAction({
      action_type: 'tags_added',
      action_category: 'crm',
      tenant_id: req.tenantId,
      user_id: req.user?.id,
      entity_type: 'Lead',
      entity_id: id,
      description: `Tags ajoutés: ${newTags.join(', ')}`,
      input_data: { added_tags: newTags, total_tags: updatedTags.length },
      output_data: { success: true, lead_tags: updatedTags },
      success: true,
      metadata: { source: 'crm_ui', route: 'POST /api/crm/leads/:id/tags' }
    }).catch(err => console.warn('[CRM] Logging Supabase échoué:', err.message));

    res.json({
      ok: true,
      leadId: id,
      tags: updatedTags,
      addedTags: newTags,
      totalTags: updatedTags.length
    });

  } catch (error) {
    console.error('[CRM] Erreur ajout tags EspoCRM:', error);

    // Logger l'échec dans Supabase (non-bloquant)
    logMaxAction({
      action_type: 'tags_added',
      action_category: 'crm',
      tenant_id: req.tenantId,
      user_id: req.user?.id,
      entity_type: 'Lead',
      entity_id: id,
      description: `Échec ajout tags`,
      input_data: { requested_tags: req.body?.tags },
      success: false,
      error_message: error.message,
      metadata: { source: 'crm_ui', route: 'POST /api/crm/leads/:id/tags' }
    }).catch(err => console.warn('[CRM] Logging Supabase échoué:', err.message));

    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout des tags dans EspoCRM',
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
 * POST /api/crm/sync-manual
 * Synchroniser manuellement le cache leads_cache avec EspoCRM
 * Endpoint UX pour les utilisateurs (bouton "Synchroniser les tags")
 */
router.post('/sync-manual', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    
    console.log(`[CRM] 🔄 Sync tags manuel par utilisateur - tenant: ${tenantId}`);
    
    // Lancer la synchronisation
    const result = await syncLeadsCache(tenantId);
    
    if (!result.ok) {
      return res.status(500).json({
        success: false,
        error: 'Échec de la synchronisation',
        details: result.error
      });
    }
    
    res.json({
      success: true,
      synced: result.synced || 0,
      timestamp: new Date().toISOString(),
      message: `${result.synced || 0} leads synchronisés avec succès`
    });
    
  } catch (error) {
    console.error('[CRM] Erreur sync tags:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/crm/tags
 * Récupérer tous les tags uniques utilisés par les leads du tenant
 * Utilisé pour le segment builder des campagnes
 *
 * SOURCE: Supabase leads_cache (évite 403 EspoCRM avec filtre tenant)
 * PRÉ-REQUIS: Exécuter sync leads-cache pour peupler les tags
 */
router.get('/tags', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { search } = req.query;

    console.log(`[CRM] 🏷️ GET /tags - tenant: ${tenantId} (source: Supabase leads_cache)`);

    // Récupérer les tags depuis Supabase (évite 403 EspoCRM)
    const result = await getTagsFromCache(tenantId, search);

    if (!result.ok) {
      console.error(`[CRM] ❌ Erreur getTagsFromCache:`, result.error);
      // Fallback: retourner liste vide au lieu d'erreur
      return res.json({
        ok: true,
        tags: [],
        count: 0,
        info: 'Cache non disponible - lancez une sync'
      });
    }

    res.json({
      ok: true,
      tags: result.tags,
      count: result.count
    });

  } catch (error) {
    console.error('[CRM] Erreur récupération tags:', error);
    // Fallback: retourner liste vide au lieu d'erreur
    res.json({
      ok: true,
      tags: [],
      count: 0,
      info: 'Erreur - lancez une sync pour peupler le cache'
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

/**
 * POST /api/crm/request-activation
 * Auto-provisionner le CRM pour un tenant
 *
 * Flow:
 * 1. Vérifier que le tenant existe en DB
 * 2. Mettre à jour crm_url et crm_status = 'active'
 * 3. Retourner success pour redirection vers dashboard
 */
router.post('/request-activation', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const user = req.user;
    const db = req.app?.locals?.db;

    console.log(`[CRM] 🚀 AUTO-PROVISIONING CRM pour tenant: ${tenantId}, user: ${user?.email}`);

    if (!db) {
      console.error('[CRM] ❌ Database connection non disponible');
      return res.status(500).json({
        success: false,
        error: 'Service temporairement indisponible'
      });
    }

    // Vérifier que le tenant existe
    const checkResult = await db.query(
      'SELECT slug, name, crm_url, crm_status FROM tenants WHERE slug = $1',
      [tenantId]
    );

    if (checkResult.rows.length === 0) {
      console.error(`[CRM] ❌ Tenant ${tenantId} non trouvé en DB`);
      return res.status(404).json({
        success: false,
        error: 'Tenant non trouvé'
      });
    }

    const tenant = checkResult.rows[0];

    // Si déjà activé, retourner succès
    if (tenant.crm_status === 'active' && tenant.crm_url) {
      console.log(`[CRM] ℹ️ Tenant ${tenantId} déjà activé`);
      return res.json({
        success: true,
        message: 'Votre CRM est déjà activé !',
        status: 'active',
        alreadyActive: true
      });
    }

    // AUTO-PROVISIONING: Donner accès au CRM partagé
    // Utilise le même EspoCRM que macrea avec isolation par cTenantId
    const fs = require('fs');
    const IS_DOCKER = fs.existsSync('/bitnami');
    const sharedCrmUrl = process.env.ESPO_BASE_URL || (IS_DOCKER ? 'http://espocrm:8080/espocrm/api/v1' : 'http://localhost:8081/espocrm/api/v1');
    const sharedCrmApiKey = process.env.ESPO_API_KEY || '';

    // Mettre à jour le tenant en DB
    await db.query(
      `UPDATE tenants
       SET crm_url = $2,
           crm_api_key = $3,
           crm_status = 'active',
           crm_provisioned_at = NOW(),
           is_provisioned = true,
           updated_at = NOW()
       WHERE slug = $1`,
      [tenantId, sharedCrmUrl, sharedCrmApiKey]
    );

    console.log(`[CRM] ✅ Tenant ${tenantId} AUTO-PROVISIONNÉ avec CRM partagé`);

    // Logger l'activation dans Supabase (non-bloquant)
    logMaxAction({
      action_type: 'crm_activated',
      action_category: 'onboarding',
      tenant_id: tenantId,
      user_id: user?.id,
      entity_type: 'Tenant',
      entity_id: tenantId,
      description: `CRM auto-provisionné pour ${user?.email}`,
      input_data: {
        user_email: user?.email,
        user_name: user?.name,
        tenant_id: tenantId
      },
      output_data: {
        status: 'active',
        crm_type: 'shared',
        crm_url: sharedCrmUrl.substring(0, 30) + '...'
      },
      success: true,
      metadata: { source: 'crm_setup_page', route: 'POST /api/crm/request-activation' }
    }).catch(err => console.warn('[CRM] Logging Supabase échoué:', err.message));

    res.json({
      success: true,
      message: 'Votre CRM est maintenant activé ! Vous pouvez commencer à gérer vos prospects.',
      status: 'active',
      redirect: '/dashboard'
    });

  } catch (error) {
    console.error('[CRM] ❌ Erreur auto-provisioning:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'activation de votre CRM',
      details: error.message
    });
  }
});

export default router;
