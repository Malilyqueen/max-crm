/**
 * components/max/SuggestionCard.tsx
 * Carte de suggestion IA générée dynamiquement
 */

import React from 'react';
import { useThemeColors } from '../../hooks/useThemeColors';

export interface Suggestion {
  id: string;
  type: 'email' | 'relance' | 'tag' | 'action';
  title: string;
  description: string;
  leadId?: string;
  leadName?: string;
}

interface SuggestionCardProps {
  suggestion: Suggestion;
  onExecute?: (suggestion: Suggestion) => void;
}

const getIcon = (type: string) => {
  switch (type) {
    case 'email':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      );
    case 'relance':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case 'tag':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
          />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      );
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'email':
      return 'text-blue-600';
    case 'relance':
      return 'text-orange-600';
    case 'tag':
      return 'text-purple-600';
    default:
      return 'text-green-600';
  }
};

const getTypeBgColor = (type: string) => {
  switch (type) {
    case 'email':
      return 'bg-blue-100';
    case 'relance':
      return 'bg-orange-100';
    case 'tag':
      return 'bg-purple-100';
    default:
      return 'bg-green-100';
  }
};

export function SuggestionCard({ suggestion, onExecute }: SuggestionCardProps) {
  const colors = useThemeColors();

  return (
    <div
      className="rounded-lg p-4 border transition-all hover:shadow-md"
      style={{
        background: colors.cardBg,
        borderColor: colors.borderLight
      }}
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg ${getTypeBgColor(suggestion.type)}`}>
          <div className={getTypeColor(suggestion.type)}>{getIcon(suggestion.type)}</div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold mb-1" style={{ color: colors.textPrimary }}>
            {suggestion.title}
          </h3>
          <p className="text-sm mb-2" style={{ color: colors.textSecondary }}>
            {suggestion.description}
          </p>
          {suggestion.leadName && (
            <p className="text-xs" style={{ color: colors.textSecondary }}>
              Lead: {suggestion.leadName}
            </p>
          )}
        </div>

        {onExecute && (
          <button
            onClick={() => onExecute(suggestion)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
          >
            Exécuter
          </button>
        )}
      </div>
    </div>
  );
}
