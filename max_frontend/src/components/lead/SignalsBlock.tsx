/**
 * components/lead/SignalsBlock.tsx
 * Bloc affichant les signaux d'un lead
 *
 * Signaux affichés:
 * - Canaux ouverts (WhatsApp, Email, SMS)
 * - Dernière interaction
 * - Temps depuis dernière réponse
 * - Niveau d'engagement
 * - Score lead (si disponible)
 * - Recommandation M.A.X.
 */

import React, { useMemo } from 'react';
import {
  Radio, MessageCircle, Mail, Smartphone, Phone, Clock, BarChart3,
  Target, Send, Flame, CheckCircle, AlertTriangle, Sparkles, Edit3, Check
} from 'lucide-react';
import type { Lead } from '../../types/crm';

interface SignalsBlockProps {
  lead: Lead;
  events?: Array<{
    id: string;
    channel: string;
    direction: string;
    status: string;
    created_at: string;
  }>;
  className?: string;
  onExecuteAction?: (action: RecommendedAction) => void;
  isExecuting?: boolean;
}

export interface RecommendedAction {
  type: 'relance_j3' | 'relance_j1' | 'contact_urgent' | 'premier_contact';
  label: string;
  channel?: 'whatsapp' | 'email' | 'sms';
  reason: string;
}

interface Signal {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'gray';
  tooltip?: string;
  reason?: string; // "Pourquoi" - affiché directement pour les recommandations
  action?: RecommendedAction; // Action exécutable
}

export function SignalsBlock({
  lead,
  events = [],
  className = '',
  onExecuteAction,
  isExecuting = false
}: SignalsBlockProps) {
  // Calculer les signaux basés sur les données du lead et les events
  const signals = useMemo(() => {
    const result: Signal[] = [];

    // 1. Canaux ouverts
    const openChannels = getOpenChannels(lead, events);
    if (openChannels.length > 0) {
      result.push({
        icon: <Radio className="w-5 h-5" />,
        label: 'Canaux actifs',
        value: openChannels.join(', '),
        color: 'green',
        tooltip: 'Canaux de communication disponibles pour ce lead'
      });
    } else {
      result.push({
        icon: <Radio className="w-5 h-5" />,
        label: 'Canaux actifs',
        value: 'Aucun',
        color: 'gray',
        tooltip: 'Aucun canal de communication identifié'
      });
    }

    // 2. Dernière interaction
    const lastInteraction = getLastInteraction(lead, events);
    if (lastInteraction) {
      const hoursSince = getHoursSince(lastInteraction.date);
      result.push({
        icon: lastInteraction.icon,
        label: 'Dernière interaction',
        value: formatTimeAgo(lastInteraction.date),
        color: hoursSince < 24 ? 'green' : hoursSince < 72 ? 'yellow' : 'red',
        tooltip: `${lastInteraction.type} - ${lastInteraction.date.toLocaleString('fr-FR')}`
      });
    }

    // 3. Temps sans réponse (si message sortant sans réponse)
    const waitingResponse = getWaitingResponseTime(events);
    if (waitingResponse) {
      result.push({
        icon: '⏳',
        label: 'En attente réponse',
        value: formatTimeAgo(waitingResponse.since),
        color: waitingResponse.hours < 24 ? 'blue' : waitingResponse.hours < 72 ? 'yellow' : 'red',
        tooltip: `Message ${waitingResponse.channel} envoyé le ${waitingResponse.since.toLocaleString('fr-FR')}`
      });
    }

    // 4. Niveau d'engagement
    const engagement = calculateEngagement(lead, events);
    result.push({
      icon: engagement.icon,
      label: 'Engagement',
      value: engagement.level,
      color: engagement.color,
      tooltip: engagement.tooltip
    });

    // 5. Score lead (si disponible)
    if (lead.score !== undefined && lead.score !== null) {
      const scoreColor = lead.score >= 80 ? 'green' : lead.score >= 50 ? 'yellow' : 'red';
      result.push({
        icon: <BarChart3 className="w-5 h-5" />,
        label: 'Score',
        value: `${lead.score}/100`,
        color: scoreColor,
        tooltip: `Score de qualification: ${lead.score}%`
      });
    }

    // 6. Recommandation M.A.X.
    const recommendation = getRecommendation(lead, events);
    if (recommendation) {
      result.push({
        icon: <Target className="w-5 h-5" />,
        label: 'Action suggérée',
        value: recommendation.action,
        color: recommendation.priority === 'urgent' ? 'red' : recommendation.priority === 'high' ? 'yellow' : 'blue',
        tooltip: recommendation.reason,
        reason: recommendation.reason, // Afficher le "Pourquoi" directement
        action: recommendation.actionData // Action exécutable
      });
    }

    return result;
  }, [lead, events]);

  const colorClasses = {
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200'
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-gray-600" />
        <h3 className="font-semibold text-gray-900">Signaux</h3>
        <span className="text-xs text-gray-400 ml-auto">Analyse M.A.X.</span>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {signals.map((signal, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${colorClasses[signal.color]} transition-all hover:shadow-sm ${signal.reason ? 'col-span-2' : ''}`}
              title={signal.tooltip}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="flex-shrink-0">{signal.icon}</span>
                <span className="text-xs font-medium opacity-70">{signal.label}</span>
              </div>
              <div className="text-sm font-semibold truncate">{signal.value}</div>
              {/* Afficher le "Pourquoi" pour les recommandations */}
              {signal.reason && (
                <div className="mt-2 pt-2 border-t border-current/10">
                  <span className="text-xs font-medium opacity-60">Pourquoi : </span>
                  <span className="text-xs opacity-80">{signal.reason}</span>
                </div>
              )}
              {/* Bouton pour noter l'action comme faite */}
              {signal.action && onExecuteAction && (
                <div className="mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onExecuteAction(signal.action!);
                    }}
                    disabled={isExecuting}
                    className={`
                      w-full px-3 py-2 rounded-md text-sm font-medium
                      transition-all duration-200
                      ${isExecuting
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700 active:scale-[0.98] shadow-sm hover:shadow'
                      }
                    `}
                  >
                    {isExecuting ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Enregistrement...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Check className="w-4 h-4" />
                        Marquer comme fait
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper functions

function getOpenChannels(lead: Lead, events: any[]): string[] {
  const channels: string[] = [];

  // Check lead data
  if (lead.emailAddress || lead.email) channels.push('Email');
  if (lead.phoneNumber || lead.phone) {
    channels.push('SMS');
    // Assume WhatsApp is available if phone is available
    channels.push('WhatsApp');
  }

  // Check events for confirmed channels
  const eventChannels = new Set(events.map(e => e.channel).filter(Boolean));
  if (eventChannels.has('whatsapp') && !channels.includes('WhatsApp')) channels.push('WhatsApp');
  if (eventChannels.has('email') && !channels.includes('Email')) channels.push('Email');
  if (eventChannels.has('sms') && !channels.includes('SMS')) channels.push('SMS');

  return channels;
}

function getLastInteraction(lead: Lead, events: any[]): { date: Date; type: string; icon: React.ReactNode } | null {
  // Sort events by date descending
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (sortedEvents.length > 0) {
    const lastEvent = sortedEvents[0];
    const icons: Record<string, React.ReactNode> = {
      whatsapp: <MessageCircle className="w-5 h-5" />,
      email: <Mail className="w-5 h-5" />,
      sms: <Smartphone className="w-5 h-5" />,
      phone: <Phone className="w-5 h-5" />
    };

    return {
      date: new Date(lastEvent.created_at),
      type: lastEvent.direction === 'inbound' ? 'Réponse reçue' : 'Message envoyé',
      icon: icons[lastEvent.channel] || <MessageCircle className="w-5 h-5" />
    };
  }

  // Fallback to lead dates
  if (lead.modifiedAt) {
    return {
      date: new Date(lead.modifiedAt),
      type: 'Modification',
      icon: <Edit3 className="w-5 h-5" />
    };
  }

  if (lead.createdAt) {
    return {
      date: new Date(lead.createdAt),
      type: 'Création',
      icon: <Sparkles className="w-5 h-5" />
    };
  }

  return null;
}

function getWaitingResponseTime(events: any[]): { since: Date; hours: number; channel: string } | null {
  // Sort events by date descending
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Find the last outbound message
  const lastOutbound = sortedEvents.find(e => e.direction === 'outbound');
  if (!lastOutbound) return null;

  // Check if there's an inbound message after it
  const lastOutboundDate = new Date(lastOutbound.created_at);
  const hasResponseAfter = sortedEvents.some(
    e => e.direction === 'inbound' && new Date(e.created_at) > lastOutboundDate
  );

  if (hasResponseAfter) return null;

  const hours = (Date.now() - lastOutboundDate.getTime()) / (1000 * 60 * 60);

  return {
    since: lastOutboundDate,
    hours,
    channel: lastOutbound.channel
  };
}

function calculateEngagement(lead: Lead, events: any[]): {
  level: string;
  icon: React.ReactNode;
  color: 'green' | 'yellow' | 'red' | 'gray';
  tooltip: string;
} {
  // Count inbound interactions
  const inboundCount = events.filter(e => e.direction === 'inbound').length;
  const outboundCount = events.filter(e => e.direction === 'outbound').length;
  const totalCount = events.length;

  // Calculate response rate
  const responseRate = outboundCount > 0 ? (inboundCount / outboundCount) * 100 : 0;

  // Determine engagement level
  if (totalCount === 0) {
    return {
      level: 'Nouveau',
      icon: <Sparkles className="w-5 h-5" />,
      color: 'gray',
      tooltip: 'Aucune interaction enregistrée'
    };
  }

  // Contact fait mais aucune réponse encore
  if (outboundCount > 0 && inboundCount === 0) {
    return {
      level: 'Contacté',
      icon: <Send className="w-5 h-5" />,
      color: 'yellow',
      tooltip: `${outboundCount} message(s) envoyé(s) - En attente de réponse`
    };
  }

  if (responseRate >= 50 && totalCount >= 3) {
    return {
      level: 'Très actif',
      icon: <Flame className="w-5 h-5" />,
      color: 'green',
      tooltip: `${inboundCount} réponses sur ${outboundCount} messages (${Math.round(responseRate)}%)`
    };
  }

  if (responseRate >= 25 || inboundCount >= 1) {
    return {
      level: 'Actif',
      icon: <CheckCircle className="w-5 h-5" />,
      color: 'green',
      tooltip: `${inboundCount} réponse(s) reçue(s)`
    };
  }

  return {
    level: 'À relancer',
    icon: <AlertTriangle className="w-5 h-5" />,
    color: 'red',
    tooltip: `Taux de réponse faible: ${Math.round(responseRate)}%`
  };
}

function getRecommendation(lead: Lead, events: any[]): {
  action: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  reason: string;
  actionData: RecommendedAction;
} | null {
  // Check waiting time
  const waitingResponse = getWaitingResponseTime(events);

  if (waitingResponse) {
    // Déterminer le canal préféré basé sur le dernier canal utilisé
    const preferredChannel = (waitingResponse.channel === 'whatsapp' ? 'whatsapp' : 'email') as 'whatsapp' | 'email';

    if (waitingResponse.hours >= 72) {
      const reason = `Aucune réponse depuis ${Math.round(waitingResponse.hours / 24)} jours`;
      return {
        action: 'Relance J+3',
        priority: 'high',
        reason,
        actionData: {
          type: 'relance_j3',
          label: 'Relance J+3',
          channel: preferredChannel,
          reason
        }
      };
    }

    if (waitingResponse.hours >= 24) {
      const reason = `Message sans réponse depuis ${Math.round(waitingResponse.hours)}h`;
      return {
        action: 'Relance J+1',
        priority: 'medium',
        reason,
        actionData: {
          type: 'relance_j1',
          label: 'Relance J+1',
          channel: preferredChannel,
          reason
        }
      };
    }
  }

  // Check lead score
  if (lead.score && lead.score >= 80) {
    const reason = 'Lead chaud avec score élevé';
    return {
      action: 'Contact urgent',
      priority: 'urgent',
      reason,
      actionData: {
        type: 'contact_urgent',
        label: 'Contact urgent',
        channel: 'whatsapp',
        reason
      }
    };
  }

  // Si aucun event enregistré → suggérer "Premier contact"
  if (events.length === 0) {
    const reason = 'Aucun contact enregistré - À contacter';
    return {
      action: 'Premier contact',
      priority: 'medium',
      reason,
      actionData: {
        type: 'premier_contact',
        label: 'Premier contact',
        channel: 'whatsapp',
        reason
      }
    };
  }

  // Si contact fait mais < 24h → "En attente de réponse" (pas d'action, juste info)
  if (waitingResponse && waitingResponse.hours < 24) {
    const hours = Math.round(waitingResponse.hours);
    return {
      action: 'En attente',
      priority: 'low',
      reason: `Contact fait il y a ${hours}h - Attendre avant relance`,
      actionData: {
        type: 'premier_contact', // Pas d'action urgente
        label: 'En attente de réponse',
        channel: waitingResponse.channel as 'whatsapp' | 'email',
        reason: `Relance possible dans ${24 - hours}h`
      }
    };
  }

  // Si events existent mais pas de waitingResponse (ex: réponse reçue)
  // → Pas de suggestion, tout va bien
  return null;
}

function getHoursSince(date: Date): number {
  return (Date.now() - date.getTime()) / (1000 * 60 * 60);
}

function formatTimeAgo(date: Date): string {
  const hours = getHoursSince(date);

  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `Il y a ${minutes}min`;
  }

  if (hours < 24) {
    return `Il y a ${Math.round(hours)}h`;
  }

  const days = Math.floor(hours / 24);
  if (days === 1) {
    return 'Hier';
  }

  if (days < 7) {
    return `Il y a ${days}j`;
  }

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default SignalsBlock;
