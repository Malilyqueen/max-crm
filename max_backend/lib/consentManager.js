/**
 * consentManager.js
 *
 * Gestion des consentements one-shot pour opérations sensibles
 * Consentement expirant + Audit JSON complet
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Durée de validité du consentement: 5 minutes
const CONSENT_EXPIRY_MS = 5 * 60 * 1000;

// Storage des consentements actifs (en mémoire volatile)
const activeConsents = new Map();

// Répertoire des rapports d'audit
const AUDIT_DIR = path.join(__dirname, '../audit_reports');

/**
 * Generate a unique consent ID
 * @returns {string} Consent ID (format: consent_timestamp_randomhex)
 */
function generateConsentId() {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `consent_${timestamp}_${random}`;
}

/**
 * Create a consent request for a sensitive operation
 *
 * @param {Object} operation - Operation details
 * @param {string} operation.type - Operation type (e.g., 'layout_modification')
 * @param {string} operation.description - Human-readable description
 * @param {Object} operation.details - Technical details
 * @returns {Object} Consent request with consentId
 */
function createConsentRequest(operation) {
    const consentId = generateConsentId();
    const expiresAt = Date.now() + CONSENT_EXPIRY_MS;

    const consent = {
        consentId,
        operation,
        status: 'pending',
        createdAt: Date.now(),
        expiresAt,
        usedAt: null
    };

    activeConsents.set(consentId, consent);

    // Auto-cleanup après expiration
    setTimeout(() => {
        const existing = activeConsents.get(consentId);
        if (existing && existing.status === 'pending') {
            activeConsents.delete(consentId);
            console.log(`[ConsentManager] Consent ${consentId} expired and cleaned up`);
        }
    }, CONSENT_EXPIRY_MS);

    console.log(`[ConsentManager] Consent created: ${consentId} (expires in 5min)`);

    return {
        consentId,
        operation: operation.description,
        expiresIn: CONSENT_EXPIRY_MS / 1000 // seconds
    };
}

/**
 * Validate and consume a consent ID
 *
 * @param {string} consentId - Consent ID to validate
 * @returns {Object|null} Consent data if valid, null otherwise
 */
function validateConsent(consentId) {
    const consent = activeConsents.get(consentId);

    if (!consent) {
        console.warn(`[ConsentManager] Consent ${consentId} not found`);
        return null;
    }

    if (consent.status !== 'pending') {
        console.warn(`[ConsentManager] Consent ${consentId} already used (status: ${consent.status})`);
        return null;
    }

    if (Date.now() > consent.expiresAt) {
        console.warn(`[ConsentManager] Consent ${consentId} expired`);
        activeConsents.delete(consentId);
        return null;
    }

    // Consommer le consentement (one-shot)
    consent.status = 'approved';
    consent.usedAt = Date.now();

    console.log(`[ConsentManager] ✅ Consent ${consentId} validated and consumed`);

    return consent;
}

/**
 * Check if a consent is valid for tool execution (allows recently-approved consents)
 * Used by consentGate during tool execution after consent approval
 *
 * @param {string} consentId - Consent ID to check
 * @returns {Object|null} Consent data if valid for execution, null otherwise
 */
function checkConsentForExecution(consentId) {
    const consent = activeConsents.get(consentId);

    if (!consent) {
        console.warn(`[ConsentManager] Consent ${consentId} not found`);
        return null;
    }

    // Accepter si status='approved' ET utilisé dans les 10 dernières minutes
    const EXECUTION_GRACE_PERIOD_MS = 10 * 60 * 1000; // 10 minutes
    if (consent.status === 'approved' && consent.usedAt) {
        const timeSinceUse = Date.now() - consent.usedAt;
        if (timeSinceUse <= EXECUTION_GRACE_PERIOD_MS) {
            console.log(`[ConsentManager] ✅ Consent ${consentId} valid for execution (approved ${timeSinceUse}ms ago)`);
            return consent;
        } else {
            console.warn(`[ConsentManager] Consent ${consentId} was approved too long ago (${timeSinceUse}ms)`);
            return null;
        }
    }

    // Accepter si status='pending' (cas normal)
    if (consent.status === 'pending') {
        if (Date.now() > consent.expiresAt) {
            console.warn(`[ConsentManager] Consent ${consentId} expired`);
            activeConsents.delete(consentId);
            return null;
        }
        return consent;
    }

    console.warn(`[ConsentManager] Consent ${consentId} invalid for execution (status: ${consent.status})`);
    return null;
}

/**
 * Create an audit report for an operation
 *
 * @param {string} consentId - Associated consent ID
 * @param {Object} operationResult - Result of the operation
 * @returns {Promise<string>} Path to the audit report
 */
async function createAuditReport(consentId, operationResult) {
    // Ensure audit directory exists
    await fs.mkdir(AUDIT_DIR, { recursive: true });

    const consent = activeConsents.get(consentId);

    const report = {
        consentId,
        timestamp: new Date().toISOString(),
        consent: consent ? {
            operation: consent.operation,
            createdAt: new Date(consent.createdAt).toISOString(),
            usedAt: new Date(consent.usedAt).toISOString(),
            duration: consent.usedAt - consent.createdAt
        } : null,
        result: operationResult,
        metadata: {
            nodeVersion: process.version,
            platform: process.platform,
            pid: process.pid
        }
    };

    const reportPath = path.join(AUDIT_DIR, `${consentId}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');

    console.log(`[ConsentManager] 📄 Audit report created: ${reportPath}`);

    // Cleanup consent from memory after audit created
    if (consent) {
        activeConsents.delete(consentId);
    }

    return reportPath;
}

/**
 * Get audit report by consent ID
 *
 * @param {string} consentId - Consent ID
 * @returns {Promise<Object|null>} Audit report or null
 */
async function getAuditReport(consentId) {
    const reportPath = path.join(AUDIT_DIR, `${consentId}.json`);

    try {
        const data = await fs.readFile(reportPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return null;
        }
        throw error;
    }
}

/**
 * List all audit reports
 *
 * @param {Object} options - Query options
 * @param {number} options.limit - Max number of reports
 * @returns {Promise<Array>} List of audit reports
 */
async function listAuditReports({ limit = 50 } = {}) {
    try {
        await fs.mkdir(AUDIT_DIR, { recursive: true });
        const files = await fs.readdir(AUDIT_DIR);

        const jsonFiles = files
            .filter(f => f.endsWith('.json'))
            .sort()
            .reverse()
            .slice(0, limit);

        const reports = [];
        for (const file of jsonFiles) {
            const reportPath = path.join(AUDIT_DIR, file);
            const data = await fs.readFile(reportPath, 'utf8');
            reports.push(JSON.parse(data));
        }

        return reports;
    } catch (error) {
        console.error('[ConsentManager] Error listing audit reports:', error);
        return [];
    }
}

export {
    createConsentRequest,
    validateConsent,
    checkConsentForExecution,
    createAuditReport,
    getAuditReport,
    listAuditReports
};
