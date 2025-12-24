/**
 * Action: Mettre à jour un champ dans EspoCRM
 *
 * Params:
 * - tenantId: string
 * - entityType: 'Lead' | 'Account' | 'Contact' | 'Meeting' | 'Call'
 * - entityId: string
 * - field: string
 * - value: any
 */

import { espoFetch } from '../lib/espoClient.js';

export async function updateCrmField(params) {
  const { tenantId, entityType, entityId, field, value } = params;

  if (!entityType || !entityId || !field) {
    throw new Error('entityType, entityId et field sont obligatoires');
  }

  try {
    const updated = await espoFetch(`/${entityType}/${entityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        [field]: value
      })
    });

    return {
      success: true,
      provider: 'espocrm',
      entityId,
      preview: `${entityType} ${entityId}: ${field} = ${JSON.stringify(value)}`,
      metadata: { entityType, entityId, field, value }
    };

  } catch (error) {
    return {
      success: false,
      provider: 'espocrm',
      error: error.message,
      preview: `Échec update ${entityType}: ${error.message}`
    };
  }
}