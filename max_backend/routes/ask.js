import express from 'express';

const router = express.Router();
const executionLog = [];
router.post('/ask', async (req,res)=>{
  const entry = { id:Date.now().toString(), ts:Date.now(), type:'ask', payload:req.body, status:'done' };
  executionLog.push(entry);
  res.json({ ok:true, answer:"OK", logId:entry.id });
});
router.get('/execution-log', (req,res)=> res.json({ ok:true, list:executionLog.slice(-100) }));

export default router;