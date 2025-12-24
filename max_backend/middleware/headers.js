export default function headers(req,res,next){
  req.ctx = {
    tenant:  req.header('X-Tenant')  || 'damath',
    role:    req.header('X-Role')    || 'admin',
    preview: (req.header('X-Preview')||'true') === 'true'
  };
  res.setHeader('X-Tenant', req.ctx.tenant);
  res.setHeader('X-Role', req.ctx.role);
  res.setHeader('X-Preview', String(req.ctx.preview));
  next();
};