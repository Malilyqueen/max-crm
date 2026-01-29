/**
 * types/events.ts
 * Types TypeScript pour les message_events (Email, SMS, WhatsApp)
 */

// Canaux de communication supportés
export type Channel = 'email' | 'sms' | 'whatsapp';

// Statuts canoniques (normalisés backend)
export type EventStatus =
  | 'queued'        // En attente
  | 'sent'          // Envoyé
  | 'delivered'     // Livré
  | 'opened'        // Ouvert
  | 'clicked'       // Cliqué
  | 'replied'       // Répondu
  | 'failed'        // Échec
  | 'bounced'       // Rebond
  | 'undelivered'   // Non livré
  | 'blocked'       // Bloqué
  | 'spam'          // Spam
  | 'unsubscribed'  // Désabonné
  | 'received'          // Reçu (entrant)
  | 'received_unknown'  // Reçu (contact inconnu)
  | 'read';             // Lu (WhatsApp)

// Direction du message
export type Direction = 'in' | 'out';

// Providers
export type Provider = 'mailjet' | 'twilio' | 'greenapi';

// Event message (correspond à la table Supabase message_events)
export interface MessageEvent {
  id: string;
  tenant_id: string;
  channel: Channel;
  provider: Provider;
  direction: Direction;
  lead_id?: string | null;
  phone_number?: string | null;
  email?: string | null;
  provider_message_id: string;
  status: EventStatus;
  message_snippet?: string | null;
  raw_payload?: any;
  event_timestamp: string; // ISO 8601
  created_at: string; // ISO 8601
}

// Filtres pour recherche d'events
export interface EventFilters {
  channel?: Channel[];
  status?: EventStatus[];
  direction?: Direction;
  leadId?: string;
  search?: string; // Email ou phone
  startDate?: string; // ISO date
  endDate?: string; // ISO date
}

// Réponse API liste events
export interface EventsListResponse {
  ok: boolean;
  items: MessageEvent[];
  total: number;
  page: number;
  limit: number;
  nextCursor: number | null;
  hasMore: boolean;
}

// Réponse API events d'un lead
export interface LeadEventsResponse {
  ok: boolean;
  leadId: string;
  events: MessageEvent[];
  total: number;
}

// Stats par canal
export interface ChannelStats {
  sent: number;
  delivered: number;
  opened?: number; // Email only
  clicked?: number; // Email only
  read?: number; // WhatsApp only
  failed: number;
  total: number;
  deliveryRate: number; // Pourcentage
}

// Point timeseries
export interface TimeseriesPoint {
  date: string; // YYYY-MM-DD
  email: number;
  sms: number;
  whatsapp: number;
}

// Réponse API stats
export interface EventsStatsResponse {
  ok: boolean;
  range: string;
  startDate: string;
  endDate: string;
  statsByChannel: {
    email: ChannelStats;
    sms: ChannelStats;
    whatsapp: ChannelStats;
  };
  inboundTotal: number;
  timeseries: TimeseriesPoint[];
  totalEvents: number;
}

// Helper types pour UI
export interface ChannelConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}

export const CHANNEL_CONFIGS: Record<Channel, ChannelConfig> = {
  email: {
    label: 'Email',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    icon: '📧'
  },
  sms: {
    label: 'SMS',
    color: '#8b5cf6',
    bgColor: '#ede9fe',
    icon: '💬'
  },
  whatsapp: {
    label: 'WhatsApp',
    color: '#10b981',
    bgColor: '#d1fae5',
    icon: '📱'
  }
};

export const STATUS_CONFIGS: Record<EventStatus, { label: string; color: string; emoji: string }> = {
  queued: { label: 'En attente', color: '#f59e0b', emoji: '⏳' },
  sent: { label: 'Envoyé', color: '#3b82f6', emoji: '📤' },
  delivered: { label: 'Livré', color: '#10b981', emoji: '✅' },
  opened: { label: 'Ouvert', color: '#10b981', emoji: '👁️' },
  clicked: { label: 'Cliqué', color: '#10b981', emoji: '🔗' },
  replied: { label: 'Répondu', color: '#10b981', emoji: '💬' },
  failed: { label: 'Échec', color: '#ef4444', emoji: '❌' },
  bounced: { label: 'Rebond', color: '#ef4444', emoji: '⚠️' },
  undelivered: { label: 'Non livré', color: '#ef4444', emoji: '❌' },
  blocked: { label: 'Bloqué', color: '#ef4444', emoji: '🚫' },
  spam: { label: 'Spam', color: '#ef4444', emoji: '🗑️' },
  unsubscribed: { label: 'Désabonné', color: '#6b7280', emoji: '🚪' },
  received: { label: 'Reçu', color: '#3b82f6', emoji: '📥' },
  received_unknown: { label: 'Reçu (inconnu)', color: '#9ca3af', emoji: '❓' },
  read: { label: 'Lu', color: '#10b981', emoji: '✅✅' }
};
