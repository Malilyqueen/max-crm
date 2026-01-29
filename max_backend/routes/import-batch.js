/**
 * routes/import-batch.js
 * Import CSV asynchrone - MIGRÉ vers batch_jobs engine
 *
 * Endpoints (backward compatible):
 *   POST /api/import/batch     - Démarrer un import (retourne job_id)
 *   GET  /api/import/status/:id - Statut et progression d'un job
 *   GET  /api/import/jobs       - Liste des jobs du tenant
 *   POST /api/import/:id/cancel - Annuler un job en cours
 *
 * NOTE: Cette route utilise maintenant batch_jobs table + batchJobEngine
 */

import express from 'express';
import { parse } from 'csv-parse/sync';
import crypto from 'crypto';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { resolveTenant } from '../core/resolveTenant.js';
import {
  createJob,
  getJob,
  listJobs,
  cancelJob,
  processJob,
  startNextQueuedJob
} from '../lib/batchJobEngine.js';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Supabase client (for status queries)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Appliquer auth à toutes les routes
router.use(authMiddleware);
router.use(resolveTenant());

/**
 * POST /api/import/batch
 * Démarrer un import CSV asynchrone
 *
 * Body: raw CSV content
 * Headers: Content-Type: text/csv
 *
 * Returns: { ok: true, jobId, totalRows, position }
 */
router.post('/batch', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(401).json({ ok: false, error: 'MISSING_TENANT' });
    }

    // Lire le body CSV
    const buf = await new Promise((ok, ko) => {
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => ok(Buffer.concat(chunks)));
      req.on('error', ko);
    });

    // Support UTF-8 BOM
    let csvContent = buf.toString('utf8');
    if (csvContent.charCodeAt(0) === 0xFEFF) {
      csvContent = csvContent.slice(1);
    }

    // Parser le CSV
    const rows = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: csvContent.includes(';') ? ';' : ','
    });

    if (rows.length === 0) {
      return res.status(400).json({ ok: false, error: 'CSV_EMPTY', message: 'Fichier CSV vide' });
    }

    const fileHash = crypto.createHash('sha1').update(buf).digest('hex').substring(0, 12);
    const fileName = req.headers['x-filename'] || `import_${fileHash}.csv`;

    console.log(`[ImportBatch] Tenant ${tenantId}: ${rows.length} rows à importer (via batch_jobs)`);

    // ═══════════════════════════════════════════════════════════════════
    // USE UNIFIED BATCH ENGINE
    // ═══════════════════════════════════════════════════════════════════
    const { job, position, shouldStartNow } = await createJob({
      tenantId,
      jobType: 'import',
      operationName: `Import ${rows.length} leads`,
      operationData: { rows },
      fileName,
      fileHash,
      requiresValidation: false // Import doesn't need consent
    });

    console.log(`[ImportBatch] Job créé: ${job.id} (status: ${job.status}, position: ${position})`);

    // Si running, démarrer le traitement en background
    if (shouldStartNow) {
      processJob(job.id, tenantId).catch(err => {
        console.error(`[ImportBatch] Erreur processing job ${job.id}:`, err);
      });
    }

    res.json({
      ok: true,
      jobId: job.id,
      totalRows: rows.length,
      status: job.status,
      position: position,
      message: job.status === 'running'
        ? 'Import démarré en arrière-plan'
        : `Import en file d'attente (position ${position})`
    });

  } catch (e) {
    console.error('[ImportBatch] Erreur:', e);
    res.status(400).json({
      ok: false,
      error: 'PARSE_ERROR',
      message: e.message
    });
  }
});

/**
 * GET /api/import/status/:id
 * Récupérer le statut et la progression d'un job
 */
router.get('/status/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    const job = await getJob(id, tenantId);

    if (!job) {
      return res.status(404).json({ ok: false, error: 'JOB_NOT_FOUND' });
    }

    // Map batch_jobs fields to legacy import_jobs format for backward compat
    res.json({
      ok: true,
      job: {
        id: job.id,
        status: job.status,
        total_rows: job.total_items,
        processed_rows: job.processed_items,
        created_count: job.success_count,
        updated_count: 0, // batch_jobs doesn't track this separately
        skipped_count: job.skip_count,
        error_count: job.fail_count,
        errors: job.errors,
        created_at: job.created_at,
        started_at: job.started_at,
        completed_at: job.completed_at,
        file_name: job.file_name,
        progress: job.progress,
        eta: job.eta
      }
    });

  } catch (e) {
    console.error('[ImportBatch] Erreur status:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/import/jobs
 * Liste des jobs d'import du tenant
 */
router.get('/jobs', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const limit = parseInt(req.query.limit) || 20;

    const jobs = await listJobs(tenantId, { limit, jobType: 'import' });

    // Map to legacy format
    const mappedJobs = jobs.map(job => ({
      id: job.id,
      status: job.status,
      total_rows: job.total_items,
      processed_rows: job.processed_items,
      created_count: job.success_count,
      updated_count: 0,
      error_count: job.fail_count,
      created_at: job.created_at,
      completed_at: job.completed_at,
      file_name: job.file_name,
      progress: job.progress
    }));

    res.json({
      ok: true,
      jobs: mappedJobs
    });

  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * POST /api/import/:id/cancel
 * Annuler un job en cours ou en attente
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    await cancelJob(id, tenantId);

    console.log(`[ImportBatch] Job ${id} annulé`);

    res.json({ ok: true, message: 'Job annulé' });

  } catch (e) {
    // Map engine errors to legacy format
    if (e.message === 'Job not found') {
      return res.status(404).json({ ok: false, error: 'JOB_NOT_FOUND' });
    }
    if (e.message.includes('Cannot cancel')) {
      return res.status(400).json({ ok: false, error: 'JOB_ALREADY_FINISHED' });
    }
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
