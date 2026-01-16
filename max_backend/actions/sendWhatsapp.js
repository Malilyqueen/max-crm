/**
 * actions/sendWhatsapp.js
 * Envoi WhatsApp via Green-API avec logging automatique
 *
 * Priorité:
 * 1. Credentials depuis Settings API (tenant_provider_configs) - chiffrés per-tenant
 * 2. Fallback: wa-instances.json (ancien système)
 */

import { sendWhatsApp, sendWhatsAppWithCredentials } from '../lib/whatsappHelper.js';
import { logMessageEvent } from '../lib/messageEventLogger.js';
import { decryptCredentials } from '../lib/encryption.js';
import { isWhatsappEnabled } from '../middleware/whatsappGate.js';
import pg from 'pg';
const { Pool } = pg;

/**
 * Récupère les credentials Green-API depuis Settings (priorité) ou JSON (fallback)
 * @param {string} tenantId
 * @param {Object} db - Pool PostgreSQL
 * @returns {Promise<Object|null>} - { instanceId, token, source: 'settings'|'json' }
 */
async function getGreenApiCredentials(tenantId, db) {
  try {
    // 1. Priorité: Lire depuis Settings API (DB)
    const result = await db.query(
      `SELECT encrypted_config FROM tenant_provider_configs
       WHERE tenant_id = $1 AND provider_type = 'greenapi_whatsapp' AND is_active = true
       LIMIT 1`,
      [tenantId]
    );

    if (result.rows.length > 0) {
      const encryptedConfig = result.rows[0].encrypted_config;
      const credentials = decryptCredentials(encryptedConfig, tenantId);

      console.log('[sendWhatsapp] ✅ Credentials depuis Settings API (chiffrés)');
      return {
        instanceId: credentials.instanceId,
        token: credentials.token,
        source: 'settings'
      };
    }

    // 2. SUPPRIMÉ: Fallback wa-instances.json (faille sécurité - partage credentials entre tenants)
    // Désactivé pour isolation per-tenant stricte
    console.error('[sendWhatsapp] ❌ Aucune configuration Green-API trouvée pour tenant:', tenantId);
    console.error('[sendWhatsapp] 💡 Configurez WhatsApp dans Settings > Providers > WhatsApp');
    return null;

  } catch (error) {
    console.error('[sendWhatsapp] ❌ Erreur récupération credentials:', error.message);
    return null;
  }
}

/**
 * Envoie un message WhatsApp
 * @param {Object} params
 * @param {string} params.to - Numéro de téléphone (+33...)
 * @param {string} params.message - Texte du message
 * @param {string} params.tenantId - Tenant ID
 * @param {string} params.leadId - Lead ID (optionnel)
 * @param {Object} params.db - Pool PostgreSQL (optionnel, requis pour Settings)
 * @returns {Promise<Object>}
 */
export async function sendWhatsapp({ to, message, tenantId, leadId, db }) {
  try {
    console.log('[sendWhatsapp] Envoi vers:', to, '| Tenant:', tenantId);

    // 1. Vérifier si WhatsApp est activé pour ce tenant (billing gate)
    if (!await isWhatsappEnabled(tenantId, db)) {
      throw new Error('WhatsApp non activé pour votre compte. Contactez le support pour activer cette option (+15€/mois).');
    }

    // 2. Récupérer les credentials (Settings ou JSON)
    const credentials = await getGreenApiCredentials(tenantId, db);

    if (!credentials) {
      throw new Error('Aucune configuration Green-API trouvée. Configurez un provider dans Settings.');
    }

    // Envoi via Green-API avec credentials dynamiques
    const result = await sendWhatsAppWithCredentials(to, message, credentials.instanceId, credentials.token);

    if (!result || !result.idMessage) {
      throw new Error('Échec envoi Green-API');
    }

    // Logger l'event
    await logMessageEvent({
      channel: 'whatsapp',
      provider: 'greenapi',
      direction: 'out',
      leadId,
      phoneNumber: to,
      providerMessageId: result.idMessage,
      status: 'sent',
      messageSnippet: message.substring(0, 200),
      rawPayload: { ...result, credentialsSource: credentials.source },
      timestamp: new Date().toISOString()
    });

    console.log(`[sendWhatsapp] ✅ Envoyé (${credentials.source}), idMessage:`, result.idMessage);

    return {
      ok: true,
      messageId: result.idMessage,
      provider: 'greenapi',
      credentialsSource: credentials.source
    };

  } catch (error) {
    console.error('[sendWhatsapp] ❌ Erreur:', error);

    // Logger l'échec
    if (leadId || to) {
      await logMessageEvent({
        channel: 'whatsapp',
        provider: 'greenapi',
        direction: 'out',
        leadId,
        phoneNumber: to,
        providerMessageId: 'failed-' + Date.now(),
        status: 'failed',
        messageSnippet: message?.substring(0, 200),
        rawPayload: { error: error.message },
        timestamp: new Date().toISOString()
      });
    }

    return {
      ok: false,
      error: error.message
    };
  }
}