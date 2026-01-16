// core/resolveTenant.js
import { TENANTS, findTenantByApiKey } from "./tenants.js";

export function resolveTenant() {
  return function (req, res, next) {
    console.log(`   🐛 [resolveTenant DEBUG] req.user exists: ${!!req.user}, tenantId: ${req.user?.tenantId || 'NONE'}`);

    // 0) BYPASS pour routes de test/action-layer en environnement local
    // Ces routes ne nécessitent pas de JWT ni de headers spécifiques
    const path = req.path || req.url;
    if (path.startsWith('/api/action-layer') || path.startsWith('/api/test')) {
      // Assigner un tenant par défaut 'macrea' pour le développement local
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

    if (tenantId && TENANTS[tenantId]) {
      req.tenant = TENANTS[tenantId];
      req.tenantId = tenantId;
      console.log(`   ✅ [resolveTenant] Tenant résolu: ${tenantId}`);
      return next();
    } else if (tenantId && !TENANTS[tenantId]) {
      console.error(`   ❌ [resolveTenant] Tenant '${tenantId}' non trouvé dans TENANTS config`);
      console.error(`   📋 [resolveTenant] Tenants disponibles: ${Object.keys(TENANTS).join(', ')}`);
      return res.status(401).json({
        ok: false,
        error: "TENANT_NOT_FOUND",
        message: `Tenant '${tenantId}' n'existe pas. Tenants disponibles: ${Object.keys(TENANTS).join(', ')}`
      });
    }

    // 2) Fallback to API key
    const apiKey = req.header("X-Api-Key") || req.header("x-api-key");
    if (apiKey) {
      const tenant = findTenantByApiKey(apiKey);
      if (!tenant) {
        console.error(`   ❌ [resolveTenant] API Key invalide: ${apiKey.substring(0, 10)}...`);
        return res.status(401).json({ ok: false, error: "INVALID_API_KEY" });
      }
      req.tenant = tenant;
      req.tenantId = tenant.id;
      console.log(`   ✅ [resolveTenant] Tenant résolu via API Key: ${tenant.id}`);
      return next();
    }

    const host = req.headers.host || "";
    const sub = host.split(".")[0]; // réserve le mapping subdomain→tenant si besoin
    if (sub && sub !== "localhost" && sub !== "127" && sub !== "127.0.0.1" && sub !== "api") {
      // ici, tu peux mapper sub→tenant plus tard
    }

    console.error(`   ❌ [resolveTenant] TENANT_NOT_RESOLVED - Aucun X-Tenant ni X-Api-Key fourni`);
    return res.status(401).json({ ok: false, error: "TENANT_NOT_RESOLVED", message: "Header X-Tenant ou X-Api-Key requis" });
  };
}