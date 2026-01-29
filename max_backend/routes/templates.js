/**
 * routes/templates.js
 * API CRUD pour les message_templates
 *
 * Endpoints:
 * - GET    /api/templates          → Liste avec filtres
 * - GET    /api/templates/:id      → Détail d'un template
 * - POST   /api/templates          → Créer un template
 * - PATCH  /api/templates/:id      → Modifier un template
 * - DELETE /api/templates/:id      → Supprimer (soft: archive)
 * - POST   /api/templates/draft-from-chat → MAX crée un brouillon
 *
 * Sécurité: JWT + tenant isolation OBLIGATOIRE
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * GET /api/templates
 * Liste les templates avec filtres
 *
 * Query params:
 * - channel: email|sms|whatsapp
 * - status: draft|active|archived
 * - category: vente|support|marketing|facturation|securite|general
 * - search: string (nom ou contenu)
 */
router.get('/', async (req, res) => {
  try {
    // SECURITY: tenantId UNIQUEMENT depuis JWT
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(401).json({ ok: false, error: 'MISSING_TENANT' });
    }

    const { channel, status, category, search } = req.query;

    // Construction query Supabase
    let query = supabase
      .from('message_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .neq('status', 'archived') // Par défaut, cacher les archivés
      .order('created_at', { ascending: false });

    // Filtres
    if (channel) {
      query = query.eq('channel', channel);
    }

    if (status) {
      // Si status explicite, l'utiliser (même archived)
      query = query.eq('status', status);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[TEMPLATES] Erreur Supabase:', error);
      return res.status(500).json({
        ok: false,
        error: 'Erreur lors de la récupération des templates'
      });
    }

    // Grouper par canal pour l'UI
    const grouped = {
      email: data.filter(t => t.channel === 'email'),
      sms: data.filter(t => t.channel === 'sms'),
      whatsapp: data.filter(t => t.channel === 'whatsapp')
    };

    res.json({
      ok: true,
      templates: data,
      grouped,
      total: data.length,
      counts: {
        email: grouped.email.length,
        sms: grouped.sms.length,
        whatsapp: grouped.whatsapp.length
      }
    });

  } catch (error) {
    console.error('[TEMPLATES] Erreur:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/templates/:id
 * Détail d'un template
 */
router.get('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(401).json({ ok: false, error: 'MISSING_TENANT' });
    }

    const { id } = req.params;

    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        ok: false,
        error: 'TEMPLATE_NOT_FOUND'
      });
    }

    res.json({
      ok: true,
      template: data
    });

  } catch (error) {
    console.error('[TEMPLATES] Erreur:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/templates
 * Créer un nouveau template
 */
router.post('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(401).json({ ok: false, error: 'MISSING_TENANT' });
    }

    const {
      channel,
      name,
      category = 'general',
      subject,
      content,
      whatsapp_from,
      whatsapp_content_sid,
      status = 'draft'
    } = req.body;

    // Validation
    if (!channel || !['email', 'sms', 'whatsapp'].includes(channel)) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_CHANNEL',
        message: 'Canal invalide. Doit être: email, sms ou whatsapp'
      });
    }

    if (!name || !content) {
      return res.status(400).json({
        ok: false,
        error: 'MISSING_FIELDS',
        message: 'Nom et contenu sont requis'
      });
    }

    if (channel === 'email' && !subject) {
      return res.status(400).json({
        ok: false,
        error: 'MISSING_SUBJECT',
        message: 'Le sujet est requis pour les emails'
      });
    }

    // Créer le template
    const { data, error } = await supabase
      .from('message_templates')
      .insert({
        tenant_id: tenantId,
        channel,
        name,
        category,
        subject: channel === 'email' ? subject : null,
        content,
        whatsapp_from: channel === 'whatsapp' ? whatsapp_from : null,
        whatsapp_content_sid: channel === 'whatsapp' ? whatsapp_content_sid : null,
        status,
        created_by: 'user'
      })
      .select()
      .single();

    if (error) {
      console.error('[TEMPLATES] Erreur création:', error);
      return res.status(500).json({
        ok: false,
        error: 'CREATE_FAILED',
        message: error.message
      });
    }

    console.log(`[TEMPLATES] ✅ Template créé: ${data.id} (${channel}) par tenant ${tenantId}`);

    res.status(201).json({
      ok: true,
      template: data,
      message: 'Template créé avec succès'
    });

  } catch (error) {
    console.error('[TEMPLATES] Erreur:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * PATCH /api/templates/:id
 * Modifier un template
 */
router.patch('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(401).json({ ok: false, error: 'MISSING_TENANT' });
    }

    const { id } = req.params;
    const updates = req.body;

    // Vérifier que le template existe et appartient au tenant
    const { data: existing } = await supabase
      .from('message_templates')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (!existing) {
      return res.status(404).json({
        ok: false,
        error: 'TEMPLATE_NOT_FOUND'
      });
    }

    // Champs modifiables
    const allowedFields = ['name', 'category', 'subject', 'content', 'whatsapp_from', 'whatsapp_content_sid', 'status'];
    const filteredUpdates = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'NO_UPDATES',
        message: 'Aucun champ à mettre à jour'
      });
    }

    const { data, error } = await supabase
      .from('message_templates')
      .update(filteredUpdates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('[TEMPLATES] Erreur update:', error);
      return res.status(500).json({
        ok: false,
        error: 'UPDATE_FAILED',
        message: error.message
      });
    }

    console.log(`[TEMPLATES] ✅ Template mis à jour: ${id}`);

    res.json({
      ok: true,
      template: data,
      message: 'Template mis à jour'
    });

  } catch (error) {
    console.error('[TEMPLATES] Erreur:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * DELETE /api/templates/:id
 * Archiver un template (soft delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(401).json({ ok: false, error: 'MISSING_TENANT' });
    }

    const { id } = req.params;

    // Soft delete: passer en archived
    const { data, error } = await supabase
      .from('message_templates')
      .update({ status: 'archived' })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({
        ok: false,
        error: 'TEMPLATE_NOT_FOUND'
      });
    }

    console.log(`[TEMPLATES] 🗑️ Template archivé: ${id}`);

    res.json({
      ok: true,
      message: 'Template archivé'
    });

  } catch (error) {
    console.error('[TEMPLATES] Erreur:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/templates/draft-from-chat
 * MAX crée un brouillon de template
 *
 * Body:
 * {
 *   channel: 'email' | 'sms' | 'whatsapp',
 *   name: string,
 *   subject?: string (email only),
 *   content: string,
 *   category?: string
 * }
 *
 * Retourne:
 * {
 *   ok: true,
 *   template_id: 'uuid',
 *   message: 'Brouillon créé...'
 * }
 */
router.post('/draft-from-chat', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(401).json({ ok: false, error: 'MISSING_TENANT' });
    }

    const {
      channel,
      name,
      subject,
      content,
      category = 'general'
    } = req.body;

    console.log('[TEMPLATES] 🤖 MAX crée un brouillon...');
    console.log(`   Channel: ${channel}`);
    console.log(`   Name: ${name}`);

    // Validation
    if (!channel || !['email', 'sms', 'whatsapp'].includes(channel)) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_CHANNEL',
        message: 'Canal invalide'
      });
    }

    if (!name || !content) {
      return res.status(400).json({
        ok: false,
        error: 'MISSING_FIELDS',
        message: 'Nom et contenu sont requis'
      });
    }

    // Créer le brouillon
    const { data, error } = await supabase
      .from('message_templates')
      .insert({
        tenant_id: tenantId,
        channel,
        name,
        category,
        subject: channel === 'email' ? subject : null,
        content,
        status: 'draft', // TOUJOURS draft quand créé par MAX
        created_by: 'max'
      })
      .select()
      .single();

    if (error) {
      console.error('[TEMPLATES] Erreur création brouillon:', error);
      return res.status(500).json({
        ok: false,
        error: 'CREATE_FAILED',
        message: error.message
      });
    }

    console.log(`[TEMPLATES] ✅ Brouillon MAX créé: ${data.id}`);

    // Message pour MAX à afficher dans le chat
    const channelLabel = {
      email: 'Email',
      sms: 'SMS',
      whatsapp: 'WhatsApp'
    }[channel];

    res.status(201).json({
      ok: true,
      template_id: data.id,
      template: data,
      message: `Brouillon ${channelLabel} créé : "${name}"`,
      instructions: [
        `Tu peux le retrouver dans Pilote Automatique > Modèles de Templates`,
        `Pour le modifier : "MAX, modifie le template ${data.id.substring(0, 8)}"`,
        `Pour l'activer : clique sur "Activer" dans l'interface`
      ]
    });

  } catch (error) {
    console.error('[TEMPLATES] Erreur:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/templates/:id/activate
 * Activer un template (draft → active)
 */
router.post('/:id/activate', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(401).json({ ok: false, error: 'MISSING_TENANT' });
    }

    const { id } = req.params;

    const { data, error } = await supabase
      .from('message_templates')
      .update({ status: 'active' })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('status', 'draft') // Seulement si draft
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({
        ok: false,
        error: 'TEMPLATE_NOT_FOUND_OR_NOT_DRAFT'
      });
    }

    console.log(`[TEMPLATES] ✅ Template activé: ${id}`);

    res.json({
      ok: true,
      template: data,
      message: 'Template activé avec succès'
    });

  } catch (error) {
    console.error('[TEMPLATES] Erreur:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;
