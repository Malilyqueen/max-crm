const router = require('express').Router();
const { upsertExecution, listExecutions } = require('../utils/executionLog');

router.post('/log', (req,res)=> {
  const now = new Date().toISOString();
  const entry = {
    id: req.body.id || `exec_${now.replace(/[:.]/g,'')}`,
    task: req.body.task || 'ad-hoc',
    type: req.body.type || 'etiquette',
    status: req.body.status || 'success',
    updated: req.body.updated ?? 0,
    errors: req.body.errors ?? 0,
    params: req.body.params || {},
    startedAt: req.body.startedAt || now,
    finishedAt: req.body.finishedAt || now,
    sampleIds: req.body.sampleIds || []
  };
  res.json({ ok:true, entry: upsertExecution(entry) });
});
router.get('/all', (req,res)=> {
  res.json({ ok:true, items: listExecutions({
    limit: Number(req.query.limit||200),
    sinceHours: req.query.sinceHours ? Number(req.query.sinceHours) : undefined
  })});
});
module.exports = router;
