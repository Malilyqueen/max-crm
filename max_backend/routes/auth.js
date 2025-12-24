/**
 * auth.js
 * Routes d'authentification pour MVP1
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Users hardcodés pour MVP1 (Phase 2: remplacer par DB)
const USERS = [
  {
    id: 'user_admin_001',
    email: 'admin@macrea.fr',
    password: '$2b$10$uqTA8M3exzcDBy4PgwdYb.QixVnsJ4WfCEdMgZd5J8Qbj21fUJS9O', // admin123
    name: 'Admin MaCréa',
    role: 'admin',
    tenantId: 'macrea'
  },
  {
    id: 'user_standard_002',
    email: 'user@macrea.fr',
    password: '$2b$10$9lkbpnY.nnPyQFvfOlPLeOjWPi8mRHlO5i2i7FS4KfNoBgBpv5dxu', // user123
    name: 'User MaCréa',
    role: 'user',
    tenantId: 'macrea'
  }
];

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production-MACREA2025';
const JWT_EXPIRES_IN = '7d'; // Token valable 7 jours

/**
 * POST /api/auth/login
 * Login simple avec email/password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email et mot de passe requis'
      });
    }

    // Chercher user
    const user = USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect'
      });
    }

    // Générer JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    console.log(`[AUTH] ✅ Login réussi: ${user.email} (${user.role})`);

    // Retourner token + user (sans password)
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId
      }
    });

  } catch (error) {
    console.error('[AUTH] ❌ Erreur login:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

/**
 * GET /api/auth/me
 * Récupère user depuis token
 */
router.get('/me', authMiddleware, (req, res) => {
  // req.user est défini par authMiddleware
  res.json({
    success: true,
    user: req.user
  });
});

/**
 * POST /api/auth/logout
 * Logout (côté client, supprime juste le token)
 */
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Déconnexion réussie'
  });
});

export default router;
