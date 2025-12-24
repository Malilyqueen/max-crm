import express from 'express';
import activity from '../services/activity.js';
import acl from '../middleware/acl.js';

const router = express.Router();

router.post('/actions/execute', acl('execute', 'actions'), (req,res)=>{
  const preview = (req.header('X-Preview')||'true')==='true';
  if (preview) return res.status(400).json({ ok:false, error:'PREVIEW_ON' });
  activity.push({ actor:'MAX', tenant:req.ctx.tenant, event:'action.execute', payload:req.body });
  res.json({ ok:true, id:`act-${Date.now()}` });
});
router.get('/activity', (req,res)=> res.json({ ok:true, list: activity.list() }));

export default router;
