// src/modesMiddleware.js
const ALLOW = { auto: true, assist: true, ro: false };

export function enforceMode(req, res, next) {
  const mode = (process.env.MODE || "assist").toLowerCase(); // "auto" | "assist" | "ro"
  // Ex : marquer les routes d'exécution par un flag req.isExecution
  const isExec = !!req.headers["x-max-exec"] || (req.method !== "GET" && req.path.includes("/tools/"));
  if (!isExec) return next();

  const permitted = mode === "auto" ? ALLOW.auto : mode === "assist" ? ALLOW.assist : ALLOW.ro;
  if (!permitted) {
    return res.status(403).json({ ok:false, error:`Mode ${mode}: exécution bloquée` });
  }
  next();
}
