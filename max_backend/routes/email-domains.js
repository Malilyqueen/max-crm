/**
 * Routes pour gestion domaines email (Option 2)
 * Permet aux tenants d'ajouter leur domaine via Mailjet MaCréa
 */

import express from 'express';
const router = express.Router();

/**
 * POST /api/email/request-domain
 * Demande de validation DNS pour un domaine client
 */
router.post('/request-domain', async (req, res) => {
  try {
    const { domain, email } = req.body;
    const tenantId = req.ctx?.tenant || 'macrea';

    if (!domain || !email) {
      return res.status(400).json({ error: 'Domain et email requis' });
    }

    console.log(`[EMAIL_DOMAIN] Demande validation pour ${email} (tenant: ${tenantId})`);

    // Appeler l'API Mailjet pour ajouter le sender
    const mailjetApiKey = process.env.MAILJET_API_KEY;
    const mailjetApiSecret = process.env.MAILJET_API_SECRET;

    if (!mailjetApiKey || !mailjetApiSecret) {
      return res.status(500).json({ error: 'Configuration Mailjet manquante' });
    }

    const auth = Buffer.from(`${mailjetApiKey}:${mailjetApiSecret}`).toString('base64');

    // 1. Ajouter le sender dans Mailjet
    const senderResponse = await fetch('https://api.mailjet.com/v3/REST/sender', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        Email: email,
        Name: `${tenantId} (Custom Domain)`
      })
    });

    if (!senderResponse.ok) {
      const errorBody = await senderResponse.text();
      console.error('[EMAIL_DOMAIN] Erreur Mailjet:', errorBody);

      // Si le sender existe déjà, récupérer ses infos
      if (senderResponse.status === 400 && errorBody.includes('already exists')) {
        console.log('[EMAIL_DOMAIN] Sender existe déjà, récupération...');
        // Chercher le sender existant
        const searchResponse = await fetch(`https://api.mailjet.com/v3/REST/sender?Email=${encodeURIComponent(email)}`, {
          headers: { 'Authorization': `Basic ${auth}` }
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.Data && searchData.Data.length > 0) {
            const existingSender = searchData.Data[0];

            // Retourner les instructions DNS
            return res.json({
              success: true,
              message: 'Domaine déjà ajouté',
              sender_id: existingSender.ID,
              status: existingSender.Status,
              dns_instructions: {
                spf: 'v=spf1 include:spf.mailjet.com ~all',
                dkim: 'Voir dashboard Mailjet pour la clé DKIM complète'
              }
            });
          }
        }
      }

      return res.status(400).json({
        error: 'Erreur lors de l\'ajout du domaine',
        details: errorBody
      });
    }

    const senderData = await senderResponse.json();
    const sender = senderData.Data[0];

    console.log('[EMAIL_DOMAIN] Sender créé:', {
      id: sender.ID,
      email: sender.Email,
      status: sender.Status
    });

    // 2. Récupérer les instructions DNS (DKIM key)
    // Note: La clé DKIM est générée par Mailjet et disponible dans le dashboard
    // Pour l'instant, on retourne les instructions génériques
    const dnsInstructions = {
      spf: 'v=spf1 include:spf.mailjet.com ~all',
      dkim: 'Voir dashboard Mailjet pour récupérer la clé DKIM complète'
    };

    // TODO: Stocker l'association tenant <-> domaine custom dans DB
    // Pour l'instant, on utilise juste Mailjet comme source de vérité

    res.json({
      success: true,
      message: 'Domaine ajouté avec succès',
      sender_id: sender.ID,
      status: sender.Status,
      dns_instructions: dnsInstructions,
      next_steps: [
        'Ajoutez les enregistrements DNS SPF et DKIM',
        'La validation peut prendre jusqu\'à 48h',
        'Vérifiez le statut dans le dashboard Mailjet'
      ]
    });

  } catch (error) {
    console.error('[EMAIL_DOMAIN] Erreur:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      details: error.message
    });
  }
});

/**
 * GET /api/email/domain-status/:email
 * Vérifie le statut de validation d'un domaine
 */
router.get('/domain-status/:email', async (req, res) => {
  try {
    const { email } = req.params;

    const mailjetApiKey = process.env.MAILJET_API_KEY;
    const mailjetApiSecret = process.env.MAILJET_API_SECRET;

    if (!mailjetApiKey || !mailjetApiSecret) {
      return res.status(500).json({ error: 'Configuration Mailjet manquante' });
    }

    const auth = Buffer.from(`${mailjetApiKey}:${mailjetApiSecret}`).toString('base64');

    // Chercher le sender dans Mailjet
    const response = await fetch(`https://api.mailjet.com/v3/REST/sender?Email=${encodeURIComponent(email)}`, {
      headers: { 'Authorization': `Basic ${auth}` }
    });

    if (!response.ok) {
      return res.status(404).json({ error: 'Domaine non trouvé' });
    }

    const data = await response.json();

    if (!data.Data || data.Data.length === 0) {
      return res.status(404).json({ error: 'Domaine non trouvé' });
    }

    const sender = data.Data[0];

    res.json({
      email: sender.Email,
      status: sender.Status, // 'Active', 'Pending', 'Inactive'
      dns_id: sender.DNSID,
      created_at: sender.CreatedAt,
      validated: sender.Status === 'Active'
    });

  } catch (error) {
    console.error('[EMAIL_DOMAIN] Erreur vérification statut:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      details: error.message
    });
  }
});

export default router;