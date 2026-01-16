/**
 * routes/events.js
 * Routes API pour les message_events (Email, SMS, WhatsApp)
 *
 * Authentification JWT + tenant isolation OBLIGATOIRE
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { normalizeStatus } from '../lib/statusNormalizer.js';

const router = express.Router();

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * GET /api/events
 * Liste les events avec pagination et filtres
 *
 * Query params:
 * - page: number (default 1)
 * - limit: number (default 25, max 100)
 * - channel: email|sms|whatsapp
 * - status: sent|delivered|opened|clicked|failed|bounced|etc
 * - direction: in|out
 * - leadId: string
 * - search: string (email ou phone)
 * - startDate: ISO date
 * - endDate: ISO date
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = req.ctx?.tenant || req.user?.tenantId || 'macrea';

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 25, 100);
    const offset = (page - 1) * limit;

    // Filtres
    const { channel, status, direction, leadId, search, startDate, endDate } = req.query;

    // Construction query Supabase
    let query = supabase
      .from('message_events')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('event_timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    // Appliquer filtres
    if (channel) {
      query = query.eq('channel', channel);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (direction) {
      query = query.eq('direction', direction);
    }

    if (leadId) {
      query = query.eq('lead_id', leadId);
    }

    if (search) {
      // Recherche dans email OU phone_number
      query = query.or(`email.ilike.%${search}%,phone_number.ilike.%${search}%`);
    }

    if (startDate) {
      query = query.gte('event_timestamp', startDate);
    }

    if (endDate) {
      query = query.lte('event_timestamp', endDate);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[EVENTS] Erreur Supabase:', error);
      return res.status(500).json({
        ok: false,
        error: 'Erreur lors de la récupération des events'
      });
    }

    // Calculer nextCursor
    const hasMore = offset + limit < count;
    const nextCursor = hasMore ? page + 1 : null;

    res.json({
      ok: true,
      items: data,
      total: count,
      page,
      limit,
      nextCursor,
      hasMore
    });

  } catch (error) {
    console.error('[EVENTS] Erreur:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * GET /api/events/lead/:leadId
 * Récupère tous les events d'un lead
 * Timeline unifiée triée par event_timestamp DESC
 */
router.get('/lead/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;
    const tenantId = req.ctx?.tenant || req.user?.tenantId || 'macrea';

    const { data, error } = await supabase
      .from('message_events')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('lead_id', leadId)
      .order('event_timestamp', { ascending: false });

    if (error) {
      console.error('[EVENTS] Erreur Supabase:', error);
      return res.status(500).json({
        ok: false,
        error: 'Erreur lors de la récupération des events du lead'
      });
    }

    res.json({
      ok: true,
      leadId,
      events: data,
      total: data.length
    });

  } catch (error) {
    console.error('[EVENTS] Erreur:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * GET /api/events/stats
 * KPIs multi-canal pour dashboard Activité
 *
 * Query params:
 * - range: 7d|30d|90d (default 7d)
 * - groupBy: day|week|month (default day)
 */
router.get('/stats', async (req, res) => {
  try {
    const tenantId = req.ctx?.tenant || req.user?.tenantId || 'macrea';
    const range = req.query.range || '7d';

    // Calculer date de début selon range
    const now = new Date();
    let startDate;
    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Récupérer tous les events de la période
    const { data: events, error } = await supabase
      .from('message_events')
      .select('channel, status, direction, event_timestamp')
      .eq('tenant_id', tenantId)
      .gte('event_timestamp', startDate.toISOString());

    if (error) {
      console.error('[EVENTS] Erreur Supabase:', error);
      return res.status(500).json({
        ok: false,
        error: 'Erreur lors de la récupération des stats'
      });
    }

    // Calculer KPIs par canal
    const statsByChannel = {
      email: { sent: 0, delivered: 0, opened: 0, clicked: 0, failed: 0, total: 0 },
      sms: { sent: 0, delivered: 0, failed: 0, total: 0 },
      whatsapp: { sent: 0, delivered: 0, read: 0, failed: 0, total: 0 }
    };

    const inboundTotal = events.filter(e => e.direction === 'in').length;

    events.forEach(event => {
      const { channel, status } = event;

      if (!statsByChannel[channel]) return;

      statsByChannel[channel].total++;

      // Compter par statut
      if (status === 'sent') statsByChannel[channel].sent++;
      else if (status === 'delivered') statsByChannel[channel].delivered++;
      else if (status === 'opened') statsByChannel[channel].opened++;
      else if (status === 'clicked') statsByChannel[channel].clicked++;
      else if (status === 'read') statsByChannel[channel].read++;
      else if (['failed', 'bounced', 'undelivered', 'blocked'].includes(status)) {
        statsByChannel[channel].failed++;
      }
    });

    // Calculer taux de livraison par canal
    Object.keys(statsByChannel).forEach(channel => {
      const stats = statsByChannel[channel];
      if (stats.sent > 0) {
        stats.deliveryRate = Math.round((stats.delivered / stats.sent) * 100);
      } else {
        stats.deliveryRate = 0;
      }
    });

    // Timeseries par jour
    const timeseriesMap = new Map();
    events.forEach(event => {
      const date = event.event_timestamp.split('T')[0]; // YYYY-MM-DD
      if (!timeseriesMap.has(date)) {
        timeseriesMap.set(date, { date, email: 0, sms: 0, whatsapp: 0 });
      }
      timeseriesMap.get(date)[event.channel]++;
    });

    const timeseries = Array.from(timeseriesMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    res.json({
      ok: true,
      range,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      statsByChannel,
      inboundTotal,
      timeseries,
      totalEvents: events.length
    });

  } catch (error) {
    console.error('[EVENTS] Erreur:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

export default router;