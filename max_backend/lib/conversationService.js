/**
 * conversationService.js
 *
 * Gestion des conversations M.A.X. avec mémoire persistante
 * - Sauvegarde JSON par session/utilisateur
 * - Gestion du contexte et auto-résumé
 * - Support multi-sessions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callHaiku } from './aiClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONVERSATIONS_DIR = path.join(__dirname, '..', 'conversations');
const MAX_CONTEXT_MESSAGES = 20; // Limite avant résumé
const SUMMARY_THRESHOLD = 99999; // Résumé désactivé (était 15)

// BETA: Fenêtre glissante de 72h + limite de 100 messages
const MAX_HISTORY_DURATION_HOURS = parseInt(process.env.MAX_HISTORY_DURATION_HOURS) || 72;
const MAX_HISTORY_MESSAGES = parseInt(process.env.MAX_HISTORY_MESSAGES) || 100;

// Créer le dossier si nécessaire
if (!fs.existsSync(CONVERSATIONS_DIR)) {
  fs.mkdirSync(CONVERSATIONS_DIR, { recursive: true });
}

/**
 * Créer une nouvelle session de conversation
 * @param {string} mode - Mode de conversation ('assisté', 'auto', 'conseil')
 * @param {object} options - Options supplémentaires { sessionId, entity, entityId, title }
 */
export function createSession(mode = 'assisté', options = {}) {
  // Utiliser sessionId fourni ou générer un nouveau
  const sessionId = options.sessionId || `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const sessionFile = path.join(CONVERSATIONS_DIR, `${sessionId}.json`);

  const initialData = {
    sessionId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
    summary: null,
    mode: mode, // 'assisté', 'auto', 'conseil'
    entity: options.entity || null, // 'Lead', 'Account', null
    entityId: options.entityId || null, // ID de l'entité EspoCRM
    title: options.title || 'Conversation',
    // SÉCURITÉ MULTI-TENANT: Stocker le tenantId dans la session
    tenantId: options.tenantId || null
  };

  fs.writeFileSync(sessionFile, JSON.stringify(initialData, null, 2));
  console.log(`[ConversationService] Session créée: ${sessionId} (mode: ${mode}, entity: ${options.entity || 'none'})`);

  return sessionId;
}

/**
 * Charger une conversation existante
 */
export function loadConversation(sessionId) {
  const sessionFile = path.join(CONVERSATIONS_DIR, `${sessionId}.json`);

  if (!fs.existsSync(sessionFile)) {
    console.warn(`[ConversationService] Session introuvable: ${sessionId}`);
    return null;
  }

  const data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
  console.log(`[ConversationService] Session chargée: ${sessionId} (${data.messages.length} messages)`);

  return data;
}

/**
 * Sauvegarder un message dans la conversation
 */
export function saveMessage(sessionId, message) {
  const sessionFile = path.join(CONVERSATIONS_DIR, `${sessionId}.json`);

  let conversation;
  if (fs.existsSync(sessionFile)) {
    conversation = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
  } else {
    // Créer nouvelle session si inexistante
    conversation = {
      sessionId,
      createdAt: new Date().toISOString(),
      messages: [],
      summary: null
    };
  }

  conversation.messages.push({
    ...message,
    timestamp: message.timestamp || new Date().toISOString()
  });

  conversation.updatedAt = new Date().toISOString();

  fs.writeFileSync(sessionFile, JSON.stringify(conversation, null, 2));
  console.log(`[ConversationService] Message sauvegardé dans ${sessionId} (${message.role})`);

  return conversation;
}

/**
 * Obtenir les messages pour le contexte IA
 * BETA: Fenêtre glissante de 72h + limite de 100 messages
 *
 * Retourne uniquement les messages qui ont moins de MAX_HISTORY_DURATION_HOURS
 * et limite à MAX_HISTORY_MESSAGES pour économiser les tokens
 */
export function getContextMessages(sessionId) {
  const conversation = loadConversation(sessionId);

  if (!conversation) {
    return [];
  }

  const now = new Date();
  const cutoffTime = new Date(now.getTime() - (MAX_HISTORY_DURATION_HOURS * 60 * 60 * 1000));

  // Filtrer les messages qui ont moins de 72h (fenêtre glissante)
  const recentMessages = conversation.messages.filter(m => {
    const messageTime = new Date(m.timestamp);
    return messageTime >= cutoffTime;
  });

  console.log(`[ConversationService] Fenêtre glissante ${MAX_HISTORY_DURATION_HOURS}h : ${conversation.messages.length} messages total → ${recentMessages.length} messages récents`);

  // Limiter à MAX_HISTORY_MESSAGES (100) pour ne pas exploser le budget tokens
  let finalMessages = recentMessages;
  if (recentMessages.length > MAX_HISTORY_MESSAGES) {
    // Garder seulement les MAX_HISTORY_MESSAGES derniers
    finalMessages = recentMessages.slice(-MAX_HISTORY_MESSAGES);
    console.log(`[ConversationService] Limite de ${MAX_HISTORY_MESSAGES} messages appliquée : ${recentMessages.length} → ${finalMessages.length}`);
  }

  // 🔐 Filtrer messages consent (frontend-only) avant envoi à OpenAI
  const messagesForAI = finalMessages.filter(m => m.type !== 'consent');
  if (messagesForAI.length < finalMessages.length) {
    console.log(`[ConversationService] ${finalMessages.length - messagesForAI.length} message(s) consent filtré(s) (frontend-only)`);
  }

  return messagesForAI.map(m => ({ role: m.role, content: m.content }));
}

/**
 * Vérifier si résumé nécessaire et le générer
 */
export async function summarizeIfNeeded(sessionId) {
  const conversation = loadConversation(sessionId);

  if (!conversation) {
    return false;
  }

  const messageCount = conversation.messages.length;

  // Déclencher résumé si >= SUMMARY_THRESHOLD et pas de résumé récent
  if (messageCount >= SUMMARY_THRESHOLD && (!conversation.lastSummaryAt || messageCount - conversation.lastSummaryCount >= 10)) {
    console.log(`[ConversationService] Génération résumé pour ${sessionId}...`);

    try {
      const messagesToSummarize = conversation.messages.slice(0, -5); // Tout sauf les 5 derniers
      const conversationText = messagesToSummarize
        .map(m => `${m.role === 'user' ? 'Utilisateur' : 'M.A.X.'}: ${m.content}`)
        .join('\n\n');

      const result = await callHaiku({
        messages: [{
          role: 'user',
          content: `Résume cette conversation en 2-3 phrases concises, en conservant les points clés et décisions importantes:\n\n${conversationText}`
        }],
        max_tokens: 300,
        temperature: 0.3
      });

      conversation.summary = result.text;
      conversation.lastSummaryAt = new Date().toISOString();
      conversation.lastSummaryCount = messageCount;

      const sessionFile = path.join(CONVERSATIONS_DIR, `${sessionId}.json`);
      fs.writeFileSync(sessionFile, JSON.stringify(conversation, null, 2));

      console.log(`[ConversationService] Résumé généré: "${result.text.slice(0, 100)}..."`);

      return true;
    } catch (error) {
      console.error(`[ConversationService] Erreur génération résumé:`, error);
      return false;
    }
  }

  return false;
}

/**
 * Lister toutes les sessions
 */
export function listSessions() {
  const files = fs.readdirSync(CONVERSATIONS_DIR).filter(f => f.endsWith('.json'));

  return files.map(filename => {
    const sessionFile = path.join(CONVERSATIONS_DIR, filename);
    const data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));

    return {
      sessionId: data.sessionId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      messageCount: data.messages.length,
      lastMessage: data.messages[data.messages.length - 1]?.content.slice(0, 100),
      entity: data.entity || null,
      entityId: data.entityId || null,
      title: data.title || 'Conversation',
      mode: data.mode || 'assisté'
    };
  }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

/**
 * Supprimer une session
 */
export function deleteSession(sessionId) {
  const sessionFile = path.join(CONVERSATIONS_DIR, `${sessionId}.json`);

  if (fs.existsSync(sessionFile)) {
    fs.unlinkSync(sessionFile);
    console.log(`[ConversationService] Session supprimée: ${sessionId}`);
    return true;
  }

  return false;
}

/**
 * Mettre à jour le mode d'exécution d'une session
 */
export function updateSessionMode(sessionId, mode) {
  const sessionFile = path.join(CONVERSATIONS_DIR, `${sessionId}.json`);

  if (!fs.existsSync(sessionFile)) {
    console.warn(`[ConversationService] Session introuvable pour update mode: ${sessionId}`);
    return false;
  }

  const conversation = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
  conversation.mode = mode;
  conversation.updatedAt = new Date().toISOString();

  fs.writeFileSync(sessionFile, JSON.stringify(conversation, null, 2));
  console.log(`[ConversationService] Mode mis à jour: ${sessionId} -> ${mode}`);

  return true;
}
