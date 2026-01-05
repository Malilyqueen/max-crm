/**
 * consentGate.js
 * Server-side validation stricte du consentement avec réponses intelligentes
 *
 * PHILOSOPHIE:
 * - PRIMARY PATH: M.A.X. anticipe et appelle request_consent AVANT l'opération
 * - SAFETY NET: Backend refuse sans consentId (filet de sécurité)
 * - SELF-HEALING: Réponse 412 contient requiresConsent + operation + details
 *   → M.A.X. peut se corriger automatiquement en appelant request_consent
 *
 * PAS DE REFUS BÊTE TYPE HUBSPOT.
 */

import { checkConsentForExecution, findRecentConsentByType } from './consentManager.js';

/**
 * Valide le consentement pour une opération structurelle
 *
 * @param {Object} params - Paramètres de l'opération (dont consentId optionnel)
 * @param {string} operationType - Type d'opération (layout_modification, field_creation, etc.)
 * @param {string} description - Description humaine de l'opération
 * @returns {Promise<Object>} Résultat de validation
 */
export async function validateConsent(params, operationType, description) {
  const { consentId } = params;

  console.log('[ConsentGate] 🔐 Validation consent pour:', operationType);
  console.log('[ConsentGate] ConsentId fourni:', consentId || 'NONE');

  // GATE 1: Pas de consentId = CHERCHER UN CONSENT RÉCENT OU REFUSER INTELLIGEMMENT
  if (!consentId) {
    console.log('[ConsentGate] ⚠️ Aucun consentId fourni - Recherche d\'un consent récent...');

    // Tenter de trouver un consent récent pour ce type d'opération (grâce période 10min)
    const recentConsent = findRecentConsentByType(operationType);

    if (recentConsent) {
      console.log(`[ConsentGate] 🔄 Consent récent trouvé et réutilisé: ${recentConsent.consentId}`);
      return {
        allowed: true,
        consent: recentConsent,
        activityLog: {
          type: 'consent_gate_passed',
          operation: operationType,
          consentId: recentConsent.consentId,
          reused: true,
          timeSinceApproval: Date.now() - recentConsent.usedAt,
          timestamp: new Date().toISOString()
        }
      };
    }

    // Aucun consent récent trouvé - bloquer et demander
    console.error('[ConsentGate] ❌ BLOQUÉ: Aucun consentId fourni et aucun consent récent');

    // Extraire les détails de l'opération (sans consentId)
    const { consentId: _, ...operationDetails } = params;

    return {
      allowed: false,
      requiresConsent: true,
      error: 'CONSENT_REQUIRED',
      httpCode: 412, // Precondition Failed

      // Informations pour self-correction M.A.X.
      operation: {
        type: operationType,
        description: description,
        details: operationDetails
      },

      message: `Cette opération nécessite un consentement utilisateur. Appelle request_consent() avec ces détails pour obtenir l'autorisation.`,

      // Log pour ActivityPanel
      activityLog: {
        type: 'consent_gate_blocked',
        operation: operationType,
        reason: 'missing_consent_id',
        timestamp: new Date().toISOString(),
        recoverable: true,
        nextAction: 'request_consent'
      }
    };
  }

  // GATE 2-4: Valider le consent avec consentManager (vérifie existence, statut, expiration)
  // Utiliser checkConsentForExecution qui accepte les consents récemment approuvés
  try {
    const consent = checkConsentForExecution(consentId);

    if (!consent) {
      console.error('[ConsentGate] ❌ BLOQUÉ: ConsentId invalide');
      return {
        allowed: false,
        error: 'CONSENT_INVALID',
        httpCode: 404,
        message: `Consentement ${consentId} invalide. Il a peut-être expiré ou été déjà utilisé.`,
        activityLog: {
          type: 'consent_gate_blocked',
          operation: operationType,
          reason: 'consent_invalid',
          consentId,
          timestamp: new Date().toISOString()
        }
      };
    }

    // ✅ TOUTES LES VÉRIFICATIONS PASSÉES
    console.log('[ConsentGate] ✅ Consent valide - Opération autorisée');
    return {
      allowed: true,
      consent,
      activityLog: {
        type: 'consent_gate_passed',
        operation: operationType,
        consentId,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('[ConsentGate] ❌ Erreur validation:', error);
    return {
      allowed: false,
      error: 'CONSENT_VALIDATION_ERROR',
      httpCode: 500,
      message: `Erreur lors de la validation du consentement: ${error.message}`,
      activityLog: {
        type: 'consent_gate_error',
        operation: operationType,
        consentId,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Middleware Express pour protéger les routes sensibles
 * Usage: router.post('/sensitive-operation', consentMiddleware('operation_type'), handler)
 */
export function consentMiddleware(operationType, description) {
  return async (req, res, next) => {
    const validation = await validateConsent(req.body, operationType, description);

    if (!validation.allowed) {
      // Log l'activité
      if (validation.activityLog) {
        console.log('[ConsentGate] Activity Log:', JSON.stringify(validation.activityLog, null, 2));
      }

      // Retourner réponse structurée (pas juste un message d'erreur)
      return res.status(validation.httpCode || 412).json({
        success: false,
        error: validation.error,
        message: validation.message,
        requiresConsent: validation.requiresConsent || false,
        operation: validation.operation || null,
        activityLog: validation.activityLog
      });
    }

    // Consent validé - passer au handler
    req.consent = validation.consent;
    req.activityLog = validation.activityLog;
    next();
  };
}
