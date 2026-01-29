/**
 * Provider Resolver - Résolution des credentials per-tenant
 *
 * SÉCURITÉ MULTI-TENANT:
 * - Chaque tenant a ses propres credentials providers (Twilio, etc.)
 * - JAMAIS de fallback vers credentials globaux (process.env.*)
 * - Erreur explicite PROVIDER_NOT_CONFIGURED si tenant non configuré
 *
 * PROVIDERS SUPPORTÉS:
 * - twilio_sms: SMS via Twilio
 * - twilio_whatsapp: WhatsApp via Twilio (futur)
 * - mailjet: Email via Mailjet (voir emailModeResolver.js)
 */

import { supabase } from './supabaseClient.js';
import { decryptCredentials, redactCredentials } from './encryption.js';

// ============================================================================
// ERREURS STANDARDISÉES
// ============================================================================

export class ProviderNotConfiguredError extends Error {
  constructor(tenantId, provider) {
    super(`PROVIDER_NOT_CONFIGURED: Tenant "${tenantId}" n'a pas de provider "${provider}" actif configuré`);
    this.name = 'ProviderNotConfiguredError';
    this.code = 'PROVIDER_NOT_CONFIGURED';
    this.tenantId = tenantId;
    this.provider = provider;
  }
}

export class ProviderCredentialsError extends Error {
  constructor(tenantId, provider, reason) {
    super(`PROVIDER_CREDENTIALS_ERROR: Impossible de récupérer credentials "${provider}" pour tenant "${tenantId}": ${reason}`);
    this.name = 'ProviderCredentialsError';
    this.code = 'PROVIDER_CREDENTIALS_ERROR';
    this.tenantId = tenantId;
    this.provider = provider;
    this.reason = reason;
  }
}

// ============================================================================
// TWILIO SMS
// ============================================================================

/**
 * Récupère les credentials Twilio SMS pour un tenant
 *
 * @param {string} tenantId - ID du tenant (OBLIGATOIRE)
 * @returns {Promise<TwilioCredentials>}
 * @throws {ProviderNotConfiguredError} Si le tenant n'a pas Twilio configuré
 * @throws {ProviderCredentialsError} Si erreur lors de la récupération/déchiffrement
 *
 * @typedef {Object} TwilioCredentials
 * @property {string} accountSid - Twilio Account SID
 * @property {string} authToken - Twilio Auth Token
 * @property {string} phoneNumber - Numéro Twilio d'envoi (+1...)
 * @property {string} providerId - ID du provider dans tenant_provider_configs
 * @property {string} providerName - Nom du provider (ex: "Twilio Production")
 */
export async function getTwilioCredentials(tenantId) {
  if (!tenantId) {
    throw new Error('SECURITY: tenantId obligatoire pour getTwilioCredentials');
  }

  console.log(`[PROVIDER_RESOLVER] Récupération credentials Twilio pour tenant: ${tenantId}`);

  try {
    // Chercher le provider Twilio SMS actif pour ce tenant
    const { data: providers, error } = await supabase
      .from('tenant_provider_configs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('provider_type', 'twilio_sms')
      .eq('is_active', true)
      .limit(1);

    if (error) {
      console.error('[PROVIDER_RESOLVER] Erreur Supabase:', error);
      throw new ProviderCredentialsError(tenantId, 'twilio_sms', error.message);
    }

    // Vérifier qu'on a trouvé un provider
    if (!providers || providers.length === 0) {
      console.warn(`[PROVIDER_RESOLVER] ⚠️ Aucun provider twilio_sms actif pour tenant: ${tenantId}`);
      throw new ProviderNotConfiguredError(tenantId, 'twilio_sms');
    }

    const provider = providers[0];
    console.log(`[PROVIDER_RESOLVER] Provider trouvé: ${provider.provider_name} (ID: ${provider.id})`);

    // Déchiffrer les credentials
    let credentials;
    try {
      credentials = decryptCredentials(provider.encrypted_config, tenantId);
    } catch (decryptError) {
      console.error('[PROVIDER_RESOLVER] ❌ Erreur déchiffrement:', decryptError.message);
      throw new ProviderCredentialsError(tenantId, 'twilio_sms', 'Échec déchiffrement credentials');
    }

    // Valider les champs requis
    if (!credentials.accountSid || !credentials.authToken || !credentials.phoneNumber) {
      console.error('[PROVIDER_RESOLVER] ❌ Credentials incomplets:', redactCredentials(credentials));
      throw new ProviderCredentialsError(
        tenantId,
        'twilio_sms',
        'Credentials incomplets (accountSid, authToken, phoneNumber requis)'
      );
    }

    console.log(`[PROVIDER_RESOLVER] ✅ Credentials Twilio récupérés pour tenant: ${tenantId}`);
    console.log(`[PROVIDER_RESOLVER]    Account SID: ${credentials.accountSid.substring(0, 10)}...`);
    console.log(`[PROVIDER_RESOLVER]    Phone: ${credentials.phoneNumber}`);

    return {
      accountSid: credentials.accountSid,
      authToken: credentials.authToken,
      phoneNumber: credentials.phoneNumber,
      // Metadata
      providerId: provider.id,
      providerName: provider.provider_name || 'Twilio SMS'
    };

  } catch (error) {
    // Re-throw nos erreurs custom
    if (error instanceof ProviderNotConfiguredError ||
        error instanceof ProviderCredentialsError) {
      throw error;
    }

    // Wrapper les autres erreurs
    console.error('[PROVIDER_RESOLVER] Exception inattendue:', error);
    throw new ProviderCredentialsError(tenantId, 'twilio_sms', error.message);
  }
}

// ============================================================================
// TWILIO WHATSAPP (préparé pour futur)
// ============================================================================

/**
 * Récupère les credentials Twilio WhatsApp pour un tenant
 *
 * @param {string} tenantId - ID du tenant (OBLIGATOIRE)
 * @returns {Promise<TwilioWhatsAppCredentials>}
 * @throws {ProviderNotConfiguredError} Si le tenant n'a pas Twilio WhatsApp configuré
 *
 * @typedef {Object} TwilioWhatsAppCredentials
 * @property {string} accountSid - Twilio Account SID
 * @property {string} authToken - Twilio Auth Token
 * @property {string} whatsappNumber - Numéro WhatsApp Business (whatsapp:+1...)
 */
export async function getTwilioWhatsAppCredentials(tenantId) {
  if (!tenantId) {
    throw new Error('SECURITY: tenantId obligatoire pour getTwilioWhatsAppCredentials');
  }

  console.log(`[PROVIDER_RESOLVER] Récupération credentials Twilio WhatsApp pour tenant: ${tenantId}`);

  try {
    // Chercher le provider Twilio WhatsApp actif pour ce tenant
    const { data: providers, error } = await supabase
      .from('tenant_provider_configs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('provider_type', 'twilio_whatsapp')
      .eq('is_active', true)
      .limit(1);

    if (error) {
      throw new ProviderCredentialsError(tenantId, 'twilio_whatsapp', error.message);
    }

    if (!providers || providers.length === 0) {
      throw new ProviderNotConfiguredError(tenantId, 'twilio_whatsapp');
    }

    const provider = providers[0];
    const credentials = decryptCredentials(provider.encrypted_config, tenantId);

    if (!credentials.accountSid || !credentials.authToken || !credentials.whatsappNumber) {
      throw new ProviderCredentialsError(
        tenantId,
        'twilio_whatsapp',
        'Credentials incomplets (accountSid, authToken, whatsappNumber requis)'
      );
    }

    console.log(`[PROVIDER_RESOLVER] ✅ Credentials Twilio WhatsApp récupérés pour tenant: ${tenantId}`);

    return {
      accountSid: credentials.accountSid,
      authToken: credentials.authToken,
      whatsappNumber: credentials.whatsappNumber,
      providerId: provider.id,
      providerName: provider.provider_name || 'Twilio WhatsApp'
    };

  } catch (error) {
    if (error instanceof ProviderNotConfiguredError ||
        error instanceof ProviderCredentialsError) {
      throw error;
    }
    throw new ProviderCredentialsError(tenantId, 'twilio_whatsapp', error.message);
  }
}

// ============================================================================
// UTILITAIRES
// ============================================================================

/**
 * Vérifie si un tenant a un provider configuré (sans récupérer les credentials)
 *
 * @param {string} tenantId - ID du tenant
 * @param {string} providerType - Type de provider (twilio_sms, twilio_whatsapp, mailjet, etc.)
 * @returns {Promise<boolean>}
 */
export async function hasProviderConfigured(tenantId, providerType) {
  if (!tenantId || !providerType) return false;

  const { data, error } = await supabase
    .from('tenant_provider_configs')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('provider_type', providerType)
    .eq('is_active', true)
    .limit(1);

  if (error) {
    console.error('[PROVIDER_RESOLVER] Erreur hasProviderConfigured:', error);
    return false;
  }

  return data && data.length > 0;
}

/**
 * Liste tous les providers actifs d'un tenant
 *
 * @param {string} tenantId - ID du tenant
 * @returns {Promise<Array<{id: string, provider_type: string, provider_name: string}>>}
 */
export async function listTenantProviders(tenantId) {
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('tenant_provider_configs')
    .select('id, provider_type, provider_name, created_at')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[PROVIDER_RESOLVER] Erreur listTenantProviders:', error);
    return [];
  }

  return data || [];
}
