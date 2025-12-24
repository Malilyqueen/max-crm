/**
 * components/chat/ChatInput.tsx
 * Input chat avec support upload fichier - Style futuriste premium
 */

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Paperclip, Send } from 'lucide-react';
import { useThemeColors } from '../../hooks/useThemeColors';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onUploadFile: (file: File) => void;
  isLoading?: boolean;
  isStreaming?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onUploadFile,
  isLoading = false,
  isStreaming = false
}) => {
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colors = useThemeColors();

  const handleSend = () => {
    if (message.trim() && !isLoading && !isStreaming) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const disabled = isLoading || isStreaming;

  return (
    <div
      className="border-t px-6 py-5"
      style={{
        borderColor: colors.border,
        background: colors.cardBg
      }}
    >
      <div className="flex items-end gap-4">
        {/* Bouton attach fichier */}
        <motion.button
          type="button"
          onClick={handleAttachClick}
          disabled={disabled}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-shrink-0 p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 145, 255, 0.1), rgba(0, 207, 255, 0.1))',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'rgba(0, 145, 255, 0.3)',
            color: '#0091ff'
          }}
          title="Uploader un fichier CSV, PDF ou DOCX"
        >
          <Paperclip className="w-5 h-5" />
        </motion.button>

        {/* Input caché pour fichier */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.pdf,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Textarea message */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Pose ta question à M.A.X..."
          rows={1}
          className="flex-1 resize-none rounded-xl px-5 py-3 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all placeholder:opacity-50"
          style={{
            minHeight: '52px',
            maxHeight: '120px',
            background: colors.background,
            color: colors.textPrimary,
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: colors.border,
            '--tw-ring-color': 'rgba(0, 145, 255, 0.4)'
          } as React.CSSProperties}
        />

        {/* Bouton envoyer */}
        <motion.button
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-shrink-0 p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          style={{
            background: 'linear-gradient(135deg, #0091ff, #00cfff)',
            color: '#ffffff',
            boxShadow: '0 0 24px rgba(0, 145, 255, 0.4)'
          }}
        >
          <Send className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Hint texte */}
      <div className="mt-3 space-y-2">
        <p className="text-xs opacity-50" style={{ color: colors.textTertiary }}>
          <kbd
            className="px-2 py-1 rounded text-xs font-semibold"
            style={{
              background: colors.hoverBg,
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: colors.borderLight,
              color: colors.textSecondary
            }}
          >
            Entrée
          </kbd>{' '}
          pour envoyer,{' '}
          <kbd
            className="px-2 py-1 rounded text-xs font-semibold"
            style={{
              background: colors.hoverBg,
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: colors.borderLight,
              color: colors.textSecondary
            }}
          >
            Shift + Entrée
          </kbd>{' '}
          pour nouvelle ligne
        </p>
        <p className="text-xs opacity-60 text-center" style={{ color: colors.textTertiary }}>
          M.A.X. peut commettre des erreurs. Il est recommandé de vérifier les informations importantes.
        </p>
      </div>
    </div>
  );
};
