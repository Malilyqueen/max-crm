/**
 * Role Gate - Contrôle d'accès basé sur le rôle M.A.X.
 *
 * Gère le bridage futur entre ADMIN (complet) et COPILOT (lecture seule)
 */

const COPILOT_MODE = process.env.FEATURE_COPILOT_MODE === 'true';
const FORCE_ADMIN = process.env.MAX_FORCE_ADMIN === 'true';

// Méthodes bloquées en mode COPILOT
const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Tools bloqués en mode COPILOT
const ADMIN_ONLY_TOOLS = [
  'update_lead_fields',
  'update_leads_in_espo',
  'delete_leads_from_espo',
  'create_custom_field',
  'import_leads_to_crm'
];

/**
 * Obtenir le rôle actuel de M.A.X.
 */
export function getCurrentRole() {
  if (FORCE_ADMIN || !COPILOT_MODE) {
    return 'ADMIN';
  }
  return 'COPILOT';
}

/**
 * Vérifier si une méthode HTTP est autorisée
 */
export function isMethodAllowed(method) {
  const role = getCurrentRole();

  if (role === 'ADMIN') {
    return true; // Admin peut tout faire
  }

  // COPILOT: lecture seule
  if (WRITE_METHODS.includes(method.toUpperCase())) {
    return false;
  }

  return true;
}

/**
 * Vérifier si un tool est autorisé
 */
export function isToolAllowed(toolName) {
  const role = getCurrentRole();

  if (role === 'ADMIN') {
    return true; // Admin peut utiliser tous les tools
  }

  // COPILOT: outils en lecture seule uniquement
  if (ADMIN_ONLY_TOOLS.includes(toolName)) {
    return false;
  }

  return true;
}

/**
 * Middleware Express pour bloquer les écritures en mode COPILOT
 */
export function roleGateMiddleware(req, res, next) {
  const role = getCurrentRole();

  // Log du rôle actuel
  req.maxRole = role;

  // Si ADMIN, tout passe
  if (role === 'ADMIN') {
    return next();
  }

  // Mode COPILOT: bloquer les méthodes d'écriture
  if (WRITE_METHODS.includes(req.method)) {
    return res.status(403).json({
      ok: false,
      error: 'FORBIDDEN',
      message: '⚠️ Droits insuffisants. Mon rôle actuel est "COPILOT" (lecture seule). Je ne peux pas exécuter cette action. Veuillez passer mon accès en "ADMIN" pour continuer.',
      role_actuel: 'COPILOT',
      action_requise: 'Modifier FEATURE_COPILOT_MODE=false dans .env'
    });
  }

  next();
}

/**
 * Vérifier l'accès à un tool avant exécution
 */
export function checkToolAccess(toolName) {
  const role = getCurrentRole();

  if (!isToolAllowed(toolName)) {
    throw new Error(
      `⚠️ Droits insuffisants. Mon rôle actuel est "${role}" (lecture seule). ` +
      `Je ne peux pas utiliser le tool "${toolName}". ` +
      `Veuillez passer mon accès en "ADMIN" pour continuer.`
    );
  }

  return true;
}

/**
 * Créer un objet de telemetry pour les logs
 */
export function createTelemetry(req, result = {}) {
  return {
    role_actuel: getCurrentRole(),
    statut: result.success ? 'SUCCESS' : 'ERROR',
    tokens_utilises: result.tokens_used || 0,
    errors: result.errors || []
  };
}

export default {
  getCurrentRole,
  isMethodAllowed,
  isToolAllowed,
  roleGateMiddleware,
  checkToolAccess,
  createTelemetry
};
