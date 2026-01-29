/**
 * lib/processors/importProcessor.js
 * CSV Import processor for batch job engine
 */

import { upsertLead } from '../../utils/espo-api.js';
import { markJobCompleted, sleep, chunk } from '../batchJobEngine.js';

// Field mapping CSV → EspoCRM
const FIELD_MAPPING = {
  'Email': 'emailAddress',
  'email': 'emailAddress',
  'Nom': 'lastName',
  'name': 'name',
  'lastName': 'lastName',
  'Prénom': 'firstName',
  'firstName': 'firstName',
  'Téléphone': 'phoneNumber',
  'phone': 'phoneNumber',
  'phoneNumber': 'phoneNumber',
  'Entreprise': 'accountName',
  'company': 'accountName',
  'accountName': 'accountName',
  'Ville': 'addressCity',
  'city': 'addressCity',
  'addressCity': 'addressCity',
  'Status': 'status',
  'status': 'status',
  'Source': 'source',
  'source': 'source',
  'Website': 'website',
  'website': 'website',
  'Description': 'description',
  'description': 'description',
  'Industry': 'industry',
  'industry': 'industry'
};

/**
 * Map CSV row fields to EspoCRM fields
 */
function mapFields(row) {
  const mapped = {};
  for (const [csvField, value] of Object.entries(row)) {
    const espoField = FIELD_MAPPING[csvField] || csvField;
    if (value && String(value).trim()) {
      mapped[espoField] = String(value).trim();
    }
  }
  return mapped;
}

/**
 * Process import job
 */
export async function processImportJob(job, tenantId, config, helpers) {
  const { supabase, checkCancelled } = helpers;
  const rows = job.operation_data?.rows || [];
  const totalRows = rows.length;

  console.log(`[ImportProcessor] Job ${job.id}: Processing ${totalRows} rows`);

  let processedItems = 0;
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;
  const errors = [];

  // Process in chunks
  const chunks = chunk(rows, config.chunk_size);
  let chunkIndex = 0;

  for (const chunkRows of chunks) {
    // Check cancellation
    if (await checkCancelled(job.id)) {
      console.log(`[ImportProcessor] Job ${job.id} cancelled`);
      return;
    }

    chunkIndex++;
    console.log(`[ImportProcessor] Job ${job.id}: Chunk ${chunkIndex}/${chunks.length}`);

    // Process each row in chunk
    for (const row of chunkRows) {
      try {
        const mappedData = mapFields(row);
        const email = mappedData.emailAddress || mappedData.email;

        // Skip rows without email
        if (!email) {
          skipCount++;
          processedItems++;
          continue;
        }

        // Build name if not present
        if (!mappedData.name && (mappedData.firstName || mappedData.lastName)) {
          mappedData.name = [mappedData.firstName, mappedData.lastName].filter(Boolean).join(' ');
        }

        // Upsert lead in EspoCRM
        const result = await upsertLead(mappedData, tenantId);

        if (result?.id) {
          successCount++;
        } else {
          successCount++; // upsertLead returns lead on both create and update
        }
        processedItems++;

      } catch (rowError) {
        failCount++;
        processedItems++;

        if (errors.length < config.max_errors) {
          errors.push({
            row: processedItems,
            email: row.email || row.Email || 'N/A',
            error: rowError.message
          });
        }

        if (!config.continue_on_error) {
          throw rowError;
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
  const finalStatus = failCount === totalRows ? 'failed' : 'completed';
  await markJobCompleted(job.id, finalStatus);

  console.log(`[ImportProcessor] Job ${job.id} finished: ${successCount} success, ${failCount} fail, ${skipCount} skip`);
}
