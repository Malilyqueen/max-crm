/**
 * components/chat/MessageList.tsx
 * Liste des messages avec auto-scroll - Style futuriste premium
 */

import React, { useEffect, useRef } from 'react';
import type { ChatMessage } from '../../types/chat';
import { Message } from './Message';
import { TypingIndicator } from './TypingIndicator';
import { QuickCards } from './QuickCards';
import { ConsentCard } from './ConsentCard';
import { useThemeColors } from '../../hooks/useThemeColors';
import { BarChart3, Search, Target, Sparkles, TrendingUp, Bot } from 'lucide-react';

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming?: boolean;
  isLoading?: boolean;
  onApproveConsent?: (consentId: string) => Promise<void>;
  onViewAudit?: (consentId: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isStreaming = false,
  isLoading = false,
  onApproveConsent,
  onViewAudit
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const colors = useThemeColors();

  // Auto-scroll vers le bas quand nouveaux messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Messages de bienvenue dynamiques selon l'heure
  const getWelcomeMessage = () => {
    const hour = new Date().getHours();

    const morningMessages = [
      { title: "M.A.X. à ton service.", subtitle: "Prêt pour la prochaine mission." },
      { title: "Systèmes opérationnels.", subtitle: "Objectif du jour ?" },
      { title: "M.A.X. en ligne.", subtitle: "Quelle est la priorité aujourd'hui ?" },
      { title: "Cockpit activé.", subtitle: "Plan de vol à établir ?" }
    ];

    const afternoonMessages = [
      { title: "M.A.X. à ton service.", subtitle: "Mission en cours ?" },
      { title: "Cockpit actif.", subtitle: "Prêt à optimiser ton pipeline." },
      { title: "Systèmes prêts.", subtitle: "Quelle est la prochaine étape ?" },
      { title: "M.A.X. opérationnel.", subtitle: "Besoin d'un coup de main ?" }
    ];

    const eveningMessages = [
      { title: "M.A.X. à ton service.", subtitle: "Besoin d'un débriefing ?" },
      { title: "Systèmes en veille.", subtitle: "Préparons demain ?" },
      { title: "Cockpit actif.", subtitle: "Dernières vérifications ?" },
      { title: "M.A.X. disponible.", subtitle: "Une dernière mission ?" }
    ];

    let messagePool;
    if (hour >= 5 && hour < 12) {
      messagePool = morningMessages;
    } else if (hour >= 12 && hour < 18) {
      messagePool = afternoonMessages;
    } else {
      messagePool = eveningMessages;
    }

    // Sélection aléatoire dans le pool
    const randomIndex = Math.floor(Math.random() * messagePool.length);
    return messagePool[randomIndex];
  };

  const welcomeMsg = getWelcomeMessage();

  // Handler pour QuickCards
  const handleQuickCardSelect = (prompt: string) => {
    // TODO: Implémenter l'envoi automatique du message
    console.log('Quick card selected:', prompt);
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 space-y-4" style={{ background: colors.background }}>
      {/* Message de bienvenue émotionnel */}
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
          {/* Avatar M.A.X. premium */}
          <div className="relative mb-8">
            <img
              src="/images/max-hero-hello.png"
              alt="M.A.X."
              className="w-32 h-auto relative z-10"
              style={{
                filter: 'drop-shadow(0 0 48px rgba(0, 145, 255, 0.8))'
              }}
            />
            <div
              className="absolute inset-0 blur-3xl animate-pulse"
              style={{ background: 'rgba(0, 145, 255, 0.5)' }}
            />
            <div
              className="absolute -inset-6 blur-[80px]"
              style={{ background: 'linear-gradient(135deg, rgba(0, 145, 255, 0.3), rgba(0, 207, 255, 0.3))' }}
            />
          </div>

          {/* Message de bienvenue */}
          <h2
            className="text-3xl font-bold mb-4"
            style={{
              background: 'linear-gradient(135deg, #0091ff, #00cfff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            {welcomeMsg.title}
          </h2>
          <p className="max-w-2xl text-base leading-relaxed mb-8 opacity-90" style={{ color: colors.textPrimary }}>
            {welcomeMsg.subtitle}
          </p>

          {/* Quick Cards */}
          <div className="max-w-2xl w-full mb-8">
            <QuickCards onSelect={handleQuickCardSelect} />
          </div>

          {/* Capabilities en liens compacts */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center max-w-2xl text-sm opacity-70" style={{ color: colors.textSecondary }}>
            {[
              { Icon: BarChart3, text: 'Analyser et importer des fichiers (CSV, Excel)' },
              { Icon: Search, text: 'Comparer avec tes leads existants' },
              { Icon: Target, text: 'Détecter et nettoyer les doublons' },
              { Icon: Sparkles, text: 'Enrichir automatiquement tes données' },
              { Icon: TrendingUp, text: 'Gérer ton pipeline de ventes' },
              { Icon: Bot, text: 'Automatiser tes tâches répétitives' }
            ].map((capability, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <capability.Icon className="w-4 h-4" style={{ color: '#0091ff' }} />
                <span>{capability.text}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.map((message, index) => {
        // Si c'est un message de consentement, afficher ConsentCard
        if (message.type === 'consent' && message.consentId && message.operation && onApproveConsent) {
          return (
            <ConsentCard
              key={`${message.timestamp}-${index}`}
              consentId={message.consentId}
              operation={message.operation.description}
              expiresIn={300} // 5 minutes
              onApprove={onApproveConsent}
              onViewAudit={onViewAudit}
            />
          );
        }

        // Sinon, afficher un message normal
        return <Message key={`${message.timestamp}-${index}`} message={message} />;
      })}

      {/* Indicateur de saisie */}
      {(isStreaming || isLoading) && <TypingIndicator />}

      {/* Anchor pour auto-scroll */}
      <div ref={bottomRef} />
    </div>
  );
};
