import express from "express";
import { checkModeWrite } from "../middleware/checkMode.js";

const router = express.Router();

const pickWorkflow = (message = "", context = "ecommerce") => {
  const t = (message || "").toLowerCase();
  if (context === "logistique") {
    if (/(track|suivi|statut)/.test(t)) return "LOG_TRACK_UPDATE";
    if (/(retard|delay)/.test(t)) return "LOG_DELAY_ALERT";
    return "LOG_TRACK_UPDATE";
  }
  if (context === "coach") return "COACH_SESSION_REMINDER";
  return "EC_RECOVER_CART"; // ecommerce par défaut
};

function n8nConfigFor(tenant) {
  const map = {
    damath:        { base: "http://127.0.0.1:5678" },
    "coach-vero":  { base: "http://127.0.0.1:5678" },
    "michele-care":{ base: "http://127.0.0.1:5678" },
    "macrea-admin":{ base: "http://127.0.0.1:5678" }
  };
  return map[tenant.id];
}

router.post("/trigger", checkModeWrite, async (req, res) => {
  res.type("application/json");
  const { message, context = "ecommerce" } = req.body || {};
  if (!message) return res.status(400).json({ ok:false, error:"MISSING_MESSAGE" });

  const t = req.tenant;
  const cfg = n8nConfigFor(t);
  if (!cfg) return res.status(400).json({ ok:false, error:"TENANT_N8N_NOT_CONFIGURED" });

  const wf = pickWorkflow(message, context);
  try {
    const url = `${cfg.base}/webhook/${wf}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, context, tenant: t.id })
    });
    if (!r.ok) {
      const text = await r.text().catch(()=>"");
      return res.status(502).json({ ok:false, error:"N8N_BAD_RESPONSE", status:r.status, body:text });
    }
    return res.json({ ok:true, sent:true, workflow: wf });
  } catch (e) {
    return res.status(504).json({ ok:false, error:"N8N_TIMEOUT_OR_NETWORK", detail:String(e), tenant:t.id });
  }
});

export default router;