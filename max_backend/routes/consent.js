/**
 * consent.js
 *
 * Routes API pour le système de consentement des opérations sensibles
 */

import express from 'express';
import { createConsentRequest, validateConsent, createAuditReport, getAuditReport, listAuditReports } from '../lib/consentManager.js';

const router = express.Router();

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

        // Import executeToolCall dynamically to avoid circular dependency
        const chatModule = await import('./chat.js');
        const executeToolCall = chatModule.executeToolCall;

        if (!executeToolCall) {
            throw new Error('executeToolCall not exported from chat.js');
        }

        // Map operation type to tool name
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

        // Get sessionId from request or use default
        const sessionId = req.body.sessionId || 'consent-execution';

        result = await executeToolCall(toolName, args, sessionId);

        executedVia = `tool:${toolName}`;

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
