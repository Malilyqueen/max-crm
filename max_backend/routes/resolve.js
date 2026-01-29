// routes/resolve.js – resolve multi-tenant from JWT
import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// SECURITY: authMiddleware OBLIGATOIRE pour extraire tenantId du JWT
router.use(authMiddleware);

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
// SECURITY: tenant extrait UNIQUEMENT depuis JWT (req.tenantId)
router.get('/resolve-tenant', (req, res) => {
  // SECURITY: tenantId UNIQUEMENT depuis JWT
  const tenantId = req.tenantId;
  if (!tenantId) {
    return res.status(401).json({ ok: false, error: 'MISSING_TENANT' });
  }

  const roleHeader = req.header('X-Role') || req.header('x-role');
  const previewHeader = req.header('X-Preview') || req.header('x-preview');
  const role = (roleHeader === 'admin' || roleHeader === 'user')
    ? roleHeader
    : (req.user?.role || 'user');
  const preview = parseBool(previewHeader, false);

  return res.json({ ok: true, tenant: tenantId, role, preview });
});

export default router;
