// routes/agent.js – actions discovery
import express from 'express';

const router = express.Router();

const KNOWN_EXTENSIONS = ['ecommerce','logistique','coaching'];

function parseBool(v){ if (typeof v==='boolean') return v; const s=String(v||'').trim().toLowerCase(); return ['1','true','yes','on'].includes(s); }

function allowedScopesFor(req){
  const role = req.header('X-Role') || 'user';
  const preview = parseBool(req.header('X-Preview'));
  const base = ['standard'];
  if (role === 'admin' && preview) return base.concat(KNOWN_EXTENSIONS);
  const ext = Array.isArray(req?.tenant?.extensions) ? req.tenant.extensions : [];
  return base.concat(ext);
}

function buildWorkflows(scopes){
  const arr = [];
  if (scopes.includes('logistique')) arr.push({ id:'wf_log_track', name:'Mise à jour Tracking', kind:'workflow', scope:'logistique' });
  if (scopes.includes('ecommerce')) arr.push({ id:'wf_ec_recover', name:'Relance panier abandonné', kind:'workflow', scope:'ecommerce' });
  if (scopes.includes('coaching')) arr.push({ id:'wf_coach_follow', name:'Rappel session coaching', kind:'workflow', scope:'coaching' });
  // Standard baseline
  arr.push({ id:'wf_std_clean', name:'Nettoyage doublons', kind:'workflow', scope:'standard' });
  return arr;
}

function buildCards(scopes){
  const out = [];
  const push = (id,title,kind,scope)=>out.push({ id,title,kind,scope });
  // Explorer kinds
  if (scopes.includes('ecommerce')) {
    push('nba_ec_1','Relance panier (NBA)','next-best-action','ecommerce');
    push('tag_ec_1','Tagger abandons','tagging','ecommerce');
  }
  if (scopes.includes('logistique')) {
    push('follow_log_1','Suivi colis','followup','logistique');
    push('prop_log_eta','Créer propriété ETA','property-create','logistique');
  }
  if (scopes.includes('coaching')) {
    push('follow_coach_1','Rappel séance','followup','coaching');
  }
  // Standard
  push('nba_std_lead','Prochaine action lead','next-best-action','standard');
  push('tag_std_qualif','Tagging qualification','tagging','standard');
  return out;
}

// GET /api/agent/discover-actions
router.get('/agent/discover-actions', (req, res) => {
  const scopes = allowedScopesFor(req);
  const workflows = buildWorkflows(scopes);
  const cards = buildCards(scopes);
  res.json({ ok:true, tenant: req?.tenant?.id || null, extensions: scopes.filter(s=>s!=='standard'), workflows, cards });
});

export default router;
