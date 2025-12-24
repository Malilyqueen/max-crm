const MATRIX = {
  admin:   { tabs:['*'], actions:['*'] },
  manager: { tabs:['dashboard','automation','crm','max'], actions:['execute'] },
  user:    { tabs:['dashboard','crm'], actions:[] }
};
export default function acl(feature, type='tabs'){
  return (req,res,next)=>{
    const allowed = MATRIX[req.ctx.role] || { [type]:[] };
    const ok = allowed[type].includes('*') || allowed[type].includes(feature);
    if (!ok) return res.status(403).json({ ok:false, error:'FORBIDDEN' });
    next();
  };
};