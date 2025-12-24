// routes/tags.js – P2 "Tags-first"
const SUGGESTIONS = [
  { test: /(panier|abandon|checkout)/i, tags: ["#panier_abandonné", "#relance_H+24"] },
  { test: /(retard|delay|en retard)/i, tags: ["#logistique_retard"] },
  { test: /(suivi|tracking|colis|statut)/i, tags: ["#logistique_suivi"] },
  { test: /(session|coaching|rappel)/i, tags: ["#coach_suivi"] },
];

function suggestTags(text = "") {
  const out = new Set();
  for (const rule of SUGGESTIONS) {
    if (rule.test.test(text)) rule.tags.forEach(t => out.add(t));
  }
  // fallback léger
  if (out.size === 0 && text.trim()) out.add("#a_qualifier");
  return Array.from(out);
}

function espoConfigFor(tenant) {
  const map = {
    damath:        { base: "http://127.0.0.1:8081", apiKey: "c33b6ca549ff94016190bf53cfb0964c" },
    "coach-vero":  { base: "http://127.0.0.1:8081", apiKey: "c33b6ca549ff94016190bf53cfb0964c" },
    "michele-care":{ base: "http://127.0.0.1:8081", apiKey: "c33b6ca549ff94016190bf53cfb0964c" },
    "macrea-admin":{ base: "http://127.0.0.1:8081", apiKey: "c33b6ca549ff94016190bf53cfb0964c" }
  };
  return map[tenant.id];
}

function n8nConfigFor(tenant) {
  const map = {
    "damath": { base: "http://127.0.0.1:5678" },
    "coach-vero": { base: "http://127.0.0.1:5679" },
    "michele-care": { base: "http://127.0.0.1:5680" },
    "macrea-admin": { base: "http://127.0.0.1:5678" }
  };
  return map[tenant.id];
}

async function patchLeadDescription(leadId, nextDescription, cfg) {
  const r = await fetch(`${cfg.base}/api/v1/Lead/${leadId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": cfg.apiKey
    },
    body: JSON.stringify({ description: nextDescription })
  });
  if (!r.ok) throw new Error(`ESPO_PATCH_FAILED ${r.status}`);
  return r.json();
}

async function readLead(leadId, cfg) {
  const r = await fetch(`${cfg.base}/api/v1/Lead/${leadId}`, {
    headers: { "X-Api-Key": cfg.apiKey }
  });
  if (!r.ok) throw new Error(`ESPO_READ_FAILED ${r.status}`);
  return r.json();
}

import express from "express";
import brainConfig from "../config/brain.config.js";
import { checkModeWrite } from "../middleware/checkMode.js";

const router = express.Router();

  // 1) Suggérer des tags à partir d'un texte libre
  router.post("/tags/suggest", async (req, res) => {
    res.type("application/json");
    const { text = "" } = req.body || {};
    const tags = suggestTags(text);
    return res.json({ ok: true, tags });
  });

  // 2) Appliquer des tags sur un Lead
  //    RO -> 403 ; Assisté -> requiresApproval ; Auto -> PATCH direct + notify n8n (TAG_EVENT)
  router.post("/tags/apply", checkModeWrite, async (req, res) => {
    res.type("application/json");
    const { id, tags = [] } = req.body || {};
    if (!id || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ ok: false, error: "MISSING_ID_OR_TAGS" });
    }

    const t = req.tenant;
    const cfg = espoConfigFor(t);
    if (!cfg) return res.status(400).json({ ok:false, error:"TENANT_ESPO_NOT_CONFIGURED" });

    // Assisté -> propose patch sans écrire
    if (brainConfig?.mode === "assist") {
      const patch = { description: `TAGS: ${tags.join(" ")}` };
      return res.json({ ok: true, requiresApproval: true, patch, applied: tags });
    }

    // Auto -> on lit la description actuelle, on append nos tags avec un préfixe clair
    try {
  const lead = await readLead(id, cfg);
      const before = `${lead?.description || ""}`.trim();
      const line = `TAGS: ${tags.join(" ")}`;
      const after = before ? `${before}\n${line}` : line;

      const data = await patchLeadDescription(id, after, cfg);

      // Notifier n8n (optionnel) via TAG_EVENT
      try {
        const n8nCfg = n8nConfigFor(t);
        if (n8nCfg) {
          const url = `${n8nCfg.base}/webhook/TAG_EVENT`;
          await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ leadId: id, tags })
          }).catch(() => null);
        }
      } catch (_) {
        // silencieux : n8n est optionnel en P2
      }

      return res.json({ ok: true, applied: tags, data });
    } catch (e) {
      return res.status(500).json({ ok: false, error: String(e) });
    }
  });

export default router;