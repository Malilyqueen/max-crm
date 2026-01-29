/**
 * lib/maxDecisionEngine.js
 * Moteur de décision M.A.X. pour les relances intelligentes
 *
 * Ce module analyse les leads et détermine les actions optimales à entreprendre:
 * - Relance J+1 (24h sans réponse)
 * - Relance J+3 (72h sans réponse, plus insistante)
 * - Panier abandonné
 * - Facture impayée
 * - Lead chaud à contacter immédiatement
 *
 * Chaque règle retourne une recommandation avec:
 * - priority: urgent | high | medium | low
 * - action: type d'action recommandée
 * - channel: canal de communication suggéré
 * - template_id: template à utiliser (optionnel)
 * - reason: explication de la recommandation
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Types de recommandations
 */
export const RECOMMENDATION_TYPES = {
  FOLLOW_UP_J1: 'follow_up_j1',
  FOLLOW_UP_J3: 'follow_up_j3',
  CART_ABANDONED: 'cart_abandoned',
  INVOICE_UNPAID: 'invoice_unpaid',
  HOT_LEAD: 'hot_lead',
  APPOINTMENT_REMINDER: 'appointment_reminder',
  WELCOME_NEW_LEAD: 'welcome_new_lead',
  REACTIVATION: 'reactivation',
  NEVER_CONTACTED: 'never_contacted',      // Leads jamais contactés
  NEVER_CONTACTED_BULK: 'never_contacted_bulk' // Action groupée
};

/**
 * Priorités des recommandations
 */
export const PRIORITIES = {
  URGENT: 'urgent',   // Action immédiate requise
  HIGH: 'high',       // Action dans les 2h
  MEDIUM: 'medium',   // Action dans la journée
  LOW: 'low'          // Action cette semaine
};

/**
 * Canaux de communication
 */
export const CHANNELS = {
  WHATSAPP: 'whatsapp',
  EMAIL: 'email',
  SMS: 'sms',
  PHONE: 'phone'  // Appel manuel suggéré
};

/**
 * Configuration des règles de relance
 */
const RULES_CONFIG = {
  // Relance J+1: 24h sans réponse
  follow_up_j1: {
    name: 'Relance J+1',
    description: 'Lead sans réponse depuis 24h',
    delay_hours: 24,
    max_delay_hours: 72,
    priority: PRIORITIES.HIGH,
    preferred_channel: CHANNELS.WHATSAPP,
    fallback_channel: CHANNELS.EMAIL,
    template_category: 'vente',
    conditions: {
      min_interactions: 1,
      max_follow_ups: 0,
      exclude_statuses: ['won', 'lost', 'archived']
    }
  },

  // Relance J+3: 72h sans réponse, plus insistante
  follow_up_j3: {
    name: 'Relance J+3',
    description: 'Lead sans réponse depuis 72h - Dernière tentative automatique',
    delay_hours: 72,
    max_delay_hours: 168, // 7 jours max
    priority: PRIORITIES.MEDIUM,
    preferred_channel: CHANNELS.WHATSAPP,
    fallback_channel: CHANNELS.PHONE,
    template_category: 'vente',
    conditions: {
      min_interactions: 1,
      max_follow_ups: 1,
      exclude_statuses: ['won', 'lost', 'archived']
    }
  },

  // Panier abandonné
  cart_abandoned: {
    name: 'Panier abandonné',
    description: 'Client ayant abandonné son panier',
    delay_hours: 1,
    max_delay_hours: 24,
    priority: PRIORITIES.HIGH,
    preferred_channel: CHANNELS.WHATSAPP,
    fallback_channel: CHANNELS.SMS,
    template_category: 'vente',
    conditions: {
      status: 'cart_abandoned',
      exclude_statuses: ['won', 'lost']
    }
  },

  // Facture impayée
  invoice_unpaid: {
    name: 'Facture impayée',
    description: 'Facture en attente de paiement',
    delay_hours: 48,
    max_delay_hours: 336, // 14 jours
    priority: PRIORITIES.MEDIUM,
    preferred_channel: CHANNELS.EMAIL,
    fallback_channel: CHANNELS.SMS,
    template_category: 'facturation',
    conditions: {
      has_unpaid_invoice: true,
      exclude_statuses: ['lost', 'archived']
    }
  },

  // Lead chaud
  hot_lead: {
    name: 'Lead chaud',
    description: 'Lead avec score élevé nécessitant une action immédiate',
    delay_hours: 0,
    max_delay_hours: 4,
    priority: PRIORITIES.URGENT,
    preferred_channel: CHANNELS.PHONE,
    fallback_channel: CHANNELS.WHATSAPP,
    template_category: 'vente',
    conditions: {
      min_score: 80,
      exclude_statuses: ['won', 'lost', 'archived']
    }
  },

  // Rappel RDV
  appointment_reminder: {
    name: 'Rappel RDV',
    description: 'Rappel de rendez-vous J-1',
    delay_hours: -24, // 24h AVANT
    priority: PRIORITIES.HIGH,
    preferred_channel: CHANNELS.WHATSAPP,
    fallback_channel: CHANNELS.SMS,
    template_category: 'vente',
    conditions: {
      has_upcoming_appointment: true
    }
  },

  // Lead jamais contacté (24h+)
  never_contacted: {
    name: 'Lead jamais contacté',
    description: 'Lead créé depuis 24h+ sans aucun contact sortant',
    delay_hours: 24,
    max_delay_hours: 720, // 30 jours max
    priority: PRIORITIES.HIGH,
    preferred_channel: CHANNELS.WHATSAPP,
    fallback_channel: CHANNELS.EMAIL,
    template_category: 'vente',
    conditions: {
      min_interactions: 0,
      max_interactions: 0, // Aucune interaction
      exclude_statuses: ['won', 'lost', 'archived', 'Converted', 'Dead']
    }
  }
};

/**
 * Calcule le temps écoulé depuis la dernière interaction
 */
function getHoursSinceLastInteraction(lead) {
  const lastInteraction = lead.lastInteractionAt || lead.updatedAt || lead.createdAt;
  if (!lastInteraction) return Infinity;

  const lastDate = new Date(lastInteraction);
  const now = new Date();
  return (now - lastDate) / (1000 * 60 * 60);
}

/**
 * Vérifie si un lead correspond aux conditions d'une règle
 */
function matchesConditions(lead, conditions) {
  // Vérifier les statuts exclus
  if (conditions.exclude_statuses && conditions.exclude_statuses.includes(lead.status)) {
    return false;
  }

  // Vérifier le statut spécifique
  if (conditions.status && lead.status !== conditions.status) {
    return false;
  }

  // Vérifier le nombre minimum d'interactions
  if (conditions.min_interactions !== undefined) {
    const interactions = lead.interactions_count || 0;
    if (interactions < conditions.min_interactions) {
      return false;
    }
  }

  // Vérifier le nombre maximum d'interactions (pour never_contacted)
  if (conditions.max_interactions !== undefined) {
    const interactions = lead.interactions_count || 0;
    if (interactions > conditions.max_interactions) {
      return false;
    }
  }

  // Vérifier le nombre maximum de follow-ups
  if (conditions.max_follow_ups !== undefined) {
    const followUps = lead.follow_ups_count || 0;
    if (followUps > conditions.max_follow_ups) {
      return false;
    }
  }

  // Vérifier le score minimum
  if (conditions.min_score !== undefined) {
    const score = lead.score || 0;
    if (score < conditions.min_score) {
      return false;
    }
  }

  // Vérifier les factures impayées
  if (conditions.has_unpaid_invoice && !lead.has_unpaid_invoice) {
    return false;
  }

  // Vérifier les RDV à venir
  if (conditions.has_upcoming_appointment && !lead.has_upcoming_appointment) {
    return false;
  }

  return true;
}

/**
 * Génère une recommandation pour un lead basée sur une règle
 */
function generateRecommendation(lead, ruleKey, rule, hoursSinceLastInteraction) {
  return {
    id: `${lead.id}_${ruleKey}_${Date.now()}`,
    lead_id: lead.id,
    lead_name: lead.name || `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
    lead_email: lead.emailAddress || lead.email,
    lead_phone: lead.phoneNumber || lead.phone,
    lead_company: lead.accountName || lead.company,
    type: ruleKey,
    name: rule.name,
    description: rule.description,
    priority: rule.priority,
    recommended_channel: rule.preferred_channel,
    fallback_channel: rule.fallback_channel,
    template_category: rule.template_category,
    hours_since_interaction: Math.round(hoursSinceLastInteraction),
    reason: buildReason(rule, hoursSinceLastInteraction, lead),
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + rule.max_delay_hours * 60 * 60 * 1000).toISOString()
  };
}

/**
 * Construit une explication claire de la recommandation
 */
function buildReason(rule, hoursSinceLastInteraction, lead) {
  const hours = Math.round(hoursSinceLastInteraction);
  const days = Math.floor(hours / 24);

  switch (rule.name) {
    case 'Relance J+1':
      return `Aucune réponse depuis ${hours}h. Une relance WhatsApp est recommandée pour maintenir l'engagement.`;

    case 'Relance J+3':
      return `${days} jours sans réponse. Dernière tentative automatique avant passage en suivi manuel.`;

    case 'Panier abandonné':
      return `Panier abandonné il y a ${hours}h. Un rappel personnalisé peut récupérer cette vente.`;

    case 'Facture impayée':
      return `Facture en attente depuis ${days} jours. Un rappel courtois est approprié.`;

    case 'Lead chaud':
      return `Score élevé (${lead.score || 'N/A'}). Contact prioritaire pour maximiser les chances de conversion.`;

    case 'Rappel RDV':
      return `Rendez-vous prévu demain. Un rappel WhatsApp confirme la présence.`;

    default:
      return rule.description;
  }
}

/**
 * Analyse un lead et génère les recommandations appropriées
 */
export function analyzeLeadForRecommendations(lead) {
  const recommendations = [];
  const hoursSinceLastInteraction = getHoursSinceLastInteraction(lead);

  for (const [ruleKey, rule] of Object.entries(RULES_CONFIG)) {
    // Vérifier si le délai est dans la fenêtre appropriée
    const delayMatch = rule.delay_hours >= 0
      ? hoursSinceLastInteraction >= rule.delay_hours && hoursSinceLastInteraction <= rule.max_delay_hours
      : true; // Pour les règles avec délai négatif (comme rappel RDV)

    if (!delayMatch) continue;

    // Vérifier les conditions spécifiques
    if (!matchesConditions(lead, rule.conditions)) continue;

    // Générer la recommandation
    recommendations.push(generateRecommendation(lead, ruleKey, rule, hoursSinceLastInteraction));
  }

  // Trier par priorité
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations;
}

/**
 * Récupère les recommandations pour tous les leads d'un tenant
 */
export async function getRecommendationsForTenant(tenantId, options = {}) {
  const { limit = 20, priority = null, type = null } = options;

  try {
    console.log(`[MAX DECISION] Analyzing leads for tenant: ${tenantId}`);

    // Récupérer les leads actifs du tenant depuis Supabase
    // Note: Cette table devrait être synchronisée avec EspoCRM
    const { data: leads, error } = await supabase
      .from('leads_cache')
      .select('*')
      .eq('tenant_id', tenantId)
      .not('status', 'in', '("won","lost","archived")')
      .order('updated_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[MAX DECISION] Error fetching leads:', error);
      // Fallback: retourner des recommandations basées sur les message_events récents
      return await getRecommendationsFromEvents(tenantId, options);
    }

    if (!leads || leads.length === 0) {
      console.log('[MAX DECISION] No leads found, using events fallback');
      return await getRecommendationsFromEvents(tenantId, options);
    }

    // Analyser chaque lead
    let allRecommendations = [];
    for (const lead of leads) {
      const leadRecommendations = analyzeLeadForRecommendations(lead);
      allRecommendations.push(...leadRecommendations);
    }

    // Filtrer par priorité si spécifié
    if (priority) {
      allRecommendations = allRecommendations.filter(r => r.priority === priority);
    }

    // Filtrer par type si spécifié
    if (type) {
      allRecommendations = allRecommendations.filter(r => r.type === type);
    }

    // Limiter le nombre de résultats
    allRecommendations = allRecommendations.slice(0, limit);

    console.log(`[MAX DECISION] Generated ${allRecommendations.length} recommendations`);

    return {
      ok: true,
      recommendations: allRecommendations,
      total: allRecommendations.length,
      analyzed_leads: leads.length
    };

  } catch (error) {
    console.error('[MAX DECISION] Error:', error);
    return {
      ok: false,
      error: error.message,
      recommendations: []
    };
  }
}

/**
 * Fallback: Génère des recommandations basées sur les events de messages récents
 * Utile quand la table leads_cache n'existe pas encore
 */
async function getRecommendationsFromEvents(tenantId, options = {}) {
  const { limit = 20 } = options;

  try {
    // Récupérer les derniers contacts sans réponse depuis message_events
    const { data: events, error } = await supabase
      .from('message_events')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('direction', 'outbound')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[MAX DECISION] Error fetching events:', error);
      return { ok: true, recommendations: [], total: 0, source: 'fallback_empty' };
    }

    // Grouper par contact
    const contactsMap = new Map();
    for (const event of events || []) {
      const contactKey = event.to_address || event.to;
      if (!contactsMap.has(contactKey)) {
        contactsMap.set(contactKey, {
          id: event.lead_id || contactKey,
          name: event.lead_name || contactKey,
          email: event.to_address,
          phone: event.to,
          lastInteractionAt: event.created_at,
          interactions_count: 1,
          follow_ups_count: 0,
          status: 'active'
        });
      } else {
        contactsMap.get(contactKey).interactions_count++;
      }
    }

    // Analyser chaque contact
    const recommendations = [];
    for (const contact of contactsMap.values()) {
      const contactRecommendations = analyzeLeadForRecommendations(contact);
      recommendations.push(...contactRecommendations);
    }

    return {
      ok: true,
      recommendations: recommendations.slice(0, limit),
      total: recommendations.length,
      source: 'message_events'
    };

  } catch (error) {
    console.error('[MAX DECISION] Fallback error:', error);
    return { ok: true, recommendations: [], total: 0, source: 'error' };
  }
}

/**
 * Marque une recommandation comme exécutée
 */
export async function markRecommendationExecuted(tenantId, recommendationId, executedAction) {
  try {
    // Logger l'action dans la table activities
    const { error } = await supabase
      .from('activities')
      .insert({
        tenant_id: tenantId,
        type: 'recommendation_executed',
        title: `Recommandation exécutée: ${executedAction.type}`,
        description: executedAction.description,
        metadata: {
          recommendation_id: recommendationId,
          action: executedAction
        }
      });

    if (error) {
      console.error('[MAX DECISION] Error logging execution:', error);
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * Récupère les statistiques des recommandations
 */
export async function getRecommendationStats(tenantId) {
  const result = await getRecommendationsForTenant(tenantId, { limit: 100 });

  if (!result.ok) {
    return result;
  }

  const stats = {
    total: result.recommendations.length,
    by_priority: {
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0
    },
    by_type: {},
    by_channel: {}
  };

  for (const rec of result.recommendations) {
    stats.by_priority[rec.priority]++;
    stats.by_type[rec.type] = (stats.by_type[rec.type] || 0) + 1;
    stats.by_channel[rec.recommended_channel] = (stats.by_channel[rec.recommended_channel] || 0) + 1;
  }

  return {
    ok: true,
    stats
  };
}

/**
 * Récupère les leads jamais contactés en croisant EspoCRM et message_events
 * Retourne une recommandation groupée pour action bulk
 */
export async function getNeverContactedRecommendation(tenantId, options = {}) {
  const { minAgeHours = 24, maxAgeHours = 720 } = options;

  try {
    console.log(`[MAX DECISION] Scanning never-contacted leads for tenant: ${tenantId}`);

    // 1. Récupérer tous les lead_ids avec au moins un message outbound
    const { data: contactedEvents, error: eventsError } = await supabase
      .from('message_events')
      .select('lead_id')
      .eq('tenant_id', tenantId)
      .eq('direction', 'outbound')
      .not('lead_id', 'is', null);

    if (eventsError) {
      console.error('[MAX DECISION] Error fetching contacted leads:', eventsError);
    }

    const contactedLeadIds = new Set(
      (contactedEvents || []).map(e => e.lead_id).filter(Boolean)
    );

    console.log(`[MAX DECISION] Found ${contactedLeadIds.size} leads with outbound events`);

    // 2. Récupérer les leads du cache qui n'ont pas été contactés
    const cutoffDateMax = new Date(Date.now() - minAgeHours * 60 * 60 * 1000).toISOString();
    const cutoffDateMin = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString();

    const { data: allLeads, error: leadsError } = await supabase
      .from('leads_cache')
      .select('id, espo_id, name, first_name, last_name, email, phone, status, created_at')
      .eq('tenant_id', tenantId)
      .not('status', 'in', '("Converted","Dead","won","lost","archived")')
      .lte('created_at', cutoffDateMax)
      .gte('created_at', cutoffDateMin)
      .order('created_at', { ascending: true });

    if (leadsError) {
      console.error('[MAX DECISION] Error fetching leads:', leadsError);
      return { ok: false, error: leadsError.message };
    }

    // 3. Filtrer les leads non contactés
    const neverContactedLeads = (allLeads || []).filter(lead => {
      const leadId = lead.espo_id || lead.id;
      return !contactedLeadIds.has(leadId);
    });

    console.log(`[MAX DECISION] Found ${neverContactedLeads.length} never-contacted leads`);

    if (neverContactedLeads.length === 0) {
      return {
        ok: true,
        hasRecommendation: false,
        count: 0,
        leads: []
      };
    }

    // 4. Calculer les stats par ancienneté
    const now = new Date();
    const stats = {
      total: neverContactedLeads.length,
      older_than_7d: 0,
      older_than_3d: 0,
      older_than_1d: 0
    };

    for (const lead of neverContactedLeads) {
      const ageHours = (now - new Date(lead.created_at)) / (1000 * 60 * 60);
      if (ageHours >= 168) stats.older_than_7d++;
      else if (ageHours >= 72) stats.older_than_3d++;
      else if (ageHours >= 24) stats.older_than_1d++;
    }

    // 5. Déterminer la priorité
    let priority = PRIORITIES.MEDIUM;
    let severity = 'med';
    if (stats.older_than_7d >= 5) {
      priority = PRIORITIES.URGENT;
      severity = 'high';
    } else if (stats.older_than_3d >= 10 || stats.older_than_7d >= 1) {
      priority = PRIORITIES.HIGH;
      severity = 'high';
    }

    // 6. Construire la recommandation groupée
    const recommendation = {
      id: `never_contacted_bulk_${tenantId}_${Date.now()}`,
      type: RECOMMENDATION_TYPES.NEVER_CONTACTED_BULK,
      name: 'Leads jamais contactés',
      description: buildNeverContactedDescription(stats),
      priority,
      severity,
      recommended_channel: CHANNELS.WHATSAPP,
      fallback_channel: CHANNELS.EMAIL,
      count: neverContactedLeads.length,
      stats,
      leads: neverContactedLeads.slice(0, 10).map(l => ({
        id: l.espo_id || l.id,
        name: l.name || `${l.first_name || ''} ${l.last_name || ''}`.trim(),
        email: l.email,
        phone: l.phone,
        created_at: l.created_at
      })),
      cta: {
        label: `Contacter ${neverContactedLeads.length} lead${neverContactedLeads.length > 1 ? 's' : ''}`,
        action: 'open_tour_de_controle',
        params: {
          filter: 'notContacted',
          url: '/crm?notContacted=true'
        }
      },
      bulk_action: {
        label: 'Lancer campagne WhatsApp',
        action: 'bulk_outreach',
        params: {
          channel: 'whatsapp',
          filters: { notContacted: true }
        }
      },
      reason: `${neverContactedLeads.length} leads n'ont jamais reçu de message. ${stats.older_than_7d > 0 ? `${stats.older_than_7d} attendent depuis plus de 7 jours.` : ''} Un premier contact peut relancer l'engagement.`,
      created_at: new Date().toISOString()
    };

    return {
      ok: true,
      hasRecommendation: true,
      count: neverContactedLeads.length,
      recommendation,
      leads: neverContactedLeads
    };

  } catch (error) {
    console.error('[MAX DECISION] getNeverContactedRecommendation error:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Construit la description de la recommandation never_contacted
 */
function buildNeverContactedDescription(stats) {
  const parts = [];

  if (stats.older_than_7d > 0) {
    parts.push(`${stats.older_than_7d} lead${stats.older_than_7d > 1 ? 's' : ''} attendent depuis +7 jours`);
  }
  if (stats.older_than_3d > 0) {
    parts.push(`${stats.older_than_3d} depuis +3 jours`);
  }
  if (stats.older_than_1d > 0) {
    parts.push(`${stats.older_than_1d} depuis +24h`);
  }

  if (parts.length === 0) {
    return `${stats.total} leads n'ont jamais été contactés`;
  }

  return `${stats.total} leads jamais contactés: ${parts.join(', ')}`;
}

/**
 * Récupère toutes les recommandations incluant les leads jamais contactés
 */
export async function getAllRecommendations(tenantId, options = {}) {
  const [standardRecs, neverContactedRec] = await Promise.all([
    getRecommendationsForTenant(tenantId, options),
    getNeverContactedRecommendation(tenantId, options)
  ]);

  const allRecommendations = [...(standardRecs.recommendations || [])];

  // Ajouter la recommandation never_contacted si présente
  if (neverContactedRec.ok && neverContactedRec.hasRecommendation) {
    allRecommendations.unshift(neverContactedRec.recommendation);
  }

  // Trier par priorité
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  allRecommendations.sort((a, b) =>
    (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3)
  );

  return {
    ok: true,
    recommendations: allRecommendations,
    total: allRecommendations.length,
    never_contacted_count: neverContactedRec.count || 0
  };
}

export default {
  analyzeLeadForRecommendations,
  getRecommendationsForTenant,
  getRecommendationStats,
  markRecommendationExecuted,
  getNeverContactedRecommendation,
  getAllRecommendations,
  RECOMMENDATION_TYPES,
  PRIORITIES,
  CHANNELS,
  RULES_CONFIG
};
