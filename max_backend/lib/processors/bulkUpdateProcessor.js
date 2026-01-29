/**
 * lib/processors/bulkUpdateProcessor.js
 * Bulk update processor for batch job engine
 *
 * Updates multiple leads with the same field values
 * Filters by cTenantId for multi-tenant isolation
 */

import { updateLead } from '../../utils/espo-api.js';
import { markJobCompleted, sleep, chunk } from '../batchJobEngine.js';

/**
 * Process bulk update job
 *
 * Expected operation_data format:
 * {
 *   lead_ids: ['id1', 'id2', ...],
 *   updates: { status: 'Qualified', stage: 'Negotiation', ... }
 * }
 *
 * Or with filters:
 * {
 *   filters: { status: 'New', source: 'Website' },
 *   updates: { status: 'Qualified' }
 * }
 */
export async function processBulkUpdateJob(job, tenantId, config, helpers) {
  const { supabase, checkCancelled } = helpers;
  const { lead_ids, updates, filters } = job.operation_data || {};

  // Validate input
  if (!updates || Object.keys(updates).length === 0) {
    throw new Error('No updates specified');
  }

  let targetIds = lead_ids || [];

  // If no lead_ids but filters provided, fetch matching leads first
  if (targetIds.length === 0 && filters) {
    console.log(`[BulkUpdateProcessor] Job ${job.id}: Fetching leads matching filters`);
    targetIds = await fetchLeadIdsByFilters(filters, tenantId);

    // Update total_items with actual count
    await supabase
      .from('batch_jobs')
      .update({ total_items: targetIds.length })
      .eq('id', job.id);
  }

  const totalItems = targetIds.length;

  if (totalItems === 0) {
    console.log(`[BulkUpdateProcessor] Job ${job.id}: No leads to update`);
    await markJobCompleted(job.id, 'completed');
    return;
  }

  console.log(`[BulkUpdateProcessor] Job ${job.id}: Updating ${totalItems} leads`);
  console.log(`[BulkUpdateProcessor] Updates: ${JSON.stringify(updates)}`);

  let processedItems = 0;
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;
  const errors = [];

  // Process in chunks
  const chunks = chunk(targetIds, config.chunk_size);
  let chunkIndex = 0;

  for (const chunkIds of chunks) {
    // Check cancellation
    if (await checkCancelled(job.id)) {
      console.log(`[BulkUpdateProcessor] Job ${job.id} cancelled`);
      return;
    }

    chunkIndex++;
    console.log(`[BulkUpdateProcessor] Job ${job.id}: Chunk ${chunkIndex}/${chunks.length}`);

    // Process each lead in chunk
    for (const leadId of chunkIds) {
      try {
        // Update lead in EspoCRM
        const result = await updateLead(leadId, updates);

        if (result?.id) {
          successCount++;
        } else {
          // Lead might not exist or update failed silently
          skipCount++;
        }
        processedItems++;

      } catch (leadError) {
        failCount++;
        processedItems++;

        // Handle 404 (lead not found) as skip, not error
        if (leadError.message?.includes('404')) {
          skipCount++;
          failCount--; // Correct the count
        } else if (errors.length < config.max_errors) {
          errors.push({
            lead_id: leadId,
            error: leadError.message
          });
        }

        if (!config.continue_on_error && !leadError.message?.includes('404')) {
          throw leadError;
        }
      }
    }

    // Update progress after each chunk
    await supabase
      .from('batch_jobs')
      .update({
        processed_items: processedItems,
        success_count: successCount,
        fail_count: failCount,
        skip_count: skipCount,
        errors
      })
      .eq('id', job.id);

    // Delay between chunks
    if (chunkIndex < chunks.length) {
      await sleep(config.delay_ms);
    }
  }

  // Mark completed
  const finalStatus = failCount === totalItems ? 'failed' : 'completed';
  await markJobCompleted(job.id, finalStatus);

  console.log(`[BulkUpdateProcessor] Job ${job.id} finished: ${successCount} success, ${failCount} fail, ${skipCount} skip`);
}

/**
 * Fetch lead IDs matching filters from EspoCRM
 * This allows bulk update based on criteria rather than explicit IDs
 */
async function fetchLeadIdsByFilters(filters, tenantId) {
  // Import espoClient dynamically to avoid circular deps
  const { default: espoFetch } = await import('../../utils/espo-fetch.js').catch(() => {
    // Fallback to direct fetch if espo-fetch doesn't exist
    return { default: null };
  });

  // Build EspoCRM filter query
  const where = [];

  // Always filter by tenant
  where.push({
    type: 'equals',
    attribute: 'cTenantId',
    value: tenantId
  });

  // Add user filters
  for (const [field, value] of Object.entries(filters)) {
    if (Array.isArray(value)) {
      where.push({
        type: 'in',
        attribute: field,
        value: value
      });
    } else {
      where.push({
        type: 'equals',
        attribute: field,
        value: value
      });
    }
  }

  // Fetch from EspoCRM
  const url = new URL(`${process.env.ESPO_BASE_URL || process.env.ESPO_BASE}/Lead`);
  url.searchParams.set('select', 'id');
  url.searchParams.set('maxSize', '10000'); // Safety limit
  url.searchParams.set('where', JSON.stringify(where));

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-Api-Key': process.env.ESPO_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`EspoCRM fetch failed: ${response.status}`);
    }

    const data = await response.json();
    return (data.list || []).map(lead => lead.id);

  } catch (error) {
    console.error('[BulkUpdateProcessor] Failed to fetch leads by filters:', error);
    throw new Error(`Failed to fetch leads: ${error.message}`);
  }
}

/**
 * Preview bulk update (dry run)
 * Returns sample of leads that would be affected
 */
export async function previewBulkUpdate(leadIds, updates, tenantId, maxPreview = 5) {
  const sampleIds = leadIds.slice(0, maxPreview);
  const preview = [];

  for (const leadId of sampleIds) {
    try {
      // Fetch current lead data
      const url = `${process.env.ESPO_BASE_URL || process.env.ESPO_BASE}/Lead/${leadId}`;
      const response = await fetch(url, {
        headers: {
          'X-Api-Key': process.env.ESPO_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const current = await response.json();
        const updated = { ...current, ...updates };

        preview.push({
          id: leadId,
          name: current.name,
          current: extractRelevantFields(current, updates),
          updated: extractRelevantFields(updated, updates)
        });
      }
    } catch (error) {
      console.error(`[BulkUpdateProcessor] Preview failed for ${leadId}:`, error);
    }
  }

  return {
    preview,
    totalAffected: leadIds.length,
    fieldsChanged: Object.keys(updates)
  };
}

/**
 * Extract only the fields being updated for preview
 */
function extractRelevantFields(lead, updates) {
  const relevant = {};
  for (const field of Object.keys(updates)) {
    relevant[field] = lead[field];
  }
  return relevant;
}
