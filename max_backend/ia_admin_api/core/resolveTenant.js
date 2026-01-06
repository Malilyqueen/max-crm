// core/resolveTenant.js
import { TENANTS, findTenantByApiKey } from "./tenants.js";

export function resolveTenant() {
  return function (req, res, next) {
    // 1) Try explicit tenant id header first
    const tenantId = req.header("X-Tenant") || req.header("x-tenant");
    if (tenantId && TENANTS[tenantId]) {
      req.tenant = TENANTS[tenantId];
      return next();
    }

    // 2) Fallback to API key
    const apiKey = req.header("X-Api-Key") || req.header("x-api-key");
    if (apiKey) {
      const tenant = findTenantByApiKey(apiKey);
      if (!tenant) {
        return res.status(401).json({ ok: false, error: "INVALID_API_KEY" });
      }
      req.tenant = tenant;
      return next();
    }
    const host = req.headers.host || "";
    const sub = host.split(".")[0]; // réserve le mapping subdomain→tenant si besoin
    if (sub && sub !== "localhost" && sub !== "127" && sub !== "api") {
      // ici, tu peux mapper sub→tenant plus tard
    }
    return res.status(401).json({ ok: false, error: "TENANT_NOT_RESOLVED" });
  };
}