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
  const { consentId, entity, fieldName, layoutTypes = ['detail', 'list'], tenantId = 'macrea' } = params;

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

    const layoutManager = new FilesystemLayoutManager(tenantId);
    const results = [];

    // Modifier chaque type de layout demandé
    for (const layoutType of layoutTypes) {
      console.log(`   Modifying ${layoutType} layout...`);

      const result = await layoutManager.addFieldToLayout(entity, fieldName, layoutType);
      results.push({
        layoutType,
        success: result.success || false,
        path: result.path,
        message: result.message
      });
    }

    const successCount = results.filter(r => r.success).length;

    return {
      success: successCount > 0,
      provider: 'espocrm-layouts',
      entityId: consentId,
      preview: `${successCount}/${layoutTypes.length} layout(s) modifié(s) pour ${entity}.${fieldName}`,
      metadata: {
        entity,
        fieldName,
        layoutTypes,
        layoutsModified: successCount,
        results,
        timestamp: new Date().toISOString()
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