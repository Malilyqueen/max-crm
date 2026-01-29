/**
 * Action: Envoyer un email
 *
 * Architecture 3 modes par tenant:
 * - Mode 1 (default): no-reply@malalacrea.fr + reply-to tenant
 * - Mode 2 (custom_domain): domaine client validé via Mailjet MaCréa
 * - Mode 3 (self_service): credentials propres du tenant
 *
 * Params:
 * - tenantId: string (OBLIGATOIRE pour résolution mode)
 * - to: string | array
 * - subject: string
 * - body: string (HTML ou texte)
 * - from: string (optionnel, override mode)
 * - cc: string | array (optionnel)
 * - bcc: string | array (optionnel)
 * - replyTo: string (optionnel, override mode)
 * - parentType: 'Lead' | 'Account' | 'Contact' (optionnel, pour tracker dans CRM)
 * - parentId: string (optionnel)
 */

export async function sendEmail(params) {
  const {
    tenantId,
    to,
    subject,
    body,
    from,
    cc,
    bcc,
    replyTo,
    parentType,
    parentId,
    leadId,      // ✅ ID du lead pour message_events
    campaignId   // ✅ ID campagne pour bulk sends
  } = params;

  if (!to || !subject || !body) {
    throw new Error('to, subject et body sont obligatoires');
  }

  if (!tenantId) {
    throw new Error('tenantId est obligatoire pour résolution mode email');
  }

  // Importer le resolver de mode
  const { resolveEmailMode } = await import('../lib/emailModeResolver.js');

  try {
    // Résoudre le mode email du tenant
    const { mode, config } = await resolveEmailMode(tenantId);

    console.log(`[SEND_EMAIL] Tenant: ${tenantId} | Mode: ${mode}`);

    // Déterminer FROM et REPLY-TO selon le mode (ou override si fourni)
    const emailFrom = from || config.from_email || 'no-reply@malalacrea.fr';
    const emailReplyTo = replyTo || config.reply_to || 'contact@malalacrea.fr';
    const emailFromName = config.from_name || 'M.A.X. CRM';

    let result;

    // Envoyer selon le mode
    if (mode === 'self_service' && config.credentials) {
      // Mode 3: Utiliser credentials tenant
      result = await sendViaMailjet({
        ...params,
        from: emailFrom,
        fromName: emailFromName,
        replyTo: emailReplyTo,
        customCredentials: config.credentials
      });
    } else {
      // Mode 1 & 2: Utiliser Mailjet MaCréa (credentials globaux)
      result = await sendViaMailjet({
        ...params,
        from: emailFrom,
        fromName: emailFromName,
        replyTo: emailReplyTo
      });
    }

    // Si un parent CRM est spécifié, créer un Email dans EspoCRM pour traçabilité
    if (parentType && parentId && result.success) {
      await trackEmailInCRM({
        to,
        subject,
        body,
        parentType,
        parentId,
        status: 'Sent'
      });
    }

    return {
      success: true,
      provider: 'mailjet',
      mode, // Retourner le mode utilisé pour debug
      entityId: result.messageId,
      preview: `Email "${subject}" envoyé à ${Array.isArray(to) ? to.join(', ') : to}`,
      metadata: {
        messageId: result.messageId,
        to,
        subject,
        from: emailFrom,
        replyTo: emailReplyTo
      }
    };

  } catch (error) {
    console.error('[SEND_EMAIL] Erreur:', error);
    return {
      success: false,
      provider: 'mailjet',
      error: error.message,
      preview: `Échec envoi email: ${error.message}`
    };
  }
}

/**
 * Envoi via SMTP (nodemailer)
 */
async function sendViaSMTP(params) {
  const nodemailer = await import('nodemailer');

  // Configuration SMTP depuis .env
  const config = {
    host: process.env.SMTP_HOST || 'ssl0.ovh.net',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true pour port 465, false pour 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  };

  console.log('   📧 [SMTP] Configuration:', {
    host: config.host,
    port: config.port,
    user: config.auth.user
  });

  try {
    // Créer le transporteur
    const transporter = nodemailer.default.createTransport(config);

    // Vérifier la connexion
    await transporter.verify();
    console.log('   ✅ [SMTP] Connexion vérifiée');

    // Préparer le message
    const mailOptions = {
      from: params.from || process.env.SMTP_FROM,
      to: Array.isArray(params.to) ? params.to.join(', ') : params.to,
      subject: params.subject,
      text: params.body, // Version texte
      html: params.body.includes('<') ? params.body : undefined // Si HTML détecté
    };

    // Ajouter CC/BCC si fournis
    if (params.cc) {
      mailOptions.cc = Array.isArray(params.cc) ? params.cc.join(', ') : params.cc;
    }
    if (params.bcc) {
      mailOptions.bcc = Array.isArray(params.bcc) ? params.bcc.join(', ') : params.bcc;
    }
    if (params.replyTo) {
      mailOptions.replyTo = params.replyTo;
    }

    // Envoyer l'email
    const info = await transporter.sendMail(mailOptions);

    console.log('   ✅ [SMTP] Email envoyé:', info.messageId);

    return {
      success: true,
      messageId: info.messageId,
      provider: 'smtp'
    };

  } catch (error) {
    console.error('   ❌ [SMTP] Erreur:', error.message);
    throw new Error(`SMTP Error: ${error.message}`);
  }
}

/**
 * Envoi via Mailjet API v3.1
 * Doc: https://dev.mailjet.com/email/guides/send-api-v31/
 *
 * Supporte customCredentials pour mode self_service
 */
export async function sendViaMailjet(params) {
  // Utiliser credentials custom (tenant) ou globaux (MaCréa)
  const apiKey = params.customCredentials?.apiKey || process.env.MAILJET_API_KEY;
  const apiSecret = params.customCredentials?.apiSecret || process.env.MAILJET_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('MAILJET_API_KEY et MAILJET_API_SECRET requis dans .env');
  }

  const credentialsSource = params.customCredentials ? 'TENANT' : 'GLOBAL';
  console.log(`   📧 [Mailjet] Configuration: ${credentialsSource}`, {
    apiKey: apiKey.substring(0, 8) + '...',
    to: params.to,
    from: params.from || 'no-reply@malalacrea.fr',
    replyTo: params.replyTo
  });

  try {
    // Préparer le payload Mailjet v3.1
    const payload = {
      Messages: [
        {
          From: {
            Email: params.from || process.env.MAILJET_FROM_EMAIL || 'no-reply@malalacrea.fr',
            Name: params.fromName || process.env.MAILJET_FROM_NAME || 'M.A.X. CRM'
          },
          To: Array.isArray(params.to)
            ? params.to.map(email => ({ Email: email }))
            : [{ Email: params.to }],
          Subject: params.subject,
          TextPart: params.body.replace(/<[^>]*>/g, ''), // Strip HTML pour version texte
          HTMLPart: params.body.includes('<') ? params.body : undefined
        }
      ]
    };

    // Ajouter CC si fourni
    if (params.cc) {
      payload.Messages[0].Cc = Array.isArray(params.cc)
        ? params.cc.map(email => ({ Email: email }))
        : [{ Email: params.cc }];
    }

    // Ajouter BCC si fourni
    if (params.bcc) {
      payload.Messages[0].Bcc = Array.isArray(params.bcc)
        ? params.bcc.map(email => ({ Email: email }))
        : [{ Email: params.bcc }];
    }

    // Ajouter ReplyTo si fourni (OBLIGATOIRE en mode default)
    if (params.replyTo) {
      payload.Messages[0].ReplyTo = { Email: params.replyTo };
    }

    // Ajouter CustomID pour tracking (leadId si disponible)
    if (params.parentId) {
      payload.Messages[0].CustomID = `${params.parentType || 'Lead'}_${params.parentId}`;
    }

    // Appel API Mailjet
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    const response = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Mailjet API error (${response.status}): ${errorBody}`);
    }

    const result = await response.json();

    // Mailjet retourne un tableau Messages avec le statut de chaque email
    const firstMessage = result.Messages[0];

    if (firstMessage.Status === 'success') {
      const messageId = firstMessage.To[0].MessageID;
      const messageUUID = firstMessage.To[0].MessageUUID;

      console.log('   ✅ [Mailjet] Email envoyé:', {
        messageId,
        messageUUID,
        to: firstMessage.To[0].Email
      });

      // Logger l'event dans message_events
      const { logMessageEvent } = await import('../lib/messageEventLogger.js');
      await logMessageEvent({
        channel: 'email',
        provider: 'mailjet',
        direction: 'out',
        tenantId: params.tenantId,
        leadId: params.leadId || params.parentId, // ✅ Priorité leadId, fallback parentId
        campaignId: params.campaignId, // ✅ Lier à la campagne bulk
        email: params.to,
        providerMessageId: String(messageId),
        status: 'sent',
        messageSnippet: params.subject,
        rawPayload: result,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        messageId: String(messageId),
        messageUUID,
        provider: 'mailjet'
      };
    } else {
      throw new Error(`Mailjet error: ${firstMessage.Errors?.[0]?.ErrorMessage || 'Unknown error'}`);
    }

  } catch (error) {
    console.error('   ❌ [Mailjet] Erreur:', error.message);
    throw new Error(`Mailjet Error: ${error.message}`);
  }
}

/**
 * Envoi via SendGrid
 */
async function sendViaSendGrid(params) {
  // TODO: Implémenter avec @sendgrid/mail
  console.log('   📧 [SendGrid] Envoi simulé:', params.subject);

  return {
    success: true,
    messageId: `sendgrid_${Date.now()}`,
    provider: 'sendgrid'
  };
}

/**
 * Envoi via Gmail API
 */
async function sendViaGmail(params) {
  // TODO: Implémenter avec Gmail API
  console.log('   📧 [Gmail] Envoi simulé:', params.subject);

  return {
    success: true,
    messageId: `gmail_${Date.now()}`,
    provider: 'gmail'
  };
}

/**
 * Créer un Email dans EspoCRM pour traçabilité
 */
async function trackEmailInCRM({ to, subject, body, parentType, parentId, status }) {
  const { espoFetch } = await import('../lib/espoClient.js');

  try {
    await espoFetch('/Email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: subject,
        to,
        body,
        status,
        parentType,
        parentId,
        dateSent: new Date().toISOString()
      })
    });
  } catch (error) {
    console.warn('   ⚠️  Impossible de tracker l\'email dans CRM:', error.message);
  }
}