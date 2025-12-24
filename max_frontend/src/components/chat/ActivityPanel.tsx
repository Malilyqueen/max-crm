/**
 * components/chat/ActivityPanel.tsx
 * Panneau d'activité de M.A.X. (rétractable)
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, RefreshCw, FileEdit, TrendingUp, Zap } from 'lucide-react';
import { useThemeColors } from '../../hooks/useThemeColors';

export interface Activity {
  id: string;
  icon: 'target' | 'refresh' | 'edit' | 'chart' | 'zap';
  message: string;
  timestamp: number;
}

interface ActivityPanelProps {
  activities: Activity[];
  isOpen: boolean;
  onClose: () => void;
}

const iconMap = {
  target: Target,
  refresh: RefreshCw,
  edit: FileEdit,
  chart: TrendingUp,
  zap: Zap
};

export const ActivityPanel: React.FC<ActivityPanelProps> = ({ activities, isOpen, onClose }) => {
  const colors = useThemeColors();

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay pour mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed md:relative right-0 top-0 h-full w-80 md:w-72 lg:w-80 z-50 flex flex-col"
            style={{
              background: colors.sidebarBg,
              borderLeft: `1px solid ${colors.border}`,
              boxShadow: '-4px 0 24px rgba(0, 145, 255, 0.1)'
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-4 border-b"
              style={{ borderColor: colors.border }}
            >
              <h3
                className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent"
              >
                Activité M.A.X.
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" style={{ color: '#0091ff' }} />
              </button>
            </div>

            {/* Activities list */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {activities.length === 0 ? (
                <div className="text-center py-12">
                  <Zap className="w-12 h-12 mx-auto mb-3 opacity-40" style={{ color: '#0091ff' }} />
                  <p className="text-sm opacity-60" style={{ color: colors.textSecondary }}>
                    Aucune activité pour le moment
                  </p>
                </div>
              ) : (
                activities.map((activity, index) => {
                  const Icon = iconMap[activity.icon];
                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-3 rounded-lg group hover:bg-white/5 transition-all"
                      style={{
                        background: 'linear-gradient(135deg, rgba(0, 145, 255, 0.05), rgba(0, 207, 255, 0.05))',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: 'rgba(0, 145, 255, 0.1)'
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            background: 'linear-gradient(135deg, #0091ff, #00cfff)',
                            boxShadow: '0 0 12px rgba(0, 145, 255, 0.3)'
                          }}
                        >
                          <Icon className="w-4 h-4" style={{ color: '#0b0b0d' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-relaxed" style={{ color: colors.textPrimary }}>
                            {activity.message}
                          </p>
                          <span className="text-xs opacity-60 mt-1 block" style={{ color: colors.textTertiary }}>
                            {formatTime(activity.timestamp)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
