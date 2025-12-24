import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  const list = [
    { id:"wf-relance-j3", name:"Relance automatique J+3", status:"active", successRate:0.92, lastRun:"2025-11-05T09:12:00Z",
      metrics:{ sent:342, opened:0.68, clicked:0.24, errors:2 } },
    { id:"wf-qualif", name:"Qualification lead automatique", status:"active", successRate:0.84, lastRun:"2025-11-05T11:20:00Z",
      metrics:{ processed:1247, qualified:0.42, errors:0, avg:1.2 } },
    { id:"wf-enrich", name:"Enrichissement données", status:"active", successRate:0.87, lastRun:"2025-11-05T12:01:00Z",
      metrics:{ enriched:856, added:"3.2k", errors:5 } }
  ];
  res.json({ ok:true, items:list });
});

router.get("/:id/runs", (req, res) => {
  const runs = [
    { id:"run_001", status:"success", startedAt:"2025-11-05T09:10:00Z", durationMs:4123, impact:{ leads:32 } },
    { id:"run_002", status:"failed",  startedAt:"2025-11-05T10:40:00Z", durationMs:1320, error:"SMTP_401" }
  ];
  res.json({ ok:true, runs });
});

export default router;