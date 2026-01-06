import express from "express";
const router = express.Router();

/**
 * Règles:
 * - admin + preview:true  -> tous les onglets
 * - admin + preview:false -> tout sauf éléments "expérimentaux" (optionnel)
 * - user                  -> pas "automation" par défaut
 */
router.get("/", (req, res) => {
  const role = (req.header("X-Role") || "user").toLowerCase();
  const preview = String(req.header("X-Preview") || "true") === "true";

  let tabs = ["reporting", "max", "crm"];
  if (role === "admin") tabs = ["reporting","automation","max","crm"];
  if (role !== "admin") tabs = tabs.filter(t => t !== "automation");
  // option: si pas preview, on pourrait masquer "max" ou "automation" selon politique

  res.json({ ok: true, tabs, role, preview });
});

export default router;