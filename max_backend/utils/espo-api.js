// utils/espo-api.js
import 'dotenv/config';
import fetch from 'node-fetch';

const ESPO_BASE = process.env.ESPO_BASE_URL?.replace(/\/+$/, '') || 'http://127.0.0.1:8081';
const ESPO_API_KEY = process.env.ESPO_API_KEY; // ← vérifie qu'elle est bien chargée

function ensureApiKey() {
  if (!ESPO_API_KEY) {
    throw new Error('ESPO_API_KEY_MISSING');
  }
}

export async function espoFetch(path, opts = {}) {
  ensureApiKey();

  const url = `${ESPO_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  const headers = {
    'X-Api-Key': ESPO_API_KEY,
    'Content-Type': 'application/json',
    ...(opts.headers || {})
  };

  const res = await fetch(url, { ...opts, headers });
  const text = await res.text();

  if (!res.ok) {
    // Remonte le code et le body pour debug ciblé
    const msg = `Espo fetch ${res.status}: ${res.statusText}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = text;
    err.url = url;
    throw err;
  }

  // Espo renvoie toujours JSON sur /api/v1/*
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Récupération simple des leads (évite filtres complexes pour supprimer les 400) */
export async function getAllLeads({ maxSize = 200, offset = 0 } = {}) {
  const q = new URLSearchParams({ maxSize: String(maxSize), offset: String(offset) });
  // Pas d'orderBy si ton instance n'a pas ce champ → retire pour éviter 400
  return espoFetch(`/Lead?${q.toString()}`, { method: 'GET' });
}

export async function updateLead(id, payload) {
  return espoFetch(`Lead/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

/**
 * Créer un lead dans EspoCRM
 * @param {Object} payload - Données du lead
 * @param {string} tenantId - Tenant ID (obligatoire pour isolation multi-tenant)
 */
export async function createLead(payload, tenantId) {
  // SECURITY: Ajouter cTenantId pour isolation multi-tenant
  const leadData = {
    ...payload,
    cTenantId: tenantId || payload.cTenantId || 'macrea' // Fallback vers macrea pour compatibilité
  };

  if (!leadData.cTenantId) {
    console.error('[SECURITY] createLead appelé sans tenantId!');
  }

  return espoFetch('Lead', { method: 'POST', body: JSON.stringify(leadData) });
}

export async function findLeadByEmail(email) {
  const leads = await getAllLeads(`?where[0][field]=emailAddress&where[0][type]=equals&where[0][value]=${encodeURIComponent(email)}&maxSize=1`);
  return leads[0] || null;
}

/**
 * Créer ou mettre à jour un lead dans EspoCRM
 * @param {Object} payload - Données du lead
 * @param {string} tenantId - Tenant ID (obligatoire pour isolation multi-tenant)
 */
export async function upsertLead(payload, tenantId) {
  const existing = payload.emailAddress ? await findLeadByEmail(payload.emailAddress) : null;

  if (existing) {
    return await updateLead(existing.id, payload);
  } else {
    return await createLead(payload, tenantId);
  }
}

export async function createContact(payload) {
  return espoFetch('Contact', { method: 'POST', body: JSON.stringify(payload) });
}

export async function findContactByEmail(email) {
  const contacts = await espoFetch(`Contact?where[0][field]=emailAddress&where[0][type]=equals&where[0][value]=${encodeURIComponent(email)}&maxSize=1`);
  const data = Array.isArray(contacts) ? contacts : (contacts.list || []);
  return data[0] || null;
}

export async function upsertContact(payload) {
  const existing = payload.emailAddress ? await findContactByEmail(payload.emailAddress) : null;

  if (existing) {
    return espoFetch(`Contact/${existing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
  } else {
    return createContact(payload);
  }
}
