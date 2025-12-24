/**
 * components/max/TaskTrayComponent.tsx
 * Affichage du journal d'exécution des tâches M.A.X.
 */

import React from 'react';
import { useThemeColors } from '../../hooks/useThemeColors';

export interface ExecutionLogEntry {
  id: string;
  timestamp: string;
  action: string;
  status: 'pending' | 'running' | 'success' | 'error';
  details?: string;
}

interface TaskTrayComponentProps {
  logs: ExecutionLogEntry[];
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return (
        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'running':
      return (
        <svg className="w-5 h-5 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      );
    case 'success':
      return (
        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'error':
      return (
        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return null;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending':
      return 'En attente';
    case 'running':
      return 'En cours';
    case 'success':
      return 'Terminé';
    case 'error':
      return 'Erreur';
    default:
      return status;
  }
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-gray-100 text-gray-700';
    case 'running':
      return 'bg-blue-100 text-blue-700';
    case 'success':
      return 'bg-green-100 text-green-700';
    case 'error':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

export function TaskTrayComponent({ logs }: TaskTrayComponentProps) {
  const colors = useThemeColors();

  if (logs.length === 0) {
    return (
      <div className="text-center py-8">
        <svg
          className="w-12 h-12 mx-auto mb-4"
          style={{ color: colors.textSecondary }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p style={{ color: colors.textSecondary }}>Aucune exécution récente</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div
          key={log.id}
          className="rounded-lg p-4 border"
          style={{
            background: colors.cardBg,
            borderColor: colors.borderLight
          }}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">{getStatusIcon(log.status)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="font-medium" style={{ color: colors.textPrimary }}>
                  {log.action}
                </h4>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(log.status)}`}>
                  {getStatusLabel(log.status)}
                </span>
              </div>
              {log.details && (
                <p className="text-sm mb-2" style={{ color: colors.textSecondary }}>
                  {log.details}
                </p>
              )}
              <p className="text-xs" style={{ color: colors.textSecondary }}>
                {new Date(log.timestamp).toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
