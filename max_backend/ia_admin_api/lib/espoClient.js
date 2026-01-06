// lib/espoClient.js
import 'dotenv/config';

const ESPO_BASE   = process.env.ESPO_BASE_URL || 'http://127.0.0.1:8081/api/v1';
const ESPO_TOKEN  = process.env.ESPO_TOKEN   || ''; // Authorization: Bearer
const ESPO_APIKEY = process.env.ESPO_API_KEY || ''; // X-Api-Key
const ESPO_USER   = process.env.ESPO_USERNAME || '';
const ESPO_PASS   = process.env.ESPO_PASSWORD || '';

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

export async function espoFetch(path, init = {}) {
  const url = `${ESPO_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  const res = await fetch(url, { headers: { ...buildAuthHeaders(), ...(init.headers||{}) }, ...init });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Espo ${res.status} ${res.statusText} – ${text}`);
  }
  // 204 No Content -> return null
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
