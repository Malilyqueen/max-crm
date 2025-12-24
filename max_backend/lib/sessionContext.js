/**
 * sessionContext.js
 * Gestion intelligente du contexte de session
 * Détermine si on est en mode IMPORT ou UPDATE
 */

/**
 * Détermine le mode d'opération selon le contexte
 * @param {object} session - Session active
 * @param {string} userMessage - Message utilisateur
 * @returns {string} 'import' | 'update' | 'query'
 */
export function detectOperationMode(session, userMessage) {
  const msgLower = userMessage.toLowerCase();

  // Mode UPDATE : utilisateur travaille sur des leads existants
  const updateKeywords = [
    'enrichis',
    'enrichir',
    'ajoute les tags',
    'ajouter des tags',
    'modifie',
    'modifier',
    'mettre à jour',
    'complète',
    'compléter',
    'remplis',
    'remplir',
    'change',
    'changer',
    'sur les leads',
    'ces leads',
    'les 5 derniers',
    'les derniers leads'
  ];

  const hasUpdateIntent = updateKeywords.some(kw => msgLower.includes(kw));

  // Si contexte de leads existants (IDs en session)
  const hasLeadContext = session.lastQueriedLeadIds && session.lastQueriedLeadIds.length > 0;

  // Si import récent (< 5 min)
  const hasRecentImport = session.imported && session.importedAt &&
    (Date.now() - new Date(session.importedAt).getTime()) < 5 * 60 * 1000;

  // Mode QUERY : consultation simple
  const queryKeywords = [
    'montre',
    'affiche',
    'liste',
    'voir',
    'combien',
    'quels sont'
  ];

  const hasQueryIntent = queryKeywords.some(kw => msgLower.includes(kw));

  // Logique de décision
  if (hasUpdateIntent && (hasLeadContext || hasRecentImport)) {
    return 'update';
  }

  if (hasQueryIntent) {
    return 'query';
  }

  // Mode IMPORT : nouveau fichier uploadé
  if (session.uploadedFile && !session.imported) {
    return 'import';
  }

  // Par défaut : consultation
  return 'query';
}

/**
 * Stocke les IDs de leads consultés (pour actions futures)
 * @param {object} session - Session
 * @param {array} leadIds - IDs des leads
 */
export function storeLeadContext(session, leadIds) {
  session.lastQueriedLeadIds = leadIds;
  session.lastQueriedAt = new Date().toISOString();
}

/**
 * Récupère le contexte de leads actif
 * @param {object} session - Session
 * @returns {array} IDs des leads
 */
export function getActiveLeadContext(session) {
  // Contexte valide pendant 30 minutes
  if (session.lastQueriedLeadIds && session.lastQueriedAt) {
    const age = Date.now() - new Date(session.lastQueriedAt).getTime();
    if (age < 30 * 60 * 1000) {
      return session.lastQueriedLeadIds;
    }
  }

  return [];
}

/**
 * Nettoie le contexte après import (évite confusion)
 */
export function clearImportContext(session) {
  delete session.uploadedFile;
  delete session.enrichedData;
  session.imported = true;
  session.importedAt = new Date().toISOString();
}
