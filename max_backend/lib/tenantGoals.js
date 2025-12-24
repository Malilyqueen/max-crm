/**
 * lib/tenantGoals.js
 * Gestion des objectifs business (mémoire longue durée)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;

if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  console.log('[tenantGoals] ✅ Supabase client initialisé');
} else {
  console.warn('[tenantGoals] ⚠️ Supabase non configuré (variables SUPABASE_URL/SUPABASE_SERVICE_KEY manquantes)');
}

/**
 * Créer un nouvel objectif
 * @param {Object} goalData - Données de l'objectif
 * @returns {Promise<Object>} { ok, goal_id?, error? }
 */
export async function createTenantGoal(goalData) {
  if (!supabase) {
    return { ok: false, error: 'Supabase not configured' };
  }

  const {
    tenant_id,
    goal_text,
    goal_category = null,
    target_value = null,
    current_value = 0,
    unit = null,
    deadline = null,
    status = 'actif',
    priority = 50,
    created_by = null,
    metadata = {}
  } = goalData;

  // Validation
  if (!tenant_id || !goal_text) {
    return { ok: false, error: 'tenant_id and goal_text are required' };
  }

  try {
    const { data, error } = await supabase
      .from('tenant_goals')
      .insert({
        tenant_id,
        goal_text,
        goal_category,
        target_value,
        current_value,
        unit,
        deadline,
        status,
        priority,
        created_by,
        metadata
      })
      .select()
      .single();

    if (error) {
      console.error('[tenantGoals] ❌ Erreur création objectif:', error);
      return { ok: false, error: error.message };
    }

    console.log(`[tenantGoals] ✅ Objectif créé: ${data.id} pour tenant ${tenant_id}`);
    return { ok: true, goal_id: data.id, goal: data };

  } catch (err) {
    console.error('[tenantGoals] ❌ Exception création objectif:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Récupérer les objectifs d'un tenant
 * @param {string} tenantId - ID du tenant
 * @param {Object} filters - Filtres optionnels
 * @returns {Promise<Object>} { ok, goals?, error? }
 */
export async function getTenantGoals(tenantId, filters = {}) {
  if (!supabase) {
    return { ok: false, error: 'Supabase not configured' };
  }

  const {
    status = null,
    archived = false,
    category = null,
    orderBy = 'priority',
    orderDirection = 'desc',
    limit = null
  } = filters;

  try {
    let query = supabase
      .from('tenant_goals')
      .select('*')
      .eq('tenant_id', tenantId);

    // Filtres
    if (status) {
      query = query.eq('status', status);
    }

    query = query.eq('archived', archived);

    if (category) {
      query = query.eq('goal_category', category);
    }

    // Tri
    if (orderBy === 'priority') {
      query = query.order('priority', { ascending: orderDirection === 'asc' });
      query = query.order('deadline', { ascending: true, nullsFirst: false });
    } else if (orderBy === 'deadline') {
      query = query.order('deadline', { ascending: orderDirection === 'asc', nullsFirst: false });
    } else {
      query = query.order(orderBy, { ascending: orderDirection === 'asc' });
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[tenantGoals] ❌ Erreur récupération objectifs:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true, goals: data || [] };

  } catch (err) {
    console.error('[tenantGoals] ❌ Exception récupération objectifs:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Mettre à jour un objectif
 * @param {string} goalId - ID de l'objectif
 * @param {string} tenantId - ID du tenant (pour sécurité)
 * @param {Object} updates - Champs à mettre à jour
 * @returns {Promise<Object>} { ok, goal?, error? }
 */
export async function updateTenantGoal(goalId, tenantId, updates) {
  if (!supabase) {
    return { ok: false, error: 'Supabase not configured' };
  }

  if (!goalId || !tenantId) {
    return { ok: false, error: 'goalId and tenantId are required' };
  }

  try {
    // Filtrer les champs autorisés
    const allowedFields = [
      'goal_text',
      'goal_category',
      'target_value',
      'current_value',
      'unit',
      'deadline',
      'status',
      'priority',
      'metadata'
    ];

    const sanitizedUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        sanitizedUpdates[key] = updates[key];
      }
    });

    if (Object.keys(sanitizedUpdates).length === 0) {
      return { ok: false, error: 'No valid fields to update' };
    }

    const { data, error } = await supabase
      .from('tenant_goals')
      .update(sanitizedUpdates)
      .eq('id', goalId)
      .eq('tenant_id', tenantId) // Sécurité: vérifier tenant_id
      .select()
      .single();

    if (error) {
      console.error('[tenantGoals] ❌ Erreur mise à jour objectif:', error);
      return { ok: false, error: error.message };
    }

    console.log(`[tenantGoals] ✅ Objectif ${goalId} mis à jour`);
    return { ok: true, goal: data };

  } catch (err) {
    console.error('[tenantGoals] ❌ Exception mise à jour objectif:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Archiver un objectif (soft delete)
 * @param {string} goalId - ID de l'objectif
 * @param {string} tenantId - ID du tenant
 * @param {string} reason - Raison de l'archivage (optionnel)
 * @returns {Promise<Object>} { ok, error? }
 */
export async function archiveTenantGoal(goalId, tenantId, reason = null) {
  if (!supabase) {
    return { ok: false, error: 'Supabase not configured' };
  }

  if (!goalId || !tenantId) {
    return { ok: false, error: 'goalId and tenantId are required' };
  }

  try {
    const updates = {
      archived: true,
      archived_at: new Date().toISOString(),
      status: 'archivé'
    };

    if (reason) {
      updates.metadata = { archive_reason: reason };
    }

    const { data, error } = await supabase
      .from('tenant_goals')
      .update(updates)
      .eq('id', goalId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('[tenantGoals] ❌ Erreur archivage objectif:', error);
      return { ok: false, error: error.message };
    }

    console.log(`[tenantGoals] ✅ Objectif ${goalId} archivé`);
    return { ok: true, goal: data };

  } catch (err) {
    console.error('[tenantGoals] ❌ Exception archivage objectif:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Récupérer un objectif spécifique
 * @param {string} goalId - ID de l'objectif
 * @param {string} tenantId - ID du tenant
 * @returns {Promise<Object>} { ok, goal?, error? }
 */
export async function getTenantGoalById(goalId, tenantId) {
  if (!supabase) {
    return { ok: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('tenant_goals')
      .select('*')
      .eq('id', goalId)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      console.error('[tenantGoals] ❌ Erreur récupération objectif:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true, goal: data };

  } catch (err) {
    console.error('[tenantGoals] ❌ Exception récupération objectif:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Calculer le pourcentage de progression d'un objectif
 * @param {Object} goal - Objectif
 * @returns {number|null} Pourcentage (0-100) ou null si non calculable
 */
export function calculateGoalProgress(goal) {
  if (!goal || !goal.target_value || goal.target_value === 0) {
    return null;
  }

  const current = goal.current_value || 0;
  const target = goal.target_value;

  const percentage = Math.round((current / target) * 100);
  return Math.min(percentage, 100); // Cap à 100%
}

/**
 * Vérifier si un objectif est proche de sa deadline
 * @param {Object} goal - Objectif
 * @param {number} daysThreshold - Nombre de jours avant deadline (default: 7)
 * @returns {boolean} true si deadline approche
 */
export function isGoalDeadlineNear(goal, daysThreshold = 7) {
  if (!goal || !goal.deadline) {
    return false;
  }

  const now = new Date();
  const deadline = new Date(goal.deadline);
  const diffMs = deadline - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return diffDays > 0 && diffDays <= daysThreshold;
}

/**
 * Formater un objectif pour affichage (texte lisible)
 * @param {Object} goal - Objectif
 * @returns {string} Texte formaté
 */
export function formatGoalForDisplay(goal) {
  if (!goal) return '';

  let text = goal.goal_text;

  if (goal.target_value && goal.unit) {
    const progress = calculateGoalProgress(goal);
    const current = goal.current_value || 0;
    text += ` (${current}/${goal.target_value} ${goal.unit}`;
    if (progress !== null) {
      text += ` - ${progress}%`;
    }
    text += ')';
  }

  if (goal.deadline) {
    const deadlineDate = new Date(goal.deadline);
    const now = new Date();
    if (deadlineDate > now) {
      const diffDays = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
      text += ` - échéance dans ${diffDays}j`;
    } else {
      text += ` - échéance dépassée`;
    }
  }

  return text;
}
