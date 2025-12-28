/**
 * actions/requestConsent.js
 * Action pour demander le consentement utilisateur avant opération sensible
 */

import { createConsentRequest } from '../lib/consentManager.js';

/**
 * Demande le consentement pour une opération sensible
 *
 * @param {Object} params
 * @param {string} params.type - Type d'opération (layout_modification, field_creation, etc.)
 * @param {string} params.description - Description de l'opération
 * @param {Object} params.details - Détails de l'opération
 * @param {string} params.tenantId - ID du tenant
 * @returns {Promise<Object>} Résultat de la demande
 */
export async function requestConsent(params) {
  const { type, description, details, tenantId = 'macrea' } = params;

  console.log(`\n🔐 CONSENT REQUEST: ${type}`);
  console.log(`   Description: ${description}`);
  console.log(`   Details:`, JSON.stringify(details, null, 2));

  try {
    // Créer la demande de consentement
    const consentRequest = await createConsentRequest({
      type,
      description,
      details,
      tenantId
    });

    console.log(`   ✅ Demande créée: ${consentRequest.consentId}`);

    return {
      success: true,
      provider: 'consent-system',
      consentId: consentRequest.consentId,
      expiresIn: 300, // 5 minutes
      preview: `Demande de consentement créée: ${description}`,
      metadata: {
        type,
        description,
        details,
        expiresAt: new Date(Date.now() + 300000).toISOString()
      }
    };

  } catch (error) {
    console.error(`   ❌ Erreur création consentement:`, error);

    return {
      success: false,
      provider: 'consent-system',
      error: error.message,
      preview: `Échec demande consentement: ${error.message}`
    };
  }
}
