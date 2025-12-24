/**
 * components/crm/LeadsListEnhanced.tsx
 * Liste des leads avec cards modernes (inspired by Demoboard)
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Phone,
  Building2,
  Eye,
  MessageSquare,
  Zap,
  Tag,
  Clock
} from 'lucide-react';
import type { Lead } from '../../types/crm';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useSettingsStore } from '../../stores/useSettingsStore';

interface LeadsListEnhancedProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  isLoading: boolean;
}

// Mapping statuts EspoCRM → couleurs (adaptatif selon thème)
const getStatusStyle = (status: string, isDark: boolean) => {
  const statusMap: Record<string, { dark: string; light: string }> = {
    'New': {
      dark: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      light: 'bg-blue-100 text-blue-700 border-blue-300'
    },
    'Assigned': {
      dark: 'bg-green-500/10 text-green-400 border-green-500/20',
      light: 'bg-green-100 text-green-700 border-green-300'
    },
    'In Process': {
      dark: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      light: 'bg-yellow-100 text-yellow-700 border-yellow-300'
    },
    'Converted': {
      dark: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      light: 'bg-emerald-100 text-emerald-700 border-emerald-300'
    },
    'Recycled': {
      dark: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      light: 'bg-gray-100 text-gray-700 border-gray-300'
    },
    'Dead': {
      dark: 'bg-red-500/10 text-red-400 border-red-500/20',
      light: 'bg-red-100 text-red-700 border-red-300'
    }
  };

  const styles = statusMap[status] || {
    dark: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    light: 'bg-gray-100 text-gray-700 border-gray-300'
  };

  return isDark ? styles.dark : styles.light;
};

const statusLabels: Record<string, string> = {
  'New': 'Nouveau',
  'Assigned': 'Assigné',
  'In Process': 'En cours',
  'Converted': 'Converti',
  'Recycled': 'Recyclé',
  'Dead': 'Perdu'
};

export function LeadsListEnhanced({ leads, onSelectLead, isLoading }: LeadsListEnhancedProps) {
  const colors = useThemeColors();
  const { theme } = useSettingsStore();
  const isDark = theme === 'dark';

  // Optimisation du stagger delay selon le nombre de leads
  // Pour 50 leads max : delay adaptatif pour garder l'animation fluide
  const getStaggerDelay = (index: number) => {
    if (leads.length <= 20) return index * 0.05; // 1s total pour 20 leads
    if (leads.length <= 50) return index * 0.03; // 1.5s total pour 50 leads
    return index * 0.02; // Pour plus de 50 leads (si jamais)
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-macrea-cyan/20 border-t-macrea-cyan rounded-full animate-spin"></div>
          <div className="absolute inset-0 bg-macrea-cyan/20 blur-xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-macrea-cyan/10 blur-2xl"></div>
          <div className="relative w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-macrea-cyan/20 to-macrea-violet/20 rounded-2xl flex items-center justify-center">
            <Building2 className="w-8 h-8 text-macrea-cyan" />
          </div>
        </div>
        <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textPrimary }}>
          Aucun lead
        </h3>
        <p style={{ color: colors.textSecondary }}>
          Aucun lead ne correspond aux filtres sélectionnés
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: 0.05
          }
        }
      }}
      className="space-y-3"
    >
      <AnimatePresence mode="popLayout">
        {leads.map((lead, index) => (
          <motion.div
            key={lead.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: getStaggerDelay(index), duration: 0.3 }}
            whileHover={{
              scale: 1.01,
              boxShadow: '0 8px 30px rgba(0, 229, 255, 0.2)'
            }}
            onClick={() => onSelectLead(lead)}
            className="group relative rounded-xl p-4 cursor-pointer transition-all duration-200"
            style={{
              background: isDark
                ? 'linear-gradient(to right, rgb(30, 41, 59), rgb(15, 23, 42))'
                : 'linear-gradient(to right, rgb(248, 250, 252), rgb(241, 245, 249))',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: isDark ? 'rgba(100, 116, 139, 0.3)' : 'rgba(148, 163, 184, 0.2)'
            }}
          >
            {/* Glow effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-macrea-cyan/5 to-macrea-violet/5 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity" />

            <div className="relative z-10 flex items-center gap-4">
              {/* Avatar avec score badge */}
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-macrea-cyan/20 to-macrea-violet/20 flex items-center justify-center border border-macrea-cyan/20">
                  <span className="text-xl font-bold" style={{ color: colors.textPrimary }}>
                    {lead.firstName?.[0] || lead.lastName?.[0] || lead.name?.[0] || '?'}
                  </span>
                </div>
                {/* Score badge */}
                {lead.score !== undefined && lead.score > 0 && (
                  <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-macrea-cyan to-macrea-violet flex items-center justify-center text-xs font-bold text-white shadow-glow">
                    {lead.score}
                  </div>
                )}
              </div>

              {/* Info principale */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-lg font-semibold truncate" style={{ color: colors.textPrimary }}>
                    {lead.firstName} {lead.lastName}
                  </div>
                  {lead.company && (
                    <div className="text-sm truncate" style={{ color: colors.textSecondary }}>
                      @ {lead.company}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm flex-wrap" style={{ color: colors.textTertiary }}>
                  {lead.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-4 h-4" />
                      <span className="truncate max-w-[200px]">{lead.email}</span>
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-4 h-4" />
                      <span>{lead.phone}</span>
                    </div>
                  )}
                  {lead.source && (
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-4 h-4" />
                      <span>{lead.source}</span>
                    </div>
                  )}
                </div>

                {/* Tags IA */}
                {lead.tags && lead.tags.length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    {lead.tags.slice(0, 3).map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-xs rounded-full border font-medium"
                        style={{
                          backgroundColor: isDark ? 'rgba(0, 229, 255, 0.1)' : 'rgba(0, 229, 255, 0.15)',
                          color: isDark ? '#00E5FF' : '#0891b2',
                          borderColor: isDark ? 'rgba(0, 229, 255, 0.2)' : 'rgba(0, 229, 255, 0.4)'
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                    {lead.tags.length > 3 && (
                      <span className="text-xs" style={{ color: colors.textTertiary }}>
                        +{lead.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Status badge */}
              <div className="flex-shrink-0">
                <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${getStatusStyle(lead.status, isDark)}`}>
                  {statusLabels[lead.status] || lead.status}
                </div>
              </div>

              {/* Metadata */}
              <div className="flex flex-col items-end gap-1 text-xs flex-shrink-0" style={{ color: colors.textTertiary }}>
                {lead.createdAt && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(lead.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                )}
                {lead.updatedAt && (
                  <div
                    className="flex items-center gap-1 font-semibold"
                    style={{ color: isDark ? '#10b981' : '#059669' }}
                  >
                    <span>•</span>
                    Mise à jour récente
                  </div>
                )}
              </div>

              {/* Actions (visible on hover) */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 flex-shrink-0">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectLead(lead);
                  }}
                  className="p-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: isDark ? 'rgba(0, 229, 255, 0.2)' : '#3b82f6',
                    color: isDark ? '#00E5FF' : '#ffffff'
                  }}
                  title="Voir détail"
                >
                  <Eye className="w-4 h-4" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Ouvrir modal de contact
                  }}
                  className="p-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: isDark ? 'rgba(168, 85, 247, 0.2)' : '#A855F7',
                    color: isDark ? '#A855F7' : '#ffffff'
                  }}
                  title="Contacter"
                >
                  <MessageSquare className="w-4 h-4" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Ouvrir modal d'automatisation
                  }}
                  className="p-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#22c55e',
                    color: isDark ? '#22c55e' : '#ffffff'
                  }}
                  title="Automatiser"
                >
                  <Zap className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
