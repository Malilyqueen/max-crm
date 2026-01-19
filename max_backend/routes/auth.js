/**
 * auth.js
 * Routes d'authentification self-service
 * - Login via DB (tables users/tenants/memberships)
 * - Signup avec auto-création tenant
 * - Fallback vers users hardcodés si DB non migrée
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production-MACREA2025';
const JWT_EXPIRES_IN = '7d'; // Token valable 7 jours
const BCRYPT_ROUNDS = 10;

// ============================================================
// FALLBACK: Users hardcodés (utilisé si tables DB non migrées)
// À SUPPRIMER une fois la migration 021 déployée en production
// ============================================================
const LEGACY_USERS = [
  {
    id: 'user_admin_001',
    email: 'admin@macrea.fr',
    password: '$2b$10$uqTA8M3exzcDBy4PgwdYb.QixVnsJ4WfCEdMgZd5J8Qbj21fUJS9O', // admin123
    name: 'Admin MaCréa',
    role: 'admin',
    tenantId: 'macrea'
  },
  {
    id: 'user_demo_003',
    email: 'demo@democlient.com',
    password: '$2b$10$yU.SodR882sVQ4MqsGpCLuzYCLo9woyV1P9I1WxpjFbiket.hZNC.', // demo123
    name: 'Demo User',
    role: 'admin',
    tenantId: 'demo_client'
  }
];

/**
 * Vérifie si les tables auth DB existent
 */
async function checkDbTablesExist(db) {
  try {
    const result = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'users'
      ) as users_exists
    `);
    return result.rows[0]?.users_exists === true;
  } catch (error) {
    console.warn('[AUTH] ⚠️ Impossible de vérifier tables DB:', error.message);
    return false;
  }
}

/**
 * Login via users hardcodés (fallback legacy)
 */
async function loginLegacy(email, password) {
  const user = LEGACY_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
    tenantName: user.tenantId,
    plan: 'starter_whatsapp',
    isProvisioned: true
  };
}

/**
 * Génère un slug à partir du nom d'entreprise
 * "Ma Super Entreprise" → "ma-super-entreprise"
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/[^a-z0-9]+/g, '_')     // Remplace caractères spéciaux par _
    .replace(/^_+|_+$/g, '')          // Supprime _ au début/fin
    .substring(0, 50);                // Max 50 caractères
}

/**
 * POST /api/auth/login
 * Login avec email/password via DB (+ fallback legacy si DB non migrée)
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = req.app.locals.db;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email et mot de passe requis'
      });
    }

    // Vérifier si les tables DB existent
    const dbReady = await checkDbTablesExist(db);

    let user = null;

    if (dbReady) {
      // Mode DB: Chercher user dans la DB avec son tenant
      try {
        const result = await db.query(
          `SELECT * FROM get_user_for_login($1)`,
          [email.toLowerCase()]
        );

        const userRow = result.rows[0];

        if (userRow && userRow.user_id) {
          // Vérifier password
          const isValid = await bcrypt.compare(password, userRow.password_hash);
          if (isValid) {
            user = {
              id: userRow.user_id,
              email: userRow.email,
              name: userRow.user_name,
              role: userRow.role,
              tenantId: userRow.tenant_slug,
              tenantName: userRow.tenant_name,
              plan: userRow.plan,
              isProvisioned: userRow.is_provisioned
            };

            // Mettre à jour last_login_at
            await db.query(
              `UPDATE users SET last_login_at = NOW() WHERE id = $1`,
              [userRow.user_id]
            );
          }
        }
      } catch (dbError) {
        console.warn('[AUTH] ⚠️ Erreur DB login, fallback legacy:', dbError.message);
        // Fallback vers legacy en cas d'erreur DB
        user = await loginLegacy(email, password);
      }
    } else {
      // Mode Legacy: Tables DB non migrées
      console.log('[AUTH] 📦 Mode legacy (tables DB non migrées)');
      user = await loginLegacy(email, password);
    }

    if (!user) {
      console.log(`[AUTH] ❌ Login failed: ${email}`);
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
        tenantId: user.tenantId,
        tenantName: user.tenantName,
        plan: user.plan,
        isProvisioned: user.isProvisioned
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    console.log(`[AUTH] ✅ Login réussi: ${user.email} (${user.role}) - tenant: ${user.tenantId} - mode: ${dbReady ? 'DB' : 'legacy'}`);

    // Retourner token + user
    res.json({
      success: true,
      token,
      user
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
 * POST /api/auth/signup
 * Inscription self-service avec auto-création tenant
 *
 * Body attendu:
 * {
 *   email: "user@example.com",
 *   password: "securePassword123",
 *   name: "Jean Dupont",
 *   companyName: "Mon Entreprise",
 *   plan: "starter" | "starter_whatsapp" (défaut: "starter")
 * }
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, companyName, plan = 'starter' } = req.body;
    const db = req.app.locals.db;

    // Validation
    if (!email || !password || !name || !companyName) {
      return res.status(400).json({
        success: false,
        error: 'Tous les champs sont requis: email, password, name, companyName'
      });
    }

    // Validation email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Format email invalide'
      });
    }

    // Validation mot de passe (min 6 caractères)
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Le mot de passe doit contenir au moins 6 caractères'
      });
    }

    // Validation plan
    if (!['starter', 'starter_whatsapp'].includes(plan)) {
      return res.status(400).json({
        success: false,
        error: 'Plan invalide. Choix: starter ou starter_whatsapp'
      });
    }

    // Vérifier si l'email existe déjà
    const existingUser = await db.query(
      `SELECT id FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Cet email est déjà utilisé',
        code: 'EMAIL_EXISTS'
      });
    }

    // Générer le slug du tenant
    let tenantSlug = generateSlug(companyName);

    // Vérifier que le slug n'existe pas déjà
    const existingTenant = await db.query(
      `SELECT id FROM tenants WHERE slug = $1`,
      [tenantSlug]
    );

    if (existingTenant.rows.length > 0) {
      // Ajouter un suffixe unique
      tenantSlug = `${tenantSlug}_${Date.now().toString(36)}`;
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Transaction: créer user + tenant + membership
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      // 1. Créer l'utilisateur
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, name)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [email.toLowerCase(), passwordHash, name]
      );

      const userId = userResult.rows[0].id;

      // 2. Créer le tenant avec le membership via la fonction SQL
      const tenantResult = await client.query(
        `SELECT * FROM create_tenant_with_owner($1, $2, $3, $4)`,
        [userId, companyName, tenantSlug, plan]
      );

      const tenantRow = tenantResult.rows[0];

      if (!tenantRow.success) {
        throw new Error(tenantRow.error_message || 'Erreur création tenant');
      }

      await client.query('COMMIT');

      console.log(`[AUTH] ✅ Signup réussi: ${email} - tenant: ${tenantSlug} - plan: ${plan}`);

      // Générer le JWT directement (auto-login après signup)
      const token = jwt.sign(
        {
          userId: userId,
          email: email.toLowerCase(),
          role: 'owner',
          tenantId: tenantSlug,
          tenantName: companyName,
          plan: plan,
          isProvisioned: false // Pas encore provisionné
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.status(201).json({
        success: true,
        message: 'Compte créé avec succès',
        token,
        user: {
          id: userId,
          email: email.toLowerCase(),
          name: name,
          role: 'owner',
          tenantId: tenantSlug,
          tenantName: companyName,
          plan: plan,
          isProvisioned: false
        }
      });

    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('[AUTH] ❌ Erreur signup:', error);

    // Erreurs spécifiques
    if (error.code === '23505') { // Duplicate key
      return res.status(409).json({
        success: false,
        error: 'Cet email ou nom d\'entreprise est déjà utilisé'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Erreur serveur'
    });
  }
});

/**
 * GET /api/auth/me
 * Récupère user depuis token (+ fallback legacy)
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const db = req.app.locals.db;

    // Vérifier si les tables DB existent
    const dbReady = await checkDbTablesExist(db);

    let user = null;

    if (dbReady) {
      try {
        // Récupérer les infos fraîches depuis la DB
        const result = await db.query(
          `SELECT * FROM get_user_for_login($1)`,
          [req.user.email]
        );

        const userRow = result.rows[0];

        if (userRow) {
          user = {
            id: userRow.user_id,
            email: userRow.email,
            name: userRow.user_name,
            role: userRow.role,
            tenantId: userRow.tenant_slug,
            tenantName: userRow.tenant_name,
            plan: userRow.plan,
            isProvisioned: userRow.is_provisioned
          };
        }
      } catch (dbError) {
        console.warn('[AUTH] ⚠️ Erreur DB /me, fallback JWT:', dbError.message);
      }
    }

    // Fallback: utiliser les infos du JWT si DB non dispo
    if (!user && req.user) {
      user = {
        id: req.user.userId,
        email: req.user.email,
        name: req.user.name || req.user.email.split('@')[0],
        role: req.user.role,
        tenantId: req.user.tenantId,
        tenantName: req.user.tenantName || req.user.tenantId,
        plan: req.user.plan || 'starter_whatsapp',
        isProvisioned: req.user.isProvisioned !== false
      };
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('[AUTH] ❌ Erreur /me:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
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

/**
 * POST /api/auth/provision
 * Appelle resolveTenant() pour provisionner le CRM
 * (protégé par auth)
 */
router.post('/provision', authMiddleware, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const tenantId = req.user.tenantId;

    // Vérifier si déjà provisionné
    const checkResult = await db.query(
      `SELECT is_provisioned FROM tenants WHERE slug = $1`,
      [tenantId]
    );

    if (checkResult.rows[0]?.is_provisioned) {
      return res.json({
        success: true,
        message: 'Tenant déjà provisionné',
        alreadyProvisioned: true
      });
    }

    // Appeler la fonction de provisioning
    // Note: resolveTenant() dans le CRM va créer les données nécessaires
    // Pour l'instant on marque juste comme provisionné
    await db.query(
      `SELECT provision_tenant_crm($1)`,
      [tenantId]
    );

    console.log(`[AUTH] ✅ Tenant provisionné: ${tenantId}`);

    res.json({
      success: true,
      message: 'CRM provisionné avec succès',
      alreadyProvisioned: false
    });

  } catch (error) {
    console.error('[AUTH] ❌ Erreur provision:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du provisioning'
    });
  }
});

/**
 * GET /api/auth/plans
 * Liste les plans disponibles
 */
router.get('/plans', async (req, res) => {
  try {
    const db = req.app.locals.db;

    const result = await db.query(
      `SELECT id, name, price_eur, whatsapp_enabled, whatsapp_messages_included, description
       FROM tenant_plans
       WHERE is_active = true
       ORDER BY price_eur ASC`
    );

    res.json({
      success: true,
      plans: result.rows.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price_eur,
        features: {
          whatsapp: p.whatsapp_enabled,
          whatsappMessages: p.whatsapp_messages_included,
          sms: true,
          email: true,
          campaigns: true
        },
        description: p.description
      }))
    });

  } catch (error) {
    console.error('[AUTH] ❌ Erreur /plans:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

export default router;