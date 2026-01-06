// utils/espoClient.js
// Node 18+ a fetch global; sinon: import fetch from 'node-fetch';

function buildBase() {
  // Priorité ESPO_URL; fallback ESPO_BASE_URL si présent
  const raw = (process.env.ESPO_URL || process.env.ESPO_BASE_URL || 'http://127.0.0.1:8081').trim();
  // Enlève tout /api/vX/truc déjà présent, et trailing slashes
  const base = raw.replace(/\/api\/v\d+.*$/i, '').replace(/\/+$/, '');
  return `${base}/api/v1`;
}

const API = buildBase();

export async function espo(method, path, options = {}) {
  const url = `${API}/${String(path).replace(/^\/+/, '')}`;
  const headers = { ...(options.headers || {}) };

  // Injecte toujours la clé, sans écraser d’autres entêtes utiles
  headers['X-Api-Key'] = process.env.ESPO_API_KEY;

  // Body: si objet → JSON
  let body = options.body ?? null;
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    body = JSON.stringify(body);
  }

  // DEBUG (temporaire) : aide à tracer les 401
  // console.log('[espo] =>', method, url, 'key_last4=', (process.env.ESPO_API_KEY||'').slice(-4));

  const res = await fetch(url, { method, headers, body });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : {}; } catch { data = text; }

  if (!res.ok) {
    const err = new Error(`ESPO_HTTP_${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// Helpers utilisés par server.js (gardés pour compat)
export async function getMetadata(path) {
  return espo('GET', `Metadata/${String(path).replace(/^\/+/, '')}`);
}
export async function updateEntity(entity, id, patch) {
  return espo('PATCH', `${entity}/${id}`, patch);
}
export async function linkMany(entity, id, link, ids = []) {
  return espo('POST', `${entity}/${id}/link/${link}`, { ids });
}
export async function ensureTagId(name) {
  const q = encodeURIComponent(JSON.stringify([{ type:'equals', attribute:'name', value:name }]));
  const found = await espo('GET', `Tag?maxSize=1&where=${q}`);
  if (found?.list?.[0]?.id) return found.list[0].id;
  const created = await espo('POST', 'Tag', { name });
  return created?.id;
}
export { espo as default };
