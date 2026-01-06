// routes/chat.js – unified ask-action executor (simulated)
import express from 'express';

const router = express.Router();

// POST /api/chat/ask-action { tenant, actionId, params, source }
router.post('/chat/ask-action', async (req, res) => {
  const { actionId, params = {}, source = 'ui' } = req.body || {};
  if (!actionId) return res.status(400).json({ ok:false, error:'MISSING_ACTION_ID' });
  const id = `task_${Date.now().toString(36)}`;
  // Simulate quick success; in future we can enqueue
  return res.json({ ok:true, task: { id, actionId, status:'done', source } });
});

export default router;
