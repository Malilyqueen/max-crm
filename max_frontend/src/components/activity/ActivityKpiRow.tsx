/**
 * components/activity/ActivityKpiRow.tsx
 * KPIs multi-canal (Email, SMS, WhatsApp) pour dashboard Activité
 */

import React from 'react';
import { Mail, MessageSquare, Smartphone, TrendingUp, TrendingDown } from 'lucide-react';
import type { EventsStatsResponse } from '../../types/events';

interface ActivityKpiRowProps {
  stats: EventsStatsResponse | null;
  isLoading: boolean;
}

export function ActivityKpiRow({ stats, isLoading }: ActivityKpiRowProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg p-6 border border-gray-200 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-32"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const { statsByChannel, inboundTotal } = stats;

  const channelConfigs = [
    {
      key: 'email' as const,
      label: 'Email',
      icon: Mail,
      color: '#3b82f6',
      bgColor: '#dbeafe'
    },
    {
      key: 'whatsapp' as const,
      label: 'WhatsApp',
      icon: MessageSquare,
      color: '#10b981',
      bgColor: '#d1fae5'
    },
    {
      key: 'sms' as const,
      label: 'SMS',
      icon: Smartphone,
      color: '#8b5cf6',
      bgColor: '#ede9fe'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {channelConfigs.map(({ key, label, icon: Icon, color, bgColor }) => {
        const channelStats = statsByChannel[key];
        const hasActivity = channelStats.total > 0;

        return (
          <div
            key={key}
            className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-lg transition-shadow duration-300"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="p-2.5 rounded-xl"
                  style={{
                    backgroundColor: bgColor,
                    color
                  }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{label}</h3>
                  <p className="text-xs text-gray-500">
                    {channelStats.total} message{channelStats.total > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Taux de livraison */}
              {hasActivity && channelStats.deliveryRate > 0 && (
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    {channelStats.deliveryRate >= 90 ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-orange-600" />
                    )}
                    <span
                      className="text-lg font-bold"
                      style={{
                        color: channelStats.deliveryRate >= 90 ? '#10b981' : '#f59e0b'
                      }}
                    >
                      {channelStats.deliveryRate}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">livraison</p>
                </div>
              )}
            </div>

            {/* Stats détaillées */}
            {hasActivity ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Envoyés</span>
                  <span className="font-medium text-gray-900">{channelStats.sent}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Livrés</span>
                  <span className="font-medium text-green-600">{channelStats.delivered}</span>
                </div>

                {/* Email specific */}
                {key === 'email' && channelStats.opened !== undefined && channelStats.opened > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Ouverts</span>
                      <span className="font-medium text-blue-600">{channelStats.opened}</span>
                    </div>
                    {channelStats.clicked !== undefined && channelStats.clicked > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Cliqués</span>
                        <span className="font-medium text-purple-600">{channelStats.clicked}</span>
                      </div>
                    )}
                  </>
                )}

                {/* WhatsApp specific */}
                {key === 'whatsapp' && channelStats.read !== undefined && channelStats.read > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Lus</span>
                    <span className="font-medium text-green-600">{channelStats.read}</span>
                  </div>
                )}

                {channelStats.failed > 0 && (
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                    <span className="text-gray-600">Échecs</span>
                    <span className="font-medium text-red-600">{channelStats.failed}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-400">Aucune activité</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
