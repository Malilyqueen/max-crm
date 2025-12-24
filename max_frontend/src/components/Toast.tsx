/**
 * components/Toast.tsx
 * Système de notifications toast - Style M.A.X. premium
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useThemeColors } from '../hooks/useThemeColors';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle
};

const colorMap = {
  success: {
    bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))',
    border: 'rgba(16, 185, 129, 0.3)',
    icon: '#10b981',
    glow: 'rgba(16, 185, 129, 0.2)'
  },
  error: {
    bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1))',
    border: 'rgba(239, 68, 68, 0.3)',
    icon: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.2)'
  },
  info: {
    bg: 'linear-gradient(135deg, rgba(0, 145, 255, 0.1), rgba(0, 207, 255, 0.1))',
    border: 'rgba(0, 145, 255, 0.3)',
    icon: '#0091ff',
    glow: 'rgba(0, 145, 255, 0.2)'
  },
  warning: {
    bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.1))',
    border: 'rgba(245, 158, 11, 0.3)',
    icon: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.2)'
  }
};

export const Toast: React.FC<ToastProps> = ({ id, type, message, duration = 5000, onClose }) => {
  const colors = useThemeColors();
  const Icon = iconMap[type];
  const toastColors = colorMap[type];

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      className="relative flex items-start gap-3 p-4 rounded-lg shadow-2xl backdrop-blur-xl min-w-[320px] max-w-md"
      style={{
        background: toastColors.bg,
        border: `1px solid ${toastColors.border}`,
        boxShadow: `0 0 32px ${toastColors.glow}`
      }}
    >
      {/* Icon with glow */}
      <div className="flex-shrink-0 relative">
        <Icon className="w-5 h-5" style={{ color: toastColors.icon }} />
        <div
          className="absolute inset-0 blur-md"
          style={{ background: toastColors.icon, opacity: 0.3 }}
        />
      </div>

      {/* Message */}
      <p className="flex-1 text-sm font-medium" style={{ color: colors.textPrimary }}>
        {message}
      </p>

      {/* Close button */}
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 p-1 rounded-md transition-all hover:bg-white/10"
        style={{ color: colors.textSecondary }}
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

// Container for toasts
interface ToastContainerProps {
  toasts: Array<Omit<ToastProps, 'onClose'>>;
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={onClose} />
        ))}
      </AnimatePresence>
    </div>
  );
};
