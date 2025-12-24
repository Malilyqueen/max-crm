/**
 * components/dashboard/QuickActions.tsx
 * Actions rapides pour le dashboard
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeColors } from '../../hooks/useThemeColors';

export function QuickActions() {
  const navigate = useNavigate();
  const colors = useThemeColors();

  const actions = [
    {
      id: 'chat-max',
      title: 'Chat M.A.X.',
      description: 'Démarrer une conversation',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
      onClick: () => navigate('/chat')
    },
    {
      id: 'view-leads',
      title: 'Voir les leads',
      description: 'Gérer vos contacts',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      onClick: () => navigate('/crm')
    },
    {
      id: 'automation',
      title: 'Automatisations',
      description: 'Workflows actifs',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      onClick: () => navigate('/automation')
    },
    {
      id: 'reports',
      title: 'Rapports',
      description: 'Analyse détaillée',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      onClick: () => navigate('/reporting')
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={action.onClick}
          className="p-6 rounded-lg text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
          style={{
            background: colors.cardBg,
            border: `1px solid ${colors.border}`,
            color: '#0091ff'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 145, 255, 0.08)';
            e.currentTarget.style.borderColor = 'rgba(0, 145, 255, 0.3)';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 207, 255, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = colors.cardBg;
            e.currentTarget.style.borderColor = colors.border;
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div className="mb-3">{action.icon}</div>
          <h3 className="text-sm font-semibold mb-1" style={{ color: colors.textPrimary }}>{action.title}</h3>
          <p className="text-xs" style={{ color: colors.textSecondary }}>{action.description}</p>
        </button>
      ))}
    </div>
  );
}
