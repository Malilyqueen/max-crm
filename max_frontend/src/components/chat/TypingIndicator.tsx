/**
 * components/chat/TypingIndicator.tsx
 * Indicateur "M.A.X. est en train d'écrire..." - Style premium
 */

import React from 'react';
import { useThemeColors } from '../../hooks/useThemeColors';

export const TypingIndicator: React.FC = () => {
  const colors = useThemeColors();

  return (
    <div className="flex justify-start w-full mb-4">
      <div
        className="rounded-lg px-4 py-3 shadow-lg max-w-[75%]"
        style={{
          background: colors.messageBg,
          border: `1px solid ${colors.border}`,
          boxShadow: '0 0 24px rgba(0, 145, 255, 0.1)'
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="relative">
            <img
              src="/images/Max_avatar.png"
              alt="M.A.X."
              className="w-7 h-7 rounded-full"
              style={{
                boxShadow: '0 0 16px rgba(0, 145, 255, 0.5)'
              }}
            />
            <div
              className="absolute inset-0 blur-md animate-pulse"
              style={{ background: 'rgba(0, 145, 255, 0.4)' }}
            />
          </div>
          <span
            className="text-sm font-semibold"
            style={{
              background: 'linear-gradient(135deg, #0091ff, #00cfff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            M.A.X.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full animate-bounce"
              style={{ background: '#0091ff', animationDuration: '1s' }}
            ></div>
            <div
              className="w-2 h-2 rounded-full animate-bounce"
              style={{ background: '#0091ff', animationDelay: '0.2s', animationDuration: '1s' }}
            ></div>
            <div
              className="w-2 h-2 rounded-full animate-bounce"
              style={{ background: '#00cfff', animationDelay: '0.4s', animationDuration: '1s' }}
            ></div>
          </div>
          <span className="text-xs italic opacity-70" style={{ color: colors.textSecondary }}>
            est en train d'écrire...
          </span>
        </div>
      </div>
    </div>
  );
};
