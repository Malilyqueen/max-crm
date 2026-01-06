import express from 'express';
import { shouldAutoRun, withinSchedule, rateLimit } from '../services/auto-guard.js';
import { getMode } from '../services/mode.js';
import * as activity from '../services/activity.js';
import { trigger } from '../services/n8n.js';

const fetch = (...args)=> import('node-fetch').then(({default: f})=> f(...args));
const MAP = {
  'relance-j3': 'http://127.0.0.1:5678/webhook/relance-j3',
  'tag-chaud':  'http://127.0.0.1:5678/webhook/tag-chaud',
  'nettoyage':  'http://127.0.0.1:5678/webhook/nettoyage'
};

const router = express.Router();

router.get('/n8n/workflows',(req,res)=> res.json({ ok:true, list:Object.keys(MAP) }));

router.post('/n8n/trigger', async (req,res)=>{
  const tenant = req.header("X-Tenant") || "default";
  const role = (req.header("X-Role") || "user").toLowerCase();
  const preview = String(req.header("X-Preview") || "true") === "true";
  const { code, mode = getMode(), payload = {} } = req.body || {};

  // Mode auto : appliquer les garde-fous
  if (mode === "auto" && shouldAutoRun({ role, code })) {
    if (!withinSchedule()) return res.status(429).json({ ok:false, error:"OUT_OF_SCHEDULE" });
    if (!rateLimit(tenant)) return res.status(429).json({ ok:false, error:"RATE_LIMIT" });
  }

  // En preview => refuse l'exécution réelle
  if (preview === true) return res.status(400).json({ ok:false, error:"PREVIEW_ON" });

  try {
    const run = await trigger({ code, payload, tenant, role, mode });
    activity.push({ type: "automation.run", tenant, actor: "MAX", auto: mode==="auto", code, runId: run.runId });
    return res.json({ ok: true, runId: run.runId });
  } catch (e) {
    return res.status(502).json({ ok:false, error:"N8N_BAD_GATEWAY" });
  }
});

export default router;