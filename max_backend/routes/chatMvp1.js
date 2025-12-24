/**
 * routes/chatMvp1.js
 * Routes Chat M.A.X. Global - MVP1
 *
 * Endpoints:
 * - POST /api/chat-mvp1/send - Envoyer message à M.A.X.
 * - GET /api/chat-mvp1/history - Récupérer historique conversation
 * - GET /api/chat-mvp1/stream - Stream SSE réponse M.A.X.
 * - POST /api/chat-mvp1/upload-file - Upload fichier CSV/PDF/DOCX
 * - POST /api/chat-mvp1/mode - Changer mode (auto/assist/conseil)
 * - POST /api/chat-mvp1/reset - Réinitialiser conversation
 * - GET /api/chat-mvp1/stats - Stats du store (admin only)
 */

import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { callOpenAI, callOpenAIStream } from '../lib/openaiClient.js';
import {
  getOrCreateConversation,
  addMessage,
  getHistory,
  getMessagesForAI,
  changeMode,
  resetConversation,
  getStats
} from '../services/conversationStore.js';
import { parseFile, isSupportedFile } from '../lib/fileParser.js';

const router = express.Router();

// Appliquer authMiddleware à toutes les routes
router.use(authMiddleware);

// Configuration multer (upload en mémoire uniquement)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB max
  },
  fileFilter: (req, file, cb) => {
    if (isSupportedFile(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté. Formats acceptés: CSV, PDF, DOCX'));
    }
  }
});

/**
 * POST /api/chat-mvp1/send
 * Envoyer un message à M.A.X. (non-streaming)
 *
 * Body: {
 *   message: string (requis)
 * }
 */
router.post('/send', async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user?.id || 'default_user';

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Le message est requis et ne peut pas être vide'
      });
    }

    console.log('[CHAT_MVP1] 📨 Nouveau message:', {
      userId,
      messageLength: message.length
    });

    // Récupérer conversation et mode
    const conversation = getOrCreateConversation(userId);
    const mode = conversation.mode;

    // Récupérer tenantId depuis req.user ou req.tenant
    const tenantId = req.user?.tenantId || req.tenant?.id || 'macrea';

    // Ajouter message user
    addMessage(userId, 'user', message);

    // Récupérer historique pour contexte
    const messagesForAI = getMessagesForAI(userId);

    // Appeler OpenAI avec tenantId pour charger la mémoire Supabase
    const { content, usage } = await callOpenAI({
      messages: messagesForAI,
      mode,
      tenantId, // ✅ Ajout du tenantId pour récupérer contexte Supabase
      useComplexModel: false, // MVP1: toujours simple model
      maxTokens: 2000,
      temperature: 0.7
    });

    // Ajouter réponse assistant
    addMessage(userId, 'assistant', content);

    res.json({
      success: true,
      message: content,
      mode,
      usage,
      conversationLength: getHistory(userId).length
    });
  } catch (error) {
    console.error('[CHAT_MVP1] ❌ Erreur /send:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de l\'envoi du message'
    });
  }
});

/**
 * GET /api/chat-mvp1/stream
 * Stream SSE de la réponse M.A.X.
 *
 * Query: ?message=... (message user en URL encoded)
 */
router.get('/stream', async (req, res) => {
  try {
    const message = req.query.message;
    const userId = req.user?.id || 'default_user';

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Le paramètre "message" est requis'
      });
    }

    console.log('[CHAT_MVP1] 🌊 Stream SSE démarré:', {
      userId,
      messageLength: message.length
    });

    // Configurer SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Récupérer conversation et mode
    const conversation = getOrCreateConversation(userId);
    const mode = conversation.mode;

    // Récupérer tenantId depuis req.user ou req.tenant
    const tenantId = req.user?.tenantId || req.tenant?.id || 'macrea';

    // Ajouter message user
    addMessage(userId, 'user', message);

    // Récupérer historique
    const messagesForAI = getMessagesForAI(userId);

    // Appeler OpenAI en streaming avec tenantId
    const stream = await callOpenAIStream({
      messages: messagesForAI,
      mode,
      tenantId, // ✅ Ajout du tenantId pour récupérer contexte Supabase
      useComplexModel: false,
      maxTokens: 2000,
      temperature: 0.7
    });

    let fullContent = '';

    // Envoyer les chunks au client
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';

      if (content) {
        fullContent += content;

        // Envoyer le chunk au client via SSE
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Ajouter la réponse complète à l'historique
    if (fullContent) {
      addMessage(userId, 'assistant', fullContent);
    }

    // Envoyer événement de fin
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

    console.log('[CHAT_MVP1] ✅ Stream terminé:', {
      userId,
      responseLength: fullContent.length
    });
  } catch (error) {
    console.error('[CHAT_MVP1] ❌ Erreur /stream:', error.message);

    // Envoyer erreur via SSE
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

/**
 * GET /api/chat-mvp1/history
 * Récupérer l'historique de conversation
 *
 * Query: ?limit=20 (optionnel)
 */
router.get('/history', async (req, res) => {
  try {
    const userId = req.user?.id || 'default_user';
    const limit = parseInt(req.query.limit || '50', 10);

    const history = getHistory(userId, limit);
    const conversation = getOrCreateConversation(userId);

    res.json({
      success: true,
      history,
      mode: conversation.mode,
      total: history.length
    });
  } catch (error) {
    console.error('[CHAT_MVP1] ❌ Erreur /history:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la récupération de l\'historique'
    });
  }
});

/**
 * POST /api/chat-mvp1/upload-file
 * Upload fichier CSV/PDF/DOCX pour analyse par M.A.X.
 *
 * Multipart form-data:
 * - file: fichier CSV/PDF/DOCX
 */
router.post('/upload-file', upload.single('file'), async (req, res) => {
  try {
    const userId = req.user?.id || 'default_user';

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Aucun fichier fourni'
      });
    }

    const { buffer, originalname, mimetype, size } = req.file;

    console.log('[CHAT_MVP1] 📎 Upload fichier:', {
      userId,
      filename: originalname,
      mimetype,
      size
    });

    // Parser le fichier
    const parsed = await parseFile(buffer, originalname);

    console.log('[CHAT_MVP1] ✅ Fichier parsé:', {
      type: parsed.type,
      summaryLength: parsed.summary.length
    });

    // Stocker le fichier dans la conversation sans analyser automatiquement
    const conversation = getOrCreateConversation(userId);
    const mode = conversation.mode;

    // Créer message user avec résumé du fichier (pour contexte)
    const userMessage = `📎 Fichier uploadé: ${parsed.type.toUpperCase()} "${originalname}"\n\n${parsed.summary}`;
    addMessage(userId, 'user', userMessage);

    // Retourner confirmation sans analyse automatique
    res.json({
      success: true,
      file: {
        originalname,
        type: parsed.type,
        stats: parsed.data.stats
      },
      message: `Fichier "${originalname}" chargé avec succès. Que voulez-vous que je fasse avec ce fichier ?`,
      mode
    });
  } catch (error) {
    console.error('[CHAT_MVP1] ❌ Erreur /upload-file:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de l\'upload du fichier'
    });
  }
});

/**
 * POST /api/chat-mvp1/mode
 * Changer le mode de conversation
 *
 * Body: {
 *   mode: 'auto' | 'assist' | 'conseil'
 * }
 */
router.post('/mode', async (req, res) => {
  try {
    const { mode } = req.body;
    const userId = req.user?.id || 'default_user';

    if (!mode || !['auto', 'assist', 'conseil'].includes(mode)) {
      return res.status(400).json({
        success: false,
        error: 'Mode invalide. Valeurs acceptées: auto, assist, conseil'
      });
    }

    const conversation = changeMode(userId, mode);

    res.json({
      success: true,
      mode: conversation.mode,
      message: `Mode changé vers "${mode}"`
    });
  } catch (error) {
    console.error('[CHAT_MVP1] ❌ Erreur /mode:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors du changement de mode'
    });
  }
});

/**
 * POST /api/chat-mvp1/reset
 * Réinitialiser la conversation (nouveau sessionId, messages vides)
 */
router.post('/reset', async (req, res) => {
  try {
    const userId = req.user?.id || 'default_user';

    const conversation = resetConversation(userId);

    res.json({
      success: true,
      sessionId: conversation.sessionId,
      mode: conversation.mode,
      message: 'Conversation réinitialisée'
    });
  } catch (error) {
    console.error('[CHAT_MVP1] ❌ Erreur /reset:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la réinitialisation'
    });
  }
});

/**
 * GET /api/chat-mvp1/stats
 * Obtenir les stats du store (admin only)
 */
router.get('/stats', async (req, res) => {
  try {
    // TODO: Vérifier role admin
    const stats = getStats();

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('[CHAT_MVP1] ❌ Erreur /stats:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la récupération des stats'
    });
  }
});

export default router;
