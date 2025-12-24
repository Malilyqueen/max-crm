import React, { useState, useEffect } from 'react';
import {
  loadSessions,
  getCurrentSessionId,
  setCurrentSessionId,
  deleteSession as deleteSessionLocal
} from '../lib/sessionManager';

/**
 * SessionSelector - Sélecteur de sessions M.A.X.
 *
 * Affiche la liste des sessions et permet de :
 * - Changer de session
 * - Créer nouvelle conversation
 * - Supprimer sessions (sauf générale)
 * - Voir badges unread
 */
export function SessionSelector({ onSessionChange }) {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionIdState] = useState(getCurrentSessionId());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadSessionsList();
  }, []);

  function loadSessionsList() {
    const allSessions = loadSessions();
    setSessions(allSessions);
  }

  function handleSelectSession(sessionId) {
    setCurrentSessionId(sessionId);
    setCurrentSessionIdState(sessionId);
    setIsOpen(false);

    if (onSessionChange) {
      onSessionChange(sessionId);
    }
  }

  function handleDeleteSession(sessionId, e) {
    e.stopPropagation();

    if (sessionId === 'session_general_main') {
      alert('Impossible de supprimer la session générale');
      return;
    }

    if (confirm('Supprimer cette session ?')) {
      // Supprimer localement
      deleteSessionLocal(sessionId);

      // Supprimer sur le backend
      fetch(`/api/chat/session/${sessionId}`, { method: 'DELETE' })
        .then(r => r.json())
        .then(data => {
          if (data.ok) {
            console.log('[SessionSelector] Session supprimée:', sessionId);
          }
        })
        .catch(err => console.error('[SessionSelector] Erreur suppression:', err));

      // Recharger la liste
      loadSessionsList();

      // Si c'était la session active, basculer sur générale
      if (currentSessionId === sessionId) {
        handleSelectSession('session_general_main');
      }
    }
  }

  function handleNewConversation() {
    handleSelectSession('session_general_main');
    setIsOpen(false);
  }

  function getSessionIcon(session) {
    if (session.entity === 'Lead') return '📋';
    if (session.entity === 'Account') return '🏢';
    return '🏠';
  }

  return (
    <div className="relative">
      {/* Bouton d'ouverture */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
      >
        <span className="text-sm">
          {sessions.find(s => s.sessionId === currentSessionId)?.title || 'Conversation'}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Menu déroulant */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-slate-800 rounded-lg shadow-xl border border-white/10 z-50 max-h-96 overflow-y-auto">
          {/* Header */}
          <div className="p-3 border-b border-white/10">
            <button
              onClick={handleNewConversation}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-br from-indigo-400 to-cyan-300 text-slate-900 font-semibold hover:opacity-90 transition-opacity"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Nouvelle conversation</span>
            </button>
          </div>

          {/* Liste des sessions */}
          <div className="p-2">
            {sessions.map(session => {
              const isActive = session.sessionId === currentSessionId;

              return (
                <div
                  key={session.sessionId}
                  onClick={() => handleSelectSession(session.sessionId)}
                  className={`
                    flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors
                    ${isActive ? 'bg-indigo-500/20 border border-indigo-400/30' : 'hover:bg-white/5'}
                  `}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg">{getSessionIcon(session)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{session.title}</div>
                      {session.entity && (
                        <div className="text-xs text-slate-400">
                          {session.entity} · {new Date(session.lastActive).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {session.unread > 0 && (
                      <span className="px-2 py-0.5 bg-cyan-400 text-slate-900 text-xs font-bold rounded-full">
                        {session.unread}
                      </span>
                    )}

                    {session.sessionId !== 'session_general_main' && (
                      <button
                        onClick={(e) => handleDeleteSession(session.sessionId, e)}
                        className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                        title="Supprimer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Overlay pour fermer */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
