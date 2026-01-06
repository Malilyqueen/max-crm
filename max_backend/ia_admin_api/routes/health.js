import express from 'express';
import { getAllLeads } from '../utils/espo-api.js';

const router = express.Router();

async function checkEspoHealth() {
  try {
    // Simple query to test Espo connectivity
    await getAllLeads('?maxSize=1');
    return true;
  } catch (error) {
    console.warn('Espo health check failed:', error.message);
    return false;
  }
}

async function checkN8nHealth() {
  try {
    const fetch = (await import('node-fetch')).default;
    const baseUrl = process.env.N8N_BASE;
    if (!baseUrl) return false;

    const response = await fetch(`${baseUrl}/healthz`, { timeout: 5000 });
    return response.ok;
  } catch (error) {
    console.warn('n8n health check failed:', error.message);
    return false;
  }
}

router.get('/health', async (req, res) => {
  try {
    const [espoOk, n8nOk] = await Promise.all([
      checkEspoHealth(),
      checkN8nHealth()
    ]);

    res.json({
      ok: true,
      pid: process.pid,
      uptime: process.uptime(),
      services: {
        espo: espoOk,
        n8n: n8nOk,
        sse: true // SSE is always available
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      ok: false,
      error: 'Health check failed',
      services: {
        espo: false,
        n8n: false,
        sse: false
      }
    });
  }
});

export default router;