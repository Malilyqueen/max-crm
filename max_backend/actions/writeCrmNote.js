/**
 * Action: Créer une note dans EspoCRM
 *
 * Params:
 * - tenantId: string
 * - parentType: 'Lead' | 'Account' | 'Contact' | 'Opportunity'
 * - parentId: string
 * - subject: string
 * - body: string
 */

import { espoFetch } from '../lib/espoClient.js';

export async function writeCrmNote(params) {
  const { tenantId, parentType, parentId, subject, body } = params;

  if (!parentType || !parentId) {
    throw new Error('parentType et parentId sont obligatoires');
  }

  try {
    const note = await espoFetch('/Note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: subject || 'Note automatique',
        post: body + `\n\n🤖 Créé par M.A.X. le ${new Date().toLocaleString('fr-FR')}`,
        parentType,
        parentId
      })
    });

    return {
      success: true,
      provider: 'espocrm',
      entityId: note.id,
      preview: `Note "${subject}" créée sur ${parentType} ${parentId}`,
      metadata: { noteId: note.id, parentType, parentId }
    };

  } catch (error) {
    return {
      success: false,
      provider: 'espocrm',
      error: error.message,
      preview: `Échec création note: ${error.message}`
    };
  }
}