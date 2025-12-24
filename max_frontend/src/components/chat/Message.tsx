/**
 * components/chat/Message.tsx
 * Composant Message pour Chat M.A.X. - Style futuriste premium
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { ChatMessage } from '../../types/chat';
import clsx from 'clsx';
import { useThemeColors } from '../../hooks/useThemeColors';

interface MessageProps {
  message: ChatMessage;
}

export const Message: React.FC<MessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const colors = useThemeColors();

  // Formater le timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0.0, 0.2, 1] }}
      className={clsx(
        'flex w-full mb-5',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className="max-w-[75%] rounded-2xl px-5 py-4 relative group"
        style={{
          background: isUser
            ? 'linear-gradient(135deg, rgba(0, 145, 255, 0.1), rgba(0, 207, 255, 0.1))'
            : colors.messageBg,
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: isUser
            ? 'rgba(0, 145, 255, 0.3)'
            : colors.border,
          boxShadow: isUser
            ? '0 0 24px rgba(0, 145, 255, 0.15)'
            : '0 0 24px rgba(0, 145, 255, 0.05)',
          backdropFilter: 'blur(10px)'
        }}
      >
        {/* Glow effect subtil */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl -z-10"
          style={{
            background: isUser
              ? 'linear-gradient(135deg, rgba(0, 145, 255, 0.2), rgba(0, 207, 255, 0.2))'
              : 'linear-gradient(135deg, rgba(0, 207, 255, 0.3), rgba(0, 145, 255, 0.1))'
          }}
        />

        {/* Avatar et nom */}
        <div className="flex items-center gap-3 mb-3">
          {isAssistant ? (
            <div className="relative">
              <img
                src="/images/Max_avatar.png"
                alt="M.A.X."
                className="w-8 h-8 rounded-full"
                style={{
                  boxShadow: '0 0 20px rgba(0, 145, 255, 0.6)'
                }}
              />
              <div
                className="absolute inset-0 rounded-full blur-lg -z-10 animate-pulse"
                style={{ background: 'rgba(0, 145, 255, 0.4)' }}
              />
            </div>
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: 'linear-gradient(135deg, #0091ff, #00cfff)',
                color: '#ffffff',
                boxShadow: '0 0 16px rgba(0, 145, 255, 0.5)'
              }}
            >
              U
            </div>
          )}
          <span
            className="text-sm font-bold"
            style={{
              background: 'linear-gradient(135deg, #0091ff, #00cfff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            {isUser ? 'Vous' : 'M.A.X.'}
          </span>
          <span className="text-xs opacity-50 ml-auto" style={{ color: colors.textTertiary }}>
            {formatTime(message.timestamp)}
          </span>
        </div>

        {/* Contenu du message */}
        <div
          className="text-sm leading-relaxed whitespace-pre-wrap break-words"
          style={{ color: colors.messageText }}
        >
          {message.content}
        </div>
      </div>
    </motion.div>
  );
};
