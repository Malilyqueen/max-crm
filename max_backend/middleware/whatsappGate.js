/**
 * whatsappGate.js
 * Gate pour vérifier si WhatsApp est activé pour le tenant
 * Utilisé pour routes /api/wa/* et action sendWhatsapp
 */

import pg from 'pg';
const { Pool } = pg;

/**
 * Middleware gate WhatsApp
 * Vérifie si whatsapp_enabled=true dans tenant_features
 * Nécessite: authMiddleware + resolveTenant en amont
 */
export async function whatsappGate(req, res, next) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;

    if (!tenantId) {
      console.error('   ❌ [whatsappGate] Pas de tenantId - authMiddleware/resolveTenant manquant?');
      return res.status(500).json({
        ok: false,
        error: 'TENANT_NOT_RESOLVED',
        message: 'Configuration serveur incorrecte'
      });
    }

    // Connexion PostgreSQL
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('supabase')
        ? { rejectUnauthorized: false }
        : false
    });

    try {
      // Vérifier si WhatsApp est activé pour ce tenant
      const result = await pool.query(
        `SELECT whatsapp_enabled FROM tenant_features WHERE tenant_id = $1`,
        [tenantId]
      );

      // Si pas de row, considérer comme désactivé (default false)
      const whatsappEnabled = result.rows.length > 0
        ? result.rows[0].whatsapp_enabled
        : false;

      if (!whatsappEnabled) {
        console.warn(`   🚫 [whatsappGate] WhatsApp désactivé pour tenant: ${tenantId}`);
        return res.status(403).json({
          ok: false,
          error: 'WHATSAPP_DISABLED',
          message: 'WhatsApp n\'est pas activé pour votre compte. Contactez le support pour activer cette option (+15€/mois).',
          upgrade_required: true,
          feature: 'whatsapp'
        });
      }

      console.log(`   ✅ [whatsappGate] WhatsApp activé pour tenant: ${tenantId}`);
      next();

    } finally {
      await pool.end();
    }

  } catch (error) {
    console.error('   ❌ [whatsappGate] Erreur:', error.message);
    return res.status(500).json({
      ok: false,
      error: 'GATE_CHECK_FAILED',
      message: 'Erreur lors de la vérification des permissions'
    });
  }
}

/**
 * Fonction utilitaire pour vérifier WhatsApp enabled (hors middleware)
 * Utilisée dans actions/sendWhatsapp.js
 *
 * @param {string} tenantId
 * @param {Pool} db - Pool PostgreSQL existant
 * @returns {Promise<boolean>}
 */
export async function isWhatsappEnabled(tenantId, db) {
  try {
    const result = await db.query(
      `SELECT whatsapp_enabled FROM tenant_features WHERE tenant_id = $1`,
      [tenantId]
    );

    const enabled = result.rows.length > 0
      ? result.rows[0].whatsapp_enabled
      : false;

    console.log(`   🔍 [isWhatsappEnabled] Tenant ${tenantId}: ${enabled ? '✅' : '🚫'}`);
    return enabled;

  } catch (error) {
    console.error(`   ❌ [isWhatsappEnabled] Erreur pour ${tenantId}:`, error.message);
    return false; // Sécurité: refuser en cas d'erreur
  }
}