/**
 * Action: Envoyer un email
 *
 * Supporte plusieurs providers selon la config :
 * - SMTP direct
 * - SendGrid
 * - Gmail API
 *
 * Params:
 * - tenantId: string
 * - to: string | array
 * - subject: string
 * - body: string (HTML ou texte)
 * - from: string (optionnel)
 * - cc: string | array (optionnel)
 * - bcc: string | array (optionnel)
 * - replyTo: string (optionnel)
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
    parentId
  } = params;

  if (!to || !subject || !body) {
    throw new Error('to, subject et body sont obligatoires');
  }

  // Déterminer le provider selon la config
  const provider = process.env.EMAIL_PROVIDER || 'smtp';

  try {
    let result;

    switch (provider) {
      case 'smtp':
        result = await sendViaSMTP(params);
        break;

      case 'sendgrid':
        result = await sendViaSendGrid(params);
        break;

      case 'gmail':
        result = await sendViaGmail(params);
        break;

      default:
        throw new Error(`Provider email inconnu: ${provider}`);
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
      provider,
      entityId: result.messageId,
      preview: `Email "${subject}" envoyé à ${Array.isArray(to) ? to.join(', ') : to}`,
      metadata: {
        messageId: result.messageId,
        to,
        subject
      }
    };

  } catch (error) {
    return {
      success: false,
      provider,
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