/**
 * Rate Limiter Middleware - Protection contre les abus
 *
 * Philosophie: "Un système qui refuse de servir (429) vaut mieux qu'un système qui tombe."
 *
 * Limites par catégorie:
 * - Global: 100 req/min par IP
 * - Auth: 10 req/min par IP (login, register, password reset)
 * - Sensitive: 30 req/min par tenant (sync, send, jobs)
 * - AI: 20 req/min par tenant (chat, enrichment)
 */

// Store en mémoire pour le rate limiting (suffisant pour single-instance)
// Pour multi-instance: utiliser Redis
const stores = {
  ip: new Map(),      // IP -> { count, resetTime }
  tenant: new Map(),  // tenantId -> { count, resetTime }
  auth: new Map(),    // IP -> { count, resetTime } pour endpoints auth
  ai: new Map(),      // tenantId -> { count, resetTime } pour endpoints AI
};

// Nettoyage périodique des entrées expirées (toutes les 5 min)
setInterval(() => {
  const now = Date.now();
  for (const store of Object.values(stores)) {
    for (const [key, value] of store.entries()) {
      if (now > value.resetTime) {
        store.delete(key);
      }
    }
  }
}, 5 * 60 * 1000);

/**
 * Créer un rate limiter configurable
 */
function createLimiter(options) {
  const {
    windowMs = 60 * 1000,  // 1 minute par défaut
    max = 100,              // 100 requêtes par défaut
    keyGenerator,           // Fonction pour générer la clé (IP, tenant, etc.)
    store,                  // Map à utiliser
    message = 'Trop de requêtes, veuillez réessayer plus tard',
    skipFailedRequests = false,
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    if (!key) return next(); // Pas de clé = pas de limite

    const now = Date.now();
    let record = store.get(key);

    // Nouvelle fenêtre ou première requête
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      store.set(key, record);
    } else {
      record.count++;
    }

    // Headers de rate limit (RFC 6585)
    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    // Limite dépassée
    if (record.count > max) {
      res.setHeader('Retry-After', resetSeconds);

      console.warn(`[RATE_LIMIT] 429 - Key: ${key}, Count: ${record.count}/${max}, Reset: ${resetSeconds}s`);

      return res.status(429).json({
        ok: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message,
        retryAfter: resetSeconds,
        limit: max,
        windowMs,
      });
    }

    next();
  };
}

// ═══════════════════════════════════════════════════════════════════
// LIMITERS PRÉ-CONFIGURÉS
// ═══════════════════════════════════════════════════════════════════

/**
 * Limite globale par IP - 100 req/min
 * Appliqué à toutes les routes
 */
export const globalLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 100,
  store: stores.ip,
  keyGenerator: (req) => {
    // Priorité: X-Forwarded-For (derrière proxy/Cloudflare) > IP directe
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip || req.connection?.remoteAddress;
    return `global:${ip}`;
  },
  message: 'Limite globale atteinte (100 req/min). Veuillez patienter.',
});

/**
 * Limite stricte pour auth - 10 req/min par IP
 * Protège contre brute force login/password
 */
export const authLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 10,
  store: stores.auth,
  keyGenerator: (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip || req.connection?.remoteAddress;
    return `auth:${ip}`;
  },
  message: 'Trop de tentatives d\'authentification. Réessayez dans 1 minute.',
});

/**
 * Limite par tenant pour endpoints sensibles - 30 req/min
 * sync, send (emails/sms/whatsapp), batch jobs
 */
export const sensitiveLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 30,
  store: stores.tenant,
  keyGenerator: (req) => {
    // Tenant depuis JWT décodé ou header
    const tenantId = req.user?.tenantId || req.headers['x-tenant'] || 'anonymous';
    return `sensitive:${tenantId}`;
  },
  message: 'Limite d\'opérations sensibles atteinte (30/min). Veuillez patienter.',
});

/**
 * Limite par tenant pour endpoints AI - 20 req/min
 * Chat, enrichissement, analyse
 */
export const aiLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 20,
  store: stores.ai,
  keyGenerator: (req) => {
    const tenantId = req.user?.tenantId || req.headers['x-tenant'] || 'anonymous';
    return `ai:${tenantId}`;
  },
  message: 'Limite d\'appels IA atteinte (20/min). Veuillez patienter.',
});

/**
 * Limite pour webhooks entrants - 60 req/min par IP
 * WhatsApp, Twilio, Mailjet webhooks
 */
export const webhookLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 60,
  store: stores.ip,
  keyGenerator: (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip || req.connection?.remoteAddress;
    return `webhook:${ip}`;
  },
  message: 'Trop de webhooks reçus. Limite: 60/min.',
});

/**
 * Skip rate limit pour certaines routes (health, static)
 */
export function skipRateLimitFor(paths) {
  return (req, res, next) => {
    if (paths.some(p => req.path.startsWith(p))) {
      return next();
    }
    return globalLimiter(req, res, next);
  };
}

// ═══════════════════════════════════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtenir les stats de rate limiting (pour monitoring)
 */
export function getRateLimitStats() {
  return {
    ip: stores.ip.size,
    tenant: stores.tenant.size,
    auth: stores.auth.size,
    ai: stores.ai.size,
  };
}

/**
 * Reset manuel d'une clé (pour admin/debug)
 */
export function resetRateLimit(storeType, key) {
  const store = stores[storeType];
  if (store) {
    store.delete(key);
    return true;
  }
  return false;
}

export default {
  globalLimiter,
  authLimiter,
  sensitiveLimiter,
  aiLimiter,
  webhookLimiter,
  skipRateLimitFor,
  getRateLimitStats,
  resetRateLimit,
};
