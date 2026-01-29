/**
 * routes/automations.js
 * API CRUD pour les automatisations/workflows
 *
 * Remplace le mock de automationMvp1.js par des données réelles en DB.
 *
 * Endpoints:
 *   GET    /api/automations          - Liste des automatisations (avec filtres)
 *   GET    /api/automations/:id      - Détail d'une automatisation
 *   POST   /api/automations          - Créer une automatisation
 *   PATCH  /api/automations/:id      - Modifier une automatisation
 *   DELETE /api/automations/:id      - Supprimer (archiver) une automatisation
 *   POST   /api/automations/:id/toggle - Activer/désactiver
 *   POST   /api/automations/:id/execute - Exécution manuelle
 *   GET    /api/automations/:id/executions - Historique d'exécution
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * GET /api/automations
 * Liste des automatisations avec filtres optionnels
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { status, triggerType, search } = req.query;

    console.log(`[AUTOMATIONS] GET / tenant=${tenantId}`);

    let query = supabase
      .from('automations')
      .select('*')
      .eq('tenant_id', tenantId)
      .neq('status', 'archived')
      .order('created_at', { ascending: false });

    // Filtre par statut
    if (status) {
      const statusList = status.split(',');
      query = query.in('status', statusList);
    }

    // Filtre par type de trigger
    if (triggerType) {
      const triggerList = triggerType.split(',');
      query = query.in('trigger_type', triggerList);
    }

    const { data: automations, error } = await query;

    if (error) {
      console.error('[AUTOMATIONS] Erreur DB:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    // Filtre recherche côté serveur (nom + description)
    let filtered = automations || [];
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(searchLower) ||
        (a.description && a.description.toLowerCase().includes(searchLower))
      );
    }

    // Transformer pour format frontend compatible avec le mock
    const workflows = filtered.map(formatWorkflowForFrontend);

    res.json({
      ok: true,
      workflows,
      total: workflows.length
    });

  } catch (error) {
    console.error('[AUTOMATIONS] Erreur:', error);
    res.status(500).json({ ok: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/automations/:id
 * Détail d'une automatisation
 */
router.get('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    console.log(`[AUTOMATIONS] GET /${id} tenant=${tenantId}`);

    const { data: automation, error } = await supabase
      .from('automations')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !automation) {
      return res.status(404).json({ ok: false, error: 'Automatisation non trouvée' });
    }

    res.json({
      ok: true,
      workflow: formatWorkflowForFrontend(automation)
    });

  } catch (error) {
    console.error('[AUTOMATIONS] Erreur:', error);
    res.status(500).json({ ok: false, error: 'Erreur serveur' });
  }
});

/**
 * POST /api/automations
 * Créer une nouvelle automatisation
 */
router.post('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const {
      name,
      description,
      trigger_type,
      trigger_label,
      trigger_config = {},
      actions = [],
      status = 'draft',
      created_by = 'user'
    } = req.body;

    console.log(`[AUTOMATIONS] POST / tenant=${tenantId} name="${name}"`);

    // Validation
    if (!name || !trigger_type) {
      return res.status(400).json({
        ok: false,
        error: 'Nom et type de déclencheur requis'
      });
    }

    // Valider les actions
    const validatedActions = actions.map((action, index) => ({
      id: action.id || `action_${Date.now()}_${index}`,
      type: action.type,
      label: action.label || '',
      description: action.description || '',
      config: action.config || {},
      order: action.order ?? index + 1
    }));

    const { data: automation, error } = await supabase
      .from('automations')
      .insert({
        tenant_id: tenantId,
        name,
        description,
        trigger_type,
        trigger_label,
        trigger_config,
        actions: validatedActions,
        status,
        created_by
      })
      .select()
      .single();

    if (error) {
      console.error('[AUTOMATIONS] Erreur création:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    console.log(`[AUTOMATIONS] Créée: ${automation.id}`);

    res.status(201).json({
      ok: true,
      workflow: formatWorkflowForFrontend(automation),
      message: 'Automatisation créée'
    });

  } catch (error) {
    console.error('[AUTOMATIONS] Erreur:', error);
    res.status(500).json({ ok: false, error: 'Erreur serveur' });
  }
});

/**
 * PATCH /api/automations/:id
 * Modifier une automatisation
 */
router.patch('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;
    const updates = req.body;

    console.log(`[AUTOMATIONS] PATCH /${id} tenant=${tenantId}`);

    // Vérifier que l'automatisation existe et appartient au tenant
    const { data: existing, error: checkError } = await supabase
      .from('automations')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ ok: false, error: 'Automatisation non trouvée' });
    }

    // Champs modifiables
    const allowedFields = [
      'name', 'description', 'status',
      'trigger_type', 'trigger_label', 'trigger_config',
      'actions'
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    const { data: automation, error } = await supabase
      .from('automations')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('[AUTOMATIONS] Erreur mise à jour:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    res.json({
      ok: true,
      workflow: formatWorkflowForFrontend(automation),
      message: 'Automatisation mise à jour'
    });

  } catch (error) {
    console.error('[AUTOMATIONS] Erreur:', error);
    res.status(500).json({ ok: false, error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/automations/:id
 * Archiver une automatisation (soft delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    console.log(`[AUTOMATIONS] DELETE /${id} tenant=${tenantId}`);

    const { error } = await supabase
      .from('automations')
      .update({ status: 'archived' })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('[AUTOMATIONS] Erreur archivage:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    res.json({ ok: true, message: 'Automatisation archivée' });

  } catch (error) {
    console.error('[AUTOMATIONS] Erreur:', error);
    res.status(500).json({ ok: false, error: 'Erreur serveur' });
  }
});

/**
 * POST /api/automations/:id/toggle
 * Activer/désactiver une automatisation
 */
router.post('/:id/toggle', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    console.log(`[AUTOMATIONS] POST /${id}/toggle tenant=${tenantId}`);

    // Récupérer l'automatisation
    const { data: automation, error: fetchError } = await supabase
      .from('automations')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !automation) {
      return res.status(404).json({ ok: false, error: 'Automatisation non trouvée' });
    }

    // Vérifier qu'on ne peut pas activer un brouillon
    if (automation.status === 'draft') {
      return res.status(400).json({
        ok: false,
        error: 'Impossible d\'activer un brouillon. Publiez d\'abord l\'automatisation.'
      });
    }

    // Toggle status
    const newStatus = automation.status === 'active' ? 'inactive' : 'active';

    const { error: updateError } = await supabase
      .from('automations')
      .update({ status: newStatus })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error('[AUTOMATIONS] Erreur toggle:', updateError);
      return res.status(500).json({ ok: false, error: updateError.message });
    }

    console.log(`[AUTOMATIONS] Toggle ${id}: ${automation.status} → ${newStatus}`);

    res.json({
      ok: true,
      status: newStatus,
      message: newStatus === 'active' ? 'Automatisation activée' : 'Automatisation désactivée'
    });

  } catch (error) {
    console.error('[AUTOMATIONS] Erreur:', error);
    res.status(500).json({ ok: false, error: 'Erreur serveur' });
  }
});

/**
 * POST /api/automations/:id/execute
 * Exécution manuelle d'une automatisation (pour test)
 */
router.post('/:id/execute', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;
    const { lead_id, trigger_data = {} } = req.body;

    console.log(`[AUTOMATIONS] POST /${id}/execute tenant=${tenantId}`);

    // Récupérer l'automatisation
    const { data: automation, error: fetchError } = await supabase
      .from('automations')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !automation) {
      return res.status(404).json({ ok: false, error: 'Automatisation non trouvée' });
    }

    // Créer une entrée d'exécution
    const { data: execution, error: execError } = await supabase
      .from('automation_executions')
      .insert({
        tenant_id: tenantId,
        automation_id: id,
        lead_id,
        trigger_data,
        status: 'pending',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (execError) {
      console.error('[AUTOMATIONS] Erreur création exécution:', execError);
      return res.status(500).json({ ok: false, error: execError.message });
    }

    // TODO: Ici on pourrait lancer l'exécution réelle des actions
    // Pour MVP, on simule une exécution réussie
    const startTime = Date.now();

    // Simuler l'exécution des actions
    const actionsExecuted = automation.actions.map(action => ({
      action_id: action.id,
      type: action.type,
      status: 'success',
      executed_at: new Date().toISOString()
    }));

    const duration = Date.now() - startTime + 100; // +100ms pour simulation

    // Mettre à jour l'exécution
    await supabase
      .from('automation_executions')
      .update({
        status: 'success',
        completed_at: new Date().toISOString(),
        duration_ms: duration,
        actions_executed: actionsExecuted
      })
      .eq('id', execution.id);

    // Mettre à jour les stats de l'automatisation
    const newTotalExecutions = (automation.stats_total_executions || 0) + 1;
    const newSuccessRate = automation.stats_success_rate
      ? ((automation.stats_success_rate * automation.stats_total_executions + 100) / newTotalExecutions)
      : 100;
    const newAvgDuration = automation.stats_average_duration
      ? Math.round((automation.stats_average_duration * automation.stats_total_executions + duration / 1000) / newTotalExecutions)
      : Math.round(duration / 1000);

    await supabase
      .from('automations')
      .update({
        stats_total_executions: newTotalExecutions,
        stats_success_rate: Math.round(newSuccessRate * 100) / 100,
        stats_last_executed: new Date().toISOString(),
        stats_average_duration: newAvgDuration
      })
      .eq('id', id);

    console.log(`[AUTOMATIONS] Exécution ${execution.id} terminée en ${duration}ms`);

    res.json({
      ok: true,
      execution_id: execution.id,
      status: 'success',
      duration_ms: duration,
      actions_executed: actionsExecuted.length,
      message: 'Automatisation exécutée avec succès'
    });

  } catch (error) {
    console.error('[AUTOMATIONS] Erreur:', error);
    res.status(500).json({ ok: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/automations/:id/executions
 * Historique d'exécution d'une automatisation
 */
router.get('/:id/executions', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    console.log(`[AUTOMATIONS] GET /${id}/executions tenant=${tenantId}`);

    const { data: executions, error, count } = await supabase
      .from('automation_executions')
      .select('*', { count: 'exact' })
      .eq('automation_id', id)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) {
      console.error('[AUTOMATIONS] Erreur récupération exécutions:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    res.json({
      ok: true,
      executions: executions || [],
      total: count || 0
    });

  } catch (error) {
    console.error('[AUTOMATIONS] Erreur:', error);
    res.status(500).json({ ok: false, error: 'Erreur serveur' });
  }
});

/**
 * Formatte une automatisation DB pour le format attendu par le frontend
 * (compatible avec l'ancien format mock)
 */
function formatWorkflowForFrontend(automation) {
  return {
    id: automation.id,
    name: automation.name,
    description: automation.description || '',
    status: automation.status,
    trigger: {
      type: automation.trigger_type,
      label: automation.trigger_label || getTriggerLabel(automation.trigger_type),
      config: automation.trigger_config || {}
    },
    actions: automation.actions || [],
    stats: {
      totalExecutions: automation.stats_total_executions || 0,
      successRate: automation.stats_success_rate || 0,
      lastExecuted: automation.stats_last_executed || null,
      averageDuration: automation.stats_average_duration || 0
    },
    createdAt: automation.created_at,
    updatedAt: automation.updated_at,
    createdBy: automation.created_by
  };
}

/**
 * Retourne un label par défaut pour un type de trigger
 */
function getTriggerLabel(triggerType) {
  const labels = {
    'lead_created': 'Nouveau lead créé',
    'lead_status_changed': 'Changement de statut',
    'time_based': 'Planifié',
    'lead_updated': 'Lead modifié',
    'tag_added': 'Tag ajouté',
    'manual': 'Déclenchement manuel'
  };
  return labels[triggerType] || triggerType;
}

export default router;
