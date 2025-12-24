import express from 'express';

const router = express.Router();
router.get('/resolve-tenant', (req,res)=> {
  res.json({ ok:true, tenant:req.ctx.tenant, role:req.ctx.role, preview:req.ctx.preview });
});
router.get('/__espo-status', (req,res)=> res.json({ ok:true, base:'http://127.0.0.1:8081', sample:1 }));

export default router;