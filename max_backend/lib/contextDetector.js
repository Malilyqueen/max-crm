/**
 * contextDetector.js
 * Détecte automatiquement l'état de la conversation depuis le message de M.A.X.
 */

// États possibles de la conversation
export const ConversationState = {
  IDLE: 'idle',
  FILE_UPLOADED: 'file_uploaded',
  ANALYSIS_READY: 'analysis_ready',
  IMPORT_DONE: 'import_done',
  ENRICHMENT_PROPOSED: 'enrichment_proposed',
  WORKFLOW_PROPOSED: 'workflow_proposed',
  ERROR: 'error'
};

/**
 * Détecte l'état de la conversation depuis le message de M.A.X.
 * @param {string} maxMessage - Le message de M.A.X.
 * @param {object} metadata - Métadonnées optionnelles de la session
 * @returns {string} L'état détecté
 */
export function detectState(maxMessage, metadata = {}) {
  const messageLower = maxMessage.toLowerCase();

  // Import terminé
  if (
    messageLower.includes('leads importés') ||
    messageLower.includes('import terminé') ||
    messageLower.includes('✅ import') ||
    messageLower.includes('créés dans espocrm') ||
    messageLower.includes('ajoutés dans espocrm')
  ) {
    return ConversationState.IMPORT_DONE;
  }

  // Enrichissement proposé
  if (
    (messageLower.includes('enrichir') ||
     messageLower.includes('enrichissement') ||
     messageLower.includes('données manquantes') ||
     messageLower.includes('compléter les champs')) &&
    maxMessage.includes('?')
  ) {
    return ConversationState.ENRICHMENT_PROPOSED;
  }

  // Workflow proposé
  if (
    (messageLower.includes('workflow') ||
     messageLower.includes('automatisation') ||
     messageLower.includes('relance automatique') ||
     messageLower.includes('voulez-vous activer')) &&
    maxMessage.includes('?')
  ) {
    return ConversationState.WORKFLOW_PROPOSED;
  }

  // Analyse prête pour import
  if (
    (messageLower.includes('j\'ai scanné') ||
     messageLower.includes('j\'ai analysé') ||
     messageLower.includes('confirmer') ||
     messageLower.includes('je lance')) &&
    maxMessage.includes('?')
  ) {
    return ConversationState.ANALYSIS_READY;
  }

  // Erreur
  if (
    messageLower.includes('erreur') ||
    messageLower.includes('impossible') ||
    messageLower.includes('échec') ||
    maxMessage.includes('⚠️') ||
    (maxMessage.includes('❌') && !messageLower.includes('importé'))
  ) {
    return ConversationState.ERROR;
  }

  // Par défaut
  return ConversationState.IDLE;
}

/**
 * Extrait les données contextuelles du message
 * @param {string} maxMessage - Le message de M.A.X.
 * @returns {object} Les données contextuelles extraites
 */
export function extractContextData(maxMessage) {
  const context = {};

  // Extraire nombre de leads
  const leadMatch = maxMessage.match(/(\d+)\s+leads?/i);
  if (leadMatch) {
    context.lead_count = parseInt(leadMatch[1]);
  }

  // Extraire coût enrichissement
  const costMatch = maxMessage.match(/(\d+(?:[.,]\d+)?)\s*€/);
  if (costMatch) {
    const costStr = costMatch[1].replace(',', '.');
    context.enrichment_cost = parseFloat(costStr);
  }

  // Extraire nom de workflow
  const workflowMatch = maxMessage.match(/workflow[:\s]+"([^"]+)"/i);
  if (workflowMatch) {
    context.workflow_name = workflowMatch[1];
  }

  // Extraire nombre enrichissable
  const enrichableMatch = maxMessage.match(/(\d+)\s+(?:leads?\s+)?(?:trouvables?|enrichissables?)/i);
  if (enrichableMatch) {
    context.enrichable_count = parseInt(enrichableMatch[1]);
  }

  return context;
}
