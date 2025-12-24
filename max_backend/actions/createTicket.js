/**
 * Action: Créer un ticket de support dans EspoCRM
 *
 * Note: EspoCRM utilise l'entité "Case" pour les tickets
 *
 * Params:
 * - tenantId: string
 * - name: string (obligatoire - sujet du ticket)
 * - description: string (obligatoire)
 * - status: string (défaut: 'New')
 * - priority: string (défaut: 'Normal') - Low|Normal|High|Urgent
 * - type: string (optionnel) - Question|Incident|Problem
 * - accountId: string (optionnel)
 * - contactId: string (optionnel)
 * - leadId: string (optionnel)
 */

import { espoFetch } from '../lib/espoClient.js';

export async function createTicket(params) {
  const {
    tenantId,
    name,
    description,
    status = 'New',
    priority = 'Normal',
    type,
    accountId,
    contactId,
    leadId
  } = params;

  if (!name || !description) {
    throw new Error('name et description sont obligatoires');
  }

  try {
    const payload = {
      name,
      description,
      status,
      priority
    };

    if (type) {
      payload.type = type;
    }

    if (accountId) {
      payload.accountId = accountId;
    }

    if (contactId) {
      payload.contactId = contactId;
    }

    if (leadId) {
      payload.leadId = leadId;
    }

    const ticket = await espoFetch('/Case', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return {
      success: true,
      provider: 'espocrm',
      entityId: ticket.id,
      preview: `Ticket "${name}" créé (${priority}, ${status})`,
      metadata: {
        ticketId: ticket.id,
        name,
        status,
        priority
      }
    };

  } catch (error) {
    return {
      success: false,
      provider: 'espocrm',
      error: error.message,
      preview: `Échec création ticket: ${error.message}`
    };
  }
}
