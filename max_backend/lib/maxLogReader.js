// lib/maxLogReader.js
// Module de lecture des logs et mémoire Supabase pour le moteur IA de M.A.X.
// Permet à M.A.X. de consulter son historique et sa mémoire contextuelle

import { supabase } from './supabaseClient.js';

/**
 * Récupérer l'historique des actions liées à un Lead spécifique
 * @param {string} tenantId - ID du tenant
 * @param {string} leadId - ID du lead
 * @param {Object} options - Options de filtrage
 * @param {number} options.limit - Nombre max d'actions (défaut: 20)
 * @param {string} options.since - Date ISO depuis laquelle filtrer (ex: '2025-12-01T00:00:00Z')
 * @returns {Promise<Array>} Historique des actions ([] en cas d'erreur)
 */
export async function getLeadHistory(tenantId, leadId, options = {}) {
  if (!supabase) {
    console.warn('[maxLogReader] Supabase non configuré - retour tableau vide');
    return [];
  }

  const { limit = 20, since = null } = options;

  try {
    let query = supabase
      .from('max_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('entity_type', 'Lead')
      .eq('entity_id', leadId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (since) {
      query = query.gte('created_at', since);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[maxLogReader] Erreur récupération historique lead:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.warn('[maxLogReader] Exception getLeadHistory:', err.message);
    return [];
  }
}

/**
 * Récupérer les actions récentes pour un tenant (fenêtre de 72h par défaut)
 * @param {string} tenantId - ID du tenant
 * @param {Object} options - Options de filtrage
 * @param {number} options.limit - Nombre max d'actions (défaut: 100)
 * @param {string} options.since - Date ISO depuis laquelle filtrer (défaut: 72h en arrière)
 * @param {number} options.hoursWindow - Fenêtre temporelle en heures (défaut: 72)
 * @param {Array<string>} options.actionTypes - Filtrer par types d'actions (ex: ['lead_status_changed', 'note_added'])
 * @returns {Promise<Array>} Actions récentes ([] en cas d'erreur)
 */
export async function getRecentActions(tenantId, options = {}) {
  if (!supabase) {
    console.warn('[maxLogReader] Supabase non configuré - retour tableau vide');
    return [];
  }

  const { limit = 100, since = null, hoursWindow = 72, actionTypes = null } = options;

  try {
    // Calculer la date de début de fenêtre (72h par défaut)
    const windowStart = since || new Date(Date.now() - hoursWindow * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from('max_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('created_at', windowStart) // Filtre 72h
      .order('created_at', { ascending: false })
      .limit(limit);

    if (actionTypes && Array.isArray(actionTypes) && actionTypes.length > 0) {
      query = query.in('action_type', actionTypes);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[maxLogReader] Erreur récupération actions récentes:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.warn('[maxLogReader] Exception getRecentActions:', err.message);
    return [];
  }
}

/**
 * Récupérer des statistiques synthétiques pour un Lead
 * @param {string} tenantId - ID du tenant
 * @param {string} leadId - ID du lead
 * @returns {Promise<Object>} Objet de stats (valeurs nulles en cas d'erreur)
 */
export async function getLeadStats(tenantId, leadId) {
  if (!supabase) {
    console.warn('[maxLogReader] Supabase non configuré - retour stats nulles');
    return {
      total_actions: 0,
      status_changes: 0,
      notes_added: 0,
      last_action_at: null,
      most_common_action: null
    };
  }

  try {
    const { data, error } = await supabase
      .from('max_logs')
      .select('action_type, created_at, success')
      .eq('tenant_id', tenantId)
      .eq('entity_type', 'Lead')
      .eq('entity_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[maxLogReader] Erreur récupération stats lead:', error.message);
      return {
        total_actions: 0,
        status_changes: 0,
        notes_added: 0,
        last_action_at: null,
        most_common_action: null
      };
    }

    const actions = data || [];

    // Calculer les stats
    const stats = {
      total_actions: actions.length,
      status_changes: actions.filter(a => a.action_type === 'lead_status_changed').length,
      notes_added: actions.filter(a => a.action_type === 'note_added').length,
      views: actions.filter(a => a.action_type === 'lead_viewed').length,
      last_action_at: actions.length > 0 ? actions[0].created_at : null,
      most_common_action: null
    };

    // Trouver l'action la plus fréquente
    if (actions.length > 0) {
      const actionCounts = {};
      actions.forEach(action => {
        actionCounts[action.action_type] = (actionCounts[action.action_type] || 0) + 1;
      });

      const sortedActions = Object.entries(actionCounts).sort((a, b) => b[1] - a[1]);
      stats.most_common_action = sortedActions[0][0];
    }

    return stats;
  } catch (err) {
    console.warn('[maxLogReader] Exception getLeadStats:', err.message);
    return {
      total_actions: 0,
      status_changes: 0,
      notes_added: 0,
      last_action_at: null,
      most_common_action: null
    };
  }
}

/**
 * Récupérer le contexte mémoire d'un tenant (scope global uniquement)
 * @param {string} tenantId - ID du tenant
 * @returns {Promise<Object>} Objet simple { [key]: value } ({} en cas d'erreur)
 */
export async function getTenantMemoryContext(tenantId) {
  if (!supabase) {
    console.warn('[maxLogReader] Supabase non configuré - retour objet vide');
    return {};
  }

  try {
    const { data, error } = await supabase
      .from('tenant_memory')
      .select('memory_key, memory_value, memory_type')
      .eq('tenant_id', tenantId)
      .eq('scope', 'global')
      .order('priority', { ascending: false });

    if (error) {
      console.warn('[maxLogReader] Erreur récupération mémoire tenant:', error.message);
      return {};
    }

    const memories = data || [];

    // Filtrer les mémoires expirées
    const now = new Date();
    const validMemories = memories.filter(mem =>
      !mem.expires_at || new Date(mem.expires_at) > now
    );

    // Construire un objet simple { key: value }
    const context = {};
    validMemories.forEach(mem => {
      context[mem.memory_key] = mem.memory_value;
    });

    return context;
  } catch (err) {
    console.warn('[maxLogReader] Exception getTenantMemoryContext:', err.message);
    return {};
  }
}

/**
 * Récupérer la mémoire IDENTITÉ du tenant (long terme, jamais effacée)
 * Différente de la mémoire événementielle (72h)
 * @param {string} tenantId - ID du tenant
 * @returns {Promise<Object>} Identité structurée { business, secteur, objectifs, ton, preferences }
 */
export async function getTenantIdentity(tenantId) {
  if (!supabase) {
    console.warn('[maxLogReader] Supabase non configuré - retour identité vide');
    return {
      business_model: null,
      secteur: null,
      objectifs: [],
      contraintes: [],
      ton_communication: null,
      preferences: {}
    };
  }

  try {
    const { data, error } = await supabase
      .from('tenant_memory')
      .select('memory_key, memory_value, memory_type, priority')
      .eq('tenant_id', tenantId)
      .eq('scope', 'global')
      .in('memory_type', ['identity', 'business_context', 'preference'])
      .is('expires_at', null) // Identité = jamais expirée
      .order('priority', { ascending: false });

    if (error) {
      console.warn('[maxLogReader] Erreur récupération identité tenant:', error.message);
      return {
        business_model: null,
        secteur: null,
        objectifs: [],
        contraintes: [],
        ton_communication: null,
        preferences: {}
      };
    }

    const memories = data || [];

    // Construire l'identité structurée
    const identity = {
      business_model: null,
      secteur: null,
      objectifs: [],
      contraintes: [],
      ton_communication: null,
      preferences: {}
    };

    memories.forEach(mem => {
      switch (mem.memory_key) {
        case 'business_model':
          identity.business_model = mem.memory_value;
          break;
        case 'secteur':
          identity.secteur = mem.memory_value;
          break;
        case 'objectifs':
          identity.objectifs = Array.isArray(mem.memory_value) ? mem.memory_value : [mem.memory_value];
          break;
        case 'contraintes':
          identity.contraintes = Array.isArray(mem.memory_value) ? mem.memory_value : [mem.memory_value];
          break;
        case 'ton_communication':
          identity.ton_communication = mem.memory_value;
          break;
        default:
          // Autres préférences génériques
          identity.preferences[mem.memory_key] = mem.memory_value;
      }
    });

    return identity;
  } catch (err) {
    console.warn('[maxLogReader] Exception getTenantIdentity:', err.message);
    return {
      business_model: null,
      secteur: null,
      objectifs: [],
      contraintes: [],
      ton_communication: null,
      preferences: {}
    };
  }
}

/**
 * Récupérer le contexte complet pour M.A.X. (helper combiné)
 * Combine IDENTITÉ (long terme) + ÉVÉNEMENTS (72h)
 * @param {string} tenantId - ID du tenant
 * @param {Object} options - Options
 * @param {number} options.recentActionsLimit - Nombre d'actions récentes (défaut: 20)
 * @returns {Promise<Object>} Contexte complet pour l'IA avec séparation identité/événements
 */
export async function getMaxContext(tenantId, options = {}) {
  const { recentActionsLimit = 20 } = options;

  try {
    // Récupérer en parallèle : IDENTITÉ (long terme) + ÉVÉNEMENTS (72h)
    const [identity, recentActions, tenantMemory] = await Promise.all([
      getTenantIdentity(tenantId),
      getRecentActions(tenantId, { limit: recentActionsLimit }),
      getTenantMemoryContext(tenantId) // Gardé pour compatibilité (peut contenir d'autres infos)
    ]);

    return {
      tenant_id: tenantId,
      // MÉMOIRE LONG TERME (jamais effacée)
      identity: identity,
      // MÉMOIRE COURT TERME (72h)
      recent_actions: recentActions,
      // Contexte général (ancienne structure, gardée pour compatibilité)
      tenant_memory: tenantMemory,
      generated_at: new Date().toISOString()
    };
  } catch (err) {
    console.warn('[maxLogReader] Exception getMaxContext:', err.message);
    return {
      tenant_id: tenantId,
      identity: {
        business_model: null,
        secteur: null,
        objectifs: [],
        contraintes: [],
        ton_communication: null,
        preferences: {}
      },
      recent_actions: [],
      tenant_memory: {},
      generated_at: new Date().toISOString()
    };
  }
}
