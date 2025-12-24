/**
 * Action: Créer une opportunité dans EspoCRM
 *
 * Params:
 * - tenantId: string
 * - name: string (obligatoire)
 * - amount: number (obligatoire)
 * - stage: string (défaut: 'Prospecting')
 * - closeDate: string ISO (obligatoire)
 * - accountId: string (optionnel)
 * - contactId: string (optionnel)
 * - probability: number (optionnel)
 * - description: string (optionnel)
 */

import { espoFetch } from '../lib/espoClient.js';

export async function createOpportunity(params) {
  const {
    tenantId,
    name,
    amount,
    stage = 'Prospecting',
    closeDate,
    accountId,
    contactId,
    probability,
    description
  } = params;

  if (!name || !amount || !closeDate) {
    throw new Error('name, amount et closeDate sont obligatoires');
  }

  try {
    const payload = {
      name,
      amount,
      stage,
      closeDate,
      description: description || `Opportunité créée par M.A.X. le ${new Date().toLocaleString('fr-FR')}`
    };

    if (accountId) {
      payload.accountId = accountId;
    }

    if (contactId) {
      payload.contactId = contactId;
    }

    if (probability !== undefined) {
      payload.probability = probability;
    }

    const opportunity = await espoFetch('/Opportunity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return {
      success: true,
      provider: 'espocrm',
      entityId: opportunity.id,
      preview: `Opportunité "${name}" créée (${amount} €, stage: ${stage})`,
      metadata: {
        opportunityId: opportunity.id,
        name,
        amount,
        stage,
        closeDate
      }
    };

  } catch (error) {
    return {
      success: false,
      provider: 'espocrm',
      error: error.message,
      preview: `Échec création opportunité: ${error.message}`
    };
  }
}
