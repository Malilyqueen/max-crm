/**
 * components/chat/ModeSelector.tsx
 * Sélecteur de mode (Auto/Assisté/Conseil) - Chat M.A.X. MVP1
 */

import React from 'react';
import type { ChatMode } from '../../types/chat';
import clsx from 'clsx';

interface ModeSelectorProps {
  currentMode: ChatMode;
  onChangeMode: (mode: ChatMode) => void;
  disabled?: boolean;
}

const MODES: Array<{ value: ChatMode; label: string; description: string }> = [
  {
    value: 'auto',
    label: 'Auto',
    description: 'Propose des actions concrètes (avec confirmation)'
  },
  {
    value: 'assist',
    label: 'Assisté',
    description: 'Recommandations uniquement'
  },
  {
    value: 'conseil',
    label: 'Conseil',
    description: 'Conseils et analyses uniquement'
  }
];

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  currentMode,
  onChangeMode,
  disabled = false
}) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700">Mode:</span>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {MODES.map((mode) => (
          <button
            key={mode.value}
            onClick={() => onChangeMode(mode.value)}
            disabled={disabled}
            title={mode.description}
            className={clsx(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-all',
              currentMode === mode.value
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
};
