import express from 'express';
import { getAllLeads } from '../utils/espo-api.js';
import { getRecentMaxActivity, formatActivityForReporting } from '../lib/activityLogger.js';
import { getEnrichmentReports, getEnrichmentStats } from '../lib/enrichmentReporter.js';

const router = express.Router();

async function getEspoActivity(tenant) {
  try {
    // Récupérer les activités réelles de M.A.X.
    const maxActivities = getRecentMaxActivity(50);

    // Formater pour le frontend
    return maxActivities.map(formatActivityForReporting);
  } catch (error) {
    console.error('Error fetching M.A.X. activity:', error);
    // Fallback to empty array
    return [];
  }
}

router.get('/reporting', async (req, res) => {
  try {
    const tenant = req.ctx?.tenant || 'default';
    const activity = await getEspoActivity(tenant);

    res.json({
      ok: true,
      kpis: { leads: 42, hot: 7, tasksRunning: 2 }, // Garder pour compatibilité
      activity
    });
  } catch (error) {
    console.error('Reporting error:', error);
    res.status(500).json({ ok: false, error: 'Reporting fetch failed' });
  }
});

// Endpoint pour récupérer les rapports d'enrichissement
router.get('/enrichments', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const reports = await getEnrichmentReports(limit);

    res.json({
      ok: true,
      reports
    });
  } catch (error) {
    console.error('[Enrichments] Error fetching enrichment reports:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch enrichment reports' });
  }
});

// Endpoint pour récupérer les statistiques d'enrichissement
router.get('/enrichments/stats', async (req, res) => {
  try {
    const stats = await getEnrichmentStats();

    res.json({
      ok: true,
      stats
    });
  } catch (error) {
    console.error('[Enrichments] Error fetching enrichment stats:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch enrichment stats' });
  }
});

// Endpoint pour récupérer les leads modifiés par M.A.X.
router.get('/leads-modified', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const reports = await getEnrichmentReports(limit);

    // Extraire tous les leads modifiés depuis les rapports
    // Utiliser un Map pour dédupliquer par leadId (garder la plus récente)
    const leadsMap = new Map();

    reports.forEach(report => {
      if (report.details && Array.isArray(report.details)) {
        report.details
          .filter(detail => detail.status === 'enriched')
          .forEach(detail => {
            const existingLead = leadsMap.get(detail.leadId);
            const leadData = {
              leadId: detail.leadId,
              leadName: detail.name,
              email: detail.email,
              timestamp: report.timestamp,
              reportId: report.id,
              fieldsModified: {
                secteur: detail.secteur,
                tags: detail.tags,
                services: detail.services,
                description: detail.description
              },
              confidence: detail.confiance
            };

            // Garder seulement le plus récent (timestamp le plus grand)
            if (!existingLead || new Date(report.timestamp) > new Date(existingLead.timestamp)) {
              leadsMap.set(detail.leadId, leadData);
            }
          });
      }
    });

    // Convertir la Map en tableau et trier par timestamp décroissant
    const leadsModified = Array.from(leadsMap.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      ok: true,
      leadsModified: leadsModified.slice(0, limit),
      totalCount: leadsModified.length
    });
  } catch (error) {
    console.error('[Enrichments] Error fetching modified leads:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch modified leads' });
  }
});

export default router;
