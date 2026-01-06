/**
 * whatsapp-message-presets.js
 * Presets de templates WhatsApp approuvés par Twilio
 *
 * Ces presets sont automatiquement importés au démarrage de MAX
 * pour permettre à M.A.X. d'envoyer des messages sans manipuler les ContentSid
 */

export const WHATSAPP_MESSAGE_PRESETS = [
  // ========== RENDEZ-VOUS / APPOINTMENTS ==========
  {
    id: 'appointment_confirm_text_v1',
    tenantId: 'macrea',
    name: 'Confirmation RDV - TEXT (MVP)',
    type: 'appointment',
    templateName: 'appointment_confirm_text_v1',
    contentSid: 'HXb52bb079e24d459e6b3962a49213096e',  // ✅ FONCTIONNE dans le Sandbox
    variables: ['prenom', 'date', 'heure'],
    mode: 'text',
    messageText: 'Bonjour {{prenom}} 👋\n\nVotre rendez-vous est prévu le {{date}} à {{heure}}.\n\nMerci de répondre "oui" pour confirmer ou "non" pour annuler.',
    description: '✅ Template TEXT qui fonctionne dans le Sandbox - Réponse texte libre OUI/NON'
  },
  {
    id: 'appointment_confirm_v1',
    tenantId: 'macrea',
    name: 'Confirmation RDV - Quick Reply',
    type: 'appointment',
    templateName: 'appointment_confirmation_v1',
    contentSid: 'HXd70815ab2465aaed6ab72fde5018021a',  // PRIORITAIRE - Template structuré avec contexte complet
    variables: ['prenom', 'date', 'heure', 'leadId', 'tenantId'],
    mode: 'quick_reply',
    buttons: [
      {
        action: 'confirm',
        label: '✅ Confirmer',
        payload: 'action=confirm|type=appointment|lead={{4}}|tenant={{5}}'
      },
      {
        action: 'cancel',
        label: '❌ Annuler',
        payload: 'action=cancel|type=appointment|lead={{4}}|tenant={{5}}'
      }
    ],
    messageText: 'Bonjour {{prenom}},\n\nVotre rendez-vous est confirmé le {{date}} à {{heure}}.\n\nMerci de confirmer votre présence.',
    description: 'Confirmation de RDV avec boutons Confirmer/Annuler (payload structuré avec leadId/tenantId)'
  },
  {
    id: 'appointment_confirm_simple_v1',
    tenantId: 'macrea',
    name: 'Confirmation RDV - OUI/NON',
    type: 'appointment',
    templateName: 'appointment_confirmation_simple_v1',
    contentSid: 'HX8903819c78549d63782e7209d9ce8b8c',  // FALLBACK - Template simple OUI/NON
    variables: ['prenom', 'date', 'heure'],
    mode: 'quick_reply',
    buttons: [
      {
        action: 'yes',
        label: 'OUI',
        payload: 'OUI'
      },
      {
        action: 'no',
        label: 'NON',
        payload: 'NON'
      }
    ],
    messageText: 'Bonjour {{prenom}},\n\nVotre rendez-vous est confirmé le {{date}} à {{heure}}.\n\nMerci de confirmer votre présence.',
    description: 'Confirmation de RDV avec boutons OUI/NON (payload simple, nécessite reconstruction contexte)'
  },
  {
    id: 'appointment_reminder_v1',
    tenantId: 'macrea',
    name: 'Rappel RDV',
    type: 'appointment',
    templateName: 'appointment_reminder_v1',
    contentSid: 'HX43ff9d92de715f0d410727f0287d47b7',
    variables: ['prenom', 'date', 'heure'],
    mode: 'text',
    messageText: 'Bonjour {{prenom}},\n\nRappel : votre rendez-vous est prévu le {{date}} à {{heure}}.\n\nÀ bientôt !',
    description: 'Rappel de RDV 24h avant'
  },

  // ========== RELANCES / FOLLOW-UP ==========
  {
    id: 'followup_j1_v1',
    tenantId: 'macrea',
    name: 'Relance J+1',
    type: 'follow_up',
    templateName: 'followup_j1_v1',
    contentSid: 'HX8edc734256e6b70b5d73bc61a7921505',
    variables: ['prenom', 'produit'],
    mode: 'text',
    messageText: 'Bonjour {{prenom}},\n\nVous avez manifesté un intérêt pour {{produit}}.\n\nAvez-vous des questions ?',
    description: 'Relance 1 jour après premier contact'
  },
  {
    id: 'followup_j3_v1',
    tenantId: 'macrea',
    name: 'Relance J+3',
    type: 'follow_up',
    templateName: 'followup_j3_v1',
    contentSid: 'HX70f182f65f2ebd94b9cd80679bf039e1',
    variables: ['prenom'],
    mode: 'text',
    messageText: 'Bonjour {{prenom}},\n\nJe reviens vers vous concernant votre demande.\n\nÊtes-vous toujours intéressé(e) ?',
    description: 'Relance 3 jours après premier contact'
  },

  // ========== PANIER ABANDONNÉ / CART ==========
  {
    id: 'cart_abandoned_v1',
    tenantId: 'macrea',
    name: 'Panier abandonné - simple',
    type: 'cart',
    templateName: 'cart_abandoned_v1',
    contentSid: 'HX61f249a45e5bbb10e7c26efce55c6446',
    variables: ['prenom', 'montant', 'produit'],
    mode: 'text',
    messageText: 'Bonjour {{prenom}},\n\nVous avez laissé {{produit}} dans votre panier ({{montant}}).\n\nFinalisez votre commande maintenant !',
    description: 'Rappel panier abandonné simple (TEXT)'
  },
  {
    id: 'cart_abandoned_cta_v1',
    tenantId: 'macrea',
    name: 'Panier abandonné - CTA',
    type: 'cart',
    templateName: 'cart_abandoned_cta_v1',
    contentSid: 'HXd256a89aed1c3b4ab6fd19f53eab7b82',
    variables: ['prenom', 'montant', 'payload'],
    mode: 'cta',
    buttons: [
      {
        action: 'view_cart',
        label: 'Finaliser ma commande',
        url: 'https://shop.macrea.fr/cart/{{3}}'
      }
    ],
    messageText: 'Bonjour {{prenom}},\n\nVous avez laissé des articles dans votre panier ({{montant}}).\n\nFinalisez maintenant !',
    description: 'Panier abandonné avec bouton CTA (URL avec payload encodé)',
    payloadEncoding: true,
    payloadSchema: {
      cartToken: 'string',
      leadId: 'string',
      tenantId: 'string'
    }
  },

  // ========== ÉVÉNEMENTS / EVENTS ==========
  {
    id: 'event_register_v1',
    tenantId: 'macrea',
    name: 'Inscription événement',
    type: 'event',
    templateName: 'event_register_v1',
    contentSid: 'HXf257b92197254aaae707f913a137a76e',
    variables: ['prenom', 'eventName', 'date'],
    mode: 'text',
    messageText: 'Bonjour {{prenom}},\n\nVotre inscription à {{eventName}} est confirmée pour le {{date}}.\n\nÀ très bientôt !',
    description: 'Confirmation d\'inscription à un événement'
  },
  {
    id: 'event_reminder_v1',
    tenantId: 'macrea',
    name: 'Rappel événement',
    type: 'event',
    templateName: 'event_reminder_v1',
    contentSid: 'HX6cb41ef6b121945edd43c5d5ec837f17',
    variables: ['prenom', 'eventName', 'heure'],
    mode: 'text',
    messageText: 'Bonjour {{prenom}},\n\nRappel : {{eventName}} commence à {{heure}}.\n\nOn vous attend !',
    description: 'Rappel d\'événement le jour J'
  },

  // ========== COMMANDES / ORDERS ==========
  {
    id: 'order_confirmation_v1',
    tenantId: 'macrea',
    name: 'Confirmation de commande',
    type: 'cart',  // Changé de 'order' à 'cart' car seuls appointment, cart, event, follow_up sont acceptés
    templateName: 'order_confirmation_v1',
    contentSid: 'HX3e935c08c5ab094d54ebb9ef15073051',
    variables: ['prenom', 'orderId', 'montant'],
    mode: 'text',
    messageText: 'Bonjour {{prenom}},\n\nVotre commande #{{orderId}} ({{montant}}) est confirmée.\n\nMerci pour votre confiance !',
    description: 'Confirmation de commande'
  }
];

/**
 * Récupère un preset par son nom
 * @param {string} name - Nom du preset (ex: "Confirmation RDV - TEXT only")
 * @returns {Object|null} - Preset trouvé ou null
 */
export function getPresetByName(name) {
  return WHATSAPP_MESSAGE_PRESETS.find(
    preset => preset.name.toLowerCase() === name.toLowerCase()
  ) || null;
}

/**
 * Récupère un preset par son templateName Twilio
 * @param {string} templateName - Nom du template Twilio (ex: "appointment_confirm_text_v1")
 * @returns {Object|null} - Preset trouvé ou null
 */
export function getPresetByTemplateName(templateName) {
  return WHATSAPP_MESSAGE_PRESETS.find(
    preset => preset.templateName === templateName
  ) || null;
}

/**
 * Récupère tous les presets d'un type donné
 * @param {string} type - Type de preset (appointment, follow_up, cart, event, order)
 * @returns {Array} - Liste des presets du type
 */
export function getPresetsByType(type) {
  return WHATSAPP_MESSAGE_PRESETS.filter(preset => preset.type === type);
}

/**
 * Récupère tous les presets avec boutons
 * @returns {Array} - Liste des presets avec boutons (Quick Reply ou CTA)
 */
export function getPresetsWithButtons() {
  return WHATSAPP_MESSAGE_PRESETS.filter(
    preset => preset.mode === 'quick_reply' || preset.mode === 'cta'
  );
}

/**
 * Génère un payload encodé pour les templates CTA
 * @param {Object} data - Données à encoder { cartToken, leadId, tenantId, ... }
 * @returns {string} - Payload encodé en base64url
 */
export function generatePayload(data) {
  const jsonString = JSON.stringify(data);
  // Encode en base64 puis remplace les caractères non URL-safe
  return Buffer.from(jsonString)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Décode un payload encodé
 * @param {string} payload - Payload encodé
 * @returns {Object} - Données décodées
 */
export function decodePayload(payload) {
  try {
    // Reconvertir en base64 standard
    const base64 = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    // Ajouter le padding si nécessaire
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');

    const jsonString = Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('[decodePayload] Erreur décodage:', error);
    return null;
  }
}

export default WHATSAPP_MESSAGE_PRESETS;
