# Hardening checks

- DashboardPanel.tsx : accès null-safe (kpis ?? {}, timeline ?? []) – OK
- api.ts : applyServerCtxIfPresent() appelé après chaque apiGet/apiPost – OK
- TaskTray : n'ouvre qu'UN seul EventSource – OK
- ActionAuditModal : route /api/actions/:id/audit – OK
- mask.js : regex (secret|token|key|password|apikey|email) – OK