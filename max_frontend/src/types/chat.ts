/**
 * types/chat.ts
 * Types TypeScript pour Chat M.A.X. Global - MVP1
 */

/**
 * Mode de conversation M.A.X.
 * - auto: Propose des actions concrètes (avec confirmation)
 * - assist: Recommandations uniquement
 * - conseil: Conseils et analyses uniquement
 */
export type ChatMode = 'auto' | 'assist' | 'conseil';

/**
 * Rôle du message
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Type de message
 */
export type MessageType = 'text' | 'consent';

/**
 * Détails d'une opération nécessitant consentement
 */
export interface ConsentOperation {
  type: string;
  description: string;
  details: Record<string, any>;
}

/**
 * Message dans la conversation
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
  timestamp: number;
  type?: MessageType;
  consentId?: string;
  operation?: ConsentOperation;
  expiresIn?: number;
  consentStatus?: 'pending' | 'executing' | 'success' | 'error' | 'expired';
  auditReportId?: string;
}

/**
 * Stats d'un fichier uploadé
 */
export interface FileStats {
  totalRows?: number;
  totalColumns?: number;
  pages?: number;
  charactersCount?: number;
  linesCount?: number;
  warnings?: number;
}

/**
 * Type de fichier supporté
 */
export type FileType = 'csv' | 'pdf' | 'docx';

/**
 * Résultat d'upload de fichier
 */
export interface FileUploadResult {
  originalname: string;
  type: FileType;
  stats: FileStats;
}

/**
 * Réponse API /send
 */
export interface SendMessageResponse {
  success: boolean;
  message: string;
  mode: ChatMode;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  conversationLength: number;
}

/**
 * Réponse API /history
 */
export interface HistoryResponse {
  success: boolean;
  history: ChatMessage[];
  mode: ChatMode;
  total: number;
}

/**
 * Réponse API /mode
 */
export interface ChangeModeResponse {
  success: boolean;
  mode: ChatMode;
  message: string;
}

/**
 * Réponse API /reset
 */
export interface ResetConversationResponse {
  success: boolean;
  sessionId: string;
  mode: ChatMode;
  message: string;
}

/**
 * Réponse API /upload-file
 */
export interface UploadFileResponse {
  success: boolean;
  file: FileUploadResult;
  message: string;
  mode: ChatMode;
}

/**
 * Chunk SSE reçu du backend
 */
export interface SSEChunk {
  content?: string;
  done?: boolean;
  error?: string;
}

/**
 * État du chat store
 */
export interface ChatState {
  // Messages
  messages: ChatMessage[];

  // Mode actuel
  mode: ChatMode;

  // Session ID (pour le vrai M.A.X.)
  sessionId: string | null;

  // Loading states
  isLoading: boolean;
  isStreaming: boolean;

  // Tokens usage totaux
  totalTokens: number;

  // Actions
  sendMessage: (message: string, useStreaming?: boolean) => Promise<void>;
  uploadFile: (file: File) => Promise<void>;
  changeMode: (newMode: ChatMode) => Promise<void>;
  resetConversation: () => Promise<void>;
  loadHistory: () => Promise<void>;

  // Utils
  addMessage: (role: MessageRole, content: string) => void;
  injectMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
}

/**
 * Statistiques du store (admin)
 */
export interface StoreStats {
  totalConversations: number;
  conversations: Array<{
    userId: string;
    sessionId: string;
    mode: ChatMode;
    messagesCount: number;
    createdAt: number;
    updatedAt: number;
    ageHours: string;
  }>;
}
