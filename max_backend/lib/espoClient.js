// lib/espoClient.js
/**
 * Client EspoCRM avec support multi-tenant
 *
 * SÉCURITÉ MULTI-TENANT:
 * - Utilisez injectTenantId() pour ajouter cTenantId aux données de création
 * - Utilisez buildTenantFilter() pour filtrer les requêtes par tenant
 * - ESPO_HAS_TENANT_FIELD contrôle si le filtrage est actif
 */
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { normalizeLeadUpdate } from './fieldValidator.js';

// Load .env from max_backend directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '..', '.env') });

// ═══════════════════════════════════════════════════════════════════
// SÉCURITÉ PROD: Aucun fallback localhost - crash explicite si manquant
// ═══════════════════════════════════════════════════════════════════
const ESPO_BASE = process.env.ESPO_BASE_URL;
if (!ESPO_BASE) {
  throw new Error('[ESPO_CLIENT] FATAL: ESPO_BASE_URL non défini. Configurez cette variable dans .env');
}

const ESPO_TOKEN  = process.env.ESPO_TOKEN   || ''; // Authorization: Bearer
const ESPO_APIKEY = process.env.ESPO_API_KEY || ''; // X-Api-Key
const ESPO_USER   = process.env.ESPO_USERNAME || '';
const ESPO_PASS   = process.env.ESPO_PASSWORD || '';

// Log de la config (sans secrets)
console.log(`[ESPO_CLIENT] Configured ESPO_BASE_URL: ${ESPO_BASE}`);

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION MULTI-TENANT
// ═══════════════════════════════════════════════════════════════════
const ESPO_HAS_TENANT_FIELD = process.env.ESPO_HAS_TENANT_FIELD === 'true';

/**
 * Injecter le cTenantId dans les données d'un lead
 * À utiliser AVANT chaque création/modification de lead
 *
 * @param {Object} leadData - Données du lead
 * @param {string} tenantId - ID du tenant (depuis JWT)
 * @returns {Object} - Données avec cTenantId injecté
 */
export function injectTenantId(leadData, tenantId) {
  if (!ESPO_HAS_TENANT_FIELD) return leadData;
  if (!tenantId) {
    console.warn('[ESPO_CLIENT] ⚠️ injectTenantId appelé sans tenantId!');
    return leadData;
  }
  return { ...leadData, cTenantId: tenantId };
}

/**
 * Construire le filtre tenant pour les requêtes EspoCRM
 *
 * @param {string} tenantId - ID du tenant
 * @param {number} whereIndex - Index du where clause (default 0)
 * @returns {string} - Query string à ajouter à l'URL
 */
export function buildTenantFilter(tenantId, whereIndex = 0) {
  if (!ESPO_HAS_TENANT_FIELD) return '';
  if (!tenantId) return '';
  return `&where[${whereIndex}][type]=equals&where[${whereIndex}][attribute]=cTenantId&where[${whereIndex}][value]=${encodeURIComponent(tenantId)}`;
}

/**
 * Vérifier si le filtrage tenant est actif
 */
export function isTenantFilterActive() {
  return ESPO_HAS_TENANT_FIELD;
}

function buildAuthHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (ESPO_TOKEN)  h['Authorization'] = `Bearer ${ESPO_TOKEN}`;
  if (ESPO_APIKEY) h['X-Api-Key']     = ESPO_APIKEY;
  if (!ESPO_TOKEN && !ESPO_APIKEY && ESPO_USER && ESPO_PASS) {
    const basic = Buffer.from(`${ESPO_USER}:${ESPO_PASS}`).toString('base64');
    h['Authorization'] = `Basic ${basic}`;
  }
  return h;
}

function buildAdminAuthHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (ESPO_USER && ESPO_PASS) {
    const basic = Buffer.from(`${ESPO_USER}:${ESPO_PASS}`).toString('base64');
    h['Authorization'] = `Basic ${basic}`;
  } else {
    throw new Error('Admin credentials (ESPO_USERNAME/ESPO_PASSWORD) not configured');
  }
  return h;
}

export async function espoFetch(path, init = {}) {
  const url = `${ESPO_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  const headers = { ...buildAuthHeaders(), ...(init.headers||{}) };

  // Debug log
  console.log(`[ESPO_CLIENT] 🔍 Request: ${init.method || 'GET'} ${url}`);
  console.log(`[ESPO_CLIENT] 🔑 API Key:`, headers['X-Api-Key'] ? `${headers['X-Api-Key'].substring(0, 10)}...` : 'NOT SET');

  // IMPORTANT: Ne pas spread init car init.headers écraserait notre headers fusionné
  const { headers: _ignored, ...initWithoutHeaders } = init;
  const res = await fetch(url, { ...initWithoutHeaders, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[ESPO_CLIENT] ❌ ${res.status} ${res.statusText} – URL: ${url}`);
    throw new Error(`Espo ${res.status} ${res.statusText} – ${text}`);
  }
  // 204 No Content -> return null
  if (res.status === 204) return null;
  try { return await res.json(); } catch (e) { return null; }
}

// Admin version: always uses Basic Auth with admin credentials
export async function espoAdminFetch(path, init = {}) {
  const url = `${ESPO_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  const headers = { ...buildAdminAuthHeaders(), ...(init.headers||{}) };
  const { headers: _ignored, ...initWithoutHeaders } = init;
  const res = await fetch(url, { ...initWithoutHeaders, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Espo Admin ${res.status} ${res.statusText} – ${text}`);
  }
  if (res.status === 204) return null;
  try { return await res.json(); } catch (e) { return null; }
}

// Lightweight helper used by server code: espo(method, path, { body, headers })
export async function espo(method, path, { body, headers } = {}) {
  const url = `${ESPO_BASE}/${String(path).replace(/^\/+/, '')}`;
  const init = { method, headers: { ...buildAuthHeaders(), ...(headers || {}) } };
  if (body !== undefined) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
    init.headers['Content-Type'] = init.headers['Content-Type'] || 'application/json';
  }

  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} – ${text}`);
  }
  if (res.status === 204) return null;
  try { return await res.json(); } catch { return null; }
}

// Admin version of espo helper
export async function espoAdmin(method, path, { body, headers } = {}) {
  const url = `${ESPO_BASE}/${String(path).replace(/^\/+/, '')}`;
  const init = { method, headers: { ...buildAdminAuthHeaders(), ...(headers || {}) } };
  if (body !== undefined) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
    init.headers['Content-Type'] = init.headers['Content-Type'] || 'application/json';
  }

  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Admin ${res.status} ${res.statusText} – ${text}`);
  }
  if (res.status === 204) return null;
  try { return await res.json(); } catch { return null; }
}

/**
 * SAFE UPDATE LEAD - Wrapper sécurisé avec validation automatique des champs
 *
 * Cette fonction intercepte TOUTES les écritures vers Lead et applique:
 * 1. Validation des champs selon le mapping officiel
 * 2. Normalisation automatique (anciens champs → nouveaux champs)
 * 3. Rejet strict des champs non autorisés
 *
 * @param {string} leadId - ID du lead à mettre à jour
 * @param {Object} updateData - Données à mettre à jour
 * @param {Object} options - Options { skipValidation: boolean }
 * @returns {Promise<Object>} Lead mis à jour
 */
export async function safeUpdateLead(leadId, updateData, options = {}) {
  // Option pour bypass (debug uniquement)
  if (options.skipValidation) {
    console.warn('[ESPO_CLIENT] ⚠️  Validation SKIPPED - Mode debug');
    return espoFetch(`/Lead/${leadId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData)
    });
  }

  // Valider et normaliser les données
  let normalized;
  try {
    normalized = normalizeLeadUpdate(updateData, { silent: false });
  } catch (error) {
    if (error.code === 'FIELD_VALIDATION_ERROR') {
      console.error('[ESPO_CLIENT] ❌ Validation échouée:', error.details);
      throw new Error(`Impossible de mettre à jour le lead ${leadId}: ${error.message}\n${JSON.stringify(error.details.errors, null, 2)}`);
    }
    throw error;
  }

  // Log de l'opération
  console.log(`[ESPO_CLIENT] ✅ Lead ${leadId} - Validation OK - Champs: ${Object.keys(normalized).join(', ')}`);

  // Envoyer à EspoCRM
  return espoFetch(`/Lead/${leadId}`, {
    method: 'PATCH',
    body: JSON.stringify(normalized)
  });
}

/**
 * SAFE CREATE LEAD - Wrapper sécurisé pour création de Lead
 */
export async function safeCreateLead(leadData, options = {}) {
  if (options.skipValidation) {
    console.warn('[ESPO_CLIENT] ⚠️  Validation SKIPPED - Mode debug');
    return espoFetch('/Lead', {
      method: 'POST',
      body: JSON.stringify(leadData)
    });
  }

  const normalized = normalizeLeadUpdate(leadData, { silent: false });
  console.log(`[ESPO_CLIENT] ✅ Création Lead - Validation OK - Champs: ${Object.keys(normalized).join(', ')}`);

  return espoFetch('/Lead', {
    method: 'POST',
    body: JSON.stringify(normalized)
  });
}

let _last = { ok:false, checkedAt:0, details:null };
const TTL = 15_000;

export async function espoStatus(force = false) {
  const now = Date.now();
  if (!force && now - _last.checkedAt < TTL) return _last;
  try {
    const ping = await espoFetch('/Lead?maxSize=1');
    _last = { ok:true, checkedAt:now, details:{ base: ESPO_BASE, sample: ping?.list?.length ?? 0 } };
  } catch (e) {
    _last = { ok:false, checkedAt:now, details:{ base: ESPO_BASE, error: String(e) } };
  }
  return _last;
}

export function ensureEspoAuth() {
  return async (req, res, next) => {
    const st = await espoStatus();
    if (!st.ok) {
      return res.status(503).json({
        ok:false,
        error:'Espo auth/config invalide',
        details: st.details,
        hint:'Configure ESPO_BASE_URL + (ESPO_TOKEN | ESPO_API_KEY | ESPO_USERNAME/PASSWORD)',
      });
    }
    next();
  };
}
