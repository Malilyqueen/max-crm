/**
 * Action: Créer un brouillon d'email
 *
 * Créé dans EspoCRM avec status='Draft' ou dans une table MAX selon config
 *
 * Params:
 * - tenantId: string
 * - to: string | array
 * - subject: string
 * - body: string
 * - parentType: 'Lead' | 'Account' | 'Contact' (optionnel)
 * - parentId: string (optionnel)
 */

import { espoFetch } from '../lib/espoClient.js';

export async function createEmailDraft(params) {
  const { tenantId, to, subject, body, parentType, parentId } = params;

  if (!to || !subject) {
    throw new Error('to et subject sont obligatoires');
  }

  try {
    const payload = {
      name: subject,
      to,
      body: body || '',
      status: 'Draft',
      dateSent: null
    };

    if (parentType && parentId) {
      payload.parentType = parentType;
      payload.parentId = parentId;
    }

    const draft = await espoFetch('/Email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return {
      success: true,
      provider: 'espocrm',
      entityId: draft.id,
      preview: `Brouillon email "${subject}" créé pour ${Array.isArray(to) ? to.join(', ') : to}`,
      metadata: {
        draftId: draft.id,
        to,
        subject,
        parentType,
        parentId
      }
    };

  } catch (error) {
    return {
      success: false,
      provider: 'espocrm',
      error: error.message,
      preview: `Échec création brouillon: ${error.message}`
    };
  }
}