/**
 * components/dashboard/RecentActivityList.tsx
 * Liste d'activité récente pour le dashboard
 */

import React from 'react';
import type { RecentActivity } from '../../types/dashboard';
import { useThemeColors } from '../../hooks/useThemeColors';

interface RecentActivityListProps {
  activities: RecentActivity[];
}

const activityIcons: Record<RecentActivity['type'], React.ReactNode> = {
  lead_created: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  lead_converted: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  workflow_triggered: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  max_interaction: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  )
};

const activityColorStyles: Record<RecentActivity['type'], { background: string; color: string }> = {
  lead_created: {
    background: 'rgba(0, 145, 255, 0.1)',
    color: '#0091ff'
  },
  lead_converted: {
    background: 'rgba(16, 185, 129, 0.1)',
    color: '#10b981'
  },
  workflow_triggered: {
    background: 'rgba(139, 92, 246, 0.1)',
    color: '#8b5cf6'
  },
  max_interaction: {
    background: 'rgba(249, 115, 22, 0.1)',
    color: '#f97316'
  }
};

export function RecentActivityList({ activities }: RecentActivityListProps) {
  const colors = useThemeColors();

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;

    const diffDays = Math.floor(diffHours / 24);
    return `Il y a ${diffDays}j`;
  };

  if (activities.length === 0) {
    return (
      <div className="text-center py-8" style={{ color: colors.textSecondary }}>
        Aucune activité récente
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-4 p-4 rounded-lg transition-all"
          style={{
            background: colors.cardBg,
            border: `1px solid ${colors.borderLight}`
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 145, 255, 0.05)';
            e.currentTarget.style.borderColor = 'rgba(0, 145, 255, 0.3)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 145, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = colors.cardBg;
            e.currentTarget.style.borderColor = colors.borderLight;
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div
            className="p-2 rounded-lg"
            style={activityColorStyles[activity.type]}
          >
            {activityIcons[activity.type]}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{activity.title}</p>
            <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>{activity.description}</p>
            <p className="text-xs mt-1" style={{ color: colors.textTertiary }}>{formatTime(activity.timestamp)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
