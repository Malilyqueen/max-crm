/**
 * Action Layer - Point d'entrée unifié
 *
 * Toutes les actions CRM passent par ce layer pour :
 * - Logging uniforme
 * - Traçabilité
 * - Retry automatique
 * - Retour standardisé
 *
 * Format de retour standard :
 * {
 *   success: boolean,
 *   provider: string (espocrm, gmail, smtp, calendar...),
 *   entityId: string (ID de l'entité créée/modifiée),
 *   preview: string (description humaine de ce qui a été fait),
 *   error: string (si success=false),
 *   metadata: object (données additionnelles)
 * }
 */

import { sendEmail } from './sendEmail.js';
import { createEmailDraft } from './createEmailDraft.js';
import { createCalendarEvent } from './createCalendarEvent.js';
import { writeCrmNote } from './writeCrmNote.js';
import { updateCrmField } from './updateCrmField.js';
import { createOpportunity } from './createOpportunity.js';
import { createContact } from './createContact.js';
import { createTicket } from './createTicket.js';
import { createKnowledgeArticle } from './createKnowledgeArticle.js';
import { requestConsent } from './requestConsent.js';
import { modifyLayout } from './modifyLayout.js';
import { logAction } from './actionLogger.js';

/**
 * Exécute une action et log le résultat
 */
export async function executeAction(actionType, params) {
  const startTime = Date.now();

  console.log(`\n🎯 ACTION: ${actionType}`);
  console.log(`   Params:`, JSON.stringify(params, null, 2));

  let result;

  try {
    switch (actionType) {
      case 'send_email':
        result = await sendEmail(params);
        break;

      case 'create_email_draft':
        result = await createEmailDraft(params);
        break;

      case 'create_calendar_event':
        result = await createCalendarEvent(params);
        break;

      case 'write_crm_note':
        result = await writeCrmNote(params);
        break;

      case 'update_crm_field':
        result = await updateCrmField(params);
        break;

      case 'create_opportunity':
        result = await createOpportunity(params);
        break;

      case 'create_contact':
        result = await createContact(params);
        break;

      case 'create_ticket':
        result = await createTicket(params);
        break;

      case 'create_knowledge_article':
        result = await createKnowledgeArticle(params);
        break;

      case 'request_consent':
        result = await requestConsent(params);
        break;

      case 'modify_layout':
        result = await modifyLayout(params);
        break;

      default:
        throw new Error(`Action inconnue: ${actionType}`);
    }

    // Log de succès
    await logAction({
      tenantId: params.tenantId || 'macrea',
      actionType,
      payload: params,
      result,
      success: true,
      duration: Date.now() - startTime
    });

    console.log(`   ✅ ${result.preview}`);
    return result;

  } catch (error) {
    // Log d'erreur
    const errorResult = {
      success: false,
      provider: 'unknown',
      error: error.message
    };

    await logAction({
      tenantId: params.tenantId || 'macrea',
      actionType,
      payload: params,
      result: errorResult,
      success: false,
      duration: Date.now() - startTime
    });

    console.error(`   ❌ ${error.message}`);
    return errorResult;
  }
}

// Exporter les actions individuelles aussi
export {
  sendEmail,
  createEmailDraft,
  createCalendarEvent,
  writeCrmNote,
  updateCrmField,
  requestConsent,
  modifyLayout
};