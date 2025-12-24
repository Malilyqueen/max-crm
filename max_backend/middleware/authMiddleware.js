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
      return res.status(401).json({
        success: false,
        error: 'Token manquant'
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

    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Token invalide'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expiré'
      });
    }
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
