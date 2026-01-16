/**
 * WhatsApp Pro Panel - Mode QR CODE ONLY
 *
 * RÈGLES STRICTES:
 * - Aucun champ technique visible (instanceId, token, Green-API)
 * - QR code uniquement pour connexion
 * - Feature flag billing: whatsapp_enabled
 * - Upsell "+15€/mois" si désactivé
 * - UX: "Je clique → Je scanne → Ça marche"
 */

import { useState, useEffect, useRef } from 'react';
import { useProvidersStore } from '../../stores/useProvidersStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { api } from '../../api/client';
import { useToast } from '../../hooks/useToast';

interface WhatsAppStatus {
  connected: boolean;
  phoneNumber?: string;
  qrCode?: string;
  loading: boolean;
  error?: string;
}

export function WhatsAppProPanel() {
  const { providers, fetchProviders } = useProvidersStore();
  const { tenant } = useSettingsStore();
  const toast = useToast();

  const [whatsappEnabled, setWhatsappEnabled] = useState<boolean | null>(null);
  const [status, setStatus] = useState<WhatsAppStatus>({
    connected: false,
    loading: false
  });
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Vérifier si WhatsApp est activé (feature flag billing)
  useEffect(() => {
    const checkWhatsAppEnabled = async () => {
      try {
        const response = await api.get('/settings/features');
        setWhatsappEnabled(response.whatsapp_enabled || false);
      } catch (error) {
        console.error('[WhatsApp Pro] Erreur vérification feature flag:', error);
        setWhatsappEnabled(false);
      }
    };

    checkWhatsAppEnabled();
  }, []);

  // Vérifier si WhatsApp est déjà connecté
  useEffect(() => {
    const whatsappProvider = providers.find(
      p => p.provider_type === 'greenapi_whatsapp' && p.is_active
    );

    if (whatsappProvider) {
      setStatus(prev => ({
        ...prev,
        connected: true,
        phoneNumber: 'Connecté' // TODO: Récupérer numéro réel depuis API
      }));
    }
  }, [providers]);

  /**
   * Générer QR code pour connexion
   */
  const handleConnectWhatsApp = async () => {
    if (!whatsappEnabled) {
      toast.error('WhatsApp Pro n\'est pas activé. Contactez le support.');
      return;
    }

    setStatus(prev => ({ ...prev, loading: true, error: undefined }));

    try {
      // Appeler l'API backend pour obtenir QR code
      // L'API backend génère instanceId/token en interne (invisible client)
      const response = await api.post('/wa/qr/generate', {
        // Pas de credentials envoyés - backend gère tout
      });

      if (!response.ok) {
        throw new Error(response.error || 'Erreur génération QR');
      }

      setStatus(prev => ({
        ...prev,
        qrCode: response.qrCode,
        loading: false
      }));

      // Démarrer polling du statut
      startPolling();
    } catch (error: any) {
      console.error('[WhatsApp Pro] Erreur connexion:', error);
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: error.response?.data?.error || error.message || 'Erreur de connexion'
      }));
      toast.error('Impossible de générer le QR code');
    }
  };

  /**
   * Polling du statut de connexion
   */
  const startPolling = () => {
    if (pollingIntervalRef.current) return;

    setIsPolling(true);

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await api.get('/wa/qr/status');

        if (response.connected) {
          stopPolling();
          setStatus({
            connected: true,
            phoneNumber: response.phoneNumber,
            loading: false
          });
          await fetchProviders(); // Refresh providers list
          toast.success('WhatsApp Pro connecté avec succès!');
        }
      } catch (error) {
        console.error('[WhatsApp Pro] Erreur polling:', error);
      }
    }, 3000); // Toutes les 3 secondes
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
  };

  /**
   * Déconnecter WhatsApp
   */
  const handleDisconnect = async () => {
    if (!confirm('Êtes-vous sûr de vouloir déconnecter WhatsApp Pro?')) {
      return;
    }

    setStatus(prev => ({ ...prev, loading: true }));

    try {
      await api.post('/wa/disconnect');

      setStatus({
        connected: false,
        loading: false
      });

      await fetchProviders();
      toast.success('WhatsApp Pro déconnecté');
    } catch (error: any) {
      console.error('[WhatsApp Pro] Erreur déconnexion:', error);
      toast.error('Erreur lors de la déconnexion');
      setStatus(prev => ({ ...prev, loading: false }));
    }
  };

  /**
   * Envoyer message de test au numéro connecté
   */
  const handleSendTest = async () => {
    setStatus(prev => ({ ...prev, loading: true }));

    try {
      const response = await api.post('/wa/test');

      if (!response.ok) {
        throw new Error(response.error || 'Erreur envoi message');
      }

      toast.success(`✅ Message test envoyé à ${response.phoneNumber}! Vérifiez votre téléphone WhatsApp.`);
    } catch (error: any) {
      console.error('[WhatsApp Pro] Erreur test:', error);
      toast.error(error.response?.data?.error || error.message || 'Impossible d\'envoyer le message test');
    } finally {
      setStatus(prev => ({ ...prev, loading: false }));
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, []);

  // Loading state
  if (whatsappEnabled === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Feature flag désactivé - Upsell
  if (!whatsappEnabled) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            WhatsApp Pro
          </h3>
          <p className="text-gray-700 mb-6 text-lg">
            Envoyez et recevez des messages WhatsApp directement depuis MAX CRM.
            <br />
            Gagnez du temps et améliorez votre relation api.
          </p>

          <div className="bg-white rounded-lg p-6 mb-6 border border-gray-200 inline-block">
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="text-3xl font-bold text-green-600">+15€</span>
              <span className="text-gray-600">/mois</span>
            </div>
            <p className="text-sm text-gray-500">Option premium</p>
          </div>

          <div className="space-y-3 text-left max-w-md mx-auto mb-6">
            <div className="flex items-center gap-3">
              <span className="text-green-600 text-xl">✓</span>
              <span className="text-gray-700">Envoi de messages WhatsApp illimités</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-600 text-xl">✓</span>
              <span className="text-gray-700">Réception des réponses en temps réel</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-600 text-xl">✓</span>
              <span className="text-gray-700">Historique complet des conversations</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-600 text-xl">✓</span>
              <span className="text-gray-700">Support prioritaire</span>
            </div>
          </div>

          <button
            onClick={() => {
              toast.info('Contactez le support pour activer WhatsApp Pro');
              // TODO: Ouvrir modal contact support ou rediriger
            }}
            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-lg transition-colors shadow-md hover:shadow-lg"
          >
            Activer WhatsApp Pro
          </button>

          <p className="mt-4 text-sm text-gray-500">
            Besoin d'aide? <a href="#" className="text-blue-600 hover:text-blue-700 underline">Contactez le support</a>
          </p>
        </div>
      </div>
    );
  }

  // WhatsApp connecté
  if (status.connected) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Statut connecté */}
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="text-5xl">✅</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-green-900 mb-1">
                WhatsApp Pro Connecté
              </h3>
              <p className="text-green-700">
                {status.phoneNumber && <span className="font-medium">{status.phoneNumber}</span>}
              </p>
              <p className="text-sm text-green-600 mt-1">
                Vous pouvez maintenant envoyer et recevoir des messages WhatsApp depuis MAX.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSendTest}
            className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors shadow-sm"
          >
            📤 Envoyer un test
          </button>
          <button
            onClick={handleDisconnect}
            disabled={status.loading}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {status.loading ? '⏳' : '🔌'} Déconnecter
          </button>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>💡 Astuce:</strong> Vous pouvez envoyer des messages WhatsApp depuis les fiches leads en cliquant sur le numéro de téléphone.
          </p>
        </div>
      </div>
    );
  }

  // Mode connexion (QR code)
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="text-5xl mb-3">💬</div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Connecter WhatsApp Pro
        </h3>
        <p className="text-gray-600">
          Scannez le QR code avec votre téléphone pour connecter votre WhatsApp à MAX.
        </p>
      </div>

      {/* Erreur */}
      {status.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            ❌ {status.error}
          </p>
        </div>
      )}

      {/* QR Code ou bouton */}
      {!status.qrCode && (
        <div className="text-center">
          <button
            onClick={handleConnectWhatsApp}
            disabled={status.loading}
            className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-lg transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status.loading ? (
              <>⏳ Génération du QR code...</>
            ) : (
              <>🔗 Connecter mon WhatsApp</>
            )}
          </button>
        </div>
      )}

      {/* QR Code */}
      {status.qrCode && (
        <div className="bg-white border-2 border-gray-300 rounded-xl p-8 text-center">
          <div className="inline-block p-4 bg-white rounded-lg shadow-sm">
            <img
              src={status.qrCode}
              alt="QR Code WhatsApp"
              className="w-72 h-72"
            />
          </div>

          <div className="mt-6 space-y-4">
            {isPolling && (
              <div className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-gray-700 font-medium">
                  En attente de connexion...
                </p>
              </div>
            )}

            <button
              onClick={handleConnectWhatsApp}
              disabled={status.loading}
              className="text-gray-600 hover:text-gray-900 underline text-sm"
            >
              🔄 Générer un nouveau QR code
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-semibold text-blue-900 mb-3">
          📱 Comment scanner le QR code?
        </h4>
        <ol className="space-y-2 text-sm text-blue-800">
          <li className="flex gap-2">
            <span className="font-bold">1.</span>
            <span>Ouvrez WhatsApp sur votre téléphone</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">2.</span>
            <span>Appuyez sur <strong>⋮</strong> (menu) puis <strong>Appareils connectés</strong></span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">3.</span>
            <span>Appuyez sur <strong>Connecter un appareil</strong></span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">4.</span>
            <span>Scannez le QR code affiché ci-dessus</span>
          </li>
        </ol>
      </div>
    </div>
  );
}