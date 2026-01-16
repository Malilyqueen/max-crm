/**
 * components/lead/UnifiedTimeline.tsx
 * Timeline unifiée combinant activités CRM + message_events
 */

import React from 'react';
import {
  Mail,
  MessageSquare,
  Smartphone,
  FileText,
  PhoneCall,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Clock
} from 'lucide-react';
import type { LeadActivity } from '../../types/crm';
import type { MessageEvent } from '../../types/events';
import { CHANNEL_CONFIGS, STATUS_CONFIGS } from '../../types/events';

interface UnifiedTimelineProps {
  activities: LeadActivity[];
  events: MessageEvent[];
  isLoading?: boolean;
}

type TimelineItem = {
  id: string;
  type: 'activity' | 'event';
  timestamp: string;
  data: LeadActivity | MessageEvent;
};

export function UnifiedTimeline({ activities, events, isLoading }: UnifiedTimelineProps) {
  // Merge et trier par date décroissante
  const timelineItems: TimelineItem[] = [
    ...activities.map(activity => ({
      id: activity.id,
      type: 'activity' as const,
      timestamp: activity.createdAt,
      data: activity
    })),
    ...events.map(event => ({
      id: event.id,
      type: 'event' as const,
      timestamp: event.event_timestamp,
      data: event
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Format timestamp relatif
  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;

    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get icon for activity type
  const getActivityIcon = (type: string) => {
    const icons: Record<string, any> = {
      status_change: TrendingUp,
      note_added: FileText,
      email_sent: Mail,
      call_made: PhoneCall,
      meeting_scheduled: Calendar
    };
    return icons[type] || FileText;
  };

  // Get icon for event channel
  const getEventIcon = (channel: string) => {
    const icons: Record<string, any> = {
      email: Mail,
      whatsapp: MessageSquare,
      sms: Smartphone
    };
    return icons[channel] || Mail;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-4 animate-pulse">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (timelineItems.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-sm font-medium text-gray-900 mb-1">Aucune activité</h3>
        <p className="text-sm text-gray-500">
          L'historique des activités et communications apparaîtra ici.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>

      {/* Timeline items */}
      <div className="space-y-6">
        {timelineItems.map((item, index) => {
          const isActivity = item.type === 'activity';

          if (isActivity) {
            // Render CRM activity
            const activity = item.data as LeadActivity;
            const ActivityIcon = getActivityIcon(activity.type);

            return (
              <div key={item.id} className="relative flex gap-4">
                {/* Icon */}
                <div className="relative z-10 w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <ActivityIcon className="w-5 h-5 text-violet-600" />
                </div>

                {/* Content */}
                <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Par {activity.createdBy} • {formatTimestamp(activity.createdAt)}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-violet-100 text-violet-700 font-medium">
                      {activity.type === 'status_change' && 'Statut'}
                      {activity.type === 'note_added' && 'Note'}
                      {activity.type === 'email_sent' && 'Email'}
                      {activity.type === 'call_made' && 'Appel'}
                      {activity.type === 'meeting_scheduled' && 'Rendez-vous'}
                    </span>
                  </div>

                  {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                    <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded p-2">
                      {JSON.stringify(activity.metadata, null, 2)}
                    </div>
                  )}
                </div>
              </div>
            );
          } else {
            // Render message event
            const event = item.data as MessageEvent;
            const EventIcon = getEventIcon(event.channel);
            const channelConfig = CHANNEL_CONFIGS[event.channel];
            const statusConfig = STATUS_CONFIGS[event.status];
            const DirectionIcon = event.direction === 'in' ? ArrowDownLeft : ArrowUpRight;

            return (
              <div key={item.id} className="relative flex gap-4">
                {/* Icon */}
                <div
                  className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: channelConfig.bgColor,
                    color: channelConfig.color
                  }}
                >
                  <EventIcon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <DirectionIcon
                        className="w-4 h-4"
                        style={{
                          color: event.direction === 'in' ? '#10b981' : '#3b82f6'
                        }}
                      />
                      <p className="text-sm font-medium text-gray-900">
                        {event.direction === 'in' ? 'Message reçu' : 'Message envoyé'} via {channelConfig.label}
                      </p>
                    </div>

                    <span
                      className="text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1"
                      style={{
                        backgroundColor: `${statusConfig.color}20`,
                        color: statusConfig.color
                      }}
                    >
                      <span>{statusConfig.emoji}</span>
                      <span>{statusConfig.label}</span>
                    </span>
                  </div>

                  {/* Contact info */}
                  <p className="text-xs text-gray-600 mb-2">
                    {event.email || event.phone_number} • {formatTimestamp(event.event_timestamp)}
                  </p>

                  {/* Message snippet */}
                  {event.message_snippet && (
                    <div className="mt-2 text-sm text-gray-700 bg-gray-50 rounded p-3 border-l-2" style={{ borderLeftColor: channelConfig.color }}>
                      {event.message_snippet}
                    </div>
                  )}

                  {/* Provider info */}
                  <p className="text-xs text-gray-400 mt-2">
                    Provider: {event.provider} • ID: {event.provider_message_id.slice(0, 12)}...
                  </p>
                </div>
              </div>
            );
          }
        })}
      </div>
    </div>
  );
}
