/**
 * components/activity/MessageEventsTable.tsx
 * Table paginée des events de communication (Email, SMS, WhatsApp)
 */

import React from 'react';
import { Mail, MessageSquare, Smartphone, ArrowUpRight, ArrowDownLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import type { MessageEvent } from '../../types/events';
import { CHANNEL_CONFIGS, STATUS_CONFIGS } from '../../types/events';

interface MessageEventsTableProps {
  events: MessageEvent[];
  isLoading: boolean;
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  onPageChange: (newPage: number) => void;
  onEventClick?: (event: MessageEvent) => void;
}

export function MessageEventsTable({
  events,
  isLoading,
  total,
  page,
  pageSize,
  hasMore,
  onPageChange,
  onEventClick
}: MessageEventsTableProps) {

  // Format timestamp
  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Relative time if < 24h
    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;

    // Absolute date otherwise
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get channel icon
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return Mail;
      case 'whatsapp': return MessageSquare;
      case 'sms': return Smartphone;
      default: return Mail;
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Horodatage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Canal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Direction</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b border-gray-200 animate-pulse">
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                  <td className="px-6 py-4"><div className="h-8 w-8 bg-gray-200 rounded-full"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-48"></div></td>
                  <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded-full w-24"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-64"></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Empty state
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun événement</h3>
        <p className="text-sm text-gray-500">
          Aucune activité de communication trouvée pour les filtres sélectionnés.
        </p>
      </div>
    );
  }

  // Calculate pagination info
  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Horodatage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Canal
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Direction
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Message
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {events.map((event) => {
              const channelConfig = CHANNEL_CONFIGS[event.channel];
              const statusConfig = STATUS_CONFIGS[event.status];
              const ChannelIcon = getChannelIcon(event.channel);
              const DirectionIcon = event.direction === 'in' ? ArrowDownLeft : ArrowUpRight;

              return (
                <tr
                  key={event.id}
                  onClick={() => onEventClick?.(event)}
                  className={`hover:bg-gray-50 transition-colors ${onEventClick ? 'cursor-pointer' : ''}`}
                >
                  {/* Timestamp */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatTimestamp(event.event_timestamp)}
                    </div>
                  </td>

                  {/* Channel */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: channelConfig.bgColor,
                        color: channelConfig.color
                      }}
                    >
                      <ChannelIcon className="w-5 h-5" />
                    </div>
                  </td>

                  {/* Direction */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <DirectionIcon
                        className="w-4 h-4"
                        style={{
                          color: event.direction === 'in' ? '#10b981' : '#3b82f6'
                        }}
                      />
                      <span className="text-sm text-gray-600">
                        {event.direction === 'in' ? 'Entrant' : 'Sortant'}
                      </span>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      {event.email && (
                        <div className="text-gray-900 font-medium">{event.email}</div>
                      )}
                      {event.phone_number && (
                        <div className="text-gray-900 font-medium">{event.phone_number}</div>
                      )}
                      {event.lead_id && (
                        <div className="text-gray-500 text-xs mt-1">Lead: {event.lead_id.slice(0, 8)}...</div>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${statusConfig.color}20`,
                        color: statusConfig.color
                      }}
                    >
                      <span>{statusConfig.emoji}</span>
                      <span>{statusConfig.label}</span>
                    </span>
                  </td>

                  {/* Message snippet */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 truncate max-w-md">
                      {event.message_snippet || '—'}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Affichage <span className="font-medium">{startIndex}</span> à{' '}
          <span className="font-medium">{endIndex}</span> sur{' '}
          <span className="font-medium">{total}</span> événements
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="text-sm text-gray-700">
            Page <span className="font-medium">{page}</span> sur{' '}
            <span className="font-medium">{totalPages}</span>
          </div>

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={!hasMore}
            className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
