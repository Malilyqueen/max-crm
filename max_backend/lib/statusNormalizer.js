/**
 * lib/statusNormalizer.js
 * Normalisation des statuts d'events multi-providers vers format canonique MAX
 */

/**
 * Statuts canoniques MAX (agnostiques du provider)
 */
export const CANONICAL_STATUSES = {
  // Statuts sortants (direction: out)
  queued: 'queued',           // Provider a accepté, pas encore envoyé
  sent: 'sent',               // Envoyé par le provider
  delivered: 'delivered',     // Reçu par le destinataire
  opened: 'opened',           // Email/message ouvert
  clicked: 'clicked',         // Lien cliqué
  replied: 'replied',         // Destinataire a répondu

  // Statuts échec
  failed: 'failed',           // Échec générique
  bounced: 'bounced',         // Email bounced (hard/soft)
  undelivered: 'undelivered', // SMS/WhatsApp non livré
  blocked: 'blocked',         // Bloqué par provider

  // Statuts négatifs utilisateur
  spam: 'spam',               // Marqué spam
  unsubscribed: 'unsubscribed', // Désabonnement

  // Statuts entrants (direction: in)
  received: 'received',       // Message entrant reçu

  // Statut WhatsApp spécifique
  read: 'read'                // WhatsApp read receipt
};

/**
 * Mapping Mailjet → Canonique
 */
const MAILJET_STATUS_MAP = {
  'sent': 'sent',
  'delivered': 'delivered',
  'open': 'opened',
  'click': 'clicked',
  'bounce': 'bounced',
  'spam': 'spam',
  'blocked': 'blocked',
  'unsub': 'unsubscribed'
};

/**
 * Mapping Twilio SMS → Canonique
 */
const TWILIO_STATUS_MAP = {
  'queued': 'queued',
  'sent': 'sent',
  'delivered': 'delivered',
  'undelivered': 'undelivered',
  'failed': 'failed',
  'received': 'received'  // SMS entrant
};

/**
 * Mapping Green-API WhatsApp → Canonique
 */
const GREENAPI_STATUS_MAP = {
  'sent': 'sent',
  'delivered': 'delivered',
  'read': 'read',
  'failed': 'failed',
  'received': 'received'  // WhatsApp entrant
};

/**
 * Normalise un statut provider vers le format canonique MAX
 *
 * @param {string} providerStatus - Statut brut du provider
 * @param {string} provider - Provider source (mailjet, twilio, greenapi)
 * @returns {string} Statut canonique
 */
export function normalizeStatus(providerStatus, provider) {
  if (!providerStatus) {
    console.warn('[STATUS_NORMALIZER] ⚠️ Status vide, retour "sent" par défaut');
    return 'sent';
  }

  const statusLower = providerStatus.toLowerCase().trim();

  let mapping;
  switch (provider) {
    case 'mailjet':
      mapping = MAILJET_STATUS_MAP;
      break;
    case 'twilio':
      mapping = TWILIO_STATUS_MAP;
      break;
    case 'greenapi':
      mapping = GREENAPI_STATUS_MAP;
      break;
    default:
      console.warn(`[STATUS_NORMALIZER] ⚠️ Provider inconnu: ${provider}, pas de normalisation`);
      return statusLower;
  }

  const canonicalStatus = mapping[statusLower];

  if (!canonicalStatus) {
    console.warn(`[STATUS_NORMALIZER] ⚠️ Statut inconnu pour ${provider}: "${statusLower}", retour brut`);
    return statusLower;
  }

  return canonicalStatus;
}

/**
 * Vérifie si un statut canonique est un échec
 *
 * @param {string} canonicalStatus - Statut canonique
 * @returns {boolean}
 */
export function isFailureStatus(canonicalStatus) {
  return ['failed', 'bounced', 'undelivered', 'blocked'].includes(canonicalStatus);
}

/**
 * Vérifie si un statut canonique est un succès complet
 *
 * @param {string} canonicalStatus - Statut canonique
 * @returns {boolean}
 */
export function isSuccessStatus(canonicalStatus) {
  return ['delivered', 'opened', 'clicked', 'read'].includes(canonicalStatus);
}

/**
 * Retourne un emoji pour un statut canonique (UI)
 *
 * @param {string} canonicalStatus - Statut canonique
 * @returns {string} Emoji
 */
export function getStatusEmoji(canonicalStatus) {
  const emojiMap = {
    queued: '⏳',
    sent: '📤',
    delivered: '✅',
    opened: '👁️',
    clicked: '🔗',
    replied: '💬',
    failed: '❌',
    bounced: '⚠️',
    undelivered: '❌',
    blocked: '🚫',
    spam: '🗑️',
    unsubscribed: '🚪',
    received: '📥',
    read: '✅✅'
  };

  return emojiMap[canonicalStatus] || '📋';
}

/**
 * Retourne une couleur pour un statut canonique (UI)
 *
 * @param {string} canonicalStatus - Statut canonique
 * @returns {string} Couleur hex
 */
export function getStatusColor(canonicalStatus) {
  if (isSuccessStatus(canonicalStatus)) return '#10b981'; // green
  if (isFailureStatus(canonicalStatus)) return '#ef4444'; // red
  if (canonicalStatus === 'queued') return '#f59e0b'; // orange
  if (canonicalStatus === 'sent') return '#3b82f6'; // blue
  return '#6b7280'; // gray
}