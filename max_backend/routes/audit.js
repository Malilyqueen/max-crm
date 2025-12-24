import express from "express";
import { deepMask } from "../services/mask.js";
import { getExecutionById } from "../services/n8n.js";

const router = express.Router();

// Reste strict sur /:id/audit (pas /:id)
router.get("/:id/audit", async (req, res) => {
  try {
    const data = await getExecutionById(req.params.id);
    const stepsSrc = data?.data || data?.nodes || [];
    const steps = stepsSrc.map((s) => ({
      name: s.name || s.id || "step",
      startedAt: s.startedAt || s.startTime || null,
      finishedAt: s.finishedAt || s.endTime || null,
      durationMs: s.durationMs ?? null,
      status: s.status || (s.error ? "failed" : "success"),
      in: deepMask(s.input || s.in || {}),
      out: deepMask(s.output || s.out || {}),
    }));
    res.json({
      ok: true,
      id: data?.id || req.params.id,
      startedAt: data?.startedAt || null,
      finishedAt: data?.finishedAt || null,
      durationMs: data?.duration || null,
      steps
    });
  } catch {
    res.status(404).json({ ok:false, error:"RUN_NOT_FOUND" });
  }
});

export default router;