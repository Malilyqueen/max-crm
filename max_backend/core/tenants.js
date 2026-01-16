// core/tenants.js
// Configuration multi-tenant avec credentials EspoCRM par tenant

export const TENANTS = {
  // Tenant local développement XAMPP
  "macrea": {
    id: "macrea",
    name: "MaCréa Local Dev",
    apiKey: "macrea_local_dev_key",
    standard: true,
    extensions: ["logistique", "ecommerce", "coach"],
    flags: { isAdmin: true },

    // Configuration EspoCRM pour développement local XAMPP
    espo: {
      baseUrl: process.env.ESPO_BASE_URL || "http://127.0.0.1:8081/espocrm/api/v1",
      apiKey: process.env.ESPO_API_KEY || "",
      admin: {
        username: process.env.ESPO_USERNAME || "admin",
        password: process.env.ESPO_PASSWORD || "",
      },
      canSelfHeal: true,
    }
  },

  "macrea-admin": {
    id: "macrea-admin",
    name: "MaCréa Admin",
    apiKey: "admin_xxx_change_me",
    standard: true,
    extensions: ["logistique", "ecommerce", "coach"],
    flags: { isAdmin: true },

    // Configuration EspoCRM pour ce tenant
    espo: {
      baseUrl: process.env.ESPO_BASE_URL || "http://espocrm:80/api/v1",
      apiKey: process.env.ESPO_API_KEY || "",
      // Credentials admin pour self-healing (création champs, layouts, rebuild)
      admin: {
        username: process.env.ESPO_USERNAME || "admin",
        password: process.env.ESPO_PASSWORD || "",
      },
      canSelfHeal: true, // Peut créer des champs, modifier layouts, rebuild
    }
  },

  "damath": {
    id: "damath",
    name: "Damath Overseas",
    apiKey: "damath_xxx_change_me",
    standard: true,
    extensions: ["logistique"],
    flags: { isAdmin: false },

    // EspoCRM dédié pour Damath (à configurer lors de l'onboarding)
    espo: {
      baseUrl: process.env.DAMATH_ESPO_BASE_URL || "",
      apiKey: process.env.DAMATH_ESPO_API_KEY || "",
      admin: {
        username: process.env.DAMATH_ESPO_USERNAME || "admin",
        password: process.env.DAMATH_ESPO_PASSWORD || "",
      },
      canSelfHeal: true,
    }
  },

  "coach-vero": {
    id: "coach-vero",
    name: "Coach Vero",
    apiKey: "coach_xxx_change_me",
    standard: true,
    extensions: ["coach"],
    flags: { isAdmin: false },

    espo: {
      baseUrl: process.env.COACH_VERO_ESPO_BASE_URL || "",
      apiKey: process.env.COACH_VERO_ESPO_API_KEY || "",
      admin: {
        username: process.env.COACH_VERO_ESPO_USERNAME || "admin",
        password: process.env.COACH_VERO_ESPO_PASSWORD || "",
      },
      canSelfHeal: true,
    }
  },

  "michele-care": {
    id: "michele-care",
    name: "Michele Care",
    apiKey: "mcare_xxx_change_me",
    standard: true,
    extensions: ["ecommerce"],
    flags: { isAdmin: false },

    espo: {
      baseUrl: process.env.MICHELE_CARE_ESPO_BASE_URL || "",
      apiKey: process.env.MICHELE_CARE_ESPO_API_KEY || "",
      admin: {
        username: process.env.MICHELE_CARE_ESPO_USERNAME || "admin",
        password: process.env.MICHELE_CARE_ESPO_PASSWORD || "",
      },
      canSelfHeal: true,
    }
  }
};

export function findTenantByApiKey(key) {
  return Object.values(TENANTS).find(t => t.apiKey === key) || null;
}

/**
 * Récupère la configuration EspoCRM pour un tenant donné
 * @param {string} tenantId - ID du tenant
 * @returns {object|null} Configuration EspoCRM ou null
 */
export function getTenantEspoConfig(tenantId) {
  const tenant = TENANTS[tenantId];
  if (!tenant || !tenant.espo) {
    return null;
  }

  return {
    baseUrl: tenant.espo.baseUrl,
    apiKey: tenant.espo.apiKey,
    adminUsername: tenant.espo.admin.username,
    adminPassword: tenant.espo.admin.password,
    canSelfHeal: tenant.espo.canSelfHeal || false,
  };
}

/**
 * Vérifie si un tenant a les permissions pour faire du self-healing
 * @param {string} tenantId - ID du tenant
 * @returns {boolean} True si le tenant peut créer des champs, modifier layouts, etc.
 */
export function canTenantSelfHeal(tenantId) {
  const config = getTenantEspoConfig(tenantId);
  return config?.canSelfHeal &&
         config?.adminUsername &&
         config?.adminPassword;
}
