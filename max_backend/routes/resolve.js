// routes/resolve.js – resolve multi-tenant + role/preview for UI
import express from 'express';
import { TENANTS, findTenantByApiKey } from '../core/tenants.js';

const router = express.Router();

function pickTenant(req) {
  // Priority: X-Tenant id, then X-Api-Key
  const tId = req.header('X-Tenant') || req.header('x-tenant');
  if (tId && TENANTS[tId]) return TENANTS[tId];

  const key = req.header('X-Api-Key') || req.header('x-api-key');
  if (key) {
    const t = findTenantByApiKey(key);
    if (t) return t;
  }
  return null;
}

function parseBool(v, d = false) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (['1','true','yes','on'].includes(s)) return true;
    if (['0','false','no','off'].includes(s)) return false;
  }
  return d;
}

// GET /api/resolve-tenant -> { ok, tenant, role, preview }
router.get('/resolve-tenant', (req, res) => {
  const t = pickTenant(req);
  if (!t) {
    return res.status(401).json({ ok: false, error: 'TENANT_NOT_RESOLVED' });
  }

  const roleHeader = req.header('X-Role') || req.header('x-role');
  const previewHeader = req.header('X-Preview') || req.header('x-preview');
  const role = (roleHeader === 'admin' || roleHeader === 'user')
    ? roleHeader
    : (t?.flags?.isAdmin ? 'admin' : 'user');
  const preview = parseBool(previewHeader, false);

  return res.json({ ok: true, tenant: t.id, role, preview });
});

export default router;
