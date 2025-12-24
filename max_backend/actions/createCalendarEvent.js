/**
 * Action: Créer un événement calendrier dans EspoCRM
 *
 * Params:
 * - tenantId: string
 * - type: 'meeting' | 'call'
 * - subject: string
 * - dateStart: ISO string
 * - dateEnd: ISO string (optionnel)
 * - duration: number en minutes (optionnel, défaut 60)
 * - parentType: 'Lead' | 'Account' | 'Contact' (optionnel)
 * - parentId: string (optionnel)
 * - assignedUserId: string (optionnel)
 */

import { espoFetch } from '../lib/espoClient.js';

export async function createCalendarEvent(params) {
  const {
    tenantId,
    type = 'meeting',
    subject,
    dateStart,
    dateEnd,
    duration = 60,
    parentType,
    parentId,
    assignedUserId,
    description
  } = params;

  if (!subject || !dateStart) {
    throw new Error('subject et dateStart sont obligatoires');
  }

  const entityType = type === 'call' ? 'Call' : 'Meeting';

  // Calculer dateEnd si pas fourni
  let computedDateEnd = dateEnd;
  if (!computedDateEnd && dateStart) {
    const start = new Date(dateStart);
    const end = new Date(start.getTime() + duration * 60 * 1000);
    computedDateEnd = end.toISOString();
  }

  try {
    const payload = {
      name: subject,
      dateStart,
      dateEnd: computedDateEnd,
      status: 'Planned',
      description: description || `Créé par M.A.X. le ${new Date().toLocaleString('fr-FR')}`
    };

    // Lier à un parent (Lead, Contact, Account...)
    if (parentType && parentId) {
      payload.parentType = parentType;
      payload.parentId = parentId;
    }

    // Assigner à un utilisateur
    if (assignedUserId) {
      payload.assignedUserId = assignedUserId;
    }

    const event = await espoFetch(`/${entityType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return {
      success: true,
      provider: 'espocrm',
      entityId: event.id,
      preview: `${entityType} "${subject}" créé le ${new Date(dateStart).toLocaleString('fr-FR')}`,
      metadata: {
        eventId: event.id,
        entityType,
        dateStart,
        dateEnd: computedDateEnd,
        parentType,
        parentId
      }
    };

  } catch (error) {
    return {
      success: false,
      provider: 'espocrm',
      error: error.message,
      preview: `Échec création ${entityType}: ${error.message}`
    };
  }
}