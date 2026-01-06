import express from "express";
const router = express.Router();

router.get("/execution-log", (req, res) => {
  const items = [
    { id:"act-1", code:"wf-relance-j3", status:"running",  startedAt:"2025-11-05T10:58:00Z" },
    { id:"act-2", code:"tag-hot",       status:"completed", startedAt:"2025-11-05T10:30:00Z", finishedAt:"2025-11-05T10:31:05Z" }
  ];
  res.json({ ok:true, items });
});

export default router;