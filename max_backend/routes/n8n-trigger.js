import express from 'express';
import guard from '../middleware/mode-auto.js';
import { trigger } from '../services/n8n.js';
import * as activity from '../services/activity.js';

// Rate limiting simple (50/h par tenant)
const rateLimit = new Map();

function checkRateLimit(tenant) {
  const now = Date.now();
  const window = 60 * 60 * 1000; // 1 heure
  const key = `${tenant}:${Math.floor(now / window)}`;

  const current = rateLimit.get(key) || 0;
  if (current >= 50) {
    throw new Error('RATE_LIMIT_EXCEEDED');
  }

  rateLimit.set(key, current + 1);

  // Cleanup old entries
  for (const [k, v] of rateLimit.entries()) {
    if (k !== key && now - parseInt(k.split(':')[1]) * window > window * 2) {
      rateLimit.delete(k);
    }
  }
}

function checkBusinessHours() {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0 = dimanche, 1 = lundi

  // 9h-19h, lundi-samedi
  if (day === 0 || hour < 9 || hour >= 19) {
    throw new Error('OUTSIDE_BUSINESS_HOURS');
  }
}

const router = express.Router();

router.post('/n8n/trigger', async (req, res) => {
  console.log('DEBUG: Raw request body:', req.body);
  console.log('DEBUG: Request headers:', req.headers);

  const { code, payload, mode = 'assist' } = req.body || {};
  // SECURITY: tenantId UNIQUEMENT depuis JWT
  const tenant = req.tenantId;
  if (!tenant) {
    return res.status(401).json({ ok: false, error: 'MISSING_TENANT' });
  }

  console.log('DEBUG: N8N trigger called with:', { code, mode, tenant, ctx: req.ctx });

  // Debug: return request info
  return res.json({
    ok: true,
    debug: { code, mode, tenant, role: req.ctx?.role, payload },
    message: 'Debug response'
  });
});

export default router;