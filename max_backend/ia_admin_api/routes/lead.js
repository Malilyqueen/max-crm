import express from "express";
import brainConfig from "../config/brain.config.js";
import { checkModeWrite } from "../middleware/checkMode.js";

const router = express.Router();

function espoConfigFor(tenant) {
  const ESPO_BASE_URL = process.env.ESPO_BASE_URL;
  const ESPO_API_KEY = process.env.ESPO_API_KEY;

  if (!ESPO_BASE_URL || !ESPO_API_KEY) {
    throw new Error('ESPO_BASE_URL et ESPO_API_KEY requis dans .env');
  }

  // Pour MVP: Tous les tenants utilisent la même instance EspoCRM
  // TODO Phase 3: Charger config par tenant depuis Supabase
  return { base: ESPO_BASE_URL, apiKey: ESPO_API_KEY };
}

router.post("/updateLead", checkModeWrite, async (req, res) => {
  res.type("application/json");
  const { id, fields } = req.body || {};
  if (!id || !fields) return res.status(400).json({ ok:false, error:"MISSING_FIELDS" });

  const t = req.tenant;
  const cfg = espoConfigFor(t);
  if (!cfg) return res.status(400).json({ ok:false, error:"TENANT_ESPO_NOT_CONFIGURED", tenant: t?.id });

  // Mode Assisté → propose patch sans écrire
  if (brainConfig?.mode === "assist") {
    return res.json({ ok:true, requiresApproval:true, patch: fields });
  }

  // Mode Auto → PATCH EspoCRM
  try {
    const r = await fetch(`${cfg.base}/api/v1/Lead/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": cfg.apiKey
      },
      body: JSON.stringify(fields)
    });
    if (!r.ok) {
      const text = await r.text().catch(()=>"");
      return res.status(502).json({ ok:false, error:"ESPO_BAD_RESPONSE", status:r.status, body:text });
    }
    const data = await r.json();
    return res.json({ ok:true, updated:true, data });
  } catch (e) {
    return res.status(504).json({ ok:false, error:"ESPO_TIMEOUT_OR_NETWORK", detail:String(e), tenant:t.id });
  }
});

export default router;