/**
 * Configuration des templates WhatsApp
 *
 * Chaque template définit:
 * - id: Identifiant unique interne
 * - name: Nom métier du template
 * - contentSid: Content SID Twilio/Meta (commence par HX...)
 * - variables: Variables à remplir dans le template
 * - buttons: Boutons disponibles (action + label)
 * - payloadFormat: Format du payload pour les boutons avec placeholders
 * - category: Catégorie métier (confirmation, relance, marketing...)
 */

export const WHATSAPP_TEMPLATES = {
  'appointment_confirmation': {
    id: 'appointment_confirmation',
    name: 'Confirmation de rendez-vous',
    contentSid: 'HXb6fda8e4bcefed455d5c3f8a5c3d4a44', // À remplacer par ton vrai ContentSid
    variables: ['date', 'time'],
    variablesDescription: {
      date: 'Date du rendez-vous (ex: 15/12/2025)',
      time: 'Heure du rendez-vous (ex: 14h30)'
    },
    buttons: [
      { action: 'confirm', label: 'Confirm', type: 'QUICK_REPLY' },
      { action: 'cancel', label: 'Cancel', type: 'QUICK_REPLY' }
    ],
    payloadFormat: '{{action}}|tenant={{tenantId}}|contact={{contactId}}|type=appointment',
    category: 'confirmation',
    description: 'Template pour confirmer un rendez-vous avec boutons Confirm/Cancel'
  },

  'relance_j3': {
    id: 'relance_j3',
    name: 'Relance J+3',
    contentSid: null, // Pas de template - message libre
    variables: ['nom', 'produit'],
    variablesDescription: {
      nom: 'Nom du contact',
      produit: 'Produit ou service concerné'
    },
    buttons: [],
    payloadFormat: null,
    category: 'relance',
    description: 'Message libre de relance 3 jours après premier contact'
  }
};

/**
 * Récupère un template par son ID
 */
export function getTemplate(templateId) {
  const template = WHATSAPP_TEMPLATES[templateId];
  if (!template) {
    throw new Error(`Template WhatsApp introuvable: ${templateId}`);
  }
  return template;
}

/**
 * Liste tous les templates disponibles
 */
export function listTemplates(category = null) {
  const templates = Object.values(WHATSAPP_TEMPLATES);
  if (category) {
    return templates.filter(t => t.category === category);
  }
  return templates;
}

/**
 * Valide les variables fournies pour un template
 */
export function validateTemplateVariables(templateId, variables) {
  const template = getTemplate(templateId);
  const missing = template.variables.filter(v => !(v in variables));

  if (missing.length > 0) {
    throw new Error(
      `Variables manquantes pour le template ${templateId}: ${missing.join(', ')}`
    );
  }

  return true;
}

/**
 * Construit le payload d'un bouton avec les données du context
 */
export function buildButtonPayload(templateId, action, context) {
  const template = getTemplate(templateId);

  if (!template.payloadFormat) {
    throw new Error(`Le template ${templateId} n'a pas de format de payload défini`);
  }

  // Remplacer les placeholders dans le format
  let payload = template.payloadFormat
    .replace('{{action}}', action)
    .replace('{{tenantId}}', context.tenantId)
    .replace('{{contactId}}', context.contactId);

  // Ajouter d'autres données du context si nécessaire
  if (context.metadata) {
    Object.entries(context.metadata).forEach(([key, value]) => {
      payload = payload.replace(`{{${key}}}`, value);
    });
  }

  return payload;
}

/**
 * Parse un payload de bouton reçu de WhatsApp
 */
export function parseButtonPayload(payload) {
  const parts = payload.split('|');
  const parsed = {};

  parts.forEach(part => {
    const [key, value] = part.split('=');
    if (key && value) {
      parsed[key] = value;
    } else {
      // Premier élément sans '=' est l'action
      parsed.action = part;
    }
  });

  return parsed;
}

export default WHATSAPP_TEMPLATES;
