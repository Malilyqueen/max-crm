import 'dotenv/config';
// routes/etq_actions.js (ESM)
import express from 'express';
const router = express.Router();

// --- helpers HTTP vers Espo ---

const ESPO = (process.env.ESPO_URL || 'http://127.0.0.1:8081').replace(/\/+$/, '');
const ESPO_TIMEOUT_MS = Number(process.env.ESPO_TIMEOUT_MS || 15000); // 15s par défaut

console.log('[M.A.X:etq] ESPO_URL=', process.env.ESPO_URL, ' | API_KEY last4=', (process.env.ESPO_API_KEY || '').slice(-4));

function hjson() {
  const h = { 'Content-Type': 'application/json' };
  const key = process.env.ESPO_API_KEY; // lu à chaque requête
  if (key) h['X-Api-Key'] = key;
  return h;
}

async function espoFetch(path, options = {}) {
  const url = `${ESPO}/api/v1${path}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort('timeout'), ESPO_TIMEOUT_MS);

  console.log('[ESPO] →', options.method || 'GET', url);
  try {
    const res = await fetch(url, { ...options, headers: { ...(options.headers || {}), ...hjson() }, signal: controller.signal });
    const text = await res.text(); // lis le body une fois
    if (!res.ok) {
      console.error('[ESPO] ←', res.status, text?.slice(0,200));
      throw new Error(`${options.method || 'GET'} ${path} ${res.status} ${text}`);
    }
    console.log('[ESPO] ←', res.status, (text?.length || 0) + 'B');
    return text ? JSON.parse(text) : null;
  } catch (e) {
    console.error('[ESPO][ERROR]', String(e));
    throw e;
  } finally {
    clearTimeout(t);
  }
}

const espoGet    = (p)   => espoFetch(p);
const espoPost   = (p,b) => espoFetch(p, { method: 'POST', body: JSON.stringify(b || {}) });
const espoDelete = (p)   => espoFetch(p, { method: 'DELETE' });

// selftest interne du router
router.get('/__selftest', (_req,res)=>res.json({ ok:true, scope:'etiquette-actions', espo: ESPO }));

// helpers…
async function listLeads({ statuses=[], sinceDays=0, limit=600, pageSize=200 }) { /* …(identique à avant)… */ }
async function findOrCreateEtqId(name, color) { /* … */ }
async function linkEtiquette(leadId, etqId){ return espoPost(`/Lead/${leadId}/relation/etiquettes`,{id:etqId}); }
async function unlinkEtiquette(leadId, etqId){ return espoDelete(`/Lead/${leadId}/relation/etiquettes/${etqId}`); }

// endpoints
router.post('/preview', async (req,res)=>{ /* … */ });
router.post('/add', async (req,res)=>{ /* … */ });
router.post('/remove', async (req,res)=>{ /* … */ });


// Mini endpoint de diagnostic d'environnement
router.get('/__env', (req, res) => {
  res.json({
    url: process.env.ESPO_URL,
    key_last4: (process.env.ESPO_API_KEY || '').slice(-4)
  });
});

// GET /api/actions/etiquette/_probe
router.get('/_probe', async (_req, res) => {
  try {
    const x = await espoGet('/Lead?maxSize=1');
    res.json({ ok: true, espo: ESPO, sample: (x.list || []).length });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e), espo: ESPO });
  }
});

export default router; // <-- IMPORTANT
