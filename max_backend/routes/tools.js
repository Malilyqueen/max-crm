/**
 * routes/tools.js
 * Endpoint pour tester directement les tools sans passer par le LLM
 *
 * 🔐 SÉCURITÉ CRITIQUE:
 * - Désactivé par défaut en production (ENABLE_TOOLS_EXECUTE=false)
 * - Protégé par token admin (X-Admin-Token)
 * - Double vérification: env + header
 */

import express from 'express';

const router = express.Router();

// Configuration sécurité
const TOOLS_EXECUTE_ENABLED = process.env.ENABLE_TOOLS_EXECUTE === 'true';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null;

/**
 * Middleware de protection
 */
function protectToolsExecute(req, res, next) {
  // Vérification 1: Feature flag
  if (!TOOLS_EXECUTE_ENABLED) {
    console.warn('[tools/execute] ⚠️  Tentative d\'accès REFUSÉE - Feature désactivée');
    return res.status(403).json({
      success: false,
      error: 'TOOLS_EXECUTE_DISABLED',
      message: 'Cet endpoint est désactivé en production. Définir ENABLE_TOOLS_EXECUTE=true pour l\'activer.'
    });
  }

  // Vérification 2: Admin token (si défini)
  if (ADMIN_TOKEN) {
    const providedToken = req.headers['x-admin-token'];

    if (!providedToken) {
      console.warn('[tools/execute] ⚠️  Tentative d\'accès REFUSÉE - Token manquant');
      return res.status(401).json({
        success: false,
        error: 'ADMIN_TOKEN_REQUIRED',
        message: 'Header X-Admin-Token requis pour cet endpoint.'
      });
    }

    if (providedToken !== ADMIN_TOKEN) {
      console.warn('[tools/execute] ⚠️  Tentative d\'accès REFUSÉE - Token invalide');
      return res.status(403).json({
        success: false,
        error: 'INVALID_ADMIN_TOKEN',
        message: 'Token admin invalide.'
      });
    }
  }

  // Vérification 3: Log audit (qui accède et quand)
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  TOOLS EXECUTE - ACCÈS ADMIN                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`[tools/execute] ✅ Accès autorisé`);
  console.log(`[tools/execute] 📍 IP: ${req.ip}`);
  console.log(`[tools/execute] 🕒 Timestamp: ${new Date().toISOString()}`);
  console.log(`[tools/execute] 🏢 Tenant: ${req.headers['x-tenant'] || 'none'}`);

  next();
}

/**
 * POST /api/tools/execute
 * Exécute un tool directement (bypass LLM)
 *
 * Headers requis:
 * - X-Admin-Token: <ADMIN_TOKEN> (si défini dans .env)
 *
 * Body:
 * {
 *   "tool": "create_custom_field",
 *   "args": { ... }
 * }
 */
router.post('/execute', protectToolsExecute, async (req, res) => {
  const { tool, args } = req.body;

  if (!tool || !args) {
    return res.status(400).json({
      success: false,
      error: 'Missing tool or args parameter'
    });
  }

  console.log(`[tools/execute] Direct tool call: ${tool}`);
  console.log(`[tools/execute] Args:`, args);

  try {
    // Import handleToolCalls dynamiquement pour éviter circular dependency
    const { handleToolCalls } = await import('./chat.js');

    // Simuler un tool call
    const toolCall = {
      id: `test_${Date.now()}`,
      type: 'function',
      function: {
        name: tool,
        arguments: JSON.stringify(args)
      }
    };

    // Exécuter le tool
    const result = await handleToolCalls(
      [toolCall],
      'test-session-direct',
      'test-conversation-direct',
      'Direct tool test'
    );

    // Retourner le résultat du tool
    const toolResult = result[0];

    // Si le tool a retourné un httpCode, l'utiliser pour la réponse HTTP
    if (toolResult.httpCode) {
      return res.status(toolResult.httpCode).json(toolResult);
    }

    return res.json(toolResult);

  } catch (error) {
    console.error('[tools/execute] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
