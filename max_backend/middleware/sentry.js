/**
 * Sentry Error Tracking Middleware
 *
 * Capture des erreurs backend avec tags:
 * - tenant_id
 * - route
 * - request_id
 * - user_id (si authentifié)
 *
 * Configuration: SENTRY_DSN dans .env
 *
 * IMPORTANT: Ne capture JAMAIS de données sensibles (passwords, tokens, etc.)
 */

import crypto from 'crypto';

// Configuration Sentry
const SENTRY_DSN = process.env.SENTRY_DSN || '';
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.CRM_ENV === 'prod';
const SAMPLE_RATE = parseFloat(process.env.SENTRY_SAMPLE_RATE || '1.0');

// Client Sentry (lazy init)
let sentryClient = null;
let sentryInitialized = false;

/**
 * Initialiser Sentry (appelé au démarrage du serveur)
 */
export async function initSentry() {
  if (!SENTRY_DSN) {
    console.log('[SENTRY] ⚠️  SENTRY_DSN non configuré - monitoring désactivé');
    return false;
  }

  try {
    // Import dynamique pour éviter l'erreur si le package n'est pas installé
    const Sentry = await import('@sentry/node');

    Sentry.init({
      dsn: SENTRY_DSN,
      environment: IS_PRODUCTION ? 'production' : 'development',
      release: process.env.APP_VERSION || 'unknown',
      sampleRate: SAMPLE_RATE,

      // Ne pas capturer les erreurs 4xx (erreurs client)
      beforeSend(event, hint) {
        const error = hint.originalException;

        // Skip les erreurs de validation (4xx)
        if (error?.statusCode && error.statusCode < 500) {
          return null;
        }

        // Nettoyer les données sensibles
        if (event.request) {
          // Supprimer les headers sensibles
          const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie', 'x-admin-token'];
          sensitiveHeaders.forEach(h => {
            if (event.request.headers?.[h]) {
              event.request.headers[h] = '[FILTERED]';
            }
          });

          // Supprimer le body si contient des données sensibles
          if (event.request.data) {
            const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'credential'];
            const dataStr = JSON.stringify(event.request.data);
            if (sensitiveFields.some(f => dataStr.toLowerCase().includes(f))) {
              event.request.data = '[FILTERED - CONTAINS SENSITIVE DATA]';
            }
          }
        }

        return event;
      },

      // Ignorer certaines erreurs communes
      ignoreErrors: [
        'ECONNRESET',
        'ETIMEDOUT',
        'socket hang up',
        /^TokenExpiredError/,
        /^JsonWebTokenError/,
      ],
    });

    sentryClient = Sentry;
    sentryInitialized = true;
    console.log('[SENTRY] ✅ Initialisé - DSN:', SENTRY_DSN.substring(0, 30) + '...');
    return true;
  } catch (e) {
    console.warn('[SENTRY] ⚠️  Échec initialisation:', e.message);
    console.warn('[SENTRY] Installez avec: npm install @sentry/node');
    return false;
  }
}

/**
 * Middleware pour ajouter le request_id et contexte à chaque requête
 */
export function sentryRequestMiddleware(req, res, next) {
  // Générer un request_id unique
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.requestId);

  // Ajouter le contexte Sentry si initialisé
  if (sentryInitialized && sentryClient) {
    sentryClient.withScope((scope) => {
      // Tags communs
      scope.setTag('request_id', req.requestId);
      scope.setTag('route', `${req.method} ${req.route?.path || req.path}`);
      scope.setTag('environment', IS_PRODUCTION ? 'production' : 'development');

      // Tenant (depuis JWT ou header)
      const tenantId = req.user?.tenantId || req.headers['x-tenant'] || 'unknown';
      scope.setTag('tenant_id', tenantId);

      // User (sans données sensibles)
      if (req.user) {
        scope.setUser({
          id: req.user.id || req.user.userId,
          username: req.user.email?.split('@')[0] || 'unknown',
        });
      }

      // Contexte de la requête (filtré)
      scope.setContext('request', {
        method: req.method,
        url: req.originalUrl,
        query: req.query,
        ip: req.headers['x-forwarded-for']?.split(',')[0] || req.ip,
      });
    });
  }

  next();
}

/**
 * Middleware de capture d'erreurs (doit être le DERNIER middleware)
 */
export function sentryErrorMiddleware(err, req, res, next) {
  // Logger l'erreur
  console.error(`[ERROR] ${req.requestId || 'NO_ID'} - ${req.method} ${req.path}:`, err.message);

  // Capturer avec Sentry si initialisé
  if (sentryInitialized && sentryClient) {
    sentryClient.withScope((scope) => {
      // Ajouter les tags de la requête
      scope.setTag('request_id', req.requestId);
      scope.setTag('route', `${req.method} ${req.route?.path || req.path}`);
      scope.setTag('tenant_id', req.user?.tenantId || req.headers['x-tenant'] || 'unknown');
      scope.setTag('status_code', err.statusCode || err.status || 500);

      // Capturer l'erreur
      sentryClient.captureException(err);
    });
  }

  // Continuer vers le handler d'erreur suivant
  next(err);
}

/**
 * Capturer une erreur manuellement (pour les erreurs non-HTTP)
 */
export function captureError(error, context = {}) {
  console.error('[CAPTURE_ERROR]', error.message, context);

  if (sentryInitialized && sentryClient) {
    sentryClient.withScope((scope) => {
      // Ajouter le contexte
      Object.entries(context).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number') {
          scope.setTag(key, String(value));
        } else {
          scope.setContext(key, value);
        }
      });

      sentryClient.captureException(error);
    });
  }
}

/**
 * Capturer un message (pour les alertes non-erreur)
 */
export function captureMessage(message, level = 'info', context = {}) {
  if (sentryInitialized && sentryClient) {
    sentryClient.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setTag(key, String(value));
      });
      sentryClient.captureMessage(message, level);
    });
  }
}

/**
 * Test Sentry - envoyer une erreur de test
 */
export function testSentry() {
  if (!sentryInitialized) {
    return { ok: false, error: 'Sentry not initialized' };
  }

  try {
    sentryClient.captureException(new Error('Test error from M.A.X. Backend'));
    return { ok: true, message: 'Test error sent to Sentry' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Vérifier le status Sentry
 */
export function getSentryStatus() {
  return {
    initialized: sentryInitialized,
    dsn_configured: !!SENTRY_DSN,
    environment: IS_PRODUCTION ? 'production' : 'development',
    sample_rate: SAMPLE_RATE,
  };
}

export default {
  initSentry,
  sentryRequestMiddleware,
  sentryErrorMiddleware,
  captureError,
  captureMessage,
  testSentry,
  getSentryStatus,
};
