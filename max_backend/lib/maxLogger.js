// lib/maxLogger.js
import { supabase } from './supabaseClient.js';

/**
 * Helper pour enregistrer les actions de M.A.X. dans Supabase
 *
 * @param {Object} logData - Données du log
 * @param {string} logData.action_type - Type d'action (ex: 'lead_status_changed')
 * @param {string} logData.action_category - Catégorie (ex: 'crm', 'communication')
 * @param {string} logData.tenant_id - ID du tenant
 * @param {string} [logData.session_id] - ID de session optionnel
 * @param {string} [logData.user_id] - ID utilisateur optionnel
 * @param {string} [logData.entity_type] - Type d'entité (ex: 'Lead')
 * @param {string} [logData.entity_id] - ID de l'entité
 * @param {string} [logData.description] - Description lisible de l'action
 * @param {Object} [logData.input_data] - Données d'entrée
 * @param {Object} [logData.output_data] - Données de sortie
 * @param {boolean} [logData.success=true] - Succès ou échec
 * @param {string} [logData.error_message] - Message d'erreur si échec
 * @param {number} [logData.execution_time_ms] - Temps d'exécution
 * @param {Object} [logData.metadata] - Métadonnées additionnelles
 */
export async function logMaxAction(logData) {
  if (!supabase) {
    console.warn('[MAX_LOGGER] Supabase non configuré - log ignoré');
    return { ok: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('max_logs')
      .insert([{
        action_type: logData.action_type,
        action_category: logData.action_category,
        tenant_id: logData.tenant_id,
        session_id: logData.session_id || null,
        user_id: logData.user_id || null,
        entity_type: logData.entity_type || null,
        entity_id: logData.entity_id || null,
        description: logData.description || null,
        input_data: logData.input_data || null,
        output_data: logData.output_data || null,
        success: logData.success !== undefined ? logData.success : true,
        error_message: logData.error_message || null,
        execution_time_ms: logData.execution_time_ms || null,
        metadata: logData.metadata || {}
      }])
      .select();

    if (error) {
      console.error('[MAX_LOGGER] ❌ Erreur enregistrement log:', error);
      return { ok: false, error: error.message };
    }

    console.log(`[MAX_LOGGER] ✅ Action loggée: ${logData.action_type} (${logData.tenant_id})`);
    return { ok: true, data: data[0] };
  } catch (err) {
    console.error('[MAX_LOGGER] ❌ Exception lors du logging:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Helper pour créer/mettre à jour une session
 */
export async function upsertSession(sessionData) {
  if (!supabase) {
    return { ok: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error} = await supabase
      .from('max_sessions')
      .upsert([{
        session_id: sessionData.session_id,
        tenant_id: sessionData.tenant_id,
        user_id: sessionData.user_id || null,
        user_email: sessionData.user_email || null,
        last_activity_at: new Date().toISOString(),
        message_count: sessionData.message_count || 0,
        metadata: sessionData.metadata || {}
      }], {
        onConflict: 'session_id',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('[MAX_LOGGER] ❌ Erreur upsert session:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true, data: data[0] };
  } catch (err) {
    console.error('[MAX_LOGGER] ❌ Exception lors de upsert session:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Helper pour enregistrer/récupérer une mémoire tenant
 */
export async function setTenantMemory(memoryData) {
  if (!supabase) {
    return { ok: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('tenant_memory')
      .upsert([{
        tenant_id: memoryData.tenant_id,
        memory_key: memoryData.memory_key,
        memory_type: memoryData.memory_type,
        memory_value: memoryData.memory_value,
        scope: memoryData.scope || 'global',
        priority: memoryData.priority || 0,
        expires_at: memoryData.expires_at || null,
        last_accessed_at: new Date().toISOString(),
        metadata: memoryData.metadata || {}
      }], {
        onConflict: 'tenant_id,memory_key,scope',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('[MAX_LOGGER] ❌ Erreur set memory:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true, data: data[0] };
  } catch (err) {
    console.error('[MAX_LOGGER] ❌ Exception lors de set memory:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Helper pour récupérer une mémoire tenant
 */
export async function getTenantMemory(tenant_id, memory_key, scope = 'global') {
  if (!supabase) {
    return { ok: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('tenant_memory')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('memory_key', memory_key)
      .eq('scope', scope)
      .maybeSingle();

    if (error) {
      console.error('[MAX_LOGGER] ❌ Erreur get memory:', error);
      return { ok: false, error: error.message };
    }

    // Mettre à jour last_accessed_at et access_count
    if (data) {
      await supabase
        .from('tenant_memory')
        .update({
          last_accessed_at: new Date().toISOString(),
          access_count: (data.access_count || 0) + 1
        })
        .eq('id', data.id);
    }

    return { ok: true, data };
  } catch (err) {
    console.error('[MAX_LOGGER] ❌ Exception lors de get memory:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Configurer l'identité complète d'un tenant (mémoire long terme)
 * @param {Object} identityData - Données identité structurées
 * @param {string} identityData.tenant_id - ID du tenant
 * @param {string} identityData.business_model - Modèle économique
 * @param {string} identityData.secteur - Secteur d'activité
 * @param {Array<string>} identityData.objectifs - Liste des objectifs business
 * @param {Array<string>} identityData.contraintes - Liste des contraintes métier
 * @param {string} identityData.ton_communication - Ton de communication préféré
 * @param {Object} identityData.preferences - Autres préférences (objet clé-valeur)
 * @returns {Promise<Object>} { ok, error? }
 */
export async function setTenantIdentity(identityData) {
  if (!supabase) {
    return { ok: false, error: 'Supabase not configured' };
  }

  const {
    tenant_id,
    business_model,
    secteur,
    objectifs = [],
    contraintes = [],
    ton_communication,
    preferences = {}
  } = identityData;

  if (!tenant_id) {
    return { ok: false, error: 'tenant_id required' };
  }

  try {
    const memories = [];

    // Business model
    if (business_model) {
      memories.push({
        tenant_id,
        memory_key: 'business_model',
        memory_value: business_model,
        memory_type: 'identity',
        scope: 'global',
        priority: 100, // Max priorité
        expires_at: null // Jamais expirée
      });
    }

    // Secteur
    if (secteur) {
      memories.push({
        tenant_id,
        memory_key: 'secteur',
        memory_value: secteur,
        memory_type: 'identity',
        scope: 'global',
        priority: 100,
        expires_at: null
      });
    }

    // Objectifs
    if (objectifs.length > 0) {
      memories.push({
        tenant_id,
        memory_key: 'objectifs',
        memory_value: objectifs,
        memory_type: 'business_context',
        scope: 'global',
        priority: 90,
        expires_at: null
      });
    }

    // Contraintes
    if (contraintes.length > 0) {
      memories.push({
        tenant_id,
        memory_key: 'contraintes',
        memory_value: contraintes,
        memory_type: 'business_context',
        scope: 'global',
        priority: 90,
        expires_at: null
      });
    }

    // Ton de communication
    if (ton_communication) {
      memories.push({
        tenant_id,
        memory_key: 'ton_communication',
        memory_value: ton_communication,
        memory_type: 'preference',
        scope: 'global',
        priority: 80,
        expires_at: null
      });
    }

    // Préférences additionnelles
    Object.entries(preferences).forEach(([key, value]) => {
      memories.push({
        tenant_id,
        memory_key: key,
        memory_value: value,
        memory_type: 'preference',
        scope: 'global',
        priority: 70,
        expires_at: null
      });
    });

    // Upsert toutes les mémoires (par memory_key pour éviter doublons)
    for (const memory of memories) {
      await setTenantMemory(memory);
    }

    console.log(`[MAX_LOGGER] ✅ Identité configurée pour tenant ${tenant_id} (${memories.length} mémoires)`);
    return { ok: true, count: memories.length };

  } catch (err) {
    console.error('[MAX_LOGGER] ❌ Exception lors de set identity:', err);
    return { ok: false, error: err.message };
  }
}
