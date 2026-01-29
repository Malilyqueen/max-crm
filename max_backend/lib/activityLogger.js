/**
 * activityLogger.js
 * Système de logging des interactions avec les leads
 * Alimente le système d'alertes vivantes M.A.X.
 * DB: Supabase (PostgreSQL)
 */

import { supabase } from './supabaseClient.js';

/**
 * Logger une activité (message, appel, etc.)
 *
 * @param {Object} params - Paramètres de l'activité
 * @param {string} params.leadId - ID du lead EspoCRM
 * @param {string} params.channel - Canal (whatsapp/email/call/other)
 * @param {string} params.direction - Direction (in/out)
 * @param {string} [params.status] - Statut (sent/delivered/failed/replied/no_answer)
 * @param {string} [params.messageSnippet] - Aperçu du message
 * @param {Object} [params.meta] - Métadonnées additionnelles
 * @param {string} [params.tenantId] - ID du tenant (défaut: 'macrea')
 * @returns {Promise<Object>} Activité créée
 */
export async function logActivity({
  leadId,
  channel,
  direction,
  status = 'sent',
  messageSnippet = null,
  meta = {},
  tenantId // OBLIGATOIRE - plus de fallback 'macrea'
}) {
  // SECURITY: tenantId est OBLIGATOIRE - AUCUN fallback
  if (!tenantId) {
    console.error('🚫 [SECURITY] logActivity REFUSÉ - tenantId MANQUANT!', {
      leadId,
      channel,
      direction,
      status
    });
    throw new Error('SECURITY: tenantId obligatoire pour logActivity');
  }

  // Validation
  const validChannels = ['whatsapp', 'email', 'call', 'other'];
  const validDirections = ['in', 'out'];
  const validStatuses = ['sent', 'delivered', 'failed', 'replied', 'no_answer'];

  if (!validChannels.includes(channel)) {
    throw new Error(`Canal invalide: ${channel}. Attendu: ${validChannels.join(', ')}`);
  }

  if (!validDirections.includes(direction)) {
    throw new Error(`Direction invalide: ${direction}. Attendu: ${validDirections.join(', ')}`);
  }

  if (!validStatuses.includes(status)) {
    throw new Error(`Statut invalide: ${status}. Attendu: ${validStatuses.join(', ')}`);
  }

  // Préparer données pour Supabase
  const activityData = {
    tenant_id: tenantId,
    lead_id: leadId,
    channel,
    direction,
    status,
    message_snippet: messageSnippet ? messageSnippet.substring(0, 500) : null,
    meta: meta || {}
  };

  // Insérer dans Supabase
  const { data, error } = await supabase
    .from('lead_activities')
    .insert(activityData)
    .select()
    .single();

  if (error) {
    console.error(`[ActivityLogger] ❌ Erreur Supabase:`, error);
    throw new Error(`Erreur logging activité: ${error.message}`);
  }

  console.log(`[ActivityLogger] ✓ Logged: ${leadId} - ${channel} ${direction} (${status})`);

  return data;
}

/**
 * Récupérer les activités d'un lead
 *
 * @param {string} leadId - ID du lead
 * @param {number} [days=30] - Nombre de jours à récupérer
 * @param {string} [tenantId='macrea'] - ID du tenant
 * @returns {Promise<Array>} Liste des activités
 */
export async function getLeadActivities(leadId, days = 30, tenantId) {
  // SECURITY: tenantId est OBLIGATOIRE
  if (!tenantId) {
    throw new Error('SECURITY: tenantId obligatoire pour getLeadActivities');
  }
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const { data, error } = await supabase
    .from('lead_activities')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('lead_id', leadId)
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`[ActivityLogger] ❌ Erreur récupération activités:`, error);
    throw new Error(`Erreur récupération activités: ${error.message}`);
  }

  console.log(`[ActivityLogger] ✓ ${data.length} activités trouvées pour lead ${leadId} (${days}j)`);

  return data || [];
}

/**
 * Calculer le canal préféré d'un lead
 *
 * @param {string} leadId - ID du lead
 * @param {string} [tenantId='macrea'] - ID du tenant
 * @returns {Promise<Object>} Canal préféré + statistiques
 */
export async function calculatePreferredChannel(leadId, tenantId) {
  // SECURITY: tenantId est OBLIGATOIRE
  if (!tenantId) {
    throw new Error('SECURITY: tenantId obligatoire pour calculatePreferredChannel');
  }
  const activities = await getLeadActivities(leadId, 30, tenantId);

  const channels = ['whatsapp', 'email', 'call'];
  const stats = {};

  channels.forEach(channel => {
    const sent = activities.filter(a => a.channel === channel && a.direction === 'out').length;
    const replied = activities.filter(a => a.channel === channel && a.direction === 'in').length;

    stats[channel] = {
      sent,
      replied,
      rate: sent > 0 ? (replied / sent) * 100 : 0
    };
  });

  // Canal préféré = meilleur taux (minimum 2 tentatives)
  const validChannels = Object.entries(stats)
    .filter(([ch, s]) => s.sent >= 2)
    .sort((a, b) => b[1].rate - a[1].rate);

  if (validChannels.length === 0) {
    return {
      preferredChannel: 'inconnu',
      stats,
      confidence: 'aucune'
    };
  }

  const [preferredChannel, { rate }] = validChannels[0];

  // Niveau de confiance
  let confidence = 'basse';
  if (rate >= 70) confidence = 'haute';
  else if (rate >= 40) confidence = 'moyenne';

  console.log(`[ActivityLogger] Canal préféré pour ${leadId}: ${preferredChannel} (${rate.toFixed(0)}% - confiance ${confidence})`);

  return {
    preferredChannel,
    rate: rate.toFixed(1),
    stats,
    confidence
  };
}

/**
 * Calculer les jours depuis dernière activité
 *
 * @param {string} leadId - ID du lead
 * @param {string} [tenantId='macrea'] - ID du tenant
 * @returns {Promise<number>} Nombre de jours
 */
export async function daysSinceLastActivity(leadId, tenantId) {
  // SECURITY: tenantId est OBLIGATOIRE
  if (!tenantId) {
    throw new Error('SECURITY: tenantId obligatoire pour daysSinceLastActivity');
  }
  const activities = await getLeadActivities(leadId, 90, tenantId);

  if (activities.length === 0) {
    return Infinity; // Jamais contacté
  }

  const lastActivity = activities[0]; // Plus récent (ordre DESC)
  const now = new Date();
  const lastDate = new Date(lastActivity.created_at);
  const diffMs = now - lastDate;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Détecter si un message contient une intention d'achat
 *
 * @param {string} message - Contenu du message
 * @returns {boolean} True si intention détectée
 */
export function hasIntention(message) {
  if (!message) return false;

  const intentionKeywords = [
    'prix', 'tarif', 'coût', 'combien', 'disponible', 'dispo',
    'commander', 'acheter', 'réserver', 'rendez-vous',
    'devis', 'proposition', 'offre', 'intéressé', 'contact',
    'quand', 'comment', 'où', 'horaire', 'délai'
  ];

  const lowerMessage = message.toLowerCase();

  return intentionKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Récupérer les activités récentes de M.A.X. (pour reporting)
 * Note: Fonction de compatibilité pour reporting.js
 *
 * @param {number} limit - Nombre d'activités à retourner
 * @returns {Array} Liste des activités récentes
 */
export function getRecentMaxActivity(limit = 50) {
  // Pour l'instant, retourner un tableau vide
  // Cette fonction sera implémentée plus tard avec agrégation multi-leads
  console.log('[ActivityLogger] getRecentMaxActivity appelé (stub)');
  return [];
}

/**
 * Formater une activité pour le reporting
 * Note: Fonction de compatibilité pour reporting.js
 *
 * @param {Object} activity - Activité brute
 * @returns {Object} Activité formatée
 */
export function formatActivityForReporting(activity) {
  return {
    id: activity.id,
    leadId: activity.lead_id,
    channel: activity.channel,
    direction: activity.direction,
    status: activity.status,
    snippet: activity.message_snippet,
    timestamp: activity.created_at
  };
}

/**
 * Logger une activité de M.A.X. (alias pour logActivity)
 * Note: Fonction de compatibilité pour chat.js
 *
 * @param {Object} params - Paramètres de l'activité
 * @returns {Promise<Object>} Activité créée
 */
export async function logMaxActivity(params) {
  return logActivity(params);
}
