/**
 * routes/recommendations.js
 * API pour les recommandations intelligentes M.A.X.
 *
 * Endpoints:
 *   GET  /api/max/recommendations       - Liste des recommandations pour le tenant
 *   GET  /api/max/recommendations/stats - Statistiques des recommandations
 *   POST /api/max/recommendations/:id/execute - Marquer une recommandation comme exécutée
 */

import express from 'express';
import supabase from '../lib/supabaseClient.js';
import {
  getRecommendationsForTenant,
  getRecommendationStats,
  markRecommendationExecuted,
  getNeverContactedRecommendation,
  getAllRecommendations,
  PRIORITIES,
  RECOMMENDATION_TYPES
} from '../lib/maxDecisionEngine.js';

const router = express.Router();

/**
 * GET /api/max/recommendations
 * Récupère TOUTES les recommandations pour le tenant courant
 * Inclut les leads jamais contactés en priorité
 *
 * Query params:
 *   - limit: nombre max de recommandations (défaut: 20)
 *   - priority: filtrer par priorité (urgent, high, medium, low)
 *   - type: filtrer par type (follow_up_j1, follow_up_j3, never_contacted_bulk, etc.)
 *   - include_never_contacted: inclure les leads jamais contactés (défaut: true)
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { limit, priority, type, include_never_contacted } = req.query;

    console.log(`[RECOMMENDATIONS] GET / tenant=${tenantId}`);

    // Validation des paramètres
    if (priority && !Object.values(PRIORITIES).includes(priority)) {
      return res.status(400).json({
        ok: false,
        error: `Priorité invalide. Valeurs acceptées: ${Object.values(PRIORITIES).join(', ')}`
      });
    }

    if (type && !Object.values(RECOMMENDATION_TYPES).includes(type)) {
      return res.status(400).json({
        ok: false,
        error: `Type invalide. Valeurs acceptées: ${Object.values(RECOMMENDATION_TYPES).join(', ')}`
      });
    }

    // Utiliser getAllRecommendations pour inclure never_contacted
    const includeNeverContacted = include_never_contacted !== 'false';

    let result;
    if (includeNeverContacted) {
      result = await getAllRecommendations(tenantId, {
        limit: limit ? parseInt(limit) : 20,
        priority,
        type
      });
    } else {
      result = await getRecommendationsForTenant(tenantId, {
        limit: limit ? parseInt(limit) : 20,
        priority,
        type
      });
    }

    res.json(result);

  } catch (error) {
    console.error('[RECOMMENDATIONS] Error:', error);
    res.status(500).json({ ok: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/max/recommendations/never-contacted
 * Endpoint dédié pour les leads jamais contactés
 * Retourne la recommandation groupée + liste des leads
 *
 * Query params:
 *   - minAgeHours: âge minimum du lead en heures (défaut: 24)
 *   - maxAgeHours: âge maximum du lead en heures (défaut: 720 = 30j)
 */
router.get('/never-contacted', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { minAgeHours, maxAgeHours } = req.query;

    console.log(`[RECOMMENDATIONS] GET /never-contacted tenant=${tenantId}`);

    const result = await getNeverContactedRecommendation(tenantId, {
      minAgeHours: minAgeHours ? parseInt(minAgeHours) : 24,
      maxAgeHours: maxAgeHours ? parseInt(maxAgeHours) : 720
    });

    if (!result.ok) {
      return res.status(500).json(result);
    }

    res.json(result);

  } catch (error) {
    console.error('[RECOMMENDATIONS] Never-contacted error:', error);
    res.status(500).json({ ok: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/max/recommendations/stats
 * Récupère les statistiques des recommandations
 */
router.get('/stats', async (req, res) => {
  try {
    const tenantId = req.tenantId;

    console.log(`[RECOMMENDATIONS] GET /stats tenant=${tenantId}`);

    const result = await getRecommendationStats(tenantId);

    res.json(result);

  } catch (error) {
    console.error('[RECOMMENDATIONS] Error:', error);
    res.status(500).json({ ok: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/max/recommendations/types
 * Retourne les types de recommandations disponibles
 */
router.get('/types', (req, res) => {
  const types = [
    {
      key: 'follow_up_j1',
      name: 'Relance J+1',
      description: 'Lead sans réponse depuis 24h',
      icon: '📞',
      color: '#f59e0b'
    },
    {
      key: 'follow_up_j3',
      name: 'Relance J+3',
      description: 'Lead sans réponse depuis 72h',
      icon: '⚠️',
      color: '#ef4444'
    },
    {
      key: 'cart_abandoned',
      name: 'Panier abandonné',
      description: 'Client ayant abandonné son panier',
      icon: '🛒',
      color: '#8b5cf6'
    },
    {
      key: 'invoice_unpaid',
      name: 'Facture impayée',
      description: 'Facture en attente de paiement',
      icon: '💰',
      color: '#f97316'
    },
    {
      key: 'hot_lead',
      name: 'Lead chaud',
      description: 'Lead avec score élevé',
      icon: '🔥',
      color: '#dc2626'
    },
    {
      key: 'appointment_reminder',
      name: 'Rappel RDV',
      description: 'Rappel de rendez-vous J-1',
      icon: '📅',
      color: '#3b82f6'
    },
    {
      key: 'never_contacted',
      name: 'Jamais contacté',
      description: 'Lead créé depuis 24h+ sans premier contact',
      icon: '📵',
      color: '#6366f1'
    },
    {
      key: 'never_contacted_bulk',
      name: 'Leads dormants',
      description: 'Groupe de leads jamais contactés',
      icon: '📵',
      color: '#6366f1',
      is_bulk: true
    }
  ];

  res.json({ ok: true, types });
});

/**
 * GET /api/max/recommendations/priorities
 * Retourne les niveaux de priorité disponibles
 */
router.get('/priorities', (req, res) => {
  const priorities = [
    {
      key: 'urgent',
      name: 'Urgent',
      description: 'Action immédiate requise',
      color: '#dc2626',
      icon: '🚨'
    },
    {
      key: 'high',
      name: 'Haute',
      description: 'Action dans les 2h',
      color: '#f97316',
      icon: '⚡'
    },
    {
      key: 'medium',
      name: 'Moyenne',
      description: 'Action dans la journée',
      color: '#eab308',
      icon: '📌'
    },
    {
      key: 'low',
      name: 'Basse',
      description: 'Action cette semaine',
      color: '#22c55e',
      icon: '📋'
    }
  ];

  res.json({ ok: true, priorities });
});

/**
 * POST /api/max/recommendations/bulk-outreach
 * Action de masse : marque plusieurs leads comme contactés
 * Crée des message_events pour déclencher les relances J+1/J+3
 *
 * Body:
 *   - lead_ids: array d'IDs de leads (requis)
 *   - channel: canal utilisé (whatsapp, email, sms, phone) - défaut: whatsapp
 *   - timestamp: date/heure du contact (ISO string) - défaut: now
 *   - description: description de l'action
 */
router.post('/bulk-outreach', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { lead_ids, channel = 'whatsapp', timestamp, description } = req.body;

    console.log(`[RECOMMENDATIONS] POST /bulk-outreach tenant=${tenantId} leads=${lead_ids?.length}`);

    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'lead_ids requis (array non vide)'
      });
    }

    if (lead_ids.length > 500) {
      return res.status(400).json({
        ok: false,
        error: 'Maximum 500 leads par batch'
      });
    }

    const eventTimestamp = timestamp || new Date().toISOString();
    const now = new Date().toISOString();

    // Créer les message_events en batch (schéma complet)
    const messageEvents = lead_ids.map((leadId, index) => ({
      id: `bulk_outreach_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 6)}`,
      tenant_id: tenantId,
      channel: channel === 'phone' ? 'call' : channel,
      provider: 'bulk_outreach',
      direction: 'outbound',
      lead_id: leadId,
      campaign_id: null,
      phone_number: null,
      email: null,
      provider_message_id: null,
      status: 'sent',
      message_snippet: description || `Contact de masse via ${channel}`,
      raw_payload: null,
      event_timestamp: eventTimestamp,
      created_at: now
    }));

    const { data, error: insertError } = await supabase
      .from('message_events')
      .insert(messageEvents)
      .select('id');

    if (insertError) {
      console.error('[RECOMMENDATIONS] Erreur bulk insert:', insertError);
      return res.status(500).json({
        ok: false,
        error: 'Erreur lors de la création des events',
        details: insertError.message
      });
    }

    // Logger l'action bulk dans activities
    await supabase.from('activities').insert({
      tenant_id: tenantId,
      type: 'bulk_outreach',
      title: `Contact de masse: ${lead_ids.length} leads`,
      description: `${lead_ids.length} leads marqués comme contactés via ${channel}`,
      metadata: {
        lead_count: lead_ids.length,
        channel,
        event_timestamp: eventTimestamp,
        lead_ids: lead_ids.slice(0, 50) // Garder les 50 premiers pour référence
      }
    });

    console.log(`[RECOMMENDATIONS] ✅ Bulk outreach: ${lead_ids.length} message_events créés`);

    res.json({
      ok: true,
      message: `${lead_ids.length} leads marqués comme contactés`,
      created_events: data?.length || lead_ids.length,
      event_timestamp: eventTimestamp,
      next_followup: {
        j1: new Date(new Date(eventTimestamp).getTime() + 24 * 60 * 60 * 1000).toISOString(),
        j3: new Date(new Date(eventTimestamp).getTime() + 72 * 60 * 60 * 1000).toISOString()
      }
    });

  } catch (error) {
    console.error('[RECOMMENDATIONS] Bulk error:', error);
    console.error('[RECOMMENDATIONS] Stack:', error.stack);
    res.status(500).json({
      ok: false,
      error: 'Erreur serveur',
      details: error.message
    });
  }
});

/**
 * POST /api/max/recommendations/bulk-outreach-filtered
 * Action de masse INTELLIGENTE : marque TOUS les leads matchant les filtres
 * Crée des message_events avec source=user_confirmed pour ne pas fausser les stats
 *
 * Body:
 *   - filters: { status?: string[], search?: string, notContacted?: boolean }
 *   - channel: canal utilisé (whatsapp, email, sms, phone) - défaut: whatsapp
 *   - timestamp: date/heure du contact (ISO string) - défaut: now
 *   - description: description de l'action
 *   - confirm: boolean - DOIT être true pour exécuter (sécurité)
 *
 * Workflow:
 *   1. Si confirm=false ou absent → retourne le COUNT des leads matchant (preview)
 *   2. Si confirm=true → exécute le bulk sur TOUS les leads matchant
 */
router.post('/bulk-outreach-filtered', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { filters = {}, channel = 'whatsapp', timestamp, description, confirm } = req.body;

    console.log(`[RECOMMENDATIONS] POST /bulk-outreach-filtered tenant=${tenantId} confirm=${confirm}`);
    console.log(`[RECOMMENDATIONS] Filters:`, filters);

    // Import espoFetch pour requêter le CRM
    const { espoFetch } = await import('../lib/espoClient.js');

    // Construire l'endpoint EspoCRM avec filtres
    let whereIndex = 0;
    let endpoint = `/Lead?maxSize=1000&select=id`; // Max 1000 leads par requête

    // Filtre multi-statut
    if (filters.status && Array.isArray(filters.status) && filters.status.length > 0) {
      if (filters.status.length === 1) {
        endpoint += `&where[${whereIndex}][type]=equals&where[${whereIndex}][attribute]=status&where[${whereIndex}][value]=${encodeURIComponent(filters.status[0])}`;
      } else {
        endpoint += `&where[${whereIndex}][type]=in&where[${whereIndex}][attribute]=status`;
        filters.status.forEach((s, i) => {
          endpoint += `&where[${whereIndex}][value][${i}]=${encodeURIComponent(s)}`;
        });
      }
      whereIndex++;
    }

    // Filtre recherche
    if (filters.search) {
      endpoint += `&where[${whereIndex}][type]=or`;
      endpoint += `&where[${whereIndex}][value][0][type]=contains&where[${whereIndex}][value][0][attribute]=firstName&where[${whereIndex}][value][0][value]=${encodeURIComponent(filters.search)}`;
      endpoint += `&where[${whereIndex}][value][1][type]=contains&where[${whereIndex}][value][1][attribute]=lastName&where[${whereIndex}][value][1][value]=${encodeURIComponent(filters.search)}`;
      endpoint += `&where[${whereIndex}][value][2][type]=contains&where[${whereIndex}][value][2][attribute]=emailAddress&where[${whereIndex}][value][2][value]=${encodeURIComponent(filters.search)}`;
    }

    // Requête EspoCRM
    const espoData = await espoFetch(endpoint);
    let leadIds = (espoData.list || []).map(l => l.id);

    // ═══════════════════════════════════════════════════════════════════
    // FILTRE "NON CONTACTÉ" : exclure leads avec message_event outbound
    // ═══════════════════════════════════════════════════════════════════
    if (filters.notContacted === true) {
      console.log(`[RECOMMENDATIONS] Applying notContacted filter...`);

      // Récupérer les lead_ids avec events outbound
      const { data: contactedLeads } = await supabase
        .from('message_events')
        .select('lead_id')
        .eq('tenant_id', tenantId)
        .eq('direction', 'outbound')
        .not('lead_id', 'is', null);

      const contactedLeadIds = new Set(contactedLeads?.map(e => e.lead_id) || []);
      console.log(`[RECOMMENDATIONS] ${contactedLeadIds.size} leads already contacted`);

      // Filtrer
      leadIds = leadIds.filter(id => !contactedLeadIds.has(id));
      console.log(`[RECOMMENDATIONS] ${leadIds.length} leads after notContacted filter`);
    }

    const total = leadIds.length;

    console.log(`[RECOMMENDATIONS] Found ${total} leads matching filters`);

    // MODE PREVIEW : si confirm !== true, retourner juste le count
    if (confirm !== true) {
      return res.json({
        ok: true,
        mode: 'preview',
        count: total,
        filters,
        message: `${total} leads seront marqués comme contactés`,
        action_required: 'Renvoyez avec confirm=true pour exécuter'
      });
    }

    // MODE EXÉCUTION : créer les message_events
    if (leadIds.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'Aucun lead ne correspond aux filtres'
      });
    }

    if (leadIds.length > 1000) {
      return res.status(400).json({
        ok: false,
        error: `Trop de leads (${total}). Maximum 1000 par batch. Affinez vos filtres.`
      });
    }

    const eventTimestamp = timestamp || new Date().toISOString();
    const now = new Date().toISOString();

    // Créer les message_events avec source=user_confirmed
    const messageEvents = leadIds.map((leadId, index) => ({
      id: `bulk_filtered_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 6)}`,
      tenant_id: tenantId,
      channel: channel === 'phone' ? 'call' : channel,
      provider: 'user_confirmed', // ✅ Source distincte pour stats
      direction: 'outbound',
      lead_id: leadId,
      campaign_id: null,
      phone_number: null,
      email: null,
      provider_message_id: null,
      status: 'sent',
      message_snippet: description || `Contact confirmé via ${channel} (bulk)`,
      raw_payload: { source: 'user_confirmed', filters }, // ✅ Métadonnées
      event_timestamp: eventTimestamp,
      created_at: now
    }));

    const { data, error: insertError } = await supabase
      .from('message_events')
      .insert(messageEvents)
      .select('id');

    if (insertError) {
      console.error('[RECOMMENDATIONS] Erreur bulk insert:', insertError);
      return res.status(500).json({
        ok: false,
        error: 'Erreur lors de la création des events',
        details: insertError.message
      });
    }

    // Logger l'action bulk dans activities
    await supabase.from('activities').insert({
      tenant_id: tenantId,
      type: 'bulk_outreach_filtered',
      title: `Contact de masse: ${leadIds.length} leads (filtré)`,
      description: `${leadIds.length} leads marqués comme contactés via ${channel}`,
      metadata: {
        lead_count: leadIds.length,
        channel,
        filters,
        event_timestamp: eventTimestamp,
        source: 'user_confirmed'
      }
    });

    console.log(`[RECOMMENDATIONS] ✅ Bulk filtered: ${leadIds.length} message_events créés`);

    res.json({
      ok: true,
      mode: 'executed',
      message: `${leadIds.length} leads marqués comme contactés`,
      created_events: data?.length || leadIds.length,
      filters,
      event_timestamp: eventTimestamp,
      next_followup: {
        j1: new Date(new Date(eventTimestamp).getTime() + 24 * 60 * 60 * 1000).toISOString(),
        j3: new Date(new Date(eventTimestamp).getTime() + 72 * 60 * 60 * 1000).toISOString()
      }
    });

  } catch (error) {
    console.error('[RECOMMENDATIONS] Bulk filtered error:', error);
    res.status(500).json({
      ok: false,
      error: 'Erreur serveur',
      details: error.message
    });
  }
});

/**
 * POST /api/max/recommendations/:id/execute
 * Marque une recommandation comme exécutée ET crée un message_event
 * pour alimenter le système de relances (J+1, J+3)
 *
 * Body:
 *   - action_type: canal utilisé (whatsapp, email, sms, phone)
 *   - lead_id: ID du lead (optionnel, extrait de l'ID recommandation sinon)
 *   - lead_phone: téléphone du lead (optionnel)
 *   - lead_email: email du lead (optionnel)
 *   - description: description de l'action
 */
router.post('/:id/execute', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;
    const { action_type, lead_id, lead_phone, lead_email, description } = req.body;

    console.log(`[RECOMMENDATIONS] POST /${id}/execute tenant=${tenantId} action=${action_type}`);

    if (!action_type) {
      return res.status(400).json({
        ok: false,
        error: 'action_type requis (whatsapp, email, sms, phone)'
      });
    }

    // Extraire lead_id depuis l'ID de recommandation si pas fourni
    // Format: {lead_id}_{type}_{timestamp}
    const extractedLeadId = lead_id || id.split('_')[0];

    // 1. Créer un message_event pour déclencher le système de relances
    const messageEventId = `outreach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const { error: eventError } = await supabase
      .from('message_events')
      .insert({
        id: messageEventId,
        tenant_id: tenantId,
        channel: action_type === 'phone' ? 'call' : action_type,
        provider: 'manual_outreach',
        direction: 'outbound',
        lead_id: extractedLeadId,
        campaign_id: null,
        phone_number: lead_phone || null,
        email: lead_email || null,
        provider_message_id: null,
        status: 'sent',
        message_snippet: description || `Contact manuel via ${action_type}`,
        raw_payload: null,
        event_timestamp: now,
        created_at: now
      });

    if (eventError) {
      console.error('[RECOMMENDATIONS] Erreur création message_event:', eventError);
      // Continue quand même pour logger l'activity
    } else {
      console.log(`[RECOMMENDATIONS] ✅ message_event créé: ${messageEventId}`);
    }

    // 2. Logger dans activities
    const result = await markRecommendationExecuted(tenantId, id, {
      type: action_type,
      description: description || `Contact manuel via ${action_type}`,
      outcome: 'completed',
      executed_at: now,
      message_event_id: messageEventId
    });

    res.json({
      ok: true,
      message: 'Action enregistrée - Timer relance J+1/J+3 démarré',
      message_event_id: messageEventId
    });

  } catch (error) {
    console.error('[RECOMMENDATIONS] Error:', error);
    res.status(500).json({ ok: false, error: 'Erreur serveur' });
  }
});

/**
 * POST /api/max/recommendations/:id/dismiss
 * Ignore une recommandation (ne plus l'afficher)
 */
router.post('/:id/dismiss', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;
    const { reason } = req.body;

    console.log(`[RECOMMENDATIONS] POST /${id}/dismiss tenant=${tenantId}`);

    // Logger le dismiss dans activities
    const result = await markRecommendationExecuted(tenantId, id, {
      type: 'dismissed',
      description: reason || 'Recommandation ignorée par l\'utilisateur',
      outcome: 'dismissed',
      executed_at: new Date().toISOString()
    });

    res.json({
      ok: true,
      message: 'Recommandation ignorée'
    });

  } catch (error) {
    console.error('[RECOMMENDATIONS] Error:', error);
    res.status(500).json({ ok: false, error: 'Erreur serveur' });
  }
});

export default router;
