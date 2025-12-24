/**
 * SessionManager - Gestion des sessions M.A.X.
 *
 * Règles :
 * - Backend = source de vérité (fichiers session_*.json)
 * - localStorage = cache UI des métadonnées
 * - Toujours 1 session générale
 * - 1 session par Lead/Account depuis EspoCRM
 */

const LS_SESSIONS_KEY = 'max.sessions.v1';
const LS_CURRENT_KEY = 'max.currentSession.v1';

/**
 * Structure d'une session
 * @typedef {Object} Session
 * @property {string} sessionId - ID unique (ex: "session_lead_67899c01a01816b89" ou "session_general_main")
 * @property {string} title - Titre affiché
 * @property {string|null} entity - Type d'entité EspoCRM (Lead, Account, null si général)
 * @property {string|null} entityId - ID de l'entité EspoCRM
 * @property {string} lastActive - ISO timestamp
 * @property {number} unread - Nombre de messages non lus
 */

/**
 * Charger toutes les sessions depuis localStorage
 * @returns {Session[]}
 */
export function loadSessions() {
  try {
    const raw = localStorage.getItem(LS_SESSIONS_KEY);
    if (!raw) return [getDefaultGeneralSession()];

    const sessions = JSON.parse(raw);

    // Toujours garantir au moins la session générale
    const hasGeneral = sessions.some(s => s.sessionId === 'session_general_main');
    if (!hasGeneral) {
      sessions.unshift(getDefaultGeneralSession());
    }

    return sessions;
  } catch (err) {
    console.error('[SessionManager] Erreur chargement sessions:', err);
    return [getDefaultGeneralSession()];
  }
}

/**
 * Sauvegarder les sessions dans localStorage
 * @param {Session[]} sessions
 */
export function saveSessions(sessions) {
  try {
    localStorage.setItem(LS_SESSIONS_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.error('[SessionManager] Erreur sauvegarde sessions:', err);
  }
}

/**
 * Obtenir la session générale par défaut
 * @returns {Session}
 */
function getDefaultGeneralSession() {
  return {
    sessionId: 'session_general_main',
    title: 'Conversation générale',
    entity: null,
    entityId: null,
    lastActive: new Date().toISOString(),
    unread: 0
  };
}

/**
 * Obtenir la session active actuelle
 * @returns {string}
 */
export function getCurrentSessionId() {
  try {
    const id = localStorage.getItem(LS_CURRENT_KEY);
    return id || 'session_general_main';
  } catch {
    return 'session_general_main';
  }
}

/**
 * Définir la session active
 * @param {string} sessionId
 */
export function setCurrentSessionId(sessionId) {
  try {
    localStorage.setItem(LS_CURRENT_KEY, sessionId);

    // Marquer la session comme lue
    const sessions = loadSessions();
    const session = sessions.find(s => s.sessionId === sessionId);
    if (session) {
      session.unread = 0;
      session.lastActive = new Date().toISOString();
      saveSessions(sessions);
    }
  } catch (err) {
    console.error('[SessionManager] Erreur setCurrentSessionId:', err);
  }
}

/**
 * Créer ou récupérer une session contextuelle (Lead/Account)
 * @param {string} entity - "Lead" ou "Account"
 * @param {string} entityId - ID de l'entité
 * @param {string} title - Titre (ex: "Lead: Malala Ramaha")
 * @returns {string} sessionId
 */
export function getOrCreateContextSession(entity, entityId, title) {
  const sessionId = `session_${entity.toLowerCase()}_${entityId}`;

  const sessions = loadSessions();
  let session = sessions.find(s => s.sessionId === sessionId);

  if (!session) {
    // Créer nouvelle session
    session = {
      sessionId,
      title,
      entity,
      entityId,
      lastActive: new Date().toISOString(),
      unread: 0
    };

    // Insérer après la session générale
    sessions.splice(1, 0, session);
    saveSessions(sessions);

    console.log('[SessionManager] Nouvelle session créée:', sessionId);
  } else {
    // Mettre à jour le titre et lastActive
    session.title = title;
    session.lastActive = new Date().toISOString();
    saveSessions(sessions);
  }

  return sessionId;
}

/**
 * Supprimer une session (sauf la générale)
 * @param {string} sessionId
 */
export function deleteSession(sessionId) {
  if (sessionId === 'session_general_main') {
    console.warn('[SessionManager] Impossible de supprimer la session générale');
    return;
  }

  const sessions = loadSessions();
  const filtered = sessions.filter(s => s.sessionId !== sessionId);
  saveSessions(filtered);

  // Si c'était la session active, revenir à la générale
  if (getCurrentSessionId() === sessionId) {
    setCurrentSessionId('session_general_main');
  }

  console.log('[SessionManager] Session supprimée:', sessionId);
}

/**
 * Incrémenter le compteur de messages non lus
 * @param {string} sessionId
 */
export function incrementUnread(sessionId) {
  const sessions = loadSessions();
  const session = sessions.find(s => s.sessionId === sessionId);

  if (session && session.sessionId !== getCurrentSessionId()) {
    session.unread = (session.unread || 0) + 1;
    saveSessions(sessions);
  }
}

/**
 * Mettre à jour lastActive d'une session
 * @param {string} sessionId
 */
export function touchSession(sessionId) {
  const sessions = loadSessions();
  const session = sessions.find(s => s.sessionId === sessionId);

  if (session) {
    session.lastActive = new Date().toISOString();
    saveSessions(sessions);
  }
}
