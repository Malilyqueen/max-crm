/**
 * routes/batch-jobs.js
 * Unified Batch Jobs API
 *
 * Endpoints:
 *   POST   /api/batch-jobs           - Create job (import, bulk_update, bulk_delete)
 *   GET    /api/batch-jobs           - List tenant's jobs
 *   GET    /api/batch-jobs/:id       - Get job status and progress
 *   POST   /api/batch-jobs/:id/approve - Approve job (after validation)
 *   POST   /api/batch-jobs/:id/cancel  - Cancel job
 *   GET    /api/batch-jobs/:id/errors  - Get detailed errors
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
  approveJob,
  cancelJob,
  processJob,
  markJobRunning
} from '../lib/batchJobEngine.js';
import { previewBulkUpdate } from '../lib/processors/bulkUpdateProcessor.js';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Apply auth to all routes
router.use(authMiddleware);
router.use(resolveTenant());

/**
 * POST /api/batch-jobs
 * Create a new batch job
 *
 * Body for import:
 *   Content-Type: text/csv (raw CSV)
 *   Headers: X-Filename (optional)
 *
 * Body for bulk_update:
 *   Content-Type: application/json
 *   {
 *     "job_type": "bulk_update",
 *     "operation_name": "Update status to Qualified",
 *     "lead_ids": ["id1", "id2", ...],
 *     "updates": { "status": "Qualified" },
 *     "requires_validation": true
 *   }
 */
router.post('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(401).json({ ok: false, error: 'MISSING_TENANT' });
    }

    const contentType = req.headers['content-type'] || '';

    // Route based on content type
    if (contentType.includes('text/csv') || contentType.includes('multipart/form-data')) {
      return await handleImportJob(req, res, tenantId);
    } else {
      return await handleJsonJob(req, res, tenantId);
    }

  } catch (error) {
    console.error('[BatchJobs] Create error:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * Handle CSV import job creation
 */
async function handleImportJob(req, res, tenantId) {
  // Read CSV body
  const buf = await new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

  // Handle UTF-8 BOM
  let csvContent = buf.toString('utf8');
  if (csvContent.charCodeAt(0) === 0xFEFF) {
    csvContent = csvContent.slice(1);
  }

  // Parse CSV
  const rows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter: csvContent.includes(';') ? ';' : ','
  });

  if (rows.length === 0) {
    return res.status(400).json({
      ok: false,
      error: 'CSV_EMPTY',
      message: 'Fichier CSV vide'
    });
  }

  const fileHash = crypto.createHash('sha1').update(buf).digest('hex').substring(0, 12);
  const fileName = req.headers['x-filename'] || `import_${fileHash}.csv`;

  console.log(`[BatchJobs] Import: ${rows.length} rows for tenant ${tenantId}`);

  // Create job
  const { job, position, shouldStartNow } = await createJob({
    tenantId,
    jobType: 'import',
    operationName: `Import ${rows.length} leads`,
    operationData: { rows },
    fileName,
    fileHash,
    requiresValidation: false
  });

  // Start processing if no other job running
  if (shouldStartNow) {
    processJob(job.id, tenantId).catch(err => {
      console.error(`[BatchJobs] Process error:`, err);
    });
  }

  res.json({
    ok: true,
    jobId: job.id,
    totalItems: rows.length,
    status: job.status,
    position,
    message: job.status === 'running'
      ? 'Import démarré en arrière-plan'
      : `Import en file d'attente (position ${position})`
  });
}

/**
 * Handle JSON job creation (bulk_update, bulk_delete)
 */
async function handleJsonJob(req, res, tenantId) {
  const {
    job_type,
    operation_name,
    lead_ids,
    updates,
    filters,
    requires_validation = true,
    config = {}
  } = req.body;

  // Validate
  if (!job_type) {
    return res.status(400).json({
      ok: false,
      error: 'MISSING_JOB_TYPE'
    });
  }

  if (!['import', 'bulk_update', 'bulk_delete'].includes(job_type)) {
    return res.status(400).json({
      ok: false,
      error: 'INVALID_JOB_TYPE',
      message: 'job_type must be: import, bulk_update, bulk_delete'
    });
  }

  if (job_type === 'bulk_update') {
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'MISSING_UPDATES',
        message: 'updates object required for bulk_update'
      });
    }

    if (!lead_ids?.length && !filters) {
      return res.status(400).json({
        ok: false,
        error: 'MISSING_TARGET',
        message: 'lead_ids or filters required for bulk_update'
      });
    }
  }

  console.log(`[BatchJobs] ${job_type}: ${lead_ids?.length || '?'} items for tenant ${tenantId}`);

  // Build operation data
  const operationData = { lead_ids, updates, filters };

  // Create job
  const { job, position, shouldStartNow } = await createJob({
    tenantId,
    jobType: job_type,
    operationName: operation_name || `${job_type} ${lead_ids?.length || '?'} leads`,
    operationData,
    operationConfig: config,
    requiresValidation: requires_validation
  });

  // Start if no validation needed and no other job running
  if (shouldStartNow) {
    processJob(job.id, tenantId).catch(err => {
      console.error(`[BatchJobs] Process error:`, err);
    });
  }

  res.json({
    ok: true,
    jobId: job.id,
    totalItems: job.total_items,
    status: job.status,
    position,
    requiresValidation: requires_validation,
    message: job.status === 'awaiting_validation'
      ? 'En attente de validation'
      : job.status === 'running'
        ? 'Traitement démarré'
        : `En file d'attente (position ${position})`
  });
}

/**
 * GET /api/batch-jobs
 * List tenant's jobs
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const limit = parseInt(req.query.limit) || 20;
    const jobType = req.query.job_type || null;

    const jobs = await listJobs(tenantId, { limit, jobType });

    res.json({
      ok: true,
      jobs
    });

  } catch (error) {
    console.error('[BatchJobs] List error:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * GET /api/batch-jobs/:id
 * Get job status and progress
 */
router.get('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    const job = await getJob(id, tenantId);

    if (!job) {
      return res.status(404).json({
        ok: false,
        error: 'JOB_NOT_FOUND'
      });
    }

    res.json({
      ok: true,
      job
    });

  } catch (error) {
    console.error('[BatchJobs] Get error:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * POST /api/batch-jobs/:id/approve
 * Approve job after validation
 *
 * Body:
 *   { "consent_id": "optional-consent-id" }
 */
router.post('/:id/approve', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?.id || 'system';
    const { id } = req.params;
    const { consent_id } = req.body;

    const { job, shouldStartNow } = await approveJob(id, tenantId, userId, consent_id);

    // Start processing
    if (shouldStartNow) {
      processJob(job.id, tenantId).catch(err => {
        console.error(`[BatchJobs] Process error:`, err);
      });
    }

    res.json({
      ok: true,
      message: 'Job approuvé',
      status: job.status,
      started: shouldStartNow
    });

  } catch (error) {
    console.error('[BatchJobs] Approve error:', error);
    res.status(400).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * POST /api/batch-jobs/:id/cancel
 * Cancel a job
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    await cancelJob(id, tenantId);

    res.json({
      ok: true,
      message: 'Job annulé'
    });

  } catch (error) {
    console.error('[BatchJobs] Cancel error:', error);
    res.status(400).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * GET /api/batch-jobs/:id/errors
 * Get detailed errors for a job
 */
router.get('/:id/errors', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    const { data: job, error } = await supabase
      .from('batch_jobs')
      .select('errors, fail_count')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !job) {
      return res.status(404).json({
        ok: false,
        error: 'JOB_NOT_FOUND'
      });
    }

    res.json({
      ok: true,
      totalErrors: job.fail_count,
      errors: job.errors || [],
      note: job.errors?.length < job.fail_count
        ? `Showing first ${job.errors.length} of ${job.fail_count} errors`
        : null
    });

  } catch (error) {
    console.error('[BatchJobs] Errors error:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * POST /api/batch-jobs/preview
 * Preview bulk update changes (dry run)
 *
 * Body:
 *   {
 *     "lead_ids": ["id1", "id2", ...],
 *     "updates": { "status": "Qualified" },
 *     "max_preview": 5
 *   }
 */
router.post('/preview', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { lead_ids, updates, max_preview = 5 } = req.body;

    if (!lead_ids?.length || !updates) {
      return res.status(400).json({
        ok: false,
        error: 'MISSING_PARAMS',
        message: 'lead_ids and updates required'
      });
    }

    const preview = await previewBulkUpdate(lead_ids, updates, tenantId, max_preview);

    res.json({
      ok: true,
      ...preview
    });

  } catch (error) {
    console.error('[BatchJobs] Preview error:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

export default router;
