import express from 'express';
import fs from 'fs';
import path from 'path';
import { getAllLeads } from '../utils/espo-api.js';
import { getRateLimitStats } from '../middleware/rateLimiter.js';

const router = express.Router();

// Timestamp de démarrage
const BOOT_TIME = new Date().toISOString();

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

// ════════════════════════════════════════════════════════════════════════════
// BOOT INFO - Endpoint de vérification de configuration (sans secrets)
// ════════════════════════════════════════════════════════════════════════════
router.get('/boot-info', async (req, res) => {
  const tasksDir = process.env.TASKS_DIR || '/app/data/tasks_autogen';
  const taskRegistry = process.env.TASK_REGISTRY_PATH || '/app/data/task_registry.json';
  const espoBaseUrl = process.env.ESPO_BASE_URL || 'NOT_SET';

  // Vérifier l'existence des paths
  const tasksDirExists = fs.existsSync(tasksDir);
  const taskRegistryDirExists = fs.existsSync(path.dirname(taskRegistry));

  // Vérifier si l'URL Espo est correcte pour l'environnement
  const isProduction = process.env.NODE_ENV === 'production' || process.env.CRM_ENV === 'prod';
  const espoUrlIsLocal = espoBaseUrl.includes('localhost') || espoBaseUrl.includes('127.0.0.1');
  const espoConfigValid = !isProduction || !espoUrlIsLocal;

  // Test Espo connectivity
  let espoConnected = false;
  let espoRequestUrl = null;
  try {
    await getAllLeads('?maxSize=1');
    espoConnected = true;
    espoRequestUrl = espoBaseUrl + '/Lead?maxSize=1';
  } catch (e) {
    espoRequestUrl = espoBaseUrl + '/Lead?maxSize=1 (FAILED: ' + e.message + ')';
  }

  res.json({
    boot_time: BOOT_TIME,
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      CRM_ENV: process.env.CRM_ENV || 'dev',
      is_production: isProduction,
    },
    espo: {
      base_url: espoBaseUrl,
      url_is_local: espoUrlIsLocal,
      config_valid: espoConfigValid,
      connected: espoConnected,
      test_request_url: espoRequestUrl,
    },
    paths: {
      TASKS_DIR: tasksDir,
      tasks_dir_exists: tasksDirExists,
      TASK_REGISTRY_PATH: taskRegistry,
      task_registry_dir_exists: taskRegistryDirExists,
    },
    security: {
      ALLOW_RESET: process.env.ALLOW_RESET || 'false',
      ENABLE_TOOLS_EXECUTE: process.env.ENABLE_TOOLS_EXECUTE || 'false',
    },
    rate_limiting: getRateLimitStats(),
    uptime_seconds: Math.floor(process.uptime()),
  });
});

export default router;