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
    .from('max_alerts')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('resolved_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`[AlertGenerator] ❌ Erreur getActiveAlerts:`, error);
    throw new Error(`Erreur récupération alertes: ${error.message}`);
  }

  return data || [];
}

/**
 * Scan batch pour détecter les leads dormants et générer des alertes collectives
 * À appeler via CRON ou manuellement
 *
 * @param {string} tenantId - ID du tenant
 * @returns {Promise<Object>} Résultat du scan
 */
export async function scanDormantLeads(tenantId) {
  console.log(`[AlertGenerator] 🔍 Scan batch leads dormants pour tenant ${tenantId}`);

  const result = {
    scanned_leads: 0,
    alerts_created: 0,
    alerts_resolved: 0,
    dormant_count: 0
  };

  try {
    // 1. Récupérer tous les leads du cache
    const { data: allLeads, error: leadsError } = await supabase
      .from('leads_cache')
      .select('id, espo_id, name, first_name, last_name, email, phone, status, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .not('status', 'in', '("Converted","Dead","won","lost","archived")');

    if (leadsError) {
      console.error(`[AlertGenerator] ❌ Erreur fetch leads:`, leadsError);
      return { ok: false, error: leadsError.message };
    }

    result.scanned_leads = allLeads?.length || 0;

    // 2. Récupérer les lead_ids avec events outbound
    const { data: contactedEvents } = await supabase
      .from('message_events')
      .select('lead_id')
      .eq('tenant_id', tenantId)
      .eq('direction', 'outbound')
      .not('lead_id', 'is', null);

    const contactedLeadIds = new Set(
      (contactedEvents || []).map(e => e.lead_id).filter(Boolean)
    );

    // 3. Identifier les leads jamais contactés créés il y a > 7 jours
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const dormantLeads = (allLeads || []).filter(lead => {
      const leadId = lead.espo_id || lead.id;
      const createdAt = new Date(lead.created_at);
      return !contactedLeadIds.has(leadId) && createdAt < sevenDaysAgo;
    });

    result.dormant_count = dormantLeads.length;
    console.log(`[AlertGenerator] 📊 ${dormantLeads.length} leads dormants (jamais contactés, +7j)`);

    // 4. Générer des alertes individuelles pour chaque lead dormant
    for (const lead of dormantLeads) {
      const leadId = lead.espo_id || lead.id;
      const existingAlert = await getActiveAlert(leadId, 'NoContact7d', tenantId);

      if (!existingAlert) {
        const daysSinceCreation = Math.floor((now - new Date(lead.created_at)) / (1000 * 60 * 60 * 24));

        const suggestedChannel = lead.phone ? 'whatsapp' : (lead.email ? 'email' : 'other');
        const suggestedAction = {
          action: suggestedChannel === 'whatsapp' ? 'whatsapp_first_contact' : 'email_first_contact',
          channel: suggestedChannel,
          template: 'premier_contact'
        };

        await createAlert({
          tenantId,
          leadId,
          type: 'NoContact7d',
          severity: daysSinceCreation >= 14 ? 'high' : 'med',
          message: `Ce lead n'a jamais été contacté depuis ${daysSinceCreation} jours. On lance un 1er message sur ${suggestedChannel === 'whatsapp' ? 'WhatsApp' : 'email'} ?`,
          suggestedAction
        });

        result.alerts_created++;
      }
    }

    // 5. Résoudre les alertes NoContact7d pour les leads maintenant contactés
    const { data: activeNoContactAlerts } = await supabase
      .from('max_alerts')
      .select('id, lead_id')
      .eq('tenant_id', tenantId)
      .eq('type', 'NoContact7d')
      .is('resolved_at', null);

    for (const alert of (activeNoContactAlerts || [])) {
      if (contactedLeadIds.has(alert.lead_id)) {
        await resolveAlert(alert.id, 'batch_scan');
        result.alerts_resolved++;
      }
    }

    console.log(`[AlertGenerator] ✅ Scan terminé:`, result);
    return { ok: true, ...result };

  } catch (error) {
    console.error(`[AlertGenerator] ❌ Erreur scan batch:`, error);
    return { ok: false, error: error.message };
  }
}

/**
 * Récupérer les alertes actives avec enrichissement des infos lead
 * + injection d'une alerte collective "DormantLeadsBulk" si applicable
 *
 * @param {string} tenantId - ID du tenant
 * @returns {Promise<Object>} Alertes enrichies
 */
export async function getActiveAlertsEnriched(tenantId) {
  try {
    // 1. Récupérer les alertes individuelles
    const alerts = await getActiveAlerts(tenantId);

    // 2. Calculer les stats
    const stats = {
      total: alerts.length,
      by_severity: { high: 0, med: 0, low: 0 },
      by_type: { NoContact7d: 0, NoReply3d: 0 }
    };

    for (const alert of alerts) {
      stats.by_severity[alert.severity] = (stats.by_severity[alert.severity] || 0) + 1;
      stats.by_type[alert.type] = (stats.by_type[alert.type] || 0) + 1;
    }

    // 3. Enrichir avec infos lead depuis le cache
    const leadIds = [...new Set(alerts.map(a => a.lead_id))];

    if (leadIds.length > 0) {
      const { data: leadsInfo } = await supabase
        .from('leads_cache')
        .select('espo_id, name, first_name, last_name, email, phone')
        .in('espo_id', leadIds);

      const leadsMap = new Map(
        (leadsInfo || []).map(l => [l.espo_id, l])
      );

      for (const alert of alerts) {
        const leadInfo = leadsMap.get(alert.lead_id);
        if (leadInfo) {
          alert.lead_name = leadInfo.name || `${leadInfo.first_name || ''} ${leadInfo.last_name || ''}`.trim();
          alert.lead_email = leadInfo.email;
          alert.lead_phone = leadInfo.phone;
        }
      }
    }

    // 4. Si beaucoup d'alertes NoContact7d, créer une alerte collective
    const noContactCount = stats.by_type.NoContact7d || 0;
    if (noContactCount >= 5) {
      // Injecter une alerte "bulk" en premier
      const bulkAlert = {
        id: `bulk_dormant_${tenantId}_${Date.now()}`,
        tenant_id: tenantId,
        type: 'DormantLeadsBulk',
        severity: noContactCount >= 20 ? 'high' : 'med',
        message: `${noContactCount} leads n'ont jamais été contactés. Lancer une campagne de premier contact ?`,
        suggested_action: {
          action: 'bulk_first_contact',
          label: 'Voir tous les leads dormants',
          url: '/crm?notContacted=true'
        },
        created_at: new Date().toISOString(),
        is_bulk: true,
        count: noContactCount
      };

      alerts.unshift(bulkAlert);
      stats.total++;
    }

    return {
      success: true,
      alerts,
      stats
    };

  } catch (error) {
    console.error(`[AlertGenerator] ❌ Erreur getActiveAlertsEnriched:`, error);
    return { success: false, error: error.message, alerts: [], stats: {} };
  }
}
