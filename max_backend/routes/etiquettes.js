const router = require('express').Router();
const fetch = global.fetch || require('node-fetch');
const { upsertExecution } = require('../utils/executionLog');

const ESPO = process.env.ESPO_URL?.replace(/\/+$/,'') || 'http://127.0.0.1:8081';
const AUTH = (process.env.ESPO_API_USER && process.env.ESPO_API_PASS)
  ? 'Basic ' + Buffer.from(process.env.ESPO_API_USER + ':' + process.env.ESPO_API_PASS).toString('base64')
  : null;

function hjson() {
  const h = { 'Content-Type':'application/json' };
  if (AUTH) h.Authorization = AUTH;
  return h;
}
async function espoGet(path) {
  const r = await fetch(`${ESPO}/api/v1${path}`, { headers: hjson() });
  if (!r.ok) throw new Error(`GET ${path} ${r.status}`);
  return r.json();
}
async function espoPost(path, body) {
  const r = await fetch(`${ESPO}/api/v1${path}`, { method:'POST', headers: hjson(), body: JSON.stringify(body||{}) });
  if (!r.ok) throw new Error(`POST ${path} ${r.status} ${(await r.text())}`);
  return r.json();
}
async function espoDelete(path) {
  const r = await fetch(`${ESPO}/api/v1${path}`, { method:'DELETE', headers: hjson() });
  if (!r.ok) throw new Error(`DELETE ${path} ${r.status} ${(await r.text())}`);
  return true;
}

// --- 1) Lister / créer des étiquettes ---
router.get('/', async (req,res)=> {
  try {
    const q = await espoGet('/Etiquette?maxSize=200');
    res.json({ ok:true, items: q.list||[] });
  } catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});

router.post('/', async (req,res)=> {
  try {
    const { name, color } = req.body||{};
    if (!name) return res.status(400).json({ ok:false, error:'name required' });
    const ex = await espoGet(`/Etiquette?where[0][type]=equals&where[0][attribute]=name&where[0][value]=${encodeURIComponent(name)}`);
    if (ex?.list?.length) return res.json({ ok:true, created:false, item: ex.list[0] });
    const created = await espoPost('/Etiquette', { name, color });
    res.json({ ok:true, created:true, item: created });
  } catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});

async function findOrCreateEtqId(name, color) {
  const ex = await espoGet(`/Etiquette?where[0][type]=equals&where[0][attribute]=name&where[0][value]=${encodeURIComponent(name)}`);
  if (ex?.list?.[0]) return ex.list[0].id;
  const c = await espoPost('/Etiquette', { name, color });
  return c.id;
}

// --- util: lister leads ciblés ---
async function listLeads({ statuses=[], sinceDays=0, limit=600, pageSize=200 }) {
  const out=[], createdAfter = sinceDays>0
    ? new Date(Date.now()-sinceDays*864e5).toISOString().slice(0,19)+'Z' : null;
  let offset=0;
  while (offset < limit) {
    const where=[]; 
    if (statuses.length) where.push({ type:'in', attribute:'status', value: statuses });
    if (createdAfter) where.push({ type:'greaterThan', attribute:'createdAt', value: createdAfter });
    const p = new URLSearchParams({ offset:String(offset), maxSize:String(pageSize) });
    where.forEach((w,i)=> Object.entries(w).forEach(([k,v])=>{
      p.append(`where[${i}][${k}]`, Array.isArray(v) ? JSON.stringify(v) : String(v));
    }));
    const r = await espoGet('/Lead?' + p.toString());
    (r.list||[]).forEach(x=> out.push(x));
    if (!r.list || r.list.length < pageSize) break;
    offset += pageSize;
  }
  return out.slice(0, limit);
}

// --- relation helpers (linkMultiple) ---
async function linkEtiquette(leadId, etiquetteId) {
  return espoPost(`/Lead/${leadId}/relation/etiquettes`, { id: etiquetteId });
}
async function unlinkEtiquette(leadId, etiquetteId) {
  return espoDelete(`/Lead/${leadId}/relation/etiquettes/${etiquetteId}`);
}

// --- 2) Preview ---
router.post('/actions/preview', async (req,res)=> {
  try {
    const { statuses=[], sinceDays=0, limit=600, pageSize=200 } = req.body||{};
    const leads = await listLeads({ statuses, sinceDays, limit, pageSize });
    res.json({ ok:true, data:{ count: leads.length, sampleIds: leads.slice(0,10).map(x=>x.id) } });
  } catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});

// --- 3) Ajout masse ---
router.post('/actions/add', async (req,res)=> {
  const startedAt = new Date().toISOString();
  const id = `exec_${startedAt.replace(/[:.]/g,'')}_etq_add`;
  let updated=0, errors=0, sampleIds=[];
  try {
    const { etiquette, color, statuses=[], sinceDays=0, limit=600, pageSize=200 } = req.body||{};
    if (!etiquette) return res.status(400).json({ ok:false, error:'etiquette required' });
    const etqId = await findOrCreateEtqId(etiquette, color);
    const leads = await listLeads({ statuses, sinceDays, limit, pageSize });
    sampleIds = leads.slice(0,10).map(x=>x.id);

    for (const L of leads) {
      try { await linkEtiquette(L.id, etqId); updated++; }
      catch(e){ errors++; }
    }
    const finishedAt = new Date().toISOString();
    const entry = { id, task:`etiquette:${etiquette}`, type:'etiquette-add',
      status: errors? (updated? 'partial':'error') : 'success',
      updated, errors, params:{ etiquette, statuses, sinceDays, limit, pageSize }, startedAt, finishedAt, sampleIds };
    upsertExecution(entry);
    res.json({ ok:true, data: entry });
  } catch(e){
    const finishedAt = new Date().toISOString();
    upsertExecution({ id, task:'etiquette', type:'etiquette-add', status:'error',
      updated, errors:(errors||0)+1, params:req.body||{}, startedAt, finishedAt, sampleIds });
    res.status(500).json({ ok:false, error:String(e) });
  }
});

// --- 4) Retrait masse (rollback) ---
router.post('/actions/remove', async (req,res)=> {
  const startedAt = new Date().toISOString();
  const id = `exec_${startedAt.replace(/[:.]/g,'')}_etq_rm`;
  let updated=0, errors=0, sampleIds=[];
  try {
    const { etiquette, statuses=[], sinceDays=0, limit=600, pageSize=200 } = req.body||{};
    if (!etiquette) return res.status(400).json({ ok:false, error:'etiquette required' });
    const ex = await espoGet(`/Etiquette?where[0][type]=equals&where[0][attribute]=name&where[0][value]=${encodeURIComponent(etiquette)}`);
    const etqId = ex?.list?.[0]?.id;
    if (!etqId) return res.status(404).json({ ok:false, error:'Etiquette not found' });

    const leads = await listLeads({ statuses, sinceDays, limit, pageSize });
    sampleIds = leads.slice(0,10).map(x=>x.id);

    for (const L of leads) {
      try { await unlinkEtiquette(L.id, etqId); updated++; }
      catch(e){ errors++; }
    }
    const finishedAt = new Date().toISOString();
    const entry = { id, task:`etiquette:${etiquette}`, type:'etiquette-remove',
      status: errors? (updated? 'partial':'error') : 'success',
      updated, errors, params:{ etiquette, statuses, sinceDays, limit, pageSize }, startedAt, finishedAt, sampleIds };
    upsertExecution(entry);
    res.json({ ok:true, data: entry });
  } catch(e){
    const finishedAt = new Date().toISOString();
    upsertExecution({ id, task:'etiquette', type:'etiquette-remove', status:'error',
      updated, errors:(errors||0)+1, params:req.body||{}, startedAt, finishedAt, sampleIds });
    res.status(500).json({ ok:false, error:String(e) });
  }
});

module.exports = router;
