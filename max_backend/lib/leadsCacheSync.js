/**
 * lib/leadsCacheSync.js
 * Synchronisation EspoCRM → Supabase leads_cache
 *
 * V1 Simple:
 * - Sync complète (pas incrémentale)
 * - Appelée manuellement ou via cron
 * - Upsert pour éviter doublons
 */

import { createClient } from '@supabase/supabase-js';
import { espoFetch } from './espoClient.js';
import { supabase } from './supabaseClient.js';

/**
 * Synchronise les leads d'un tenant depuis EspoCRM vers Supabase
 * @param {string} tenantId - ID du tenant
 * @param {Object} tenantConfig - Config tenant (espo_url, espo_api_key)
 * @returns {Object} { ok, synced, errors }
 */
export async function syncLeadsCache(tenantId, tenantConfig) {
  const startTime = Date.now();
  console.log(`[LeadsCache] 🔄 Sync démarrée pour tenant: ${tenantId}`);

  try {
    // 1. Récupérer tous les leads actifs depuis EspoCRM
    const espoLeads = await fetchAllLeadsFromEspo(tenantId, tenantConfig);
    console.log(`[LeadsCache] 📥 ${espoLeads.length} leads récupérés depuis EspoCRM`);

    if (espoLeads.length === 0) {
      return {
        ok: true,
        synced: 0,
        message: 'Aucun lead à synchroniser'
      };
    }

    // 2. Transformer les leads pour Supabase
    const cacheLeads = espoLeads.map(lead => transformLeadForCache(lead, tenantId));

    // 3. Upsert dans Supabase (batch)
    // Utilise la clé composite id (tenant_id + espo_id)
    const { data, error } = await supabase
      .from('leads_cache')
      .upsert(cacheLeads, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error(`[LeadsCache] ❌ Erreur upsert Supabase:`, error);
      return {
        ok: false,
        error: error.message,
        synced: 0
      };
    }

    const duration = Date.now() - startTime;
    console.log(`[LeadsCache] ✅ Sync terminée: ${cacheLeads.length} leads en ${duration}ms`);

    return {
      ok: true,
      synced: cacheLeads.length,
      duration_ms: duration
    };

  } catch (error) {
    console.error(`[LeadsCache] ❌ Erreur sync:`, error);
    return {
      ok: false,
      error: error.message,
      synced: 0
    };
  }
}

/**
 * Récupère tous les leads depuis EspoCRM (pagination automatique)
 * SÉCURITÉ: Filtre par tenant si ESPO_HAS_TENANT_FIELD=true
 */
async function fetchAllLeadsFromEspo(tenantId, tenantConfig) {
  const allLeads = [];
  const pageSize = 200; // Augmenté pour réduire les appels API
  let offset = 0;
  let hasMore = true;
  let pageCount = 0;

  // Construire le filtre tenant si applicable
  const hasTenantField = process.env.ESPO_HAS_TENANT_FIELD === 'true';
  let whereClause = '';

  if (hasTenantField) {
    whereClause = `&where[0][type]=equals&where[0][attribute]=cTenantId&where[0][value]=${tenantId}`;
    console.log(`[LeadsCache] 🔒 Filtrage EspoCRM par cTenantId=${tenantId}`);
  } else {
    console.log(`[LeadsCache] ⚠️ ESPO_HAS_TENANT_FIELD non activé - sync tous leads`);
  }

  const startTime = Date.now();

  while (hasMore) {
    try {
      const url = `/Lead?maxSize=${pageSize}&offset=${offset}&orderBy=createdAt&order=desc${whereClause}`;
      const response = await espoFetch(url);

      if (response && response.list) {
        allLeads.push(...response.list);
        hasMore = response.list.length === pageSize;
        offset += pageSize;
        pageCount++;

        // Log de progression tous les 500 leads
        if (allLeads.length % 500 === 0 || !hasMore) {
          console.log(`[LeadsCache] 📊 Progression: ${allLeads.length} leads (page ${pageCount})`);
        }
      } else {
        hasMore = false;
      }
    } catch (error) {
      console.error(`[LeadsCache] Erreur fetch page ${offset}:`, error.message);
      hasMore = false;
    }
  }

  const duration = Date.now() - startTime;
  console.log(`[LeadsCache] ✓ Fetch terminé: ${allLeads.length} leads en ${duration}ms (${pageCount} pages)`)

  return allLeads;
}

/**
 * Transforme un lead EspoCRM en format leads_cache
 * Champs compatibles avec maxDecisionEngine et alertGenerator
 *
 * Compatible avec ancien et nouveau schéma:
 * - Ancien: id, name, email, phone, status, created_at_espo
 * - Nouveau: + espo_id, first_name, last_name, created_at, updated_at
 * - V2: + tags (fusion tagsIA + maxTags)
 */
function transformLeadForCache(espoLead, tenantId) {
  const fullName = `${espoLead.firstName || ''} ${espoLead.lastName || ''}`.trim() || espoLead.name || '';
  const createdAt = espoLead.createdAt;
  const modifiedAt = espoLead.modifiedAt || espoLead.createdAt;

  // Fusionner tagsIA et maxTags (sans doublons)
  const tagsIA = Array.isArray(espoLead.tagsIA) ? espoLead.tagsIA : [];
  
  // MaxTags peut être string "tag1,tag2" ou array - normaliser en array
  let maxTags = [];
  if (espoLead.maxTags) {
    if (Array.isArray(espoLead.maxTags)) {
      maxTags = espoLead.maxTags;
    } else if (typeof espoLead.maxTags === 'string') {
      // Supporte séparateurs virgule OU espaces
      maxTags = espoLead.maxTags
        .split(/[\s,]+/)
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    }
  }
  
  const allTags = [...new Set([...tagsIA, ...maxTags])].filter(t => t && typeof t === 'string');

  return {
    // Clé primaire composite (unique par tenant)
    id: `${tenantId}_${espoLead.id}`,

    // Identifiants
    espo_id: espoLead.id,
    tenant_id: tenantId,

    // Données lead
    name: fullName,
    first_name: espoLead.firstName || '',
    last_name: espoLead.lastName || '',
    email: espoLead.emailAddress || '',
    phone: espoLead.phoneNumber || '',
    company: espoLead.accountName || '',
    status: espoLead.status || 'New',

    // Scoring & source
    score: espoLead.score || 0,
    source: espoLead.source || '',

    // Tags (fusion tagsIA + maxTags depuis EspoCRM)
    tags: allTags,

    // Environnement CRM (prod, dev, local)
    // ✅ SÉCURITÉ: Permet filtrage PROD-only dans campaigns
    crm_env: process.env.CRM_ENV || 'prod',

    // Timestamps (nouveau schéma)
    last_activity_at: modifiedAt,
    created_at: createdAt,
    updated_at: modifiedAt,

    // Compatibilité ancien schéma
    created_at_espo: createdAt,

    // Sync metadata
    synced_at: new Date().toISOString()
  };
}

/**
 * Supprime les leads orphelins (supprimés dans EspoCRM)
 * À appeler périodiquement pour nettoyage
 */
export async function cleanOrphanLeads(tenantId, validLeadIds) {
  try {
    const { error } = await supabase
      .from('leads_cache')
      .delete()
      .eq('tenant_id', tenantId)
      .not('id', 'in', `(${validLeadIds.join(',')})`);

    if (error) {
      console.error(`[LeadsCache] Erreur nettoyage:`, error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * Obtenir les stats du cache pour un tenant
 */
export async function getCacheStats(tenantId) {
  try {
    const { data, error } = await supabase
      .from('leads_cache')
      .select('status, score')
      .eq('tenant_id', tenantId);

    if (error) throw error;

    const stats = {
      total: data.length,
      by_status: {},
      avg_score: 0,
      high_score_count: 0
    };

    let scoreSum = 0;
    for (const lead of data) {
      stats.by_status[lead.status] = (stats.by_status[lead.status] || 0) + 1;
      scoreSum += lead.score || 0;
      if (lead.score >= 70) stats.high_score_count++;
    }

    stats.avg_score = data.length > 0 ? Math.round(scoreSum / data.length) : 0;

    return { ok: true, stats };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * Récupère tous les tags uniques depuis le cache Supabase
 * @param {string} tenantId - ID du tenant
 * @param {string} search - Filtre de recherche optionnel
 * @returns {Object} { ok, tags, count }
 */
export async function getTagsFromCache(tenantId, search = null) {
  try {
    const crmEnv = process.env.CRM_ENV || 'prod';
    console.log(`[LeadsCache] 🏷️ Récupération tags pour tenant: ${tenantId} (env: ${crmEnv})`);

    // Récupérer tous les leads du tenant avec leurs tags
    // SÉCURITÉ: Filtre crm_env pour séparer environnements
    const { data, error } = await supabase
      .from('leads_cache')
      .select('tags')
      .eq('tenant_id', tenantId)
      .eq('crm_env', crmEnv);  // ✅ Filtrage par environnement

    if (error) {
      console.error(`[LeadsCache] ❌ Erreur récupération tags:`, error);
      throw error;
    }

    // Extraire tous les tags uniques
    const tagsSet = new Set();
    for (const lead of data || []) {
      if (lead.tags && Array.isArray(lead.tags)) {
        lead.tags.forEach(tag => {
          if (tag && typeof tag === 'string' && tag.trim()) {
            tagsSet.add(tag.trim());
          }
        });
      }
    }

    // Convertir en array et trier
    let tags = Array.from(tagsSet).sort((a, b) => a.localeCompare(b, 'fr'));

    // Filtrer par recherche si spécifié
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      tags = tags.filter(tag => tag.toLowerCase().includes(searchLower));
    }

    console.log(`[LeadsCache] ✅ ${tags.length} tags trouvés`);

    return {
      ok: true,
      tags,
      count: tags.length
    };

  } catch (error) {
    console.error(`[LeadsCache] ❌ Erreur getTagsFromCache:`, error);
    return {
      ok: false,
      tags: [],
      count: 0,
      error: error.message
    };
  }
}

/**
 * Met à jour un seul lead dans le cache Supabase
 * Appelé automatiquement après modification d'un lead via l'API
 * @param {string} tenantId - ID du tenant
 * @param {Object} espoLead - Lead EspoCRM complet (avec tagsIA, maxTags, etc.)
 * @returns {Object} { ok, error? }
 */
export async function updateLeadInCache(tenantId, espoLead) {
  try {
    if (!tenantId || !espoLead || !espoLead.id) {
      console.warn('[LeadsCache] ⚠️ updateLeadInCache: paramètres manquants');
      return { ok: false, error: 'Paramètres manquants' };
    }

    console.log(`[LeadsCache] 🔄 Mise à jour cache pour lead ${espoLead.id} (tenant: ${tenantId})`);

    // Transformer le lead pour le cache
    const cacheData = transformLeadForCache(espoLead, tenantId);

    // Upsert dans Supabase
    const { error } = await supabase
      .from('leads_cache')
      .upsert(cacheData, {
        onConflict: 'id',
        ignoreDuplicates: false
      });

    if (error) {
      console.error(`[LeadsCache] ❌ Erreur upsert lead:`, error);
      return { ok: false, error: error.message };
    }

    console.log(`[LeadsCache] ✅ Cache mis à jour pour lead ${espoLead.id}`);
    return { ok: true };

  } catch (error) {
    console.error(`[LeadsCache] ❌ Erreur updateLeadInCache:`, error);
    return { ok: false, error: error.message };
  }
}

export default {
  syncLeadsCache,
  cleanOrphanLeads,
  getCacheStats,
  getTagsFromCache,
  updateLeadInCache
};
