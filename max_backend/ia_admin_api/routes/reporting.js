import express from 'express';
import { getAllLeads } from '../utils/espo-api.js';

const router = express.Router();

async function getEspoActivity(tenant) {
  try {
    // For now, return mock activity data since activities endpoint is not implemented
    // TODO: Implement proper ActivityStream fetching when needed
    return [
      {
        ts: Date.now() - 3600000, // 1 hour ago
        type: 'chat',
        title: 'Message envoyé à lead',
        meta: { entityId: 'lead-001', entityType: 'Lead' }
      },
      {
        ts: Date.now() - 7200000, // 2 hours ago
        type: 'action',
        title: 'Appel téléphonique',
        meta: { entityId: 'lead-002', entityType: 'Lead' }
      },
      {
        ts: Date.now() - 86400000, // 1 day ago
        type: 'workflow',
        title: 'Automation déclenchée',
        meta: { entityId: 'lead-003', entityType: 'Lead' }
      }
    ];
  } catch (error) {
    console.error('Error fetching Espo activity:', error);
    // Fallback to mock data
    return [{
      ts: Date.now(),
      type: 'chat',
      title: 'Message envoyé',
      meta: { entityId: 'mock', entityType: 'Lead' }
    }];
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

export default router;
