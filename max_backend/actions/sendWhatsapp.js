/**
 * actions/sendWhatsapp.js
 * Envoi WhatsApp via Green-API avec logging automatique
 *
 * Priorité:
 * 1. Credentials depuis Settings API (tenant_provider_configs) - chiffrés per-tenant
 * 2. Fallback: wa-instances.json (ancien système)
 *
 * Billing:
 * - Vérifie subscription_active AVANT envoi
 * - Consomme 1 message APRÈS envoi réussi
 */

import { sendWhatsApp, sendWhatsAppWithCredentials, sendWhatsAppPollWithCredentials, sendWhatsAppFileWithCredentials } from '../lib/whatsappHelper.js';
import { logMessageEvent } from '../lib/messageEventLogger.js';
import { decryptCredentials } from '../lib/encryption.js';
import { isWhatsappEnabled } from '../middleware/whatsappGate.js';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
const { Pool } = pg;

// Supabase client pour billing
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Vérifie si l'envoi WhatsApp est autorisé (billing check)
 * @param {string} tenantId
 * @returns {Promise<{canSend: boolean, reason?: string, remaining?: number}>}
 *
 * NOTE: Billing désactivé - WhatsApp illimité
 */
async function checkWhatsappBilling(tenantId) {
  // Billing désactivé - toujours autoriser
  console.log(`[sendWhatsapp] 💚 Billing désactivé - WhatsApp illimité pour tenant: ${tenantId}`);
  return { canSend: true, remaining: 'unlimited' };
}

/**
 * Consomme 1 message après envoi réussi
 * @param {string} tenantId
 * @returns {Promise<{success: boolean, remaining?: number, source?: string}>}
 *
 * NOTE: Billing désactivé - WhatsApp illimité
 */
async function consumeWhatsappMessage(tenantId) {
  // Billing désactivé - ne pas consommer
  return { success: true, remaining: 'unlimited', source: 'unlimited' };
}

/**
 * Récupère les credentials Green-API depuis Settings (priorité) ou JSON (fallback)
 * @param {string} tenantId
 * @param {Object} db - Pool PostgreSQL
 * @returns {Promise<Object|null>} - { instanceId, token, source: 'settings'|'json' }
 */
async function getGreenApiCredentials(tenantId, db) {
  try {
    // Lire provider avec vérification statut + expiration
    const result = await db.query(
      `SELECT encrypted_config, whatsapp_status, expires_at FROM tenant_provider_configs
       WHERE tenant_id = $1 AND provider_type = 'greenapi_whatsapp' AND is_active = true
       LIMIT 1`,
      [tenantId]
    );

    if (result.rows.length === 0) {
      console.error('[sendWhatsapp] ❌ Aucun provider WhatsApp actif pour tenant:', tenantId);
      return null;
    }

    const { encrypted_config, whatsapp_status, expires_at } = result.rows[0];

    // Protection: vérifier status == connected
    if (whatsapp_status !== 'connected') {
      console.error(`[sendWhatsapp] ⛔ Envoi bloqué: whatsapp_status = ${whatsapp_status} (tenant: ${tenantId})`);
      return null;
    }

    // Protection: vérifier expiration
    if (expires_at && new Date(expires_at) < new Date()) {
      console.error(`[sendWhatsapp] ⛔ Envoi bloqué: instance expirée le ${expires_at} (tenant: ${tenantId})`);
      return null;
    }

    const credentials = decryptCredentials(encrypted_config, tenantId);

    console.log('[sendWhatsapp] ✅ Credentials validées (status: connected, non expiré)');
    return {
      instanceId: credentials.instanceId,
      token: credentials.token,
      source: 'settings'
    };

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
 * @param {string} params.campaignId - Campaign ID pour bulk sends (optionnel)
 * @param {Object} params.db - Pool PostgreSQL (optionnel, requis pour Settings)
 * @returns {Promise<Object>}
 */
export async function sendWhatsapp({ to, message, tenantId, leadId, campaignId, db }) {
  try {
    console.log('[sendWhatsapp] Envoi vers:', to, '| Tenant:', tenantId);

    // 0. KILL SWITCH: Vérifier si les envois sont désactivés globalement
    const { checkKillSwitch } = await import('../lib/killSwitch.js');
    const killCheck = checkKillSwitch('whatsapp');
    if (killCheck.blocked) {
      console.warn(`[sendWhatsapp] 🛑 KILL SWITCH: envoi WhatsApp bloqué`);
      return { ok: false, error: killCheck.reason, message: killCheck.message };
    }

    // 0b. OPT-OUT: Vérifier si le contact a demandé à ne plus recevoir de WhatsApp
    const cleanPhone = to.replace(/[\+\s\-\(\)]/g, '');
    const { data: optOut } = await supabase
      .from('whatsapp_optouts')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('phone_number', cleanPhone)
      .maybeSingle();

    if (optOut) {
      console.log(`[sendWhatsapp] 🚫 BLOQUÉ: ${cleanPhone} a demandé opt-out (tenant: ${tenantId})`);
      return { ok: false, error: 'OPTED_OUT', message: 'Ce contact a demandé à ne plus recevoir de WhatsApp' };
    }

    // 1. Vérifier si WhatsApp est activé pour ce tenant (feature flag)
    if (!await isWhatsappEnabled(tenantId, db)) {
      throw new Error('WhatsApp non activé pour votre compte. Contactez le support pour activer cette option.');
    }

    // 2. Vérifier le billing WhatsApp (abonnement actif + solde disponible)
    const billingCheck = await checkWhatsappBilling(tenantId);
    if (!billingCheck.canSend) {
      console.warn(`[sendWhatsapp] ⛔ Envoi bloqué: ${billingCheck.reason}`);
      throw new Error(billingCheck.message || 'Envoi WhatsApp bloqué (billing)');
    }

    // 3. Récupérer les credentials (Settings ou JSON)
    const credentials = await getGreenApiCredentials(tenantId, db);

    if (!credentials) {
      throw new Error('Aucune configuration Green-API trouvée. Configurez un provider dans Settings.');
    }

    // 4. Envoi via Green-API avec credentials dynamiques
    const result = await sendWhatsAppWithCredentials(to, message, credentials.instanceId, credentials.token);

    if (!result || !result.idMessage) {
      throw new Error('Échec envoi Green-API');
    }

    // 5. Consommer 1 message après envoi réussi
    const consumeResult = await consumeWhatsappMessage(tenantId);

    // Logger l'event
    await logMessageEvent({
      channel: 'whatsapp',
      provider: 'greenapi',
      direction: 'out',
      tenantId,
      leadId,
      campaignId, // ✅ Lier à la campagne bulk
      phoneNumber: to,
      providerMessageId: result.idMessage,
      status: 'sent',
      messageSnippet: message.substring(0, 200),
      rawPayload: {
        ...result,
        credentialsSource: credentials.source,
        billing: consumeResult.success ? {
          consumed: true,
          remaining: consumeResult.remaining,
          source: consumeResult.source
        } : { consumed: false }
      },
      timestamp: new Date().toISOString()
    });

    console.log(`[sendWhatsapp] ✅ Envoyé (${credentials.source}), idMessage:`, result.idMessage);

    return {
      ok: true,
      messageId: result.idMessage,
      provider: 'greenapi',
      credentialsSource: credentials.source,
      billing: consumeResult.success ? {
        remaining: consumeResult.remaining,
        source: consumeResult.source
      } : null
    };

  } catch (error) {
    console.error('[sendWhatsapp] ❌ Erreur:', error);

    // Logger l'échec (sauf si c'est un blocage billing)
    const isBillingBlock = error.message?.includes('Abonnement WhatsApp inactif') ||
                          error.message?.includes('Solde de messages');

    if ((leadId || to) && !isBillingBlock) {
      await logMessageEvent({
        channel: 'whatsapp',
        provider: 'greenapi',
        direction: 'out',
        tenantId,
        leadId,
        campaignId, // ✅ Lier à la campagne bulk
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
      error: error.message,
      billingBlocked: isBillingBlock
    };
  }
}

/**
 * Envoie un sondage WhatsApp (même pipeline sécurité que sendWhatsapp)
 */
export async function sendWhatsappPoll({ to, question, options, multipleAnswers = false, tenantId, leadId, db }) {
  try {
    console.log('[sendWhatsappPoll] Envoi sondage vers:', to, '| Tenant:', tenantId);

    // Kill switch
    const { checkKillSwitch } = await import('../lib/killSwitch.js');
    const killCheck = checkKillSwitch('whatsapp');
    if (killCheck.blocked) {
      return { ok: false, error: killCheck.reason, message: killCheck.message };
    }

    // Opt-out check
    const cleanPhone = to.replace(/[\+\s\-\(\)]/g, '');
    const { data: optOut } = await supabase
      .from('whatsapp_optouts')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('phone_number', cleanPhone)
      .maybeSingle();

    if (optOut) {
      return { ok: false, error: 'OPTED_OUT', message: 'Ce contact a demandé opt-out' };
    }

    // Feature flag
    if (!await isWhatsappEnabled(tenantId, db)) {
      throw new Error('WhatsApp non activé pour votre compte.');
    }

    // Credentials
    const credentials = await getGreenApiCredentials(tenantId, db);
    if (!credentials) {
      throw new Error('Aucune configuration Green-API trouvée.');
    }

    // Envoi
    const result = await sendWhatsAppPollWithCredentials(to, question, options, multipleAnswers, credentials.instanceId, credentials.token);

    if (!result || !result.idMessage) {
      throw new Error('Échec envoi sondage Green-API');
    }

    // Logger
    await logMessageEvent({
      channel: 'whatsapp',
      provider: 'greenapi',
      direction: 'out',
      tenantId,
      leadId,
      phoneNumber: to,
      providerMessageId: result.idMessage,
      status: 'sent',
      messageSnippet: `📊 Sondage: ${question.substring(0, 180)}`,
      rawPayload: { type: 'poll', question, options, ...result },
      timestamp: new Date().toISOString()
    });

    console.log(`[sendWhatsappPoll] ✅ Sondage envoyé, idMessage:`, result.idMessage);

    return {
      ok: true,
      messageId: result.idMessage,
      provider: 'greenapi',
      type: 'poll'
    };

  } catch (error) {
    console.error('[sendWhatsappPoll] ❌ Erreur:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Envoie un fichier WhatsApp (même pipeline sécurité que sendWhatsapp)
 */
export async function sendWhatsappFile({ to, urlFile, fileName, caption, tenantId, leadId, db }) {
  try {
    console.log('[sendWhatsappFile] Envoi fichier vers:', to, '| Tenant:', tenantId);

    // Kill switch
    const { checkKillSwitch } = await import('../lib/killSwitch.js');
    const killCheck = checkKillSwitch('whatsapp');
    if (killCheck.blocked) {
      return { ok: false, error: killCheck.reason, message: killCheck.message };
    }

    // Opt-out check
    const cleanPhone = to.replace(/[\+\s\-\(\)]/g, '');
    const { data: optOut } = await supabase
      .from('whatsapp_optouts')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('phone_number', cleanPhone)
      .maybeSingle();

    if (optOut) {
      return { ok: false, error: 'OPTED_OUT', message: 'Ce contact a demandé opt-out' };
    }

    // Feature flag
    if (!await isWhatsappEnabled(tenantId, db)) {
      throw new Error('WhatsApp non activé pour votre compte.');
    }

    // Credentials
    const credentials = await getGreenApiCredentials(tenantId, db);
    if (!credentials) {
      throw new Error('Aucune configuration Green-API trouvée.');
    }

    // Envoi
    const result = await sendWhatsAppFileWithCredentials(to, urlFile, fileName, caption, credentials.instanceId, credentials.token);

    if (!result || !result.idMessage) {
      throw new Error('Échec envoi fichier Green-API');
    }

    // Logger
    await logMessageEvent({
      channel: 'whatsapp',
      provider: 'greenapi',
      direction: 'out',
      tenantId,
      leadId,
      phoneNumber: to,
      providerMessageId: result.idMessage,
      status: 'sent',
      messageSnippet: `📎 Fichier: ${fileName}${caption ? ' — ' + caption.substring(0, 150) : ''}`,
      rawPayload: { type: 'file', urlFile, fileName, ...result },
      timestamp: new Date().toISOString()
    });

    console.log(`[sendWhatsappFile] ✅ Fichier envoyé, idMessage:`, result.idMessage);

    return {
      ok: true,
      messageId: result.idMessage,
      provider: 'greenapi',
      type: 'file'
    };

  } catch (error) {
    console.error('[sendWhatsappFile] ❌ Erreur:', error);
    return { ok: false, error: error.message };
  }
}