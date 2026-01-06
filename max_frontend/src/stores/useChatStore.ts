/**
 * stores/useChatStore.ts
 * Zustand store pour Chat M.A.X. Global - MVP1
 */

import { create } from 'zustand';
import type {
  ChatState,
  ChatMode,
  MessageRole,
  UploadFileResponse,
  SSEChunk
} from '../types/chat';
import { apiClient } from '../api/client';
import { useToastStore } from '../hooks/useToast';
import { API_BASE_URL } from '../config/api';

// Clé de storage pour persistence
const STORAGE_KEY = 'max_chat_session';
const MAX_MESSAGES_DISPLAY = 50; // Limite d'affichage (règle métier: 72h côté backend)

// Charger la session depuis localStorage
function loadSessionFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const session = JSON.parse(stored);
    const now = Date.now();

    // Invalider si plus vieux que 72h
    if (session.lastActivity && (now - session.lastActivity) > 72 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return session;
  } catch (error) {
    console.error('[CHAT_STORE] Erreur chargement session:', error);
    return null;
  }
}

// Sauvegarder la session dans localStorage
function saveSessionToStorage(sessionId: string | null, messages: any[]) {
  try {
    // Garder seulement les 50 derniers messages pour l'affichage
    const messagesToStore = messages.slice(-MAX_MESSAGES_DISPLAY);

    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      sessionId,
      messages: messagesToStore,
      lastActivity: Date.now()
    }));
  } catch (error) {
    console.error('[CHAT_STORE] Erreur sauvegarde session:', error);
  }
}

// Charger la session initiale
const initialSession = loadSessionFromStorage();

export const useChatStore = create<ChatState>((set, get) => ({
  // État initial (restauré depuis localStorage si disponible)
  messages: initialSession?.messages || [],
  mode: 'assist',
  isLoading: false,
  isStreaming: false,
  totalTokens: 0,
  sessionId: initialSession?.sessionId || null,

  // Ajouter un message localement
  addMessage: (role: MessageRole, content: string) => {
    set((state) => {
      const newMessages = [
        ...state.messages,
        {
          role,
          content,
          timestamp: Date.now()
        }
      ];

      // Sauvegarder dans localStorage (persistence 72h)
      saveSessionToStorage(state.sessionId, newMessages);

      return { messages: newMessages };
    });
  },

  // Injecter un message complet (avec tous les champs type, consentId, etc.)
  injectMessage: (message: any) => {
    set((state) => {
      const newMessages = [...state.messages, message];
      saveSessionToStorage(state.sessionId, newMessages);
      return { messages: newMessages };
    });
  },

  // Effacer tous les messages
  clearMessages: () => {
    set({ messages: [], totalTokens: 0 });
  },

  // Envoyer un message à M.A.X.
  sendMessage: async (message: string, useStreaming = false) => {
    if (!message.trim()) {
      throw new Error('Le message ne peut pas être vide');
    }

    // Ajouter message user immédiatement
    get().addMessage('user', message);

    if (useStreaming) {
      // Mode streaming (SSE)
      set({ isStreaming: true, isLoading: true });

      try {
        const encodedMessage = encodeURIComponent(message);
        const currentState = get();

        // Le vrai M.A.X. n'utilise pas d'auth JWT, juste sessionId
        const eventSource = new EventSource(
          `${API_BASE_URL}/api/chat/stream?message=${encodedMessage}&sessionId=${currentState.sessionId || ''}`
        );

        let fullContent = '';

        eventSource.onmessage = (event) => {
          try {
            const chunk: SSEChunk = JSON.parse(event.data);

            if (chunk.error) {
              console.error('[CHAT_STORE] Erreur SSE:', chunk.error);
              eventSource.close();
              set({ isStreaming: false, isLoading: false });
              throw new Error(chunk.error);
            }

            if (chunk.done) {
              // Stream terminé
              eventSource.close();

              // Le message est déjà dans le state (ajouté progressivement pendant le stream)
              // Pas besoin de l'ajouter à nouveau ici

              set({ isStreaming: false, isLoading: false });
            } else if (chunk.content) {
              // Accumuler le contenu
              fullContent += chunk.content;

              // Mettre à jour le message en cours (pour affichage temps réel)
              set((state) => {
                const lastMessage = state.messages[state.messages.length - 1];

                if (lastMessage?.role === 'assistant') {
                  // Mettre à jour le dernier message assistant
                  return {
                    messages: [
                      ...state.messages.slice(0, -1),
                      {
                        ...lastMessage,
                        content: fullContent
                      }
                    ]
                  };
                } else {
                  // Créer nouveau message assistant
                  return {
                    messages: [
                      ...state.messages,
                      {
                        role: 'assistant',
                        content: fullContent,
                        timestamp: Date.now()
                      }
                    ]
                  };
                }
              });
            }
          } catch (error) {
            console.error('[CHAT_STORE] Erreur parsing SSE:', error);
            eventSource.close();
            set({ isStreaming: false, isLoading: false });
          }
        };

        eventSource.onerror = (error) => {
          console.error('[CHAT_STORE] Erreur EventSource:', error);
          eventSource.close();
          set({ isStreaming: false, isLoading: false });
        };
      } catch (error) {
        console.error('[CHAT_STORE] Erreur streaming:', error);
        set({ isStreaming: false, isLoading: false });
        throw error;
      }
    } else {
      // Mode non-streaming (POST / - vrai M.A.X.)
      set({ isLoading: true });

      try {
        const currentState = get();
        const modeMap = { auto: 'auto', assist: 'assisté', conseil: 'conseil' };

        const response = await apiClient.post('/chat', {
          sessionId: currentState.sessionId,
          message,
          mode: modeMap[currentState.mode] || 'assisté'
        });

        // Le vrai M.A.X. retourne { ok, answer, sessionId, pendingConsent?, ... }
        const data = response.data || response;
        console.log('[CHAT_STORE] 📦 Réponse complète du backend:', data);
        const answer = data.answer || data.message || '';
        const newSessionId = data.sessionId;
        const pendingConsent = data.pendingConsent; // 🔐 Consent Gate
        console.log('[CHAT_STORE] 🔍 pendingConsent extrait:', pendingConsent);

        // Sauvegarder sessionId pour continuité
        if (newSessionId) {
          set({ sessionId: newSessionId });
          // Persister le nouveau sessionId
          saveSessionToStorage(newSessionId, get().messages);
        }

        // Ajouter réponse assistant (va aussi sauvegarder via addMessage)
        get().addMessage('assistant', answer);

        // 🔐 CONSENT GATE: Si pendingConsent, injecter message type "consent"
        if (pendingConsent) {
          console.log('[CHAT_STORE] 🚨 Consent requis détecté:', pendingConsent);
          const consentMessage = {
            role: 'consent',
            type: 'consent',
            consentId: pendingConsent.consentId,
            operation: pendingConsent.operation,
            expiresIn: pendingConsent.expiresIn,
            timestamp: Date.now()
          };
          console.log('[CHAT_STORE] 💉 Injection du message consent:', consentMessage);
          get().injectMessage(consentMessage);
          console.log('[CHAT_STORE] ✅ Message consent injecté. Messages actuels:', get().messages.length);
        } else {
          console.log('[CHAT_STORE] ℹ️ Pas de pendingConsent dans cette réponse');
        }

        set({ isLoading: false });
      } catch (error: any) {
        console.error('[CHAT_STORE] Erreur /chat:', error);
        set({ isLoading: false });
        throw new Error(error.response?.data?.error || 'Erreur lors de l\'envoi du message');
      }
    }
  },

  // Uploader un fichier
  uploadFile: async (file: File) => {
    if (!file) {
      throw new Error('Aucun fichier sélectionné');
    }

    set({ isLoading: true });

    try {
      const currentState = get();
      const formData = new FormData();
      formData.append('file', file);

      // CRITIQUE : Envoyer le sessionId pour que le fichier soit attaché à la même session
      if (currentState.sessionId) {
        formData.append('sessionId', currentState.sessionId);
      }

      // Envoyer le mode actuel aussi
      formData.append('mode', currentState.mode);

      const response = await apiClient.post<UploadFileResponse>(
        '/chat/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const { mode, file: uploadedFile, sessionId: newSessionId, message: maxMessage } = response;

      // Utiliser le nom du fichier local (File object)
      const fileName = file.name;
      const fileType = uploadedFile?.type?.toUpperCase() || 'FILE';

      // CRITIQUE : Sauvegarder le sessionId retourné par le backend
      if (newSessionId && newSessionId !== currentState.sessionId) {
        set({ sessionId: newSessionId });
        console.log('[CHAT_STORE] 🔑 SessionId mis à jour:', newSessionId);
      }

      // Ajouter le message intelligent de M.A.X. (généré par l'IA)
      const displayMessage = maxMessage || `📎 Fichier "${fileName}" chargé avec succès (${fileType}). Que voulez-vous que je fasse avec ?`;
      get().addMessage('assistant', displayMessage);

      // Mettre à jour mode
      set({
        mode,
        isLoading: false
      });

      console.log('[CHAT_STORE] ✅ Fichier uploadé:', {
        fileName,
        fileType,
        sessionId: newSessionId || currentState.sessionId,
        uploadedFile
      });
    } catch (error: any) {
      console.error('[CHAT_STORE] Erreur upload:', error);
      set({ isLoading: false });
      throw new Error(error.response?.data?.error || 'Erreur lors de l\'upload du fichier');
    }
  },

  // Changer le mode de conversation (local uniquement pour le vrai M.A.X.)
  changeMode: async (newMode: ChatMode) => {
    if (!['auto', 'assist', 'conseil'].includes(newMode)) {
      throw new Error('Mode invalide');
    }

    // Le vrai M.A.X. gère le mode dans chaque requête, pas besoin d'endpoint séparé
    set({ mode: newMode });
    console.log('[CHAT_STORE] ✅ Mode changé localement:', newMode);
  },

  // Réinitialiser la conversation (local uniquement pour le vrai M.A.X.)
  resetConversation: async () => {
    // Vider les messages et créer nouvelle session
    set({
      messages: [],
      totalTokens: 0,
      sessionId: null, // Nouvelle session sera créée au prochain message
      isLoading: false
    });

    // Effacer aussi le localStorage
    localStorage.removeItem(STORAGE_KEY);

    console.log('[CHAT_STORE] ✅ Conversation réinitialisée localement');
  },

  // Charger l'historique de conversation
  loadHistory: async () => {
    // Le vrai M.A.X. gère l'historique via sessionId automatiquement
    // Pas besoin de charger explicitement
    console.log('[CHAT_STORE] Historique géré automatiquement par sessionId');
  }
}));
