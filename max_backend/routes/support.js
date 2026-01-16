/**
 * Routes Support Lite MVP
 * Système de tickets minimaliste pour support client
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Configuration upload (1 fichier max, 5 MB)
const uploadDir = path.join(__dirname, '../uploads/support');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    // Accepter images, PDFs, logs, JSON
    const allowedTypes = /jpeg|jpg|png|gif|pdf|txt|log|json/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé. Accepté: images, PDF, TXT, LOG, JSON'));
    }
  }
});

/**
 * GET /api/support/admin/all-tickets
 * Liste de TOUS les tickets de TOUS les tenants (pour admins MaCréa uniquement)
 */
router.get('/admin/all-tickets', async (req, res) => {
  try {
    const { db } = req.app.locals;
    const userRole = req.user?.role;

    // Vérifier que c'est un admin
    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé aux administrateurs'
      });
    }

    console.log(`[Support] GET ALL tickets (admin cross-tenant)`);

    // Récupérer TOUS les tickets de TOUS les tenants
    const result = await db.query(
      'SELECT * FROM support_tickets ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      tickets: result.rows
    });
  } catch (error) {
    console.error('[Support] Erreur GET all tickets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/support/tickets
 * Liste des tickets du tenant authentifié
 */
router.get('/tickets', async (req, res) => {
  try {
    const { db } = req.app.locals;
    const tenantId = req.tenantId;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    console.log(`[Support] GET tickets - Tenant: ${tenantId}, User: ${userId}, Role: ${userRole}`);

    // Si admin, voir tous les tickets du tenant
    // Sinon, voir uniquement SES tickets
    const query = userRole === 'admin'
      ? 'SELECT * FROM support_tickets WHERE tenant_id = $1 ORDER BY created_at DESC'
      : 'SELECT * FROM support_tickets WHERE tenant_id = $1 AND user_id = $2 ORDER BY created_at DESC';

    const params = userRole === 'admin' ? [tenantId] : [tenantId, userId];

    const result = await db.query(query, params);

    res.json({
      success: true,
      tickets: result.rows
    });
  } catch (error) {
    console.error('[Support] Erreur GET tickets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/support/tickets
 * Créer un nouveau ticket
 */
router.post('/tickets', async (req, res) => {
  try {
    const { db } = req.app.locals;
    const tenantId = req.tenantId;
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    const { subject, message, priority = 'normal' } = req.body;

    console.log(`[Support] POST ticket - Tenant: ${tenantId}, Subject: ${subject}`);

    // Validation
    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        error: 'Sujet et message obligatoires'
      });
    }

    if (!['urgent', 'normal'].includes(priority)) {
      return res.status(400).json({
        success: false,
        error: 'Priorité invalide (urgent ou normal)'
      });
    }

    // Créer le ticket
    const ticketResult = await db.query(
      `INSERT INTO support_tickets (tenant_id, user_id, user_email, subject, priority)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [tenantId, userId, userEmail, subject, priority]
    );

    const ticket = ticketResult.rows[0];

    // Créer le premier message
    await db.query(
      `INSERT INTO support_messages (ticket_id, user_id, user_email, user_name, is_support, message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [ticket.id, userId, userEmail, req.user?.name || userEmail, false, message]
    );

    console.log(`[Support] Ticket créé: ${ticket.ticket_number}`);

    // TODO: Envoyer email de confirmation au client
    // TODO: Envoyer email de notification au support

    res.status(201).json({
      success: true,
      ticket
    });
  } catch (error) {
    console.error('[Support] Erreur POST ticket:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/support/tickets/:id
 * Détails d'un ticket + conversation
 */
router.get('/tickets/:id', async (req, res) => {
  try {
    const { db } = req.app.locals;
    const tenantId = req.tenantId;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const ticketId = parseInt(req.params.id);

    console.log(`[Support] GET ticket #${ticketId}`);

    // Récupérer le ticket
    const ticketResult = await db.query(
      'SELECT * FROM support_tickets WHERE id = $1 AND tenant_id = $2',
      [ticketId, tenantId]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ticket non trouvé'
      });
    }

    const ticket = ticketResult.rows[0];

    // Vérifier que l'utilisateur a accès (admin ou créateur)
    if (userRole !== 'admin' && ticket.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé à ce ticket'
      });
    }

    // Récupérer les messages
    const messagesResult = await db.query(
      'SELECT * FROM support_messages WHERE ticket_id = $1 ORDER BY created_at ASC',
      [ticketId]
    );

    res.json({
      success: true,
      ticket,
      messages: messagesResult.rows
    });
  } catch (error) {
    console.error('[Support] Erreur GET ticket:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/support/tickets/:id/messages
 * Ajouter un message à un ticket
 */
router.post('/tickets/:id/messages', upload.single('attachment'), async (req, res) => {
  try {
    const { db } = req.app.locals;
    const tenantId = req.tenantId;
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    const userName = req.user?.name || userEmail;
    const userRole = req.user?.role;
    const ticketId = parseInt(req.params.id);
    const { message } = req.body;

    console.log(`[Support] POST message - Ticket #${ticketId}, User: ${userName}`);

    // Validation
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message obligatoire'
      });
    }

    // Vérifier que le ticket existe et appartient au tenant
    const ticketResult = await db.query(
      'SELECT * FROM support_tickets WHERE id = $1 AND tenant_id = $2',
      [ticketId, tenantId]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ticket non trouvé'
      });
    }

    const ticket = ticketResult.rows[0];

    // Vérifier accès (admin ou créateur)
    if (userRole !== 'admin' && ticket.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé à ce ticket'
      });
    }

    // Vérifier si le ticket est fermé
    if (ticket.status === 'closed') {
      return res.status(400).json({
        success: false,
        error: 'Impossible de répondre à un ticket fermé'
      });
    }

    // Gérer la pièce jointe (si présente)
    let attachmentFilename = null;
    let attachmentUrl = null;
    let attachmentSize = null;

    if (req.file) {
      attachmentFilename = req.file.originalname;
      attachmentUrl = `/uploads/support/${req.file.filename}`;
      attachmentSize = req.file.size;
      console.log(`[Support] Fichier uploadé: ${attachmentFilename} (${attachmentSize} bytes)`);
    }

    // Déterminer si c'est une réponse du support (admin) ou du client
    const isSupport = userRole === 'admin';

    // Insérer le message
    const messageResult = await db.query(
      `INSERT INTO support_messages
       (ticket_id, user_id, user_email, user_name, is_support, message, attachment_filename, attachment_url, attachment_size)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [ticketId, userId, userEmail, userName, isSupport, message, attachmentFilename, attachmentUrl, attachmentSize]
    );

    // Le trigger update_ticket_activity mettra à jour last_activity_at et status automatiquement

    console.log(`[Support] Message ajouté au ticket #${ticketId}`);

    // TODO: Envoyer email de notification
    // - Si isSupport=true → notifier le client
    // - Si isSupport=false → notifier le support

    res.status(201).json({
      success: true,
      message: messageResult.rows[0]
    });
  } catch (error) {
    console.error('[Support] Erreur POST message:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/support/tickets/:id/close
 * Fermer un ticket
 */
router.put('/tickets/:id/close', async (req, res) => {
  try {
    const { db } = req.app.locals;
    const tenantId = req.tenantId;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const ticketId = parseInt(req.params.id);

    console.log(`[Support] CLOSE ticket #${ticketId}`);

    // Récupérer le ticket
    const ticketResult = await db.query(
      'SELECT * FROM support_tickets WHERE id = $1 AND tenant_id = $2',
      [ticketId, tenantId]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ticket non trouvé'
      });
    }

    const ticket = ticketResult.rows[0];

    // Seul l'admin peut fermer les tickets
    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Seul le support peut fermer les tickets'
      });
    }

    // Fermer le ticket
    const updateResult = await db.query(
      'UPDATE support_tickets SET status = $1, closed_at = NOW() WHERE id = $2 RETURNING *',
      ['closed', ticketId]
    );

    console.log(`[Support] Ticket #${ticketId} fermé`);

    // TODO: Envoyer email au client pour confirmer fermeture

    res.json({
      success: true,
      ticket: updateResult.rows[0]
    });
  } catch (error) {
    console.error('[Support] Erreur CLOSE ticket:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/support/tickets/:id/reopen
 * Réouvrir un ticket fermé
 */
router.put('/tickets/:id/reopen', async (req, res) => {
  try {
    const { db } = req.app.locals;
    const tenantId = req.tenantId;
    const ticketId = parseInt(req.params.id);

    console.log(`[Support] REOPEN ticket #${ticketId}`);

    // Récupérer le ticket
    const ticketResult = await db.query(
      'SELECT * FROM support_tickets WHERE id = $1 AND tenant_id = $2',
      [ticketId, tenantId]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ticket non trouvé'
      });
    }

    // Réouvrir le ticket
    const updateResult = await db.query(
      'UPDATE support_tickets SET status = $1, closed_at = NULL WHERE id = $2 RETURNING *',
      ['open', ticketId]
    );

    console.log(`[Support] Ticket #${ticketId} réouvert`);

    res.json({
      success: true,
      ticket: updateResult.rows[0]
    });
  } catch (error) {
    console.error('[Support] Erreur REOPEN ticket:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;