import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  const range = String(req.query.range || "7d");
  const kpis = {
    calls_attempted: 247,
    calls_connected: 168,
    email_opens: 540,
    email_clicks: 81,
    delta: { calls_attempted: +18, calls_connected: +12, email_opens: +23, email_clicks: +6 }
  };
  const base = new Date(); base.setMinutes(0,0,0);
  const timeline = [
    { ts: new Date(base.getTime()-3600*1000).toISOString(), channel:"email", event:"email_opened", count:12 },
    { ts: new Date(base.getTime()-1800*1000).toISOString(), channel:"call",  event:"call_connected", count:5 }
  ];
  res.json({ ok:true, range, kpis, timeline });
});

export default router;