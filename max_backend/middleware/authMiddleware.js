/**
 * authMiddleware.js
 * Middleware d'authentification JWT pour MVP1
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production-MACREA2025';

/**
 * Middleware d'authentification
 * Vérifie le token JWT et ajoute req.user
 */
export function authMiddleware(req, res, next) {
  try {
    // Récupérer token depuis header Authorization OU query parameter (pour SSE)
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Enlever "Bearer "
    } else if (req.query.token) {
      // Fallback: token en query string (pour EventSource qui ne supporte pas les headers)
      token = req.query.token;
    }

    if (!token) {
      console.error(`   ❌ [authMiddleware] MISSING_TOKEN - Path: ${req.path}, Headers: ${JSON.stringify(req.headers.authorization || 'ABSENT')}`);
      return res.status(401).json({
        success: false,
        error: 'Token manquant',
        code: 'MISSING_TOKEN'
      });
    }

    // Vérifier token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Ajouter user à la request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      tenantId: decoded.tenantId || 'macrea' // Fallback pour MVP1
    };

    console.log(`   ✅ [authMiddleware] JWT valide - User: ${req.user.email}, Tenant: ${req.user.tenantId}, Path: ${req.path}`);
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      console.error(`   ❌ [authMiddleware] INVALID_TOKEN - Path: ${req.path}, Error: ${error.message}`);
      console.error(`   🔑 [authMiddleware] JWT_SECRET utilisé: ${JWT_SECRET.substring(0, 20)}...`);
      return res.status(401).json({
        success: false,
        error: 'Token invalide',
        code: 'INVALID_TOKEN'
      });
    }
    if (error.name === 'TokenExpiredError') {
      console.error(`   ❌ [authMiddleware] EXPIRED_TOKEN - Path: ${req.path}, Expired at: ${error.expiredAt}`);
      return res.status(401).json({
        success: false,
        error: 'Token expiré',
        code: 'EXPIRED_TOKEN'
      });
    }
    console.error(`   ❌ [authMiddleware] SERVER_ERROR - Path: ${req.path}, Error:`, error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
}

/**
 * Middleware optionnel (n'échoue pas si pas de token)
 */
export function optionalAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        tenantId: decoded.tenantId || 'macrea'
      };
    }
  } catch (error) {
    // Ignore errors for optional auth
  }
  next();
}
