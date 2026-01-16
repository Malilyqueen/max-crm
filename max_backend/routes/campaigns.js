/**
 * routes/campaigns.js
 * Routes pour envoi de campagnes en masse (Email, SMS, WhatsApp)
 * + Tracking via table campaigns + message_events
 */

import express from 'express';
import pg from 'pg';
import { sendEmail } from '../actions/sendEmail.js';
import { sendWhatsapp } from '../actions/sendWhatsapp.js';
import { sendSms } from '../actions/sendSms.js';
import { logMessageEvent } from '../lib/messageEventLogger.js';
import { espoFetch } from '../lib/espoClient.js';

const { Pool } = pg;
const router = express.Router();

// DB helper
function getPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('supabase')
      ? { rejectUnauthorized: false }
      : false
  });
}

/**
 * POST /api/campaigns/send-bulk
 * Envoie une campagne en masse à un segment de leads
 *
 * Body:
 * {
 *   channel: 'email' | 'sms' | 'whatsapp',
 *   templateId: string (optionnel pour WhatsApp/SMS),
 *   subject: string (Email only),
 *   message: string,
 *   segment: {
 *     status?: string[],
 *     tags?: string[],
 *     source?: string,
 *     leadIds?: string[] (liste manuelle)
 *   }
 * }
 */
router.post('/send-bulk', async (req, res) => {
  const pool = getPool();

  try {
    console.log('\n' + '='.repeat(80));
    console.log('📤 BULK CAMPAIGN SEND REQUEST');
    console.log('='.repeat(80));

    const tenantId = req.ctx?.tenant || req.user?.tenantId || 'macrea';
    const { channel, name, subject, message, segment } = req.body;

    console.log('📋 Channel:', channel);
    console.log('📋 Segment:', JSON.stringify(segment, null, 2));

    // Validation
    if (!channel || !['email', 'sms', 'whatsapp'].includes(channel)) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_CHANNEL',
        message: "Canal invalide. Doit être: email, sms ou whatsapp"
      });
    }

    if (!message) {
      return res.status(400).json({
        ok: false,
        error: 'MISSING_MESSAGE',
        message: 'Le message est requis'
      });
    }

    if (channel === 'email' && !subject) {
      return res.status(400).json({
        ok: false,
        error: 'MISSING_SUBJECT',
        message: 'Le sujet est requis pour les emails'
      });
    }

    if (!segment || (!segment.leadIds && !segment.status && !segment.tags && !segment.source)) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_SEGMENT',
        message: 'Segment invalide. Fournir leadIds, status, tags ou source'
      });
    }

    // Récupérer les leads du segment
    const leads = await fetchLeadsBySegment(segment);

    if (leads.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'NO_LEADS',
        message: 'Aucun lead trouvé pour ce segment'
      });
    }

    console.log(`👥 ${leads.length} leads trouvés`);

    // 1. Créer la campagne en DB AVANT l'envoi
    const campaignName = name || `Campagne ${channel} - ${new Date().toLocaleString('fr-FR')}`;
    const contentPreview = message.substring(0, 200);

    const campaignResult = await pool.query(
      `INSERT INTO campaigns (
        tenant_id, name, channel, subject, content_preview,
        segment_criteria, total_recipients, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        tenantId,
        campaignName,
        channel,
        subject || null,
        contentPreview,
        JSON.stringify(segment),
        leads.length,
        'sending', // Status: draft → sending → sent
        req.user?.email || 'system'
      ]
    );

    const campaignId = campaignResult.rows[0].id;
    console.log(`📋 Campagne créée: ${campaignId}`);

    // 2. Envoyer à chaque lead AVEC campaign_id
    const results = {
      sent: 0,
      failed: 0,
      errors: []
    };

    for (const lead of leads) {
      try {
        let sendResult;

        switch (channel) {
          case 'email':
            if (!lead.emailAddress) {
              console.log(`⚠️  Lead ${lead.id} sans email, skip`);
              results.failed++;
              results.errors.push({
                leadId: lead.id,
                reason: 'NO_EMAIL'
              });
              continue;
            }

            sendResult = await sendEmail({
              to: lead.emailAddress,
              subject,
              body: personalizeMessage(message, lead),
              tenantId,
              leadId: lead.id,
              campaignId // ✅ Nouveau: passer campaign_id
            });
            break;

          case 'sms':
            if (!lead.phoneNumber) {
              console.log(`⚠️  Lead ${lead.id} sans téléphone, skip`);
              results.failed++;
              results.errors.push({
                leadId: lead.id,
                reason: 'NO_PHONE'
              });
              continue;
            }

            sendResult = await sendSms({
              to: lead.phoneNumber,
              message: personalizeMessage(message, lead),
              tenantId,
              leadId: lead.id,
              campaignId // ✅ Nouveau: passer campaign_id
            });
            break;

          case 'whatsapp':
            if (!lead.phoneNumber) {
              console.log(`⚠️  Lead ${lead.id} sans téléphone, skip`);
              results.failed++;
              results.errors.push({
                leadId: lead.id,
                reason: 'NO_PHONE'
              });
              continue;
            }

            sendResult = await sendWhatsapp({
              to: lead.phoneNumber,
              message: personalizeMessage(message, lead),
              tenantId,
              leadId: lead.id,
              campaignId // ✅ Nouveau: passer campaign_id
            });
            break;
        }

        if (sendResult && sendResult.ok) {
          results.sent++;
          console.log(`✅ Envoyé à ${lead.id}`);
        } else {
          results.failed++;
          results.errors.push({
            leadId: lead.id,
            reason: sendResult?.error || 'SEND_FAILED'
          });
          console.log(`❌ Échec pour ${lead.id}:`, sendResult?.error);
        }

        // Petit délai pour éviter rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Erreur envoi à lead ${lead.id}:`, error);
        results.failed++;
        results.errors.push({
          leadId: lead.id,
          reason: error.message
        });
      }
    }

    // 3. Mettre à jour le statut de la campagne
    await pool.query(
      `UPDATE campaigns
       SET status = 'sent', sent_at = NOW(), completed_at = NOW()
       WHERE id = $1`,
      [campaignId]
    );

    // 4. Trigger auto-update des stats (via trigger SQL)
    await pool.query('SELECT update_campaign_stats($1)', [campaignId]);

    console.log('\n📊 RÉSULTATS:');
    console.log(`   ✅ Envoyés: ${results.sent}`);
    console.log(`   ❌ Échecs: ${results.failed}`);
    console.log('='.repeat(80) + '\n');

    res.json({
      ok: true,
      campaignId,
      channel,
      totalLeads: leads.length,
      sent: results.sent,
      failed: results.failed,
      errors: results.errors
    });

  } catch (error) {
    console.error('❌ Erreur bulk campaign:', error);
    res.status(500).json({
      ok: false,
      error: 'BULK_SEND_ERROR',
      message: error.message
    });
  } finally {
    await pool.end();
  }
});

/**
 * Récupère les leads selon le segment
 */
async function fetchLeadsBySegment(segment) {
  try {
    // Si leadIds fourni, récupérer directement
    if (segment.leadIds && segment.leadIds.length > 0) {
      const leads = [];
      for (const leadId of segment.leadIds) {
        try {
          const lead = await espoFetch(`/Lead/${leadId}`);
          if (lead) leads.push(lead);
        } catch (error) {
          console.error(`⚠️  Lead ${leadId} introuvable`);
        }
      }
      return leads;
    }

    // Sinon, construire une requête avec filtres
    let whereConditions = [];
    let whereIndex = 0;

    // Filtre par status
    if (segment.status && segment.status.length > 0) {
      whereConditions.push(
        `where[${whereIndex}][type]=in&where[${whereIndex}][attribute]=status&where[${whereIndex}][value]=${segment.status.join(',')}`
      );
      whereIndex++;
    }

    // Filtre par source
    if (segment.source) {
      whereConditions.push(
        `where[${whereIndex}][type]=equals&where[${whereIndex}][attribute]=source&where[${whereIndex}][value]=${encodeURIComponent(segment.source)}`
      );
      whereIndex++;
    }

    // Note: Les tags nécessitent une requête plus complexe (relation many-to-many)
    // Pour MVP, on les ignore ici

    const queryString = whereConditions.join('&');
    const url = `/Lead?${queryString}&maxSize=1000&select=id,firstName,lastName,emailAddress,phoneNumber,status`;

    console.log('🔍 Fetching leads:', url);

    const response = await espoFetch(url);

    return response && response.list ? response.list : [];

  } catch (error) {
    console.error('❌ Erreur fetch leads segment:', error);
    return [];
  }
}

/**
 * Personnalise le message avec les données du lead
 * Variables supportées: {{firstName}}, {{lastName}}, {{email}}
 */
function personalizeMessage(template, lead) {
  let message = template;

  message = message.replace(/\{\{firstName\}\}/g, lead.firstName || '');
  message = message.replace(/\{\{lastName\}\}/g, lead.lastName || '');
  message = message.replace(/\{\{email\}\}/g, lead.emailAddress || '');
  message = message.replace(/\{\{phone\}\}/g, lead.phoneNumber || '');
  message = message.replace(/\{\{company\}\}/g, lead.accountName || '');

  return message;
}

/**
 * GET /api/campaigns
 * Liste des campagnes avec pagination
 */
router.get('/', async (req, res) => {
  const pool = getPool();

  try {
    const tenantId = req.ctx?.tenant || req.user?.tenantId || 'macrea';
    const { page = 1, limit = 20, channel } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // Query avec filtres
    let whereClause = 'WHERE tenant_id = $1';
    const queryParams = [tenantId];

    if (channel && ['email', 'sms', 'whatsapp'].includes(channel)) {
      queryParams.push(channel);
      whereClause += ` AND channel = $${queryParams.length}`;
    }

    // Count total
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM campaigns ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total);

    // Fetch campaigns
    const campaignsResult = await pool.query(
      `SELECT
        id, name, channel, subject, content_preview,
        total_recipients, total_sent, total_delivered, total_failed,
        total_opened, total_clicked, total_read, total_replied,
        status, sent_at, created_at,
        CASE
          WHEN total_sent > 0 THEN ROUND((total_delivered::NUMERIC / total_sent::NUMERIC) * 100, 2)
          ELSE 0
        END AS delivery_rate,
        CASE
          WHEN total_delivered > 0 THEN ROUND((total_opened::NUMERIC / total_delivered::NUMERIC) * 100, 2)
          ELSE 0
        END AS open_rate
       FROM campaigns
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, Number(limit), offset]
    );

    res.json({
      ok: true,
      campaigns: campaignsResult.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error('❌ Erreur GET campaigns:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  } finally {
    await pool.end();
  }
});

/**
 * GET /api/campaigns/:id/stats
 * Détail d'une campagne avec stats Mailjet-like
 */
router.get('/:id/stats', async (req, res) => {
  const pool = getPool();

  try {
    const tenantId = req.ctx?.tenant || req.user?.tenantId || 'macrea';
    const { id } = req.params;

    // 1. Fetch campaign
    const campaignResult = await pool.query(
      `SELECT * FROM campaigns WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'CAMPAIGN_NOT_FOUND'
      });
    }

    const campaign = campaignResult.rows[0];

    // 2. Fetch distribution des statuts depuis message_events
    const statusDistribution = await pool.query(
      `SELECT
        status,
        COUNT(*) as count
       FROM message_events
       WHERE campaign_id = $1
       GROUP BY status
       ORDER BY count DESC`,
      [id]
    );

    // 3. Fetch messages récents de la campagne
    const recentMessages = await pool.query(
      `SELECT
        id, lead_id, email, phone_number, status,
        message_snippet, event_timestamp, direction
       FROM message_events
       WHERE campaign_id = $1
       ORDER BY event_timestamp DESC
       LIMIT 50`,
      [id]
    );

    // 4. Calculer KPIs Mailjet-like
    const stats = statusDistribution.rows;
    const sent = stats.find(s => ['sent', 'queued'].includes(s.status))?.count || 0;
    const delivered = stats.find(s => s.status === 'delivered')?.count || 0;
    const opened = stats.find(s => s.status === 'opened')?.count || 0;
    const clicked = stats.find(s => s.status === 'clicked')?.count || 0;
    const bounced = stats.find(s => s.status === 'bounced')?.count || 0;
    const spam = stats.find(s => s.status === 'spam')?.count || 0;
    const blocked = stats.find(s => s.status === 'blocked')?.count || 0;
    const unsub = stats.find(s => s.status === 'unsub')?.count || 0;
    const failed = stats.find(s => s.status === 'failed')?.count || 0;
    const read = stats.find(s => s.status === 'read')?.count || 0; // WhatsApp

    // Replies (messages entrants)
    const repliesResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM message_events
       WHERE campaign_id = $1 AND direction = 'in'`,
      [id]
    );
    const replied = parseInt(repliesResult.rows[0].count);

    res.json({
      ok: true,
      campaign: {
        ...campaign,
        segment_criteria: campaign.segment_criteria // Déjà JSON
      },
      kpis: {
        sent: campaign.total_sent,
        delivered: campaign.total_delivered,
        opened: campaign.total_opened,
        clicked: campaign.total_clicked,
        read: campaign.total_read, // WhatsApp
        replied: campaign.total_replied, // SMS/WhatsApp
        bounced,
        spam,
        blocked,
        unsub,
        failed: campaign.total_failed,
        delivery_rate: campaign.total_sent > 0
          ? Math.round((campaign.total_delivered / campaign.total_sent) * 100 * 100) / 100
          : 0,
        open_rate: campaign.total_delivered > 0
          ? Math.round((campaign.total_opened / campaign.total_delivered) * 100 * 100) / 100
          : 0,
        click_rate: campaign.total_opened > 0
          ? Math.round((campaign.total_clicked / campaign.total_opened) * 100 * 100) / 100
          : 0
      },
      statusDistribution: statusDistribution.rows,
      recentMessages: recentMessages.rows
    });

  } catch (error) {
    console.error('❌ Erreur GET campaign stats:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  } finally {
    await pool.end();
  }
});

/**
 * GET /api/campaigns/stats
 * Stats globales toutes campagnes
 */
router.get('/stats/global', async (req, res) => {
  const pool = getPool();

  try {
    const tenantId = req.ctx?.tenant || req.user?.tenantId || 'macrea';

    const result = await pool.query(
      `SELECT
        COUNT(*) as total_campaigns,
        SUM(total_recipients) as total_leads_reached,
        SUM(total_sent) as total_sent,
        SUM(total_delivered) as total_delivered,
        SUM(total_opened) as total_opened,
        CASE
          WHEN SUM(total_sent) > 0 THEN ROUND((SUM(total_delivered)::NUMERIC / SUM(total_sent)::NUMERIC) * 100, 2)
          ELSE 0
        END AS avg_delivery_rate,
        CASE
          WHEN SUM(total_delivered) > 0 THEN ROUND((SUM(total_opened)::NUMERIC / SUM(total_delivered)::NUMERIC) * 100, 2)
          ELSE 0
        END AS avg_open_rate
       FROM campaigns
       WHERE tenant_id = $1 AND status = 'sent'`,
      [tenantId]
    );

    res.json({
      ok: true,
      stats: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Erreur stats globales:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  } finally {
    await pool.end();
  }
});

export default router;
