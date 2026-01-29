/**
 * lib/tenantResolver.js
 * Résolution sécurisée du tenant pour les webhooks entrants
 *
 * RÈGLE D'OR:
 * - JAMAIS de fallback tenant
 * - JAMAIS de "premier trouvé" si ambiguïté
 * - Toujours retourner null ou { ambiguous: true } si problème
 *
 * PRIORITÉ DE MATCHING:
 * 1. providerMessageId → lookup dans message_events (meilleure méthode)
 * 2. email/phone/waId → lookup dans EspoCRM Lead.cTenantId
 */

import { createClient } from '@supabase/supabase-js';
import { espoFetch } from './espoClient.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Résolution par providerMessageId (PRIORITAIRE)
 * Cherche dans message_events un event sortant avec ce messageId
 *
 * @param {string} providerMessageId - ID du message provider (Mailjet MessageID, Twilio SID, etc.)
 * @returns {Promise<{leadId: string, tenantId: string} | null>}
 */
export async function resolveByProviderMessageId(providerMessageId) {
  if (!providerMessageId) return null;

  try {
    const { data, error } = await supabase
      .from('message_events')
      .select('lead_id, tenant_id')
      .eq('provider_message_id', String(providerMessageId))
      .eq('direction', 'out') // On cherche le message sortant original
      .order('event_timestamp', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[TENANT_RESOLVER] Erreur Supabase providerMessageId:', error);
      return null;
    }

    if (data && data.length > 0) {
      console.log(`[TENANT_RESOLVER] ✅ Résolu par providerMessageId ${providerMessageId}: tenant=${data[0].tenant_id}, lead=${data[0].lead_id}`);
      return {
        leadId: data[0].lead_id,
        tenantId: data[0].tenant_id
      };
    }

    return null;
  } catch (error) {
    console.error('[TENANT_RESOLVER] Exception providerMessageId:', error);
    return null;
  }
}

/**
 * Résolution par Email
 * Cherche dans EspoCRM les leads avec cet email + leur cTenantId
 *
 * @param {string} email - Adresse email
 * @param {string} [providerMessageId] - ID message pour lookup prioritaire
 * @returns {Promise<{leadId: string, tenantId: string} | {ambiguous: true, candidates: Array} | null>}
 */
export async function resolveLeadAndTenantByEmail(email, providerMessageId = null) {
  if (!email) return null;

  // 1. Essayer d'abord par providerMessageId (plus fiable)
  if (providerMessageId) {
    const resolved = await resolveByProviderMessageId(providerMessageId);
    if (resolved) return resolved;
  }

  // 2. Fallback: chercher dans EspoCRM par email
  try {
    const normalizedEmail = email.toLowerCase().trim();

    // Chercher tous les leads avec cet email
    const url = `/Lead?where[0][type]=equals&where[0][attribute]=emailAddress&where[0][value]=${encodeURIComponent(normalizedEmail)}&select=id,emailAddress,cTenantId&maxSize=50`;

    const response = await espoFetch(url);

    if (!response || !response.list || response.list.length === 0) {
      console.log(`[TENANT_RESOLVER] Aucun lead trouvé pour email: ${normalizedEmail}`);
      return null;
    }

    // Filtrer les leads qui ont un cTenantId valide
    const leadsWithTenant = response.list.filter(lead => lead.cTenantId);

    if (leadsWithTenant.length === 0) {
      console.log(`[TENANT_RESOLVER] Leads trouvés mais sans cTenantId pour email: ${normalizedEmail}`);
      return null;
    }

    // Vérifier l'unicité du tenant
    const uniqueTenants = [...new Set(leadsWithTenant.map(l => l.cTenantId))];

    if (uniqueTenants.length === 1) {
      // Un seul tenant → OK
      const lead = leadsWithTenant[0];
      console.log(`[TENANT_RESOLVER] ✅ Résolu par email ${normalizedEmail}: tenant=${lead.cTenantId}, lead=${lead.id}`);
      return {
        leadId: lead.id,
        tenantId: lead.cTenantId
      };
    }

    // Plusieurs tenants → AMBIGUÏTÉ (DANGER!)
    console.warn(`[TENANT_RESOLVER] ⚠️ AMBIGUÏTÉ email ${normalizedEmail}: ${uniqueTenants.length} tenants différents!`, uniqueTenants);
    return {
      ambiguous: true,
      candidates: leadsWithTenant.map(l => ({
        leadId: l.id,
        tenantId: l.cTenantId
      }))
    };

  } catch (error) {
    console.error('[TENANT_RESOLVER] Exception resolveByEmail:', error);
    return null;
  }
}

/**
 * Résolution par Téléphone
 * Cherche dans EspoCRM les leads avec ce numéro + leur cTenantId
 *
 * @param {string} phone - Numéro de téléphone
 * @param {string} [providerMessageId] - ID message pour lookup prioritaire
 * @returns {Promise<{leadId: string, tenantId: string} | {ambiguous: true, candidates: Array} | null>}
 */
export async function resolveLeadAndTenantByPhone(phone, providerMessageId = null) {
  if (!phone) return null;

  // 1. Essayer d'abord par providerMessageId (plus fiable)
  if (providerMessageId) {
    const resolved = await resolveByProviderMessageId(providerMessageId);
    if (resolved) return resolved;
  }

  // 2. Fallback: chercher dans EspoCRM par téléphone
  try {
    // Normaliser le numéro (garder uniquement les chiffres et le +)
    const normalizedPhone = phone.replace(/[^\d+]/g, '');

    // Chercher tous les leads avec ce téléphone
    const url = `/Lead?where[0][type]=contains&where[0][attribute]=phoneNumber&where[0][value]=${encodeURIComponent(normalizedPhone)}&select=id,phoneNumber,cTenantId&maxSize=50`;

    const response = await espoFetch(url);

    if (!response || !response.list || response.list.length === 0) {
      // Essayer une recherche plus large (derniers 9 chiffres)
      const last9Digits = normalizedPhone.replace(/^\+?\d{0,3}/, '').slice(-9);
      if (last9Digits.length >= 9) {
        const urlAlt = `/Lead?where[0][type]=contains&where[0][attribute]=phoneNumber&where[0][value]=${encodeURIComponent(last9Digits)}&select=id,phoneNumber,cTenantId&maxSize=50`;
        const responseAlt = await espoFetch(urlAlt);

        if (responseAlt && responseAlt.list && responseAlt.list.length > 0) {
          return processPhoneResults(responseAlt.list, normalizedPhone);
        }
      }

      console.log(`[TENANT_RESOLVER] Aucun lead trouvé pour phone: ${normalizedPhone}`);
      return null;
    }

    return processPhoneResults(response.list, normalizedPhone);

  } catch (error) {
    console.error('[TENANT_RESOLVER] Exception resolveByPhone:', error);
    return null;
  }
}

/**
 * Traite les résultats de recherche par téléphone
 */
function processPhoneResults(leads, normalizedPhone) {
  // Filtrer les leads qui ont un cTenantId valide
  const leadsWithTenant = leads.filter(lead => lead.cTenantId);

  if (leadsWithTenant.length === 0) {
    console.log(`[TENANT_RESOLVER] Leads trouvés mais sans cTenantId pour phone: ${normalizedPhone}`);
    return null;
  }

  // Vérifier l'unicité du tenant
  const uniqueTenants = [...new Set(leadsWithTenant.map(l => l.cTenantId))];

  if (uniqueTenants.length === 1) {
    // Un seul tenant → OK
    const lead = leadsWithTenant[0];
    console.log(`[TENANT_RESOLVER] ✅ Résolu par phone ${normalizedPhone}: tenant=${lead.cTenantId}, lead=${lead.id}`);
    return {
      leadId: lead.id,
      tenantId: lead.cTenantId
    };
  }

  // Plusieurs tenants → AMBIGUÏTÉ (DANGER!)
  console.warn(`[TENANT_RESOLVER] ⚠️ AMBIGUÏTÉ phone ${normalizedPhone}: ${uniqueTenants.length} tenants différents!`, uniqueTenants);
  return {
    ambiguous: true,
    candidates: leadsWithTenant.map(l => ({
      leadId: l.id,
      tenantId: l.cTenantId
    }))
  };
}

/**
 * Résolution par WhatsApp ID (waId ou chatId)
 * Format: 33612345678@c.us ou juste 33612345678
 *
 * @param {string} waIdOrChatId - WhatsApp ID ou Chat ID
 * @param {string} [providerMessageId] - ID message pour lookup prioritaire
 * @returns {Promise<{leadId: string, tenantId: string} | {ambiguous: true, candidates: Array} | null>}
 */
export async function resolveLeadAndTenantByWaId(waIdOrChatId, providerMessageId = null) {
  if (!waIdOrChatId) return null;

  // 1. Essayer d'abord par providerMessageId (plus fiable)
  if (providerMessageId) {
    const resolved = await resolveByProviderMessageId(providerMessageId);
    if (resolved) return resolved;
  }

  // 2. Extraire le numéro de téléphone du waId
  // Format: 33612345678@c.us → +33612345678
  let phone = waIdOrChatId.replace(/@c\.us$|@s\.whatsapp\.net$/i, '');

  // Ajouter le + si absent
  if (!phone.startsWith('+')) {
    phone = '+' + phone;
  }

  // 3. Utiliser la résolution par téléphone
  return resolveLeadAndTenantByPhone(phone, null);
}

/**
 * Logger un événement orphelin (sans tenant résolu)
 *
 * @param {Object} event - Détails de l'événement
 * @param {string} event.channel - Canal (email/sms/whatsapp)
 * @param {string} event.provider - Provider (mailjet/twilio/greenapi)
 * @param {string} event.reason - Raison (no_match, ambiguous, etc.)
 * @param {Object} event.payload - Payload brut du webhook
 * @param {Array} [event.candidates] - Candidats si ambiguïté
 */
export async function logOrphanWebhookEvent(event) {
  try {
    const orphanEvent = {
      id: `orphan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      channel: event.channel,
      provider: event.provider,
      reason: event.reason, // 'no_match' | 'ambiguous' | 'no_tenant_id'
      contact_identifier: event.contactIdentifier, // email/phone/waId
      provider_message_id: event.providerMessageId,
      candidates: event.candidates || null,
      raw_payload: event.payload,
      created_at: new Date().toISOString()
    };

    // Essayer d'insérer dans orphan_webhook_events
    const { error } = await supabase
      .from('orphan_webhook_events')
      .insert(orphanEvent);

    if (error) {
      // Si la table n'existe pas, logger en console
      console.error('[TENANT_RESOLVER] 🚨 ORPHAN WEBHOOK EVENT (table error):', {
        ...orphanEvent,
        supabaseError: error.message
      });
    } else {
      console.log(`[TENANT_RESOLVER] 📝 Orphan event logged: ${orphanEvent.id} (${event.reason})`);
    }

    return orphanEvent;
  } catch (error) {
    // En dernier recours, logger en console
    console.error('[TENANT_RESOLVER] 🚨 ORPHAN WEBHOOK EVENT (exception):', {
      channel: event.channel,
      provider: event.provider,
      reason: event.reason,
      contactIdentifier: event.contactIdentifier,
      error: error.message
    });
    return null;
  }
}

/**
 * Helper: Vérifier si un résultat de résolution est valide
 *
 * @param {Object|null} result - Résultat de résolution
 * @returns {boolean}
 */
export function isValidResolution(result) {
  return result !== null &&
         !result.ambiguous &&
         result.leadId &&
         result.tenantId;
}

/**
 * Helper: Vérifier si un résultat est ambigu
 *
 * @param {Object|null} result - Résultat de résolution
 * @returns {boolean}
 */
export function isAmbiguousResolution(result) {
  return result !== null && result.ambiguous === true;
}
