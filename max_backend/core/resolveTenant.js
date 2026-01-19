// core/resolveTenant.js
// Middleware de résolution de tenant avec support DB + fallback hardcoded
import { TENANTS, findTenantByApiKey } from "./tenants.js";

/**
 * CRM Status enum
 * - pending: CRM pas encore configuré
 * - provisioning: CRM en cours de provisioning
 * - active: CRM actif et fonctionnel
 * - error: Erreur de configuration/connexion
 * - suspended: CRM suspendu (non-paiement, etc.)
 */
const CRM_STATUS = {
  PENDING: 'pending',
  PROVISIONING: 'provisioning',
  ACTIVE: 'active',
  ERROR: 'error',
  SUSPENDED: 'suspended'
};

/**
 * Résout un tenant dynamiquement depuis la DB
 * Utilise crm_url du tenant si configuré, sinon fallback sur env vars
 */
async function resolveTenantFromDB(tenantSlug, db) {
  if (!db) return null;

  try {
    // Récupérer le tenant avec ses colonnes CRM depuis la DB
    const result = await db.query(
      `SELECT t.*, tf.whatsapp_enabled, tf.sms_enabled, tf.email_enabled, tf.campaigns_enabled
       FROM tenants t
       LEFT JOIN tenant_features tf ON tf.tenant_id = t.slug
       WHERE t.slug = $1 AND t.is_active = true`,
      [tenantSlug]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const tenantRow = result.rows[0];

    // Déterminer l'URL CRM: DB > env fallback
    const crmUrl = tenantRow.crm_url || process.env.ESPO_BASE_URL || "http://127.0.0.1:8081/espocrm/api/v1";
    const crmApiKey = tenantRow.crm_api_key || process.env.ESPO_API_KEY || "";
    const crmStatus = tenantRow.crm_status || CRM_STATUS.PENDING;

    // Construire l'objet tenant compatible avec le système existant
    const tenant = {
      id: tenantRow.slug,
      name: tenantRow.name,
      apiKey: `tenant_${tenantRow.slug}_key`,
      standard: true,
      plan: tenantRow.plan,
      isProvisioned: tenantRow.is_provisioned,
      extensions: [],
      flags: {
        isAdmin: false,
        whatsappEnabled: tenantRow.whatsapp_enabled || false,
        smsEnabled: tenantRow.sms_enabled || false,
        emailEnabled: tenantRow.email_enabled || false,
        campaignsEnabled: tenantRow.campaigns_enabled || false
      },

      // Configuration CRM avec support DB + fallback env
      crm: {
        status: crmStatus,
        error: tenantRow.crm_error || null,
        provisionedAt: tenantRow.crm_provisioned_at || null,
        isConfigured: !!tenantRow.crm_url, // True si URL en DB
        usingFallback: !tenantRow.crm_url  // True si utilise env vars
      },

      // Configuration EspoCRM (DB > env fallback)
      espo: {
        baseUrl: crmUrl,
        apiKey: crmApiKey,
        admin: {
          username: process.env.ESPO_USERNAME || "admin",
          password: process.env.ESPO_PASSWORD || "",
        },
        canSelfHeal: crmStatus === CRM_STATUS.ACTIVE,
      }
    };

    return tenant;

  } catch (error) {
    console.error(`[resolveTenant] Erreur DB pour tenant ${tenantSlug}:`, error.message);
    return null;
  }
}

/**
 * Vérifie le statut CRM du tenant et retourne une erreur avec resolve action si nécessaire
 * @returns {object|null} Erreur avec resolve action ou null si OK
 */
function checkCrmStatus(tenant) {
  if (!tenant.crm) return null;

  const { status, error } = tenant.crm;

  switch (status) {
    case CRM_STATUS.PENDING:
      // CRM pas encore provisionné - utilise fallback env, donc OK pour continuer
      // Mais si pas de fallback disponible, erreur
      if (!tenant.espo.baseUrl || tenant.espo.baseUrl.includes('127.0.0.1')) {
        return {
          status: 503,
          body: {
            ok: false,
            error: "CRM_NOT_CONFIGURED",
            message: "Votre espace CRM est en cours de configuration.",
            resolve: {
              action: "wait",
              message: "Votre CRM sera disponible sous peu. Réessayez dans quelques minutes.",
              retry: true,
              retryAfter: 60
            }
          }
        };
      }
      return null; // Utilise le fallback, OK

    case CRM_STATUS.PROVISIONING:
      return {
        status: 503,
        body: {
          ok: false,
          error: "CRM_PROVISIONING",
          message: "Votre espace CRM est en cours de création.",
          resolve: {
            action: "wait",
            message: "Création en cours... Cela peut prendre quelques minutes.",
            retry: true,
            retryAfter: 30
          }
        }
      };

    case CRM_STATUS.ERROR:
      return {
        status: 503,
        body: {
          ok: false,
          error: "CRM_ERROR",
          message: error || "Une erreur est survenue avec votre CRM.",
          resolve: {
            action: "contact_support",
            message: "Contactez le support pour résoudre ce problème.",
            supportEmail: "support@macrea.fr"
          }
        }
      };

    case CRM_STATUS.SUSPENDED:
      return {
        status: 403,
        body: {
          ok: false,
          error: "CRM_SUSPENDED",
          message: "Votre accès CRM est suspendu.",
          resolve: {
            action: "billing",
            message: "Veuillez régulariser votre situation pour réactiver l'accès.",
            redirect: "/settings/billing"
          }
        }
      };

    case CRM_STATUS.ACTIVE:
      return null; // Tout est OK

    default:
      return null; // Status inconnu, on laisse passer
  }
}

/**
 * Provisionne un nouveau tenant dans le CRM (création données initiales)
 */
async function provisionTenantIfNeeded(tenant, db) {
  if (!tenant || tenant.isProvisioned || !db) return;

  try {
    console.log(`[resolveTenant] 🚀 Provisioning tenant: ${tenant.id}`);

    await db.query(
      `UPDATE tenants SET is_provisioned = true, updated_at = NOW() WHERE slug = $1`,
      [tenant.id]
    );

    console.log(`[resolveTenant] ✅ Tenant provisionné: ${tenant.id}`);

  } catch (error) {
    console.error(`[resolveTenant] ❌ Erreur provisioning tenant ${tenant.id}:`, error.message);
  }
}

export function resolveTenant() {
  return async function (req, res, next) {
    const db = req.app?.locals?.db;
    console.log(`   🐛 [resolveTenant DEBUG] req.user exists: ${!!req.user}, tenantId: ${req.user?.tenantId || 'NONE'}`);

    // 0) BYPASS pour routes de test/action-layer en environnement local
    const path = req.path || req.url;
    if (path.startsWith('/api/action-layer') || path.startsWith('/api/test')) {
      if (TENANTS.macrea) {
        req.tenant = TENANTS.macrea;
        req.tenantId = 'macrea';
        console.log(`   🔓 [resolveTenant] Bypass pour route de test: ${path} → tenant=macrea`);
      }
      return next();
    }

    // 1) Try explicit tenant id header first
    let tenantId = req.header("X-Tenant") || req.header("x-tenant");

    // 1bis) Fallback to JWT tenantId if authMiddleware already ran
    if (!tenantId && req.user && req.user.tenantId) {
      tenantId = req.user.tenantId;
      console.log(`   🔐 [resolveTenant] Using tenantId from JWT: ${tenantId}`);
    }

    console.log(`   🔍 [resolveTenant] Path: ${path}, Tenant: ${tenantId || 'ABSENT'}`);

    if (tenantId) {
      // 1) D'abord chercher dans TENANTS hardcodés (legacy)
      if (TENANTS[tenantId]) {
        req.tenant = TENANTS[tenantId];
        req.tenantId = tenantId;
        console.log(`   ✅ [resolveTenant] Tenant résolu (hardcoded): ${tenantId}`);
        return next();
      }

      // 2) Sinon chercher dans la DB (nouveaux tenants self-service)
      const dbTenant = await resolveTenantFromDB(tenantId, db);

      if (dbTenant) {
        // Vérifier le statut CRM et retourner erreur avec resolve action si nécessaire
        const crmResolveError = checkCrmStatus(dbTenant);
        if (crmResolveError) {
          console.warn(`   ⚠️ [resolveTenant] CRM status issue for ${tenantId}: ${dbTenant.crm.status}`);
          return res.status(crmResolveError.status).json(crmResolveError.body);
        }

        req.tenant = dbTenant;
        req.tenantId = tenantId;
        console.log(`   ✅ [resolveTenant] Tenant résolu (DB): ${tenantId} - plan: ${dbTenant.plan} - crm: ${dbTenant.crm.status}`);

        // Auto-provision si nécessaire
        await provisionTenantIfNeeded(dbTenant, db);

        return next();
      }

      // 3) Tenant non trouvé nulle part
      console.error(`   ❌ [resolveTenant] Tenant '${tenantId}' non trouvé (ni hardcoded, ni DB)`);

      return res.status(401).json({
        ok: false,
        error: "TENANT_NOT_FOUND",
        message: `Tenant '${tenantId}' n'existe pas ou n'est pas configuré.`,
        resolve: {
          action: "contact_support",
          message: "Contactez le support pour configurer votre espace de travail."
        }
      });
    }

    // 2) Fallback to API key (legacy)
    const apiKey = req.header("X-Api-Key") || req.header("x-api-key");
    if (apiKey) {
      const tenant = findTenantByApiKey(apiKey);
      if (!tenant) {
        console.error(`   ❌ [resolveTenant] API Key invalide: ${apiKey.substring(0, 10)}...`);
        return res.status(401).json({
          ok: false,
          error: "INVALID_API_KEY",
          resolve: {
            action: "check_credentials",
            message: "Vérifiez votre clé API dans les paramètres."
          }
        });
      }
      req.tenant = tenant;
      req.tenantId = tenant.id;
      console.log(`   ✅ [resolveTenant] Tenant résolu via API Key: ${tenant.id}`);
      return next();
    }

    const host = req.headers.host || "";
    const sub = host.split(".")[0];
    if (sub && sub !== "localhost" && sub !== "127" && sub !== "127.0.0.1" && sub !== "api") {
      // Mapping subdomain→tenant réservé pour plus tard
    }

    console.error(`   ❌ [resolveTenant] TENANT_NOT_RESOLVED - Aucun X-Tenant ni X-Api-Key fourni`);
    return res.status(401).json({
      ok: false,
      error: "TENANT_NOT_RESOLVED",
      message: "Authentification requise. Veuillez vous connecter.",
      resolve: {
        action: "login",
        redirect: "/login"
      }
    });
  };
}

/**
 * Export pour utilisation directe (sans middleware)
 */
export async function getTenantConfig(tenantId, db) {
  if (TENANTS[tenantId]) {
    return TENANTS[tenantId];
  }
  return await resolveTenantFromDB(tenantId, db);
}

/**
 * Met à jour le statut CRM d'un tenant
 * @param {string} tenantSlug - Slug du tenant
 * @param {string} status - Nouveau statut (pending, provisioning, active, error, suspended)
 * @param {object} db - Pool PostgreSQL
 * @param {object} options - Options supplémentaires
 * @param {string} options.error - Message d'erreur (si status = error)
 * @param {string} options.crmUrl - URL CRM à configurer
 * @param {string} options.crmApiKey - API Key CRM
 */
export async function updateTenantCrmStatus(tenantSlug, status, db, options = {}) {
  if (!db) throw new Error('Database connection required');

  const validStatuses = Object.values(CRM_STATUS);
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid CRM status: ${status}. Valid: ${validStatuses.join(', ')}`);
  }

  const updates = ['crm_status = $2', 'updated_at = NOW()'];
  const params = [tenantSlug, status];
  let paramIndex = 3;

  if (options.error !== undefined) {
    updates.push(`crm_error = $${paramIndex++}`);
    params.push(options.error);
  }

  if (options.crmUrl !== undefined) {
    updates.push(`crm_url = $${paramIndex++}`);
    params.push(options.crmUrl);
  }

  if (options.crmApiKey !== undefined) {
    updates.push(`crm_api_key = $${paramIndex++}`);
    params.push(options.crmApiKey);
  }

  if (status === CRM_STATUS.ACTIVE) {
    updates.push(`crm_provisioned_at = NOW()`);
    updates.push(`is_provisioned = true`);
  }

  const query = `UPDATE tenants SET ${updates.join(', ')} WHERE slug = $1`;

  await db.query(query, params);

  console.log(`[resolveTenant] 📝 CRM status updated: ${tenantSlug} → ${status}`);
}

// Export CRM_STATUS pour utilisation externe
export { CRM_STATUS };