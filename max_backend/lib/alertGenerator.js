/**
 * alertGenerator.js
 * Génération automatique des alertes M.A.X.
 * MVP: 2 alertes uniquement (NoContact7d, NoReply3d)
 * DB: Supabase (PostgreSQL)
 */

import { supabase } from './supabaseClient.js';
import { getLeadActivities } from './activityLogger.js';
import { espoFetch } from './espoClient.js';

/**
 * Générer/rafraîchir les alertes pour un lead spécifique
 * Appelé après chaque logActivity()
 *
 * @param {string} leadId - ID du lead EspoCRM
 * @param {string} [tenantId='macrea'] - ID du tenant
 * @returns {Promise<Object>} Alertes générées/résolues
 */
export async function generateAlertsForLead(leadId, tenantId = 'macrea') {
  console.log(`[AlertGenerator] 🔔 Génération alertes pour lead ${leadId}`);

  const result = {
    created: [],
    resolved: [],
    unchanged: []
  };

  try {
    // Récupérer infos du lead depuis EspoCRM
    const lead = await espoFetch(`/Lead/${leadId}`);
    if (!lead || !lead.id) {
      console.warn(`[AlertGenerator] ⚠️ Lead ${leadId} introuvable dans EspoCRM`);
      return result;
    }

    const leadCreatedAt = new Date(lead.createdAt);
    const activities = await getLeadActivities(leadId, 30, tenantId);

    // ============================================================
    // ALERTE 1: NoContact7d
    // Lead créé depuis ≥7 jours, aucune activité OUT
    // ============================================================
    const daysSinceCreation = Math.floor((new Date() - leadCreatedAt) / (1000 * 60 * 60 * 24));
    const hasOutboundContact = activities.some(a => a.direction === 'out');

    if (daysSinceCreation >= 7 && !hasOutboundContact) {
      // Lead jamais contacté → Créer/maintenir alerte NoContact7d
      const existingAlert = await getActiveAlert(leadId, 'NoContact7d', tenantId);

      if (!existingAlert) {
        // Déterminer canal suggéré
        const suggestedChannel = lead.phoneNumber ? 'whatsapp' : (lead.emailAddress ? 'email' : 'other');
        const suggestedAction = {
          action: suggestedChannel === 'whatsapp' ? 'whatsapp_first_contact' : 'email_first_contact',
          channel: suggestedChannel,
          template: 'premier_contact'
        };

        const newAlert = await createAlert({
          tenantId,
          leadId,
          type: 'NoContact7d',
          severity: 'med',
          message: `Ce lead n'a jamais été contacté depuis ${daysSinceCreation} jours. On lance un 1er message sur ${suggestedChannel === 'whatsapp' ? 'WhatsApp' : 'email'} ?`,
          suggestedAction
        });

        result.created.push(newAlert);
        console.log(`[AlertGenerator] ✅ Alerte NoContact7d créée pour ${leadId}`);
      } else {
        result.unchanged.push('NoContact7d');
      }
    } else if (hasOutboundContact) {
      // Lead a été contacté → Résoudre alerte NoContact7d si elle existe
      const existingAlert = await getActiveAlert(leadId, 'NoContact7d', tenantId);
      if (existingAlert) {
        await resolveAlert(existingAlert.id);
        result.resolved.push('NoContact7d');
        console.log(`[AlertGenerator] ✓ Alerte NoContact7d résolue pour ${leadId}`);
      }
    }

    // ============================================================
    // ALERTE 2: NoReply3d
    // Dernière activité OUT ≥3 jours, aucune activité IN après
    // ============================================================
    const lastOutbound = activities.find(a => a.direction === 'out');

    if (lastOutbound) {
      const daysSinceLastOut = Math.floor((new Date() - new Date(lastOutbound.created_at)) / (1000 * 60 * 60 * 24));
      const hasReplyAfter = activities.some(a =>
        a.direction === 'in' && new Date(a.created_at) > new Date(lastOutbound.created_at)
      );

      if (daysSinceLastOut >= 3 && !hasReplyAfter) {
        // Silence après message → Créer/maintenir alerte NoReply3d
        const existingAlert = await getActiveAlert(leadId, 'NoReply3d', tenantId);

        if (!existingAlert) {
          // Severity: high si lead a montré intention, sinon med
          const hasIntention = activities.some(a => a.direction === 'in');
          const severity = hasIntention ? 'high' : 'med';

          // Canal suggéré = celui du dernier OUT, sinon whatsapp si phone
          const suggestedChannel = lastOutbound.channel === 'email'
            ? (lead.phoneNumber ? 'whatsapp' : 'email')
            : lastOutbound.channel;

          const suggestedAction = {
            action: 'followup',
            channel: suggestedChannel,
            template: 'relance_douce'
          };

          const newAlert = await createAlert({
            tenantId,
            leadId,
            type: 'NoReply3d',
            severity,
            message: `Silence depuis ${daysSinceLastOut} jours après ton message. Relance douce ou changement d'angle ?`,
            suggestedAction
          });

          result.created.push(newAlert);
          console.log(`[AlertGenerator] ✅ Alerte NoReply3d créée pour ${leadId}`);
        } else {
          result.unchanged.push('NoReply3d');
        }
      } else if (hasReplyAfter) {
        // Lead a répondu → Résoudre alerte NoReply3d si elle existe
        const existingAlert = await getActiveAlert(leadId, 'NoReply3d', tenantId);
        if (existingAlert) {
          await resolveAlert(existingAlert.id);
          result.resolved.push('NoReply3d');
          console.log(`[AlertGenerator] ✓ Alerte NoReply3d résolue pour ${leadId}`);
        }
      }
    }

    console.log(`[AlertGenerator] ✓ Terminé pour ${leadId}:`, result);
    return result;

  } catch (error) {
    console.error(`[AlertGenerator] ❌ Erreur pour lead ${leadId}:`, error);
    throw error;
  }
}

/**
 * Récupérer une alerte active spécifique
 *
 * @param {string} leadId - ID du lead
 * @param {string} type - Type d'alerte
 * @param {string} tenantId - ID du tenant
 * @returns {Promise<Object|null>} Alerte active ou null
 */
async function getActiveAlert(leadId, type, tenantId) {
  const { data, error } = await supabase
    .from('max_alerts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('lead_id', leadId)
    .eq('type', type)
    .is('resolved_at', null)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    console.error(`[AlertGenerator] ⚠️ Erreur getActiveAlert:`, error);
  }

  return data || null;
}

/**
 * Créer une nouvelle alerte
 *
 * @param {Object} params - Paramètres de l'alerte
 * @returns {Promise<Object>} Alerte créée
 */
async function createAlert({ tenantId, leadId, type, severity, message, suggestedAction }) {
  const { data, error } = await supabase
    .from('max_alerts')
    .insert({
      tenant_id: tenantId,
      lead_id: leadId,
      type,
      severity,
      message,
      suggested_action: suggestedAction
    })
    .select()
    .single();

  if (error) {
    console.error(`[AlertGenerator] ❌ Erreur createAlert:`, error);
    throw new Error(`Erreur création alerte: ${error.message}`);
  }

  return data;
}

/**
 * Résoudre une alerte (marquer comme traitée)
 *
 * @param {string} alertId - ID de l'alerte
 * @param {string} [resolvedBy='system'] - Qui a résolu l'alerte
 * @returns {Promise<Object>} Alerte mise à jour
 */
export async function resolveAlert(alertId, resolvedBy = 'system') {
  const { data, error } = await supabase
    .from('max_alerts')
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: resolvedBy
    })
    .eq('id', alertId)
    .select()
    .single();

  if (error) {
    console.error(`[AlertGenerator] ❌ Erreur resolveAlert:`, error);
    throw new Error(`Erreur résolution alerte: ${error.message}`);
  }

  return data;
}

/**
 * Récupérer toutes les alertes actives (pour dashboard)
 *
 * @param {string} [tenantId='macrea'] - ID du tenant
 * @returns {Promise<Array>} Liste des alertes actives
 */
export async function getActiveAlerts(tenantId = 'macrea') {
  const { data, error } = await supabase
    .from('active_alerts')
    .select('*')
    .eq('tenant_id', tenantId);

  if (error) {
    console.error(`[AlertGenerator] ❌ Erreur getActiveAlerts:`, error);
    throw new Error(`Erreur récupération alertes: ${error.message}`);
  }

  return data || [];
}
