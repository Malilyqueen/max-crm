// middleware/checkMode.js
export function checkModeWrite(req, res, next) {
  // 1) On lit le mode envoyé dans le body (priorité à la consigne MVP)
  const incoming = (req.body && typeof req.body.mode === 'string')
    ? req.body.mode.trim().toLowerCase()
    : '';

  // 2) Si on a explicitement "ro" → on bloque l'opération d'écriture
  if (incoming === 'ro') {
    return res.status(403).json({
      ok: false,
      error: 'READ_ONLY_MODE',
      reason: 'mode=RO dans le body de la requête'
    });
  }

  // 3) Sinon, on laisse passer (assist/auto/empty)
  return next();
}
