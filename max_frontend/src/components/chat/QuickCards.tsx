/**
 * components/chat/QuickCards.tsx
 * Cartes de suggestions rapides pour M.A.X.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { User, Briefcase, Target, Compass } from 'lucide-react';
import { useThemeColors } from '../../hooks/useThemeColors';

interface QuickCard {
  icon: React.ReactNode;
  label: string;
  prompt: string;
}

interface QuickCardsProps {
  onSelect: (prompt: string) => void;
  cards?: QuickCard[];
}

const defaultCards: QuickCard[] = [
  {
    icon: <User className="w-5 h-5" />,
    label: 'Se présenter',
    prompt: 'Je m\'appelle [nom]. Je travaille dans [secteur].'
  },
  {
    icon: <Briefcase className="w-5 h-5" />,
    label: 'Décrire mon entreprise',
    prompt: 'Mon entreprise s\'appelle [nom] et nous faisons [activité].'
  },
  {
    icon: <Target className="w-5 h-5" />,
    label: 'Définir mes objectifs',
    prompt: 'Mon objectif est de [objectif] d\'ici [date].'
  },
  {
    icon: <Compass className="w-5 h-5" />,
    label: 'Me guider',
    prompt: 'Peux-tu me guider pour commencer ?'
  }
];

export const QuickCards: React.FC<QuickCardsProps> = ({ onSelect, cards = defaultCards }) => {
  const colors = useThemeColors();

  return (
    <div className="grid grid-cols-2 gap-3 mt-6">
      {cards.map((card, index) => (
        <motion.button
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.3 }}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(card.prompt)}
          className="group relative p-4 rounded-xl transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${colors.gradientStart}, ${colors.gradientEnd})`,
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: colors.border,
            boxShadow: '0 0 20px rgba(0, 145, 255, 0.1)'
          }}
        >
          {/* Glow effect on hover */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl blur-md"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 145, 255, 0.2), rgba(0, 207, 255, 0.2))'
            }}
          />

          <div className="relative z-10 flex flex-col items-center text-center gap-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #0091ff, #00cfff)',
                boxShadow: '0 0 16px rgba(0, 145, 255, 0.4)'
              }}
            >
              {card.icon}
            </div>
            <span
              className="text-sm font-semibold"
              style={{ color: colors.textPrimary }}
            >
              {card.label}
            </span>
          </div>
        </motion.button>
      ))}
    </div>
  );
};
