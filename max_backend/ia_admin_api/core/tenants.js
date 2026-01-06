// core/tenants.js
export const TENANTS = {
  "macrea-admin": {
    id: "macrea-admin",
    name: "MaCréa Admin",
    apiKey: "admin_xxx_change_me",
    standard: true,
    extensions: ["logistique", "ecommerce", "coach"],
    flags: { isAdmin: true }
  },
  "damath": {
    id: "damath",
    name: "Damath Overseas",
    apiKey: "damath_xxx_change_me",
    standard: true,
    extensions: ["logistique"],
    flags: { isAdmin: false }
  },
  "coach-vero": {
    id: "coach-vero",
    name: "Coach Vero",
    apiKey: "coach_xxx_change_me",
    standard: true,
    extensions: ["coach"],
    flags: { isAdmin: false }
  },
  "michele-care": {
    id: "michele-care",
    name: "Michele Care",
    apiKey: "mcare_xxx_change_me",
    standard: true,
    extensions: ["ecommerce"],
    flags: { isAdmin: false }
  }
};

export function findTenantByApiKey(key) {
  return Object.values(TENANTS).find(t => t.apiKey === key) || null;
}