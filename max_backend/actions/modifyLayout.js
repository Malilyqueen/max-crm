/**
 * actions/modifyLayout.js
 * Action pour modifier les layouts EspoCRM après approbation du consentement
 */

import pkg from '../lib/FilesystemLayoutManager.cjs';
const { FilesystemLayoutManager } = pkg;

/**
 * Modifie un layout EspoCRM après validation du consentement
 *
 * @param {Object} params
 * @param {string} params.consentId - ID du consentement approuvé
 * @param {string} params.entity - Entity EspoCRM (Lead, Contact, etc.)
 * @param {string} params.fieldName - Nom du champ à ajouter
 * @param {Array<string>} params.layoutTypes - Types de layouts (detail, list, etc.)
 * @param {string} params.tenantId - ID du tenant
 * @returns {Promise<Object>} Résultat de l'opération
 */
export async function modifyLayout(params) {
  const { consentId, entity, fieldName, layoutTypes = ['detail', 'edit', 'list'], tenantId = 'macrea' } = params;

  console.log(`\n🔧 MODIFY_LAYOUT: ${entity}.${fieldName}`);
  console.log(`   ConsentId: ${consentId}`);
  console.log(`   Layouts: ${layoutTypes.join(', ')}`);

  if (!consentId) {
    throw new Error('ConsentId requis pour modifier un layout (opération sensible)');
  }

  if (!entity || !fieldName) {
    throw new Error('Entity et fieldName sont requis');
  }

  try {
    // Note: La vérification du consentement est déjà faite par /api/consent/execute
    // Cette action est appelée APRÈS l'approbation, donc on procède directement

    const layoutManager = new FilesystemLayoutManager({
      sshHost: process.env.ESPO_SSH_HOST,
      sshUser: process.env.ESPO_SSH_USER || 'root',
      containerName: 'espocrm'
    });

    // Appel de la méthode correcte: addFieldToLayouts (avec 's')
    const result = await layoutManager.addFieldToLayouts(entity, fieldName, layoutTypes);

    console.log(`[MODIFY_LAYOUT] Result:`, JSON.stringify(result, null, 2));

    return {
      success: result.success && result.layoutsModified > 0,
      provider: 'espocrm-layouts',
      entityId: consentId,
      preview: `${result.layoutsModified} layout(s) modifié(s), ${result.layoutsSkipped} déjà présent(s), ${result.layoutsErrors} erreur(s)`,
      metadata: {
        entity,
        fieldName,
        layoutTypes,
        layoutsModified: result.layoutsModified,
        layoutsSkipped: result.layoutsSkipped,
        layoutsErrors: result.layoutsErrors,
        results: result.results,
        timestamp: result.timestamp
      }
    };

  } catch (error) {
    console.error(`[MODIFY_LAYOUT] ❌ Erreur:`, error);
    return {
      success: false,
      provider: 'espocrm-layouts',
      error: error.message,
      metadata: {
        entity,
        fieldName,
        layoutTypes
      }
    };
  }
}