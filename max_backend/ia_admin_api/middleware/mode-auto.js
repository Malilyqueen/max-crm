const ALLOW = { admin:['relance-j3','tag-chaud','nettoyage','wf-newsletter-segment'], manager:['relance-j3','tag-chaud'], user:[] };
const BUCKET = new Map();
export default function guard(req,res,next){
  if (req.body.mode !== 'auto') return next();
  const role = req.ctx.role, code = req.body.code;
  if (!ALLOW[role]?.includes(code)) return res.status(403).json({ ok:false, error:'AUTO_NOT_ALLOWED' });
  const key = req.ctx.tenant; const now=Date.now(), hour=3600e3;
  const s = BUCKET.get(key)||{count:0, resetAt:now+hour}; if(now>s.resetAt){s.count=0; s.resetAt=now+hour;}
  if (s.count>=50) return res.status(429).json({ ok:false, error:'RATE_LIMIT' }); s.count++; BUCKET.set(key,s);
  const h = new Date().getHours(); if(h<9||h>=19) return res.status(423).json({ ok:false, error:'OUT_OF_SCHEDULE' });
  next();
};