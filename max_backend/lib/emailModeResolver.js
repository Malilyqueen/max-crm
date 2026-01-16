/**
 * Email Mode Resolver
 * Détermine le mode d'envoi email par tenant (3 options)
 */

import { supabase } from './supabaseClient.js';
import { decryptCredentials } from './encryption.js';

/**
 * Récupère la configuration email d'un tenant
 *
 * @param {string} tenantId - ID du tenant
 * @returns {Promise<{mode: string, config: object}>}
 *
 * Modes possibles:
 * - 'self_service': Tenant a son provider custom (credentials propres)
 * - 'custom_domain': Tenant utilise son domaine via Mailjet MaCréa
 * - 'default': Tenant utilise no-reply@malalacrea.fr (par défaut)
 */
export async function resolveEmailMode(tenantId) {
  console.log(`[EMAIL_MODE] Résolution mode pour tenant: ${tenantId}`);

  // 1. Vérifier si tenant a un provider email custom actif (Option 3)
  const { data: providers, error: providerError } = await supabase
    .from('tenant_provider_configs')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('provider_type', 'mailjet') // Pour l'instant seulement Mailjet
    .eq('is_active', true)
    .limit(1);

  if (providerError) {
    console.error('[EMAIL_MODE] Erreur lecture providers:', providerError);
  }

  if (providers && providers.length > 0) {
    const provider = providers[0];
    console.log(`[EMAIL_MODE] ✅ Mode: SELF_SERVICE (provider ${provider.id})`);

    // Déchiffrer les credentials
    try {
      const credentials = JSON.parse(decryptCredentials(provider.encrypted_config, tenantId));

      return {
        mode: 'self_service',
        config: {
          provider_id: provider.id,
          provider_type: provider.provider_type,
          provider_name: provider.provider_name,
          credentials,
          from_email: credentials.from_email || null, // Si configuré dans le provider
          from_name: credentials.from_name || null
        }
      };
    } catch (error) {
      console.error('[EMAIL_MODE] ❌ Erreur déchiffrement credentials:', error);
      // Fallback vers mode par défaut
    }
  }

  // 2. Vérifier si tenant a un domaine custom validé (Option 2)
  // TODO: Créer table tenant_email_domains ou stocker dans tenant_settings
  // Pour l'instant, on check si un sender Mailjet est validé pour ce tenant

  const customDomain = await getValidatedCustomDomain(tenantId);

  if (customDomain) {
    console.log(`[EMAIL_MODE] ✅ Mode: CUSTOM_DOMAIN (${customDomain.email})`);

    return {
      mode: 'custom_domain',
      config: {
        from_email: customDomain.email,
        from_name: customDomain.name || tenantId,
        reply_to: customDomain.reply_to || customDomain.email,
        mailjet_sender_id: customDomain.sender_id,
        dns_status: customDomain.status
      }
    };
  }

  // 3. Fallback: Mode par défaut (Option 1)
  console.log(`[EMAIL_MODE] ✅ Mode: DEFAULT (no-reply@malalacrea.fr)`);

  // Récupérer le reply-to du tenant (obligatoire)
  const tenantReplyTo = await getTenantReplyTo(tenantId);

  return {
    mode: 'default',
    config: {
      from_email: 'no-reply@malalacrea.fr',
      from_name: 'M.A.X. CRM',
      reply_to: tenantReplyTo || 'contact@malalacrea.fr', // Fallback si pas configuré
      quota_limit: 1000, // 1000 emails/mois par tenant (suivi futur)
      quota_shared: true
    }
  };
}

/**
 * Récupère le domaine custom validé d'un tenant (si existe)
 *
 * @param {string} tenantId
 * @returns {Promise<object|null>}
 */
async function getValidatedCustomDomain(tenantId) {
  // TODO: Implémenter table tenant_email_domains avec colonnes:
  // - tenant_id
  // - email (ex: contact@restaurant.fr)
  // - domain (ex: restaurant.fr)
  // - name (ex: "Restaurant Le Délice")
  // - reply_to (optionnel)
  // - mailjet_sender_id
  // - dns_status ('pending', 'verified', 'failed')
  // - verified_at
  // - created_at

  // Pour l'instant, on retourne null (Option 2 pas encore stockée en DB)
  return null;
}

/**
 * Récupère l'email reply-to du tenant
 *
 * @param {string} tenantId
 * @returns {Promise<string|null>}
 */
async function getTenantReplyTo(tenantId) {
  // TODO: Implémenter lecture depuis tenant_settings ou user profile
  // Pour l'instant, retourner null (fallback vers contact@malalacrea.fr)

  // Exemple future implémentation:
  // const { data } = await supabase
  //   .from('tenant_settings')
  //   .select('email_reply_to')
  //   .eq('tenant_id', tenantId)
  //   .single();
  //
  // return data?.email_reply_to || null;

  return null;
}

/**
 * Envoie un email via le provider approprié selon le mode
 *
 * @param {object} params - Paramètres sendEmail
 * @returns {Promise<object>}
 */
export async function sendEmailWithMode(params) {
  const { tenantId, to, subject, body, from, replyTo, parentType, parentId } = params;

  // Résoudre le mode email
  const { mode, config } = await resolveEmailMode(tenantId);

  // Déterminer FROM et REPLY-TO selon le mode
  const emailFrom = from || config.from_email;
  const emailReplyTo = replyTo || config.reply_to;
  const emailFromName = config.from_name || 'M.A.X. CRM';

  console.log(`[EMAIL_SEND] Mode: ${mode}`);
  console.log(`[EMAIL_SEND] FROM: ${emailFrom} <${emailFromName}>`);
  console.log(`[EMAIL_SEND] REPLY-TO: ${emailReplyTo}`);

  // Importer la fonction d'envoi appropriée
  const { sendViaMailjet } = await import('../actions/sendEmail.js');

  // Envoyer selon le mode
  switch (mode) {
    case 'self_service':
      // Utiliser credentials du tenant
      return await sendViaMailjet({
        ...params,
        from: emailFrom,
        fromName: emailFromName,
        replyTo: emailReplyTo,
        customCredentials: config.credentials // API Key + Secret du tenant
      });

    case 'custom_domain':
      // Utiliser Mailjet MaCréa avec FROM custom
      return await sendViaMailjet({
        ...params,
        from: emailFrom,
        fromName: emailFromName,
        replyTo: emailReplyTo
        // Utilise credentials globaux MaCréa
      });

    case 'default':
    default:
      // Utiliser no-reply@malalacrea.fr + reply-to tenant
      return await sendViaMailjet({
        ...params,
        from: 'no-reply@malalacrea.fr',
        fromName: 'M.A.X. CRM',
        replyTo: emailReplyTo
      });
  }
}
