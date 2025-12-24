/**
 * Routes API /api/ai/*
 *
 * Endpoints pour le suivi du budget tokens et les appels de test
 */

import express from 'express';
import { snapshot, reset } from '../lib/tokenMeter.js';
import { callHaiku } from '../lib/aiClient.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const BILLING_DIR = path.join(__dirname, '../billing');

/**
 * GET /api/ai/usage
 * Récupérer l'état actuel du budget et de l'usage
 */
router.get('/usage', (req, res) => {
  try {
    const data = snapshot();
    res.json(data);
  } catch (e) {
    console.error('[AI Routes] Erreur /usage:', e);
    res.status(500).json({
      ok: false,
      error: e.message
    });
  }
});

/**
 * GET /api/ai/usage/history?date=YYYY-MM-DD
 * Récupérer l'historique JSONL d'une date
 */
router.get('/usage/history', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);

    // Valider le format de date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        ok: false,
        error: 'Format de date invalide (attendu: YYYY-MM-DD)'
      });
    }

    const filename = `anthropic-usage-${date}.jsonl`;
    const filepath = path.join(BILLING_DIR, filename);

    try {
      const content = await fs.readFile(filepath, 'utf8');
      const lines = content.trim().split('\n').filter(l => l.length > 0);
      const entries = lines.map(line => JSON.parse(line));

      res.json({
        ok: true,
        date,
        count: entries.length,
        entries
      });
    } catch (e) {
      if (e.code === 'ENOENT') {
        // Fichier n'existe pas
        return res.json({
          ok: true,
          date,
          count: 0,
          entries: []
        });
      }
      throw e;
    }
  } catch (e) {
    console.error('[AI Routes] Erreur /usage/history:', e);
    res.status(500).json({
      ok: false,
      error: e.message
    });
  }
});

/**
 * POST /api/ai/test-call
 * Effectuer un appel de test simple
 */
router.post('/test-call', async (req, res) => {
  try {
    const result = await callHaiku({
      messages: [
        { role: 'user', content: 'Réponds simplement: OK' }
      ],
      max_tokens: 10,
      temperature: 0.3
    });

    res.json({
      ok: true,
      text: result.text,
      usage: result.usage,
      snapshot: snapshot()
    });
  } catch (e) {
    console.error('[AI Routes] Erreur /test-call:', e);

    const status = e.status || 500;
    const code = e.code || 'UNKNOWN_ERROR';

    res.status(status).json({
      ok: false,
      error: e.message,
      code,
      snapshot: snapshot()
    });
  }
});

/**
 * POST /api/ai/reset
 * Réinitialiser les compteurs (dev only, protégé par ALLOW_RESET)
 */
router.post('/reset', async (req, res) => {
  try {
    if (process.env.ALLOW_RESET !== 'true') {
      return res.status(403).json({
        ok: false,
        error: 'Reset non autorisé (ALLOW_RESET != true)'
      });
    }

    await reset();

    res.json({
      ok: true,
      message: 'Compteurs réinitialisés',
      snapshot: snapshot()
    });
  } catch (e) {
    console.error('[AI Routes] Erreur /reset:', e);
    res.status(500).json({
      ok: false,
      error: e.message
    });
  }
});

/**
 * GET /api/ai/health
 * Sanity check
 */
router.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'AI Routes',
    model: process.env.ANTHROPIC_MODEL || process.env.AI_MODEL,
    budget_enabled: true,
    reset_allowed: process.env.ALLOW_RESET === 'true'
  });
});

export default router;
