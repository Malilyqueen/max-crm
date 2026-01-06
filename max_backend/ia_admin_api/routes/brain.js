// routes/brain.js
import express from "express";
const router = express.Router();

function buildBrainForTenant(tenant) {
  const brain = {
    standard: tenant.standard === true,
    extensions: Array.isArray(tenant.extensions) ? tenant.extensions : []
  };

  const menu = [
    brain.standard ? { code: "standard", label: "Standard" } : null,
    ...brain.extensions.map(ext => {
      const label = { logistique: "Logistique", ecommerce: "E-commerce", coach: "Coaching" }[ext] || ext;
      return { code: ext, label };
    })
  ].filter(Boolean);

  const abilities = {
    canUseTasks: true,
    canTriggerN8N: true,
    canSeeLeadScoring: brain.extensions.includes("ecommerce") || brain.extensions.includes("coach"),
    canSeeTransportCalc: brain.extensions.includes("logistique")
  };

  return { brain, menu, abilities };
}

router.get("/status", (req, res) => {
  const t = req.tenant;
  const payload = buildBrainForTenant(t);
  return res.json({ ok: true, tenant: { id: t.id, name: t.name }, ...payload });
});

router.get("/menu", (req, res) => {
  const t = req.tenant;
  const { menu } = buildBrainForTenant(t);
  return res.json({ ok: true, tenant: t.id, menu });
});

router.get("/abilities", (req, res) => {
  const t = req.tenant;
  const { abilities } = buildBrainForTenant(t);
  return res.json({ ok: true, tenant: t.id, abilities });
});

export default router;