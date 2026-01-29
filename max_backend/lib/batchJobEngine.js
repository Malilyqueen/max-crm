/**
 * lib/batchJobEngine.js
 * Unified Job Engine for batch operations
 *
 * Supports: import, bulk_update, bulk_delete
 * Features:
 *   - Chunk-based processing (default 50 items, 500ms delay)
 *   - Per-tenant queue (1 running job max)
 *   - Real-time progress tracking
 *   - Graceful cancellation
 *   - Error capture (max 50 errors)
 */

import { createClient } from '@supabase/supabase-js';
import { processImportJob } from './processors/importProcessor.js';
import { processBulkUpdateJob } from './processors/bulkUpdateProcessor.js';

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Processor registry
const PROCESSORS = {
  import: processImportJob,
  bulk_update: processBulkUpdateJob,
  bulk_delete: processBulkDeleteJob // TODO: implement
};

// Default config
const DEFAULT_CONFIG = {
  chunk_size: 50,
  delay_ms: 500,
  continue_on_error: true,
  max_errors: 50
};

/**
 * Process a batch job (dispatcher)
 */
export async function processJob(jobId, tenantId) {
  console.log(`[BatchEngine] Starting job ${jobId} for tenant ${tenantId}`);

  try {
    // Fetch job
    const { data: job, error: fetchError } = await supabase
      .from('batch_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (fetchError || !job) {
      console.error(`[BatchEngine] Job ${jobId} not found`);
      return;
    }

    // Check if cancelled
    if (job.status === 'cancelled') {
      console.log(`[BatchEngine] Job ${jobId} was cancelled, skipping`);
      return;
    }

    // Get processor
    const processor = PROCESSORS[job.job_type];
    if (!processor) {
      throw new Error(`Unknown job_type: ${job.job_type}`);
    }

    // Merge config with defaults
    const config = { ...DEFAULT_CONFIG, ...job.operation_config };

    // Process job
    await processor(job, tenantId, config, {
      supabase,
      updateProgress,
      checkCancelled,
      addError
    });

    console.log(`[BatchEngine] Job ${jobId} completed`);

  } catch (error) {
    console.error(`[BatchEngine] Job ${jobId} failed:`, error);

    // Mark as failed
    await supabase
      .from('batch_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        errors: [{ error: error.message, fatal: true }]
      })
      .eq('id', jobId);
  }

  // Start next queued job for this tenant
  await startNextQueuedJob(tenantId);
}

/**
 * Update job progress
 */
export async function updateProgress(jobId, progress) {
  await supabase
    .from('batch_jobs')
    .update({
      processed_items: progress.processed_items,
      success_count: progress.success_count,
      fail_count: progress.fail_count,
      skip_count: progress.skip_count,
      errors: progress.errors
    })
    .eq('id', jobId);
}

/**
 * Check if job was cancelled
 */
export async function checkCancelled(jobId) {
  const { data } = await supabase
    .from('batch_jobs')
    .select('status')
    .eq('id', jobId)
    .single();

  return data?.status === 'cancelled';
}

/**
 * Add error to job
 */
export async function addError(jobId, error, maxErrors = 50) {
  const { data: job } = await supabase
    .from('batch_jobs')
    .select('errors')
    .eq('id', jobId)
    .single();

  const errors = job?.errors || [];
  if (errors.length < maxErrors) {
    errors.push(error);
    await supabase
      .from('batch_jobs')
      .update({ errors })
      .eq('id', jobId);
  }
}

/**
 * Mark job as running
 */
export async function markJobRunning(jobId) {
  await supabase
    .from('batch_jobs')
    .update({
      status: 'running',
      started_at: new Date().toISOString()
    })
    .eq('id', jobId);
}

/**
 * Mark job as completed
 */
export async function markJobCompleted(jobId, finalStatus = 'completed') {
  await supabase
    .from('batch_jobs')
    .update({
      status: finalStatus,
      completed_at: new Date().toISOString(),
      operation_data: null // Clean up data to save space
    })
    .eq('id', jobId);
}

/**
 * Start next queued job for tenant
 */
export async function startNextQueuedJob(tenantId) {
  const { data: nextJob } = await supabase
    .from('batch_jobs')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (nextJob) {
    console.log(`[BatchEngine] Starting next queued job: ${nextJob.id}`);

    await markJobRunning(nextJob.id);

    // Fire and forget
    processJob(nextJob.id, tenantId).catch(err => {
      console.error(`[BatchEngine] Error processing next job:`, err);
    });
  }
}

/**
 * Check if tenant has running job
 */
export async function hasRunningJob(tenantId) {
  const { data: runningJobs } = await supabase
    .from('batch_jobs')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'running');

  return (runningJobs?.length || 0) > 0;
}

/**
 * Get queue position for new job
 */
export async function getQueuePosition(tenantId) {
  const { data: queuedJobs } = await supabase
    .from('batch_jobs')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('status', ['running', 'queued']);

  return (queuedJobs?.length || 0) + 1;
}

/**
 * Create a new batch job
 */
export async function createJob({
  tenantId,
  jobType,
  operationName,
  operationData,
  operationConfig = {},
  requiresValidation = false,
  fileName = null,
  fileHash = null,
  metadata = {}
}) {
  // Check for running jobs
  const isRunning = await hasRunningJob(tenantId);
  const position = await getQueuePosition(tenantId);

  // Determine initial status
  let initialStatus;
  if (requiresValidation) {
    initialStatus = 'awaiting_validation';
  } else if (isRunning) {
    initialStatus = 'queued';
  } else {
    initialStatus = 'running';
  }

  // Calculate total items
  let totalItems = 0;
  if (operationData?.rows) {
    totalItems = operationData.rows.length;
  } else if (operationData?.lead_ids) {
    totalItems = operationData.lead_ids.length;
  }

  // Create job
  const { data: job, error } = await supabase
    .from('batch_jobs')
    .insert({
      tenant_id: tenantId,
      job_type: jobType,
      operation_name: operationName,
      operation_data: operationData,
      operation_config: { ...DEFAULT_CONFIG, ...operationConfig },
      requires_validation: requiresValidation,
      validation_status: requiresValidation ? 'pending' : 'skipped',
      status: initialStatus,
      total_items: totalItems,
      file_name: fileName,
      file_hash: fileHash,
      metadata,
      started_at: initialStatus === 'running' ? new Date().toISOString() : null
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create job: ${error.message}`);
  }

  return {
    job,
    position,
    shouldStartNow: initialStatus === 'running'
  };
}

/**
 * Approve job (after human validation)
 */
export async function approveJob(jobId, tenantId, userId, consentId = null) {
  // Verify job exists and belongs to tenant
  const { data: job, error: fetchError } = await supabase
    .from('batch_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !job) {
    throw new Error('Job not found');
  }

  if (job.status !== 'awaiting_validation') {
    throw new Error(`Cannot approve job in status: ${job.status}`);
  }

  // Check for running jobs
  const isRunning = await hasRunningJob(tenantId);
  const newStatus = isRunning ? 'queued' : 'running';

  // Update job
  await supabase
    .from('batch_jobs')
    .update({
      validation_status: 'approved',
      validated_by: userId,
      validated_at: new Date().toISOString(),
      consent_id: consentId,
      status: newStatus,
      started_at: newStatus === 'running' ? new Date().toISOString() : null
    })
    .eq('id', jobId);

  return {
    job: { ...job, status: newStatus },
    shouldStartNow: newStatus === 'running'
  };
}

/**
 * Cancel job
 */
export async function cancelJob(jobId, tenantId) {
  const { data: job, error: fetchError } = await supabase
    .from('batch_jobs')
    .select('status')
    .eq('id', jobId)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !job) {
    throw new Error('Job not found');
  }

  if (['completed', 'failed', 'cancelled'].includes(job.status)) {
    throw new Error(`Cannot cancel job in status: ${job.status}`);
  }

  await supabase
    .from('batch_jobs')
    .update({
      status: 'cancelled',
      completed_at: new Date().toISOString()
    })
    .eq('id', jobId);

  return { cancelled: true };
}

/**
 * Get job by ID
 */
export async function getJob(jobId, tenantId) {
  const { data: job, error } = await supabase
    .from('batch_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !job) {
    return null;
  }

  // Add computed fields
  const progress = job.total_items > 0
    ? Math.round((job.processed_items / job.total_items) * 100)
    : 0;

  return {
    ...job,
    progress,
    eta: estimateETA(job),
    // Don't expose raw operation_data in response
    operation_data: undefined
  };
}

/**
 * List jobs for tenant
 */
export async function listJobs(tenantId, { limit = 20, jobType = null } = {}) {
  let query = supabase
    .from('batch_jobs')
    .select('id, job_type, operation_name, status, total_items, processed_items, success_count, fail_count, skip_count, created_at, started_at, completed_at, file_name, requires_validation, validation_status')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (jobType) {
    query = query.eq('job_type', jobType);
  }

  const { data: jobs, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return jobs.map(job => ({
    ...job,
    progress: job.total_items > 0
      ? Math.round((job.processed_items / job.total_items) * 100)
      : 0
  }));
}

/**
 * Estimate time remaining
 */
function estimateETA(job) {
  if (job.status !== 'running' || !job.started_at || job.processed_items === 0) {
    return null;
  }

  const elapsed = Date.now() - new Date(job.started_at).getTime();
  const rate = job.processed_items / elapsed; // items per ms
  const remaining = job.total_items - job.processed_items;
  const etaMs = remaining / rate;

  if (etaMs > 3600000) return `${Math.round(etaMs / 3600000)}h`;
  if (etaMs > 60000) return `${Math.round(etaMs / 60000)}min`;
  return `${Math.round(etaMs / 1000)}s`;
}

/**
 * Placeholder for bulk_delete processor
 */
async function processBulkDeleteJob(job, tenantId, config, helpers) {
  // TODO: Implement bulk delete
  throw new Error('bulk_delete not implemented yet');
}

/**
 * Utility: sleep
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Utility: chunk array
 */
export function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Requeue stale running jobs on server boot
 * Jobs stuck in 'running' status (server crashed) are reset to 'queued'
 */
export async function requeueStaleJobs() {
  console.log('[BatchEngine] Checking for stale running jobs...');

  try {
    // Find all jobs stuck in 'running' status
    const { data: staleJobs, error } = await supabase
      .from('batch_jobs')
      .select('id, tenant_id, operation_name, started_at')
      .eq('status', 'running');

    if (error) {
      console.error('[BatchEngine] Error checking stale jobs:', error.message);
      return;
    }

    if (!staleJobs?.length) {
      console.log('[BatchEngine] No stale jobs found');
      return;
    }

    console.log(`[BatchEngine] Found ${staleJobs.length} stale running job(s)`);

    // Reset each to 'queued'
    for (const job of staleJobs) {
      console.log(`[BatchEngine] Requeuing stale job ${job.id}: ${job.operation_name}`);

      await supabase
        .from('batch_jobs')
        .update({
          status: 'queued',
          started_at: null // Clear started_at so ETA recalculates
        })
        .eq('id', job.id);
    }

    console.log(`[BatchEngine] ✅ Requeued ${staleJobs.length} stale job(s)`);

    // Trigger queue processing for each affected tenant
    const tenantIds = [...new Set(staleJobs.map(j => j.tenant_id))];
    for (const tenantId of tenantIds) {
      startNextQueuedJob(tenantId).catch(err => {
        console.error(`[BatchEngine] Error starting queue for tenant ${tenantId}:`, err);
      });
    }

  } catch (e) {
    console.error('[BatchEngine] Error in requeueStaleJobs:', e);
  }
}
