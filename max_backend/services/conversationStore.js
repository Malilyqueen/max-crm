/**
 * services/conversationStore.js
 * Store en mémoire (RAM) pour les conversations M.A.X. - MVP1
 *
 * Caractéristiques MVP1:
 * - Stockage en mémoire uniquement (reset au redémarrage serveur)
 * - Une conversation par utilisateur (identifié par userId)
 * - Historique limité (configurable)
 * - Pas de persistence en DB
 * - Cleanup automatique des vieilles conversations
 */

import 'dotenv/config';

// Configuration
const MAX_MESSAGES_PER_CONVERSATION = parseInt(process.env.MAX_HISTORY_MESSAGES || '100', 10);
const MAX_CONVERSATION_AGE_HOURS = parseInt(process.env.MAX_HISTORY_DURATION_HOURS || '72', 10);

/**
 * Structure d'une conversation:
 * {
 *   userId: string,
 *   sessionId: string,
 *   mode: 'auto' | 'assist' | 'conseil',
 *   messages: [
 *     { role: 'user' | 'assistant', content: string, timestamp: number }
 *   ],
 *   createdAt: number,
 *   updatedAt: number
 * }
 */

// Store en mémoire : Map<userId, conversation>
const conversations = new Map();

/**
 * Créer ou récupérer une conversation
 *
 * @param {string} userId - ID utilisateur
 * @param {string} mode - Mode initial ('auto', 'assist', 'conseil')
 * @returns {object} - Conversation
 */
export function getOrCreateConversation(userId, mode = 'assist') {
  if (!userId) {
    throw new Error('userId is required');
  }

  let conversation = conversations.get(userId);

  if (!conversation) {
    // Créer nouvelle conversation
    conversation = {
      userId,
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      mode,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    conversations.set(userId, conversation);

    console.log('[CONVERSATION_STORE] ✅ Nouvelle conversation créée:', {
      userId,
      sessionId: conversation.sessionId,
      mode
    });
  }

  return conversation;
}

/**
 * Ajouter un message à la conversation
 *
 * @param {string} userId - ID utilisateur
 * @param {string} role - 'user' ou 'assistant'
 * @param {string} content - Contenu du message
 * @returns {object} - Conversation mise à jour
 */
export function addMessage(userId, role, content) {
  if (!userId || !role || !content) {
    throw new Error('userId, role et content sont requis');
  }

  if (!['user', 'assistant'].includes(role)) {
    throw new Error('role doit être "user" ou "assistant"');
  }

  const conversation = getOrCreateConversation(userId);

  const message = {
    role,
    content,
    timestamp: Date.now()
  };

  conversation.messages.push(message);
  conversation.updatedAt = Date.now();

  // Limiter l'historique
  if (conversation.messages.length > MAX_MESSAGES_PER_CONVERSATION) {
    const toRemove = conversation.messages.length - MAX_MESSAGES_PER_CONVERSATION;
    conversation.messages.splice(0, toRemove);

    console.log('[CONVERSATION_STORE] 🗑️ Historique tronqué:', {
      userId,
      messagesRemoved: toRemove,
      messagesKept: conversation.messages.length
    });
  }

  console.log('[CONVERSATION_STORE] 💬 Message ajouté:', {
    userId,
    role,
    contentLength: content.length,
    totalMessages: conversation.messages.length
  });

  return conversation;
}

/**
 * Obtenir l'historique d'une conversation
 *
 * @param {string} userId - ID utilisateur
 * @param {number} limit - Nombre max de messages à retourner (défaut: tous)
 * @returns {Array} - Messages [{role, content, timestamp}]
 */
export function getHistory(userId, limit = null) {
  const conversation = conversations.get(userId);

  if (!conversation) {
    return [];
  }

  const messages = conversation.messages;

  if (limit && limit > 0) {
    // Retourner les N derniers messages
    return messages.slice(-limit);
  }

  return messages;
}

/**
 * Obtenir les messages formatés pour OpenAI
 * (sans le timestamp, juste {role, content})
 *
 * @param {string} userId - ID utilisateur
 * @param {number} limit - Nombre max de messages
 * @returns {Array} - Messages [{role: 'user'|'assistant', content: string}]
 */
export function getMessagesForAI(userId, limit = null) {
  const history = getHistory(userId, limit);

  return history.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
}

/**
 * Changer le mode d'une conversation
 *
 * @param {string} userId - ID utilisateur
 * @param {string} newMode - Nouveau mode ('auto', 'assist', 'conseil')
 * @returns {object} - Conversation mise à jour
 */
export function changeMode(userId, newMode) {
  if (!['auto', 'assist', 'conseil'].includes(newMode)) {
    throw new Error('Mode invalide. Doit être: auto, assist ou conseil');
  }

  const conversation = getOrCreateConversation(userId);
  const oldMode = conversation.mode;
  conversation.mode = newMode;
  conversation.updatedAt = Date.now();

  console.log('[CONVERSATION_STORE] 🔄 Mode changé:', {
    userId,
    oldMode,
    newMode
  });

  return conversation;
}

/**
 * Réinitialiser une conversation
 *
 * @param {string} userId - ID utilisateur
 * @returns {object} - Nouvelle conversation vide
 */
export function resetConversation(userId) {
  const oldConversation = conversations.get(userId);

  const newConversation = {
    userId,
    sessionId: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    mode: oldConversation?.mode || 'assist',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  conversations.set(userId, newConversation);

  console.log('[CONVERSATION_STORE] 🔄 Conversation réinitialisée:', {
    userId,
    newSessionId: newConversation.sessionId
  });

  return newConversation;
}

/**
 * Supprimer une conversation
 *
 * @param {string} userId - ID utilisateur
 * @returns {boolean} - True si supprimée
 */
export function deleteConversation(userId) {
  const deleted = conversations.delete(userId);

  if (deleted) {
    console.log('[CONVERSATION_STORE] 🗑️ Conversation supprimée:', { userId });
  }

  return deleted;
}

/**
 * Obtenir les stats du store
 *
 * @returns {object} - Stats
 */
export function getStats() {
  const stats = {
    totalConversations: conversations.size,
    conversations: []
  };

  for (const [userId, conv] of conversations.entries()) {
    stats.conversations.push({
      userId,
      sessionId: conv.sessionId,
      mode: conv.mode,
      messagesCount: conv.messages.length,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      ageHours: ((Date.now() - conv.createdAt) / (1000 * 60 * 60)).toFixed(2)
    });
  }

  return stats;
}

/**
 * Cleanup automatique des vieilles conversations
 * (à appeler périodiquement)
 */
export function cleanup() {
  const now = Date.now();
  const maxAge = MAX_CONVERSATION_AGE_HOURS * 60 * 60 * 1000; // heures → ms
  let removed = 0;

  for (const [userId, conv] of conversations.entries()) {
    const age = now - conv.updatedAt;

    if (age > maxAge) {
      conversations.delete(userId);
      removed++;
    }
  }

  if (removed > 0) {
    console.log('[CONVERSATION_STORE] 🧹 Cleanup:', {
      removed,
      remaining: conversations.size,
      maxAgeHours: MAX_CONVERSATION_AGE_HOURS
    });
  }

  return removed;
}

// Cleanup automatique toutes les heures
setInterval(cleanup, 60 * 60 * 1000);

console.log('[CONVERSATION_STORE] ✅ Store initialisé:', {
  maxMessagesPerConversation: MAX_MESSAGES_PER_CONVERSATION,
  maxConversationAgeHours: MAX_CONVERSATION_AGE_HOURS,
  cleanupIntervalHours: 1
});

export default {
  getOrCreateConversation,
  addMessage,
  getHistory,
  getMessagesForAI,
  changeMode,
  resetConversation,
  deleteConversation,
  getStats,
  cleanup
};
