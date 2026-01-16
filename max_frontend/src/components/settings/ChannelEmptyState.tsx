/**
 * État vide d'un canal (SMS/WhatsApp) avec option de skip
 * Pour Email, affiche juste les options de configuration
 */

import { useState } from 'react';
import type { ChannelType } from '../../types/providers';

interface ChannelEmptyStateProps {
  channel: ChannelType;
  onConfigure?: () => void;
  onSkip?: () => void;
  isSkipped?: boolean;
  onUnskip?: () => void;
}

const CHANNEL_INFO: Record<ChannelType, {
  icon: string;
  title: string;
  description: string;
  useCases: string[];
}> = {
  email: {
    icon: '📧',
    title: 'Email',
    description: 'Envoyez des newsletters, emails transactionnels et notifications',
    useCases: [
      'Newsletters et campagnes marketing',
      'Confirmations de commande',
      'Notifications transactionnelles',
      'Relances automatiques'
    ]
  },
  sms: {
    icon: '📱',
    title: 'SMS',
    description: 'Envoyez des notifications transactionnelles urgentes par SMS',
    useCases: [
      'Codes OTP et vérification 2FA',
      'Confirmations de rendez-vous',
      'Alertes urgentes',
      'Rappels de dernière minute'
    ]
  },
  whatsapp: {
    icon: '💬',
    title: 'WhatsApp',
    description: 'Communiquez avec vos clients via WhatsApp Business',
    useCases: [
      'Messages conversationnels',
      'Support client instantané',
      'Confirmations avec boutons interactifs',
      'Médias et fichiers'
    ]
  }
};

export function ChannelEmptyState({
  channel,
  onConfigure,
  onSkip,
  isSkipped = false,
  onUnskip
}: ChannelEmptyStateProps) {
  const [showUseCases, setShowUseCases] = useState(false);
  const info = CHANNEL_INFO[channel];
  const isOptional = channel !== 'email';

  // Si le canal est skip, afficher le message de réactivation
  if (isSkipped && isOptional) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <span className="text-3xl">⏭️</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Canal {info.title} ignoré
        </h3>
        <p className="text-gray-600 mb-4 max-w-md mx-auto">
          Vous avez choisi de ne pas utiliser ce canal pour le moment.
        </p>
        <button
          onClick={onUnskip}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Réactiver le canal {info.title}
        </button>
      </div>
    );
  }

  // État vide normal
  return (
    <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-8">
      <div className="text-center max-w-2xl mx-auto">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <span className="text-3xl">{info.icon}</span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {isOptional ? (
            <>⚪ Ce canal n'est pas encore configuré</>
          ) : (
            <>Configurez votre premier canal de communication</>
          )}
        </h3>

        {/* Description */}
        <p className="text-gray-600 mb-4">
          {info.description}
        </p>

        {/* Use cases (collapsible) */}
        {showUseCases && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
            <p className="text-sm font-semibold text-gray-900 mb-2">
              Cas d'usage :
            </p>
            <ul className="text-sm text-gray-700 space-y-1">
              {info.useCases.map((useCase, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>{useCase}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Toggle use cases */}
        <button
          onClick={() => setShowUseCases(!showUseCases)}
          className="text-sm text-blue-600 hover:text-blue-700 mb-6"
        >
          {showUseCases ? '▼ Masquer les cas d\'usage' : '▶ Voir les cas d\'usage'}
        </button>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3">
          {onConfigure && (
            <button
              onClick={onConfigure}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              🚀 Configurer {info.title}
            </button>
          )}

          {isOptional && onSkip && (
            <>
              <div className="flex items-center gap-3 w-full max-w-xs">
                <div className="flex-1 border-t border-gray-300"></div>
                <span className="text-sm text-gray-500">ou</span>
                <div className="flex-1 border-t border-gray-300"></div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">
                  Vous n'utilisez pas le {info.title} ?
                </p>
                <button
                  onClick={onSkip}
                  className="text-gray-500 hover:text-gray-700 text-sm underline"
                >
                  ⏭️ Passer ce canal
                </button>
              </div>
            </>
          )}
        </div>

        {/* Documentation link */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            💡 Pas sûr de ce qu'il vous faut ?{' '}
            <a
              href="#"
              className="text-blue-600 hover:text-blue-700 font-medium"
              onClick={(e) => {
                e.preventDefault();
                // TODO: Link to docs
                alert('Documentation à venir');
              }}
            >
              Voir le guide de choix
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
