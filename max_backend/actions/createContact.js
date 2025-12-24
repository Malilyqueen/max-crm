/**
 * Action: Créer un contact dans EspoCRM
 *
 * Params:
 * - tenantId: string
 * - firstName: string (obligatoire)
 * - lastName: string (obligatoire)
 * - emailAddress: string (optionnel)
 * - phoneNumber: string (optionnel)
 * - accountId: string (optionnel)
 * - title: string (optionnel)
 * - description: string (optionnel)
 */

import { espoFetch } from '../lib/espoClient.js';

export async function createContact(params) {
  const {
    tenantId,
    firstName,
    lastName,
    emailAddress,
    phoneNumber,
    accountId,
    title,
    description
  } = params;

  if (!firstName || !lastName) {
    throw new Error('firstName et lastName sont obligatoires');
  }

  try {
    const payload = {
      firstName,
      lastName,
      description: description || `Contact créé par M.A.X. le ${new Date().toLocaleString('fr-FR')}`
    };

    if (emailAddress) {
      payload.emailAddress = emailAddress;
    }

    if (phoneNumber) {
      payload.phoneNumber = phoneNumber;
    }

    if (accountId) {
      payload.accountId = accountId;
    }

    if (title) {
      payload.title = title;
    }

    const contact = await espoFetch('/Contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return {
      success: true,
      provider: 'espocrm',
      entityId: contact.id,
      preview: `Contact "${firstName} ${lastName}" créé`,
      metadata: {
        contactId: contact.id,
        name: contact.name,
        emailAddress,
        phoneNumber
      }
    };

  } catch (error) {
    return {
      success: false,
      provider: 'espocrm',
      error: error.message,
      preview: `Échec création contact: ${error.message}`
    };
  }
}
