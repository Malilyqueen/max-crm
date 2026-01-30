/**
 * routes/crmPublic.js
 * Routes CRM sécurisées avec filtrage par tenant (V1 multi-tenant)
 *
 * REGLE SECURITE V1:
 * - Le tenantId vient UNIQUEMENT du JWT (req.tenantId défini par authMiddleware)
 * - La config CRM vient de req.tenant (résolu par resolveTenant middleware)
 * - Toutes les requêtes EspoCRM filtrent par cTenantId = req.tenantId
 * - Aucun accès cross-tenant n'est possible
 * - Aucun fallback vers ESPO_BASE_URL pour les tenants non-macrea
 */

import express from 'express';
import { resolveTenant } from '../core/resolveTenant.js';
import supabase from '../lib/supabaseClient.js';
import { updateLeadInCache } from '../lib/leadsCacheSync.js';

const router = express.Router();

/**
 * Fetch helper pour EspoCRM - MULTI-TENANT AWARE
 * Utilise la config CRM du tenant résolu (req.tenant.espo)
 */
async function espoFetchForTenant(endpoint, tenant, options = {}) {
  // SÉCURITÉ: Vérifier que le tenant a une config CRM valide
  if (!tenant?.espo?.baseUrl) {
    throw new Error('CRM_NOT_CONFIGURED: Ce tenant n\'a pas de CRM configuré');
  }

  const url = `${tenant.espo.baseUrl}${endpoint}`;

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'X-Api-Key': tenant.espo.apiKey || '',
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: options.body
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`EspoCRM error ${response.status}: ${error}`);
  }

  return response.json();
}

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION MULTI-TENANT
// ═══════════════════════════════════════════════════════════════════

// Flag: true si le champ cTenantId existe dans EspoCRM
const ESPO_HAS_TENANT_FIELD = process.env.ESPO_HAS_TENANT_FIELD === 'true';

// SÉCURITÉ FAIL-CLOSED: Refuser les requêtes shared-mode sans filtre tenant
const ENFORCE_TENANT_ISOLATION = process.env.ENFORCE_TENANT_ISOLATION !== 'false';

/**
 * Helper: Construire le filtre tenant si disponible
 */
function buildTenantFilter(tenantId, whereIndex = 0) {
  if (!ESPO_HAS_TENANT_FIELD) return '';
  return `&where[${whereIndex}][type]=equals&where[${whereIndex}][attribute]=cTenantId&where[${whereIndex}][value]=${encodeURIComponent(tenantId)}`;
}

/**
 * GUARD FAIL-CLOSED: Vérifier l'isolation multi-tenant
 */
function checkTenantIsolation(tenant, tenantId) {
  if (!ENFORCE_TENANT_ISOLATION) return { allowed: true };
  if (tenantId === 'macrea') return { allowed: true };
  if (tenant?.crm?.isConfigured && !tenant?.crm?.usingFallback) return { allowed: true };
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
 * SECURITY: Vérifier que le tenant est présent et a un CRM configuré
 */
function requireTenantWithCrm(req, res, next) {
  const tenantId = req.tenantId || req.user?.tenantId;
  const tenant = req.tenant;

  // Log multi-tenant détaillé
  console.log(`[CRM] ════════════════════════════════════════════`);
  console.log(`[CRM] 🔒 REQUÊTE MULTI-TENANT`);
  console.log(`[CRM]    • Path: ${req.path}`);
  console.log(`[CRM]    • JWT User: ${req.user?.email || 'UNKNOWN'}`);
  console.log(`[CRM]    • JWT Tenant ID: ${tenantId || 'NONE'}`);
  console.log(`[CRM]    • Resolved Tenant: ${tenant?.id || 'NULL'}`);
  console.log(`[CRM]    • CRM Status: ${tenant?.crm?.status || 'N/A'}`);
  console.log(`[CRM]    • CRM URL: ${tenant?.espo?.baseUrl ? tenant.espo.baseUrl.substring(0, 40) + '...' : 'NULL'}`);
  console.log(`[CRM] ════════════════════════════════════════════`);

  if (!tenantId) {
    console.error(`   🚫 [CRM SECURITY] MISSING_TENANT - Path: ${req.path}, User: ${req.user?.email || 'UNKNOWN'}`);
    return res.status(403).json({
      ok: false,
      error: 'Accès refusé: tenant non identifié',
      code: 'MISSING_TENANT'
    });
  }

  // SÉCURITÉ: Vérifier que le tenant a un CRM configuré
  if (!tenant?.espo?.baseUrl) {
    console.error(`[CRM] ❌ TENANT_NOT_PROVISIONED: ${tenantId} n'a pas de CRM configuré!`);
    return res.status(409).json({
      ok: false,
      error: 'TENANT_NOT_PROVISIONED',
      message: 'Votre espace CRM n\'est pas encore activé.',
      resolve: {
        action: 'activate_crm',
        message: 'Activez votre CRM pour commencer à gérer vos prospects.',
        redirect: '/crm-setup'
      }
    });
  }

  // GUARD FAIL-CLOSED: Vérifier isolation multi-tenant
  const isolationCheck = checkTenantIsolation(tenant, tenantId);
  if (!isolationCheck.allowed) {
    console.error(`[CRM] 🚫 ISOLATION REFUSÉE: ${tenantId} - ${isolationCheck.error}`);
    return res.status(403).json({
      ok: false,
      error: isolationCheck.error,
      message: isolationCheck.message,
      resolve: {
        action: 'wait',
        message: 'L\'isolation multi-tenant est en cours de configuration.',
        retry: true
      }
    });
  }

  // S'assurer que req.tenantId est toujours défini
  req.tenantId = tenantId;
  next();
}

// Appliquer resolveTenant + vérification tenant à toutes les routes
router.use(resolveTenant());
router.use(requireTenantWithCrm);

/**
 * Mapper un lead EspoCRM vers le format frontend
 */
function mapEspoLeadToFrontend(espoLead) {
  const tagsIA = Array.isArray(espoLead.tagsIA) ? espoLead.tagsIA : [];
  let maxTags = [];
  if (typeof espoLead.maxTags === 'string' && espoLead.maxTags.length > 0) {
    maxTags = espoLead.maxTags
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }
  const baseTags = Array.isArray(espoLead.tags) ? espoLead.tags : [];
  const allTags = [...new Set([...tagsIA, ...maxTags, ...baseTags])];

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
    tags: allTags,
    score: espoLead.scoreIA || espoLead.score || 0,
    // V1 Starter - 3 nouveaux champs
    industry: espoLead.industry || '',
    website: espoLead.website || '',
    address: espoLead.addressStreet || ''
  };
}

// ═══════════════════════════════════════════════════════════════════
// WHITELIST CRM STARTER V1 - Contrat produit
// ═══════════════════════════════════════════════════════════════════
const CRM_STARTER_WHITELIST = {
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
};

/**
 * Formate un numéro de téléphone français pour EspoCRM
 * Convertit 0612345678 → +33 6 12 34 56 78
 */
function formatPhoneNumber(phone) {
  if (!phone) return phone;

  // Nettoyer le numéro (garder uniquement les chiffres et +)
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Si commence par 0 et a 10 chiffres (format français)
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    // Convertir en format international
    cleaned = '+33' + cleaned.substring(1);
  }

  // Si déjà en format +33 ou autre format international, garder tel quel
  return cleaned;
}

function validateAndMapToEspo(frontendData) {
  const errors = [];
  const espoData = {};

  for (const [field, value] of Object.entries(frontendData)) {
    if (value === undefined || value === null) continue;

    const mapping = CRM_STARTER_WHITELIST[field];
    if (!mapping) {
      errors.push(`Champ "${field}" non autorisé`);
      continue;
    }

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

    // Transformation spéciale pour le téléphone
    let finalValue = mapping.type === 'number' ? Number(value) : value;
    if (field === 'phone' && typeof value === 'string') {
      finalValue = formatPhoneNumber(value);
    }

    espoData[mapping.espoField] = finalValue;
  }

  return { valid: errors.length === 0, espoData, errors };
}

/**
 * GET /api/crm-public/leads
 * Liste des leads depuis EspoCRM - FILTRÉ PAR TENANT
 *
 * Query params:
 * - page: number (default 1)
 * - pageSize: number (default 20)
 * - status: string | string[] (clés Espo: New, Assigned, In Process, etc.)
 * - search: string (recherche dans nom, email, entreprise)
 * - notContacted: boolean (si true, filtre leads sans message_event outbound)
 * - countOnly: boolean (si true, retourne uniquement le count sans les données)
 */
router.get('/leads', async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      status,
      search,
      notContacted,
      countOnly
    } = req.query;

    const tenantId = req.tenantId;
    console.log(`[CRM] 🔒 GET /leads - Tenant: ${tenantId}, Status: ${status}, NotContacted: ${notContacted}, CountOnly: ${countOnly}`);

    // ═══════════════════════════════════════════════════════════════════
    // FILTRE "NON CONTACTÉ" : croise EspoCRM + Supabase message_events
    // ═══════════════════════════════════════════════════════════════════
    if (notContacted === 'true') {
      return await handleNotContactedFilter(req, res, { page, pageSize, status, search, countOnly });
    }

    // ═══════════════════════════════════════════════════════════════════
    // FILTRE STANDARD : requête EspoCRM seule
    // ═══════════════════════════════════════════════════════════════════

    // Construire les paramètres EspoCRM
    const offset = (page - 1) * pageSize;
    // Si countOnly, on récupère juste 1 pour avoir le total
    const maxSize = countOnly === 'true' ? 1 : pageSize;
    let endpoint = `/Lead?maxSize=${maxSize}&offset=${offset}&orderBy=createdAt&order=desc`;

    // SECURITY: Filtre tenant si le champ existe dans EspoCRM
    let whereIndex = 0;

    // Filtre tenant (si disponible)
    const tenantFilter = buildTenantFilter(tenantId, whereIndex);
    if (tenantFilter) {
      endpoint += tenantFilter;
      whereIndex++;
    }

    // Filtre par status (optionnel) - SUPPORTE MULTI-STATUT
    if (status) {
      // Normaliser en array (peut être string ou array)
      const statusArray = Array.isArray(status) ? status : [status];

      if (statusArray.length === 1) {
        // Un seul statut : utiliser equals
        endpoint += `&where[${whereIndex}][type]=equals&where[${whereIndex}][attribute]=status&where[${whereIndex}][value]=${encodeURIComponent(statusArray[0])}`;
      } else {
        // Multi-statut : utiliser IN
        endpoint += `&where[${whereIndex}][type]=in&where[${whereIndex}][attribute]=status`;
        statusArray.forEach((s, i) => {
          endpoint += `&where[${whereIndex}][value][${i}]=${encodeURIComponent(s)}`;
        });
      }
      whereIndex++;
    }

    // Filtre par recherche (optionnel) - recherche dans plusieurs champs
    if (search) {
      endpoint += `&where[${whereIndex}][type]=or`;
      endpoint += `&where[${whereIndex}][value][0][type]=contains&where[${whereIndex}][value][0][attribute]=firstName&where[${whereIndex}][value][0][value]=${encodeURIComponent(search)}`;
      endpoint += `&where[${whereIndex}][value][1][type]=contains&where[${whereIndex}][value][1][attribute]=lastName&where[${whereIndex}][value][1][value]=${encodeURIComponent(search)}`;
      endpoint += `&where[${whereIndex}][value][2][type]=contains&where[${whereIndex}][value][2][attribute]=emailAddress&where[${whereIndex}][value][2][value]=${encodeURIComponent(search)}`;
      endpoint += `&where[${whereIndex}][value][3][type]=contains&where[${whereIndex}][value][3][attribute]=accountName&where[${whereIndex}][value][3][value]=${encodeURIComponent(search)}`;
    }

    // Appel EspoCRM
    const data = await espoFetchForTenant(endpoint, req.tenant);
    const total = data.total || 0;

    // Si countOnly, retourner juste le total
    if (countOnly === 'true') {
      console.log(`[CRM] ✅ Tenant ${tenantId}: Count = ${total} leads`);
      return res.json({
        ok: true,
        total,
        filters: { status, search }
      });
    }

    // Mapper les leads
    const leads = (data.list || []).map(mapEspoLeadToFrontend);

    console.log(`[CRM] ✅ Tenant ${tenantId}: ${leads.length} leads récupérés (total: ${total})`);

    res.json({
      ok: true,
      leads,
      list: leads, // Alias pour compatibilité
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });

  } catch (error) {
    console.error('[CRM] ❌ Erreur:', error.message);
    res.status(500).json({
      ok: false,
      error: 'Erreur lors de la récupération des leads',
      details: error.message
    });
  }
});

/**
 * Handler pour le filtre "Non contacté"
 * Croise EspoCRM (leads) avec Supabase (message_events outbound)
 *
 * Logique:
 * 1. Récupère TOUS les lead_ids qui ont au moins 1 message_event outbound
 * 2. Récupère les leads depuis EspoCRM avec les autres filtres
 * 3. Exclut les leads qui ont des events outbound
 * 4. Applique pagination sur le résultat filtré
 */
async function handleNotContactedFilter(req, res, { page, pageSize, status, search, countOnly }) {
  const tenantId = req.tenantId;

  try {
    console.log(`[CRM] 🔍 Filtre "Non contacté" - Tenant: ${tenantId}`);

    // 1. Récupérer les lead_ids avec events outbound depuis Supabase
    const { data: contactedLeads, error: supabaseError } = await supabase
      .from('message_events')
      .select('lead_id')
      .eq('tenant_id', tenantId)
      .eq('direction', 'outbound')
      .not('lead_id', 'is', null);

    if (supabaseError) {
      console.error('[CRM] Erreur Supabase:', supabaseError);
      throw new Error('Erreur lors de la récupération des events');
    }

    // Set des lead_ids contactés (pour lookup rapide)
    const contactedLeadIds = new Set(contactedLeads?.map(e => e.lead_id) || []);
    console.log(`[CRM] ${contactedLeadIds.size} leads ont été contactés`);

    // 2. Récupérer TOUS les leads depuis EspoCRM (jusqu'à 1000)
    let whereIndex = 0;
    let endpoint = `/Lead?maxSize=1000&orderBy=createdAt&order=desc`;

    // Filtre tenant
    const tenantFilter = buildTenantFilter(tenantId, whereIndex);
    if (tenantFilter) {
      endpoint += tenantFilter;
      whereIndex++;
    }

    // Filtre status
    if (status) {
      const statusArray = Array.isArray(status) ? status : [status];
      if (statusArray.length === 1) {
        endpoint += `&where[${whereIndex}][type]=equals&where[${whereIndex}][attribute]=status&where[${whereIndex}][value]=${encodeURIComponent(statusArray[0])}`;
      } else {
        endpoint += `&where[${whereIndex}][type]=in&where[${whereIndex}][attribute]=status`;
        statusArray.forEach((s, i) => {
          endpoint += `&where[${whereIndex}][value][${i}]=${encodeURIComponent(s)}`;
        });
      }
      whereIndex++;
    }

    // Filtre recherche
    if (search) {
      endpoint += `&where[${whereIndex}][type]=or`;
      endpoint += `&where[${whereIndex}][value][0][type]=contains&where[${whereIndex}][value][0][attribute]=firstName&where[${whereIndex}][value][0][value]=${encodeURIComponent(search)}`;
      endpoint += `&where[${whereIndex}][value][1][type]=contains&where[${whereIndex}][value][1][attribute]=lastName&where[${whereIndex}][value][1][value]=${encodeURIComponent(search)}`;
      endpoint += `&where[${whereIndex}][value][2][type]=contains&where[${whereIndex}][value][2][attribute]=emailAddress&where[${whereIndex}][value][2][value]=${encodeURIComponent(search)}`;
      endpoint += `&where[${whereIndex}][value][3][type]=contains&where[${whereIndex}][value][3][attribute]=accountName&where[${whereIndex}][value][3][value]=${encodeURIComponent(search)}`;
    }

    const data = await espoFetchForTenant(endpoint, req.tenant);
    const allLeads = data.list || [];

    // 3. Filtrer les leads NON contactés
    const notContactedLeads = allLeads.filter(lead => !contactedLeadIds.has(lead.id));

    console.log(`[CRM] ${allLeads.length} leads total → ${notContactedLeads.length} non contactés`);

    // Si countOnly, retourner juste le total
    if (countOnly === 'true') {
      return res.json({
        ok: true,
        total: notContactedLeads.length,
        filters: { status, search, notContacted: true }
      });
    }

    // 4. Appliquer pagination
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const paginatedLeads = notContactedLeads.slice(offset, offset + parseInt(pageSize));

    // Mapper les leads
    const leads = paginatedLeads.map(mapEspoLeadToFrontend);

    res.json({
      ok: true,
      leads,
      list: leads,
      total: notContactedLeads.length,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      _debug: {
        totalFromEspo: allLeads.length,
        contactedCount: contactedLeadIds.size,
        notContactedCount: notContactedLeads.length
      }
    });

  } catch (error) {
    console.error('[CRM] ❌ Erreur filtre non contacté:', error.message);
    res.status(500).json({
      ok: false,
      error: 'Erreur lors du filtrage des leads non contactés',
      details: error.message
    });
  }
}

/**
 * GET /api/crm-public/leads/:id
 * Détail d'un lead depuis EspoCRM avec notes et activités - VÉRIFIE TENANT
 */
router.get('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    console.log(`[CRM] 🔒 GET /leads/${id} - Tenant: ${tenantId}, User: ${req.user?.email}`);

    // Récupérer le lead
    const espoLead = await espoFetchForTenant(`/Lead/${id}`, req.tenant);

    if (!espoLead) {
      return res.status(404).json({
        ok: false,
        error: 'Lead non trouvé'
      });
    }

    // SECURITY: Vérifier que le lead appartient au tenant
    if (espoLead.cTenantId && espoLead.cTenantId !== tenantId) {
      console.error(`   🚫 [CRM SECURITY] CROSS_TENANT_ACCESS - Lead ${id} belongs to ${espoLead.cTenantId}, requested by ${tenantId}`);
      return res.status(403).json({
        ok: false,
        error: 'Accès refusé: ce lead ne vous appartient pas',
        code: 'CROSS_TENANT_ACCESS'
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
      const streamData = await espoFetchForTenant(`/Lead/${id}/stream?maxSize=20`, req.tenant);

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
 * Changer le statut d'un lead - VÉRIFIE TENANT
 */
router.patch('/leads/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const tenantId = req.tenantId;

    console.log(`[CRM] 🔒 PATCH /leads/${id}/status - Tenant: ${tenantId}, User: ${req.user?.email}`);

    if (!status) {
      return res.status(400).json({
        ok: false,
        error: 'Le champ "status" est requis'
      });
    }

    // SECURITY: Vérifier d'abord que le lead appartient au tenant
    const espoLead = await espoFetchForTenant(`/Lead/${id}`, req.tenant);
    if (!espoLead) {
      return res.status(404).json({
        ok: false,
        error: 'Lead non trouvé'
      });
    }

    if (espoLead.cTenantId && espoLead.cTenantId !== tenantId) {
      console.error(`   🚫 [CRM SECURITY] CROSS_TENANT_WRITE - Lead ${id} belongs to ${espoLead.cTenantId}, write attempted by ${tenantId}`);
      return res.status(403).json({
        ok: false,
        error: 'Accès refusé: ce lead ne vous appartient pas',
        code: 'CROSS_TENANT_WRITE'
      });
    }

    // Mettre à jour le lead via EspoCRM (utilise tenant config)
    const updatedEspoLead = await espoFetchForTenant(`/Lead/${id}`, req.tenant, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });

    // Mapper le lead mis à jour
    const lead = mapEspoLeadToFrontend(updatedEspoLead);

    console.log(`[CRM] ✅ Tenant ${tenantId}: Statut du lead ${id} changé vers "${status}"`);

    // Sync automatique: mettre à jour le cache Supabase (non-bloquant)
    updateLeadInCache(tenantId, updatedEspoLead).catch(err => {
      console.warn('[CRM] ⚠️ Sync cache échoué (non-bloquant):', err.message);
    });

    res.json({
      ok: true,
      lead
    });

  } catch (error) {
    console.error('[CRM] ❌ Erreur changement statut:', error.message);
    res.status(500).json({
      ok: false,
      error: 'Erreur lors du changement de statut',
      details: error.message
    });
  }
});

/**
 * PATCH /api/crm-public/leads/:id
 * Mise à jour générique d'un lead - WHITELIST CRM STARTER V1
 *
 * SÉCURITÉ:
 * - Whitelist-only: seuls les 13 champs du contrat sont acceptés
 * - Fail-closed multi-tenant: vérifie cTenantId AVANT modification
 */
router.patch('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const tenantId = req.tenantId;

    console.log(`[CRM] 🔒 PATCH /leads/${id} - Tenant: ${tenantId}, User: ${req.user?.email}`);
    console.log('[CRM] Données reçues:', Object.keys(updateData));

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'Aucune donnée à mettre à jour'
      });
    }

    // WHITELIST VALIDATION
    const validation = validateAndMapToEspo(updateData);
    if (!validation.valid) {
      console.warn('[CRM] ❌ Validation whitelist échouée:', validation.errors);
      return res.status(400).json({
        ok: false,
        error: 'Champs non autorisés',
        details: validation.errors
      });
    }

    if (Object.keys(validation.espoData).length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'Aucun champ valide à mettre à jour'
      });
    }

    // SECURITY: Vérifier que le lead appartient au tenant
    const espoLead = await espoFetchForTenant(`/Lead/${id}`, req.tenant);
    if (!espoLead) {
      return res.status(404).json({
        ok: false,
        error: 'Lead non trouvé'
      });
    }

    if (espoLead.cTenantId && espoLead.cTenantId !== tenantId) {
      console.error(`   🚫 [CRM SECURITY] CROSS_TENANT_WRITE - Lead ${id} belongs to ${espoLead.cTenantId}, write attempted by ${tenantId}`);
      return res.status(403).json({
        ok: false,
        error: 'Accès refusé: ce lead ne vous appartient pas',
        code: 'CROSS_TENANT_WRITE'
      });
    }

    // Mettre à jour le lead via EspoCRM (utilise tenant config)
    console.log('[CRM] Envoi à EspoCRM:', validation.espoData);
    const updatedEspoLead = await espoFetchForTenant(`/Lead/${id}`, req.tenant, {
      method: 'PUT',
      body: JSON.stringify(validation.espoData)
    });
    const lead = mapEspoLeadToFrontend(updatedEspoLead);

    console.log(`[CRM] ✅ Lead ${id} mis à jour avec succès - Champs: ${Object.keys(validation.espoData).join(', ')}`);

    // Sync automatique: mettre à jour le cache Supabase (non-bloquant)
    updateLeadInCache(tenantId, updatedEspoLead).catch(err => {
      console.warn('[CRM] ⚠️ Sync cache échoué (non-bloquant):', err.message);
    });

    res.json({
      ok: true,
      lead,
      updatedFields: Object.keys(validation.espoData)
    });

  } catch (error) {
    console.error('[CRM] ❌ Erreur PATCH /leads/:id:', error.message);

    // Parser les erreurs EspoCRM pour un message plus clair
    let userMessage = 'Erreur lors de la mise à jour du lead';
    if (error.message.includes('validationFailure')) {
      try {
        const match = error.message.match(/\{.*\}/);
        if (match) {
          const espoError = JSON.parse(match[0]);
          const field = espoError.messageTranslation?.data?.field || 'inconnu';
          const fieldNames = {
            phoneNumber: 'Téléphone',
            emailAddress: 'Email',
            firstName: 'Prénom',
            lastName: 'Nom',
            website: 'Site web'
          };
          userMessage = `Format invalide pour le champ "${fieldNames[field] || field}"`;
        }
      } catch (parseErr) {
        // Garder le message par défaut
      }
    }

    res.status(500).json({
      ok: false,
      error: userMessage,
      details: error.message
    });
  }
});

/**
 * POST /api/crm-public/leads/:id/notes
 * Ajouter une note à un lead - VÉRIFIE TENANT
 */
router.post('/leads/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const tenantId = req.tenantId;

    console.log(`[CRM] 🔒 POST /leads/${id}/notes - Tenant: ${tenantId}, User: ${req.user?.email}`);

    if (!content || !content.trim()) {
      return res.status(400).json({
        ok: false,
        error: 'Le champ "content" est requis'
      });
    }

    // Récupérer le lead actuel pour ajouter la note à la description
    const espoLead = await espoFetchForTenant(`/Lead/${id}`, req.tenant);

    if (!espoLead) {
      return res.status(404).json({
        ok: false,
        error: 'Lead non trouvé'
      });
    }

    // SECURITY: Vérifier que le lead appartient au tenant
    if (espoLead.cTenantId && espoLead.cTenantId !== tenantId) {
      console.error(`   🚫 [CRM SECURITY] CROSS_TENANT_WRITE - Lead ${id} belongs to ${espoLead.cTenantId}, write attempted by ${tenantId}`);
      return res.status(403).json({
        ok: false,
        error: 'Accès refusé: ce lead ne vous appartient pas',
        code: 'CROSS_TENANT_WRITE'
      });
    }

    // Ajouter la note à la description existante
    const timestamp = new Date().toISOString();
    const notePrefix = `[${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')}] `;
    const newDescription = espoLead.description
      ? `${espoLead.description}\n\n${notePrefix}${content}`
      : `${notePrefix}${content}`;

    // Mettre à jour le lead avec la nouvelle description (utilise tenant config)
    await espoFetchForTenant(`/Lead/${id}`, req.tenant, {
      method: 'PUT',
      body: JSON.stringify({ description: newDescription })
    });

    // Créer l'objet note pour la réponse
    const note = {
      id: Date.now().toString(), // ID temporaire basé sur timestamp
      leadId: id,
      content: content,
      createdBy: req.user?.name || espoLead.assignedUserName || 'Système',
      createdAt: timestamp
    };

    console.log(`[CRM] ✅ Tenant ${tenantId}: Note ajoutée au lead ${id}`);

    res.json({
      ok: true,
      note
    });

  } catch (error) {
    console.error('[CRM] ❌ Erreur ajout note:', error.message);
    res.status(500).json({
      ok: false,
      error: 'Erreur lors de l\'ajout de la note',
      details: error.message
    });
  }
});

/**
 * GET /api/crm-public/stats
 * Statistiques CRM pour le Dashboard - DONNÉES RÉELLES ESPOCRM
 *
 * Response: {
 *   totalLeads: number,
 *   newLeadsToday: number,
 *   leadsByStatus: Array<{ status: string, count: number, color: string }>,
 *   leadsToFollowUp: number
 * }
 */
router.get('/stats', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    console.log(`[CRM] 🔒 GET /stats - Tenant: ${tenantId}, User: ${req.user?.email}`);

    // 1. Total leads
    let whereIdx = 0;
    const totalEndpoint = `/Lead?maxSize=1${buildTenantFilter(tenantId, whereIdx)}`;
    const totalData = await espoFetchForTenant(totalEndpoint, req.tenant);
    const totalLeads = totalData.total || 0;

    // 2. Nouveaux leads aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    const todayStart = `${today} 00:00:00`;
    whereIdx = 0;
    let newTodayEndpoint = `/Lead?maxSize=1${buildTenantFilter(tenantId, whereIdx)}`;
    if (ESPO_HAS_TENANT_FIELD) whereIdx++;
    newTodayEndpoint += `&where[${whereIdx}][type]=after&where[${whereIdx}][attribute]=createdAt&where[${whereIdx}][value]=${encodeURIComponent(todayStart)}`;
    const newTodayData = await espoFetchForTenant(newTodayEndpoint, req.tenant);
    const newLeadsToday = newTodayData.total || 0;

    // 3. Leads par statut
    const statuses = ['New', 'Assigned', 'In Process', 'Converted', 'Recycled', 'Dead'];
    const statusColors = {
      'New': '#3B82F6',
      'Assigned': '#10B981',
      'In Process': '#F59E0B',
      'Converted': '#22C55E',
      'Recycled': '#6B7280',
      'Dead': '#EF4444'
    };

    const leadsByStatus = [];
    for (const status of statuses) {
      whereIdx = 0;
      let statusEndpoint = `/Lead?maxSize=1${buildTenantFilter(tenantId, whereIdx)}`;
      if (ESPO_HAS_TENANT_FIELD) whereIdx++;
      statusEndpoint += `&where[${whereIdx}][type]=equals&where[${whereIdx}][attribute]=status&where[${whereIdx}][value]=${encodeURIComponent(status)}`;

      try {
        const statusData = await espoFetchForTenant(statusEndpoint, req.tenant);
        if (statusData.total > 0) {
          leadsByStatus.push({
            status,
            count: statusData.total,
            color: statusColors[status] || '#6B7280'
          });
        }
      } catch (err) {
        console.warn(`[CRM] ⚠️ Erreur comptage status ${status}:`, err.message);
      }
    }

    // 4. Leads à relancer (New/Assigned créés >3 jours)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0] + ' 00:00:00';

    whereIdx = 0;
    let followUpEndpoint = `/Lead?maxSize=1${buildTenantFilter(tenantId, whereIdx)}`;
    if (ESPO_HAS_TENANT_FIELD) whereIdx++;
    followUpEndpoint += `&where[${whereIdx}][type]=or`;
    followUpEndpoint += `&where[${whereIdx}][value][0][type]=equals&where[${whereIdx}][value][0][attribute]=status&where[${whereIdx}][value][0][value]=New`;
    followUpEndpoint += `&where[${whereIdx}][value][1][type]=equals&where[${whereIdx}][value][1][attribute]=status&where[${whereIdx}][value][1][value]=Assigned`;
    whereIdx++;
    followUpEndpoint += `&where[${whereIdx}][type]=before&where[${whereIdx}][attribute]=createdAt&where[${whereIdx}][value]=${encodeURIComponent(threeDaysAgoStr)}`;

    let leadsToFollowUp = 0;
    try {
      const followUpData = await espoFetchForTenant(followUpEndpoint, req.tenant);
      leadsToFollowUp = followUpData.total || 0;
    } catch (err) {
      console.warn(`[CRM] ⚠️ Erreur comptage leads à relancer:`, err.message);
    }

    console.log(`[CRM] ✅ Stats tenant ${tenantId}: ${totalLeads} leads, ${newLeadsToday} aujourd'hui, ${leadsToFollowUp} à relancer`);

    res.json({
      ok: true,
      totalLeads,
      newLeadsToday,
      leadsByStatus,
      leadsToFollowUp
    });

  } catch (error) {
    console.error('[CRM] ❌ Erreur stats:', error.message);
    res.status(500).json({
      ok: false,
      error: 'Erreur lors de la récupération des statistiques CRM',
      details: error.message
    });
  }
});

/**
 * GET /api/crm-public/trends
 * Tendance leads sur les derniers jours - DONNÉES RÉELLES ESPOCRM
 *
 * Query params:
 *   - days: number (default 7)
 *
 * Response: {
 *   trends: Array<{ date: string, count: number, converted: number }>
 * }
 */
router.get('/trends', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const days = parseInt(req.query.days) || 7;

    console.log(`[CRM] 🔒 GET /trends - Tenant: ${tenantId}, Days: ${days}, User: ${req.user?.email}`);

    const trends = [];

    // Pour chaque jour, compter les leads créés et convertis
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayStart = `${dateStr} 00:00:00`;
      const dayEnd = `${dateStr} 23:59:59`;

      // Leads créés ce jour
      let whereIdx = 0;
      let createdEndpoint = `/Lead?maxSize=1${buildTenantFilter(tenantId, whereIdx)}`;
      if (ESPO_HAS_TENANT_FIELD) whereIdx++;
      createdEndpoint += `&where[${whereIdx}][type]=between&where[${whereIdx}][attribute]=createdAt&where[${whereIdx}][value][]=${encodeURIComponent(dayStart)}&where[${whereIdx}][value][]=${encodeURIComponent(dayEnd)}`;

      let count = 0;
      try {
        const createdData = await espoFetchForTenant(createdEndpoint, req.tenant);
        count = createdData.total || 0;
      } catch (err) {
        console.warn(`[CRM] ⚠️ Erreur comptage leads créés ${dateStr}:`, err.message);
      }

      // Leads convertis ce jour
      whereIdx = 0;
      let convertedEndpoint = `/Lead?maxSize=1${buildTenantFilter(tenantId, whereIdx)}`;
      if (ESPO_HAS_TENANT_FIELD) whereIdx++;
      convertedEndpoint += `&where[${whereIdx}][type]=equals&where[${whereIdx}][attribute]=status&where[${whereIdx}][value]=Converted`;
      whereIdx++;
      convertedEndpoint += `&where[${whereIdx}][type]=between&where[${whereIdx}][attribute]=modifiedAt&where[${whereIdx}][value][]=${encodeURIComponent(dayStart)}&where[${whereIdx}][value][]=${encodeURIComponent(dayEnd)}`;

      let converted = 0;
      try {
        const convertedData = await espoFetchForTenant(convertedEndpoint, req.tenant);
        converted = convertedData.total || 0;
      } catch (err) {
        console.warn(`[CRM] ⚠️ Erreur comptage leads convertis ${dateStr}:`, err.message);
      }

      trends.push({
        date: dateStr,
        count,
        converted
      });
    }

    console.log(`[CRM] ✅ Trends tenant ${tenantId}: ${days} jours récupérés`);

    res.json({
      ok: true,
      trends
    });

  } catch (error) {
    console.error('[CRM] ❌ Erreur trends:', error.message);
    res.status(500).json({
      ok: false,
      error: 'Erreur lors de la récupération des tendances CRM',
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
    const data = await espoFetchForTenant('/Lead?maxSize=1', req.tenant);

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
