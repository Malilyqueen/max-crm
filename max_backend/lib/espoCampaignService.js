/**
 * Service d'intégration EspoCRM pour les campagnes
 *
 * Crée des campagnes Email/SMS dans EspoCRM avec les contenus générés par M.A.X.
 */

const ESPO_BASE = process.env.ESPO_BASE || 'http://127.0.0.1:8081/espocrm';
const ESPO_API_KEY = process.env.ESPO_API_KEY || process.env.ESPO_ADMIN_API_KEY;

/**
 * Créer une campagne Email dans EspoCRM
 * @param {Object} params - Paramètres de la campagne
 * @returns {Object} - Résultat avec l'ID de la campagne et l'URL d'édition
 */
export async function createEmailCampaign(params) {
  const { name, objective, target, emailSubject, emailBody, emailCta } = params;

  // Construire le corps HTML de l'email
  const htmlBody = buildEmailHtml(emailBody, emailCta);

  // Créer l'EmailTemplate d'abord
  const templateRes = await fetch(`${ESPO_BASE}/api/v1/EmailTemplate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': ESPO_API_KEY
    },
    body: JSON.stringify({
      name: `${name} - Template`,
      subject: emailSubject,
      body: htmlBody,
      isHtml: true
    })
  });

  if (!templateRes.ok) {
    const error = await templateRes.text();
    throw new Error(`Erreur création template: ${error}`);
  }

  const template = await templateRes.json();

  // Créer la Campaign
  const campaignRes = await fetch(`${ESPO_BASE}/api/v1/Campaign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': ESPO_API_KEY
    },
    body: JSON.stringify({
      name,
      type: 'Email',
      status: 'Planning',
      description: `Objectif: ${objective}\nCible: ${target}\n\n✨ Généré par M.A.X.`,
      targetListsIds: [], // À remplir par l'utilisateur dans EspoCRM
      emailTemplateId: template.id
    })
  });

  if (!campaignRes.ok) {
    const error = await campaignRes.text();
    throw new Error(`Erreur création campagne: ${error}`);
  }

  const campaign = await campaignRes.json();

  return {
    ok: true,
    campaignId: campaign.id,
    templateId: template.id,
    editUrl: `${ESPO_BASE}/#Campaign/view/${campaign.id}`,
    templateEditUrl: `${ESPO_BASE}/#EmailTemplate/edit/${template.id}`
  };
}

/**
 * Créer une campagne SMS via une entité custom ou Note
 * Note: EspoCRM n'a pas de type Campaign SMS natif
 * On crée une Campaign avec type custom
 */
export async function createSmsCampaign(params) {
  const { name, objective, target, smsMessage } = params;

  const campaignRes = await fetch(`${ESPO_BASE}/api/v1/Campaign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': ESPO_API_KEY
    },
    body: JSON.stringify({
      name,
      type: 'Mail', // On utilise Mail comme fallback, ou créer un type custom
      status: 'Planning',
      description: `📱 CAMPAGNE SMS\n\nObjectif: ${objective}\nCible: ${target}\n\nMessage SMS:\n${smsMessage}\n\n✨ Généré par M.A.X.`
    })
  });

  if (!campaignRes.ok) {
    const error = await campaignRes.text();
    throw new Error(`Erreur création campagne SMS: ${error}`);
  }

  const campaign = await campaignRes.json();

  return {
    ok: true,
    campaignId: campaign.id,
    editUrl: `${ESPO_BASE}/#Campaign/view/${campaign.id}`,
    note: 'Le message SMS est dans la description. Vous pouvez l\'éditer et configurer l\'envoi via un workflow n8n.'
  };
}

/**
 * Construire le HTML d'un email avec mise en forme basique
 */
function buildEmailHtml(body, cta) {
  const ctaHtml = cta ? `
    <div style="margin: 30px 0; text-align: center;">
      <a href="#" style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
        ${cta}
      </a>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    ${body.split('\n').map(para => `<p style="margin: 15px 0;">${para}</p>`).join('')}
    ${ctaHtml}
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
      <p>✨ Message généré avec M.A.X. - Votre Copilote IA CRM</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export default {
  createEmailCampaign,
  createSmsCampaign
};
