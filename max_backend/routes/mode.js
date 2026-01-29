import express from 'express';
import { getMode, setMode } from '../services/mode.js';
import * as activity from '../services/activity.js';

const router = express.Router();

router.get("/mode", (req, res) => {
  console.log('Mode route called');
  res.json({ ok: true, mode: getMode() });
});

router.post("/mode", (req, res) => {
  const role = (req.header("X-Role") || "").toLowerCase();
  if (role !== "admin") return res.status(403).json({ ok: false, error: "FORBIDDEN" });
  const { mode } = req.body || {};
  if (!["assist","auto"].includes(mode)) return res.status(400).json({ ok: false, error: "BAD_MODE" });
  setMode(mode);
  activity.push({ actor: 'MAX', tenant: req.tenantId || 'system', event: 'mode.set', payload: req.body });
  res.json({ ok: true, mode });
});

export default router;