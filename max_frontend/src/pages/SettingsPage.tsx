/**
 * Page Settings - Connexions Self-Service
 * Permet aux clients de configurer Email, SMS, WhatsApp en autonomie
 * Phase 2 - Canaux optionnels
 */

import { useEffect, useState } from 'react';
import { Settings, Lightbulb, Mail, Smartphone, MessageCircle, CheckCircle, SkipForward, Circle } from 'lucide-react';
import { useProvidersStore } from '../stores/useProvidersStore';
import { RecommendationCard } from '../components/settings/RecommendationCard';
import { EmailProvidersPanel } from '../components/settings/EmailProvidersPanel';
import { SmsProvidersPanel } from '../components/settings/SmsProvidersPanel';
import { WhatsAppProPanel } from '../components/settings/WhatsAppProPanel';

type TabValue = 'email' | 'sms' | 'whatsapp';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabValue>('email');

  const {
    providers,
    loading,
    fetchProviders,
    isChannelConfigured,
    isChannelSkipped
  } = useProvidersStore();

  // Fetch providers au mount
  useEffect(() => {
    fetchProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Calculer les badges d'état pour les tabs
  const emailConfigured = isChannelConfigured('email');
  const smsConfigured = isChannelConfigured('sms');
  const smsSkipped = isChannelSkipped('sms');
  const whatsappConfigured = isChannelConfigured('whatsapp');
  const whatsappSkipped = isChannelSkipped('whatsapp');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-8 h-8" /> Paramètres &gt; Intégrations
          </h1>
          <p className="text-gray-600 mt-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" /> Connectez vos services email, SMS et WhatsApp. Tous les canaux sont optionnels.
          </p>
        </div>

        {/* Recommendation Card */}
        <RecommendationCard className="mb-6" />

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {/* Tab Email */}
              <button
                onClick={() => setActiveTab('email')}
                className={`
                  flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm
                  ${activeTab === 'email'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Mail className="w-4 h-4" /> Email
                {emailConfigured && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">
                    <CheckCircle className="w-3 h-3" /> Configuré
                  </span>
                )}
              </button>

              {/* Tab SMS */}
              <button
                onClick={() => setActiveTab('sms')}
                className={`
                  flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm
                  ${activeTab === 'sms'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Smartphone className="w-4 h-4" /> SMS
                <span className="text-xs text-gray-500">(Optionnel)</span>
                {smsConfigured ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">
                    <CheckCircle className="w-3 h-3" /> Configuré
                  </span>
                ) : smsSkipped ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-gray-50 text-gray-400">
                    <SkipForward className="w-3 h-3" /> Ignoré
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-500">
                    <Circle className="w-3 h-3" /> Non utilisé
                  </span>
                )}
              </button>

              {/* Tab WhatsApp */}
              <button
                onClick={() => setActiveTab('whatsapp')}
                className={`
                  flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm
                  ${activeTab === 'whatsapp'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
                <span className="text-xs text-gray-500">(Optionnel)</span>
                {whatsappConfigured ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">
                    <CheckCircle className="w-3 h-3" /> Configuré
                  </span>
                ) : whatsappSkipped ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-gray-50 text-gray-400">
                    <SkipForward className="w-3 h-3" /> Ignoré
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-500">
                    <Circle className="w-3 h-3" /> Non utilisé
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {loading && (
              <div className="text-center py-12 text-gray-500">
                Chargement des connexions...
              </div>
            )}

            {!loading && activeTab === 'email' && <EmailProvidersPanel />}
            {!loading && activeTab === 'sms' && <SmsProvidersPanel />}
            {!loading && activeTab === 'whatsapp' && <WhatsAppProPanel />}
          </div>
        </div>

        {/* Footer Help */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-600 flex items-center justify-center gap-2">
            <Lightbulb className="w-4 h-4" /> <strong>Besoin d'aide ?</strong>
            <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
              Consultez notre guide d'intégration
            </a>
            {' ou '}
            <a href="/support" className="text-blue-600 hover:text-blue-700 font-medium">
              contactez le support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
