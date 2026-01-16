/**
 * Types pour le système de providers self-service
 * Email, SMS, WhatsApp avec credentials chiffrés
 */

export type ProviderType =
  | 'mailjet'
  | 'sendgrid'
  | 'smtp'
  | 'gmail'
  | 'twilio_sms'
  | 'twilio_whatsapp'
  | 'greenapi_whatsapp';

export type ConnectionStatus = 'non_testé' | 'success' | 'failed';

export type ChannelType = 'email' | 'sms' | 'whatsapp';

export interface Provider {
  id: number;
  tenant_id: string;
  provider_type: ProviderType;
  provider_name: string | null;
  connection_status: ConnectionStatus;
  last_test_error: string | null;
  last_tested_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderWithCredentials extends Provider {
  credentials: Record<string, any>;
}

export interface TestResult {
  success: boolean;
  status: 'success' | 'failed';
  message: string;
  error: string | null;
  details?: any;
}

export interface ProviderFormData {
  provider_type: ProviderType;
  provider_name?: string;
  credentials: Record<string, any>;
  is_active?: boolean;
}

// Credentials par provider type
export interface MailjetCredentials {
  apiKey: string;
  apiSecret: string;
}

export interface SendGridCredentials {
  apiKey: string;
}

export interface SmtpCredentials {
  host: string;
  port: number;
  user: string;
  password: string;
  secure?: boolean;
}

export interface GmailCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  phoneNumber: string; // Format: +33... (international)
}

export interface GreenApiCredentials {
  instanceId: string;
  token: string;
}

// Métadonnées providers (pour UI)
export interface ProviderMetadata {
  type: ProviderType;
  name: string;
  icon: string;
  description: string;
  channel: ChannelType;
  docsUrl: string;
  recommended?: boolean;
}

export const PROVIDER_METADATA: Record<ProviderType, ProviderMetadata> = {
  mailjet: {
    type: 'mailjet',
    name: 'Mailjet',
    icon: '📮',
    description: 'Service d\'email marketing et transactionnel',
    channel: 'email',
    docsUrl: 'https://dev.mailjet.com/email/guides/getting-started/',
    recommended: true
  },
  sendgrid: {
    type: 'sendgrid',
    name: 'SendGrid',
    icon: '📨',
    description: 'Service d\'email transactionnel de Twilio',
    channel: 'email',
    docsUrl: 'https://docs.sendgrid.com/for-developers/sending-email/api-getting-started'
  },
  smtp: {
    type: 'smtp',
    name: 'SMTP',
    icon: '📧',
    description: 'Connectez n\'importe quel serveur SMTP (Gmail, Outlook, etc.)',
    channel: 'email',
    docsUrl: 'https://en.wikipedia.org/wiki/Simple_Mail_Transfer_Protocol'
  },
  gmail: {
    type: 'gmail',
    name: 'Gmail OAuth',
    icon: '📬',
    description: 'Envoyez des emails via votre compte Gmail (OAuth2)',
    channel: 'email',
    docsUrl: 'https://developers.google.com/gmail/api/guides'
  },
  twilio_sms: {
    type: 'twilio_sms',
    name: 'Twilio SMS',
    icon: '📱',
    description: 'Service d\'envoi de SMS avec Twilio',
    channel: 'sms',
    docsUrl: 'https://www.twilio.com/docs/sms'
  },
  twilio_whatsapp: {
    type: 'twilio_whatsapp',
    name: 'Twilio WhatsApp',
    icon: '💬',
    description: 'WhatsApp Business API via Twilio',
    channel: 'whatsapp',
    docsUrl: 'https://www.twilio.com/docs/whatsapp'
  },
  greenapi_whatsapp: {
    type: 'greenapi_whatsapp',
    name: 'WhatsApp Pro',
    icon: '💬',
    description: 'Connectez votre WhatsApp professionnel à MAX CRM',
    channel: 'whatsapp',
    docsUrl: 'https://docs.studiomacrea.cloud/whatsapp', // Docs internes
    recommended: true
  }
};

// Helper: récupérer providers par canal
export function getProvidersByChannel(providers: Provider[], channel: ChannelType): Provider[] {
  return providers.filter(p => PROVIDER_METADATA[p.provider_type]?.channel === channel);
}

// Helper: vérifier si un canal est configuré
export function isChannelConfigured(providers: Provider[], channel: ChannelType): boolean {
  return getProvidersByChannel(providers, channel).length > 0;
}

// Helper: récupérer le provider actif d'un canal
export function getActiveProvider(providers: Provider[], channel: ChannelType): Provider | null {
  const channelProviders = getProvidersByChannel(providers, channel);
  return channelProviders.find(p => p.is_active) || null;
}

// Helper: formater le timestamp relatif
export function formatRelativeTime(timestamp: string | null): string {
  if (!timestamp) return 'Jamais';

  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
  if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
  if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;

  return then.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: then.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

// Helper: statut badge color
export function getStatusColor(status: ConnectionStatus): {
  bg: string;
  text: string;
  icon: string;
} {
  switch (status) {
    case 'success':
      return { bg: 'bg-green-100', text: 'text-green-700', icon: '✅' };
    case 'failed':
      return { bg: 'bg-red-100', text: 'text-red-700', icon: '❌' };
    case 'non_testé':
    default:
      return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '⚠️' };
  }
}
