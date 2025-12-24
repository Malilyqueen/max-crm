/**
 * components/dashboard/StatCard.tsx
 * Carte KPI pour le dashboard
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeColors } from '../../hooks/useThemeColors';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  link?: string;
  linkLabel?: string;
}

const colorStyles = {
  blue: {
    background: 'rgba(0, 145, 255, 0.1)',
    color: '#0091ff'
  },
  green: {
    background: 'rgba(16, 185, 129, 0.1)',
    color: '#10b981'
  },
  purple: {
    background: 'rgba(139, 92, 246, 0.1)',
    color: '#8b5cf6'
  },
  orange: {
    background: 'rgba(249, 115, 22, 0.1)',
    color: '#f97316'
  },
  red: {
    background: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444'
  }
};

export function StatCard({ title, value, icon, trend, color = 'blue', link, linkLabel }: StatCardProps) {
  const navigate = useNavigate();
  const colors = useThemeColors();

  return (
    <div
      className="rounded-lg p-6 transition-all duration-200"
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.borderLight}`,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>{title}</p>
          <p className="text-3xl font-bold" style={{ color: colors.textPrimary }}>{value}</p>

          {trend && (
            <div className="flex items-center mt-2">
              <span
                className="text-sm font-medium flex items-center gap-1"
                style={{
                  color: trend.isPositive ? '#10b981' : '#ef4444'
                }}
              >
                {trend.isPositive ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                )}
                {Math.abs(trend.value)}
              </span>
              <span className="text-sm ml-2" style={{ color: colors.textSecondary }}>{trend.label}</span>
            </div>
          )}

          {link && (
            <button
              onClick={() => navigate(link)}
              className="text-sm mt-2 flex items-center gap-1 transition-colors"
              style={{ color: '#0091ff' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#00cfff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#0091ff';
              }}
            >
              {linkLabel || 'Voir plus'}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        <div
          className="p-3 rounded-lg"
          style={colorStyles[color]}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
