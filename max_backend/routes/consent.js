/**
 * consent.js
 *
 * Routes API pour le système de consentement des opérations sensibles
 */

import express from 'express';
import { createConsentRequest, validateConsent, createAuditReport, getAuditReport, listAuditReports } from '../lib/consentManager.js';
import { createJob, processJob, startNextQueuedJob } from '../lib/batchJobEngine.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════
// SAFETY CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const MAX_BULK_ITEMS = 5000; // Hard cap V1 - refuse bulk > 5000 items

/**
 * POST /api/consent/request
 * Create a consent request for a sensitive operation
 *
 * Body: {
 *   type: 'field_creation',
 *   description: 'Créer le champ feedback sur Lead',
 *   details: { entity: 'Lead', fieldName: 'feedback', type: 'text' }
 * }
 */
router.post('/request', (req, res) => {
    try {
        const { type, description, details } = req.body;

        if (!type || !description) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: type, description'
            });
        }

        const consentRequest = createConsentRequest({
            type,
            description,
            details
        });

        res.json({
            success: true,
            consent: consentRequest
        });

    } catch (error) {
        console.error('[Consent API] Error creating consent request:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/consent/execute/:consentId
 * Execute a consented operation directly
 *
 * This endpoint:
 * 1. Validates the consent (consumes it: pending → approved)
 * 2. Executes the operation based on consent.operation.details
 * 3. Creates audit report
 * 4. Returns result
 *
 * NO NEED for frontend retry - this handles everything!
 */
router.post('/execute/:consentId', async (req, res) => {
    try {
        const { consentId } = req.params;

        console.log(`[Consent Execute] Validating consent: ${consentId}`);

        // Validate consent (this consumes it: pending → approved)
        const consent = validateConsent(consentId);

        if (!consent) {
            return res.status(403).json({
                success: false,
                error: 'Invalid, expired, or already used consent'
            });
        }

        console.log(`[Consent Execute] Consent validated. Operation type: ${consent.operation.type}`);

        // Execute operation based on type
        let result;
        let executedVia = 'unknown';
        const sessionId = req.body.sessionId || 'consent-execution';

        // Import executeToolCall dynamically to avoid circular dependency
        const chatModule = await import('./chat.js');
        const executeToolCall = chatModule.executeToolCall;

        if (!executeToolCall) {
            throw new Error('executeToolCall not exported from chat.js');
        }

        // ═══════════════════════════════════════════════════════════════════
        // SPECIAL HANDLING: bulk_update → Create batch_job
        // ═══════════════════════════════════════════════════════════════════
        if (consent.operation.type === 'bulk_update') {
            console.log(`[Consent Execute] Creating batch_job for bulk_update`);

            // ─────────────────────────────────────────────────────────────────
            // GUARD 1: IDEMPOTENCE (DB) - Check if consent already executed
            // ─────────────────────────────────────────────────────────────────
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

            const { data: existingJob } = await supabase
                .from('batch_jobs')
                .select('id, status, created_at')
                .eq('consent_id', consentId)
                .single();

            if (existingJob) {
                console.log(`[Consent Execute] ⚠️ IDEMPOTENT (DB): Consent ${consentId} already executed → jobId: ${existingJob.id}`);
                return res.status(200).json({
                    success: true,
                    alreadyExecuted: true,
                    jobId: existingJob.id,
                    status: existingJob.status,
                    executedAt: existingJob.created_at,
                    message: 'Ce consent a déjà été exécuté'
                });
            }

            // ─────────────────────────────────────────────────────────────────
            // GUARD 2: TENANT FROM AUTH - Extract from JWT, not from details
            // ─────────────────────────────────────────────────────────────────
            const authHeader = req.headers.authorization;
            let authTenantId = null;

            if (authHeader?.startsWith('Bearer ')) {
                try {
                    const token = authHeader.substring(7);
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    authTenantId = decoded.tenantId;
                } catch (jwtErr) {
                    console.warn(`[Consent Execute] JWT decode failed: ${jwtErr.message}`);
                }
            }

            const { lead_ids, updates, tenantId: detailsTenantId, operation_name } = consent.operation.details;

            // Use auth tenantId as source of truth, fallback to details only if no auth
            const tenantId = authTenantId || detailsTenantId;

            if (!tenantId) {
                console.error(`[Consent Execute] ❌ NO TENANT: auth=${authTenantId}, details=${detailsTenantId}`);
                return res.status(403).json({
                    success: false,
                    error: 'TENANT_REQUIRED: Authentification requise pour bulk_update'
                });
            }

            // If both exist, they must match
            if (authTenantId && detailsTenantId && authTenantId !== detailsTenantId) {
                console.error(`[Consent Execute] ❌ TENANT MISMATCH: auth=${authTenantId}, details=${detailsTenantId}`);
                return res.status(403).json({
                    success: false,
                    error: 'TENANT_MISMATCH: TenantId ne correspond pas au contexte auth'
                });
            }

            console.log(`[Consent Execute] Tenant verified: ${tenantId}`);

            if (!lead_ids?.length || !updates) {
                return res.status(400).json({
                    success: false,
                    error: 'bulk_update requires: lead_ids, updates'
                });
            }

            // ─────────────────────────────────────────────────────────────────
            // GUARD 3: HARD SAFETY CAP - Max 5000 items
            // ─────────────────────────────────────────────────────────────────
            if (lead_ids.length > MAX_BULK_ITEMS) {
                console.error(`[Consent Execute] ❌ BULK TOO LARGE: ${lead_ids.length} > ${MAX_BULK_ITEMS}`);
                return res.status(400).json({
                    success: false,
                    error: 'BULK_TOO_LARGE',
                    message: `Bulk update limité à ${MAX_BULK_ITEMS} éléments. Contactez le support pour des volumes plus importants.`,
                    requested: lead_ids.length,
                    max: MAX_BULK_ITEMS
                });
            }

            console.log(`[Consent Execute] Size OK: ${lead_ids.length} <= ${MAX_BULK_ITEMS}`);

            // Create job with validation already approved
            const { job } = await createJob({
                tenantId,
                jobType: 'bulk_update',
                operationName: operation_name || `Bulk update ${lead_ids.length} leads`,
                operationData: { lead_ids, updates },
                requiresValidation: true
            });

            // ─────────────────────────────────────────────────────────────────
            // GUARD 4: SAFE DEFAULT STATUS = 'queued' (engine handles running)
            // ─────────────────────────────────────────────────────────────────
            // Note: supabase client already created above for idempotence check
            await supabase
                .from('batch_jobs')
                .update({
                    validation_status: 'approved',
                    validated_by: req.body.userId || 'consent-user',
                    validated_at: new Date().toISOString(),
                    consent_id: consentId,
                    status: 'queued' // ALWAYS queued - engine decides when to run
                })
                .eq('id', job.id);

            console.log(`[Consent Execute] Job ${job.id} set to 'queued' (safe default)`);

            // Fire and forget - let engine handle queue
            startNextQueuedJob(tenantId).catch(err => {
                console.error(`[Consent Execute] Queue check error:`, err);
            });

            // IDEMPOTENCE: consent_id is now stored in batch_jobs (unique constraint)
            // No in-memory tracking needed - DB is source of truth

            result = {
                success: true,
                jobId: job.id,
                status: 'queued',
                totalItems: lead_ids.length,
                message: 'Job créé et en file d\'attente'
            };

            executedVia = 'batch_job';
            console.log(`[Consent Execute] ✅ Batch job created: ${job.id} (queued, ${lead_ids.length} items)`);

        } else {
            // ═══════════════════════════════════════════════════════════════════
            // STANDARD HANDLING: Map operation type to tool
            // ═══════════════════════════════════════════════════════════════════
            const operationToToolMap = {
                'field_creation': 'create_custom_field',
                'layout_modification': 'configure_entity_layout'
            };

            const toolName = operationToToolMap[consent.operation.type];

            if (!toolName) {
                return res.status(400).json({
                    success: false,
                    error: `Unknown operation type: ${consent.operation.type}. Cannot map to tool.`
                });
            }

            console.log(`[Consent Execute] Executing tool: ${toolName}`);
            console.log(`[Consent Execute] Args:`, consent.operation.details);

            // Execute tool with consent details + consentId
            const args = {
                ...consent.operation.details,
                consentId: consentId // Include consentId so consentGate allows it
            };

            result = await executeToolCall(toolName, args, sessionId);

            executedVia = `tool:${toolName}`;
        }

        console.log(`[Consent Execute] Tool execution result:`, { success: result.success });

        // Create audit report
        const auditReportPath = await createAuditReport(consentId, {
            operation: consent.operation,
            result,
            executedAt: new Date().toISOString(),
            executedVia,
            sessionId
        });

        console.log(`[Consent Execute] ✅ Operation completed. Audit: ${auditReportPath}`);

        res.json({
            success: true,
            result,
            audit: {
                consentId,
                reportPath: auditReportPath
            }
        });

    } catch (error) {
        console.error('[Consent Execute] ❌ Error:', error);

        // Still create audit report for failed operations
        try {
            await createAuditReport(req.params.consentId, {
                error: error.message,
                stack: error.stack,
                executedAt: new Date().toISOString()
            });
        } catch (auditError) {
            console.error('[Consent Execute] Failed to create audit report:', auditError);
        }

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/consent/audit/:consentId
 * Get audit report for a consent
 */
router.get('/audit/:consentId', async (req, res) => {
    try {
        const { consentId } = req.params;

        const report = await getAuditReport(consentId);

        if (!report) {
            return res.status(404).json({
                success: false,
                error: 'Audit report not found'
            });
        }

        res.json({
            success: true,
            report
        });

    } catch (error) {
        console.error('[Consent API] Error fetching audit report:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/consent/audits
 * List all audit reports (paginated)
 */
router.get('/audits', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;

        const reports = await listAuditReports({ limit });

        res.json({
            success: true,
            reports,
            count: reports.length
        });

    } catch (error) {
        console.error('[Consent API] Error listing audit reports:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
