/**
 * WhatsApp Pro Panel - Architecture Multi-Tenant V1
 *
 * STATUTS:
 * - not_requested: Formulaire demande activation (numéro + consent)
 * - pending_provisioning: "Activation en cours..."
 * - qr_ready: Afficher QR code + bouton vérifier connexion
 * - connected: Badge connecté + numéro + bouton désactiver
 * - disabled: "WhatsApp désactivé" + bouton réactiver
 * - expired: "WhatsApp suspendu" + bouton renouveler
 *
 * REGLES:
 * - Aucun champ technique visible (instanceId, token)
 * - "Désactiver" = soft disable (PAS de logout Green-API)
 * - QR code toujours tenant-scoped
 * - Statut réel depuis API /api/whatsapp/tenant/status
 */

import { useState, useEffect, useRef } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../hooks/useToast';

type WhatsAppStatus = 'not_requested' | 'pending_provisioning' | 'qr_ready' | 'connected' | 'disabled' | 'expired';

interface WhatsAppState {
  status: WhatsAppStatus;
  connected: boolean;
  phoneNumber: string | null;
  expiresAt: string | null;
  greenApiState: string | null;
  qrCode: string | null;
  loading: boolean;
  error: string | null;
}

export function WhatsAppProPanel() {
  const toast = useToast();

  const [state, setState] = useState<WhatsAppState>({
    status: 'not_requested',
    connected: false,
    phoneNumber: null,
    expiresAt: null,
    greenApiState: null,
    qrCode: null,
    loading: true,
    error: null
  });

  const [phoneInput, setPhoneInput] = useState('');
  const [consent, setConsent] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Charger le statut au mount
  useEffect(() => {
    loadStatus();
    return () => stopPolling();
  }, []);

  const loadStatus = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const response: any = await api.get('/whatsapp/tenant/status');

      setState(prev => ({
        ...prev,
        status: response.whatsapp_status || 'not_requested',
        connected: response.connected === true,
        phoneNumber: response.phone_number || null,
        expiresAt: response.expires_at || null,
        greenApiState: response.greenApiState || null,
        loading: false
      }));
    } catch (error: any) {
      console.error('[WhatsApp Pro] Erreur chargement statut:', error);
      setState(prev => ({
        ...prev,
        status: 'not_requested',
        connected: false,
        loading: false,
        error: 'Impossible de charger le statut WhatsApp'
      }));
    }
  };

  // Demander activation
  const handleRequestActivation = async () => {
    if (!phoneInput || !/^\+[1-9]\d{6,14}$/.test(phoneInput)) {
      toast.error('Numero invalide. Format attendu: +33612345678');
      return;
    }
    if (!consent) {
      toast.error('Veuillez accepter les conditions.');
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      await api.post('/whatsapp/tenant/request-activation', { phone_number: phoneInput });
      toast.success('Demande d\'activation enregistree!');
      setState(prev => ({
        ...prev,
        status: 'pending_provisioning',
        phoneNumber: phoneInput,
        loading: false
      }));
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erreur lors de la demande';
      toast.error(msg);
      setState(prev => ({ ...prev, loading: false, error: msg }));
    }
  };

  // Charger QR code
  const handleLoadQR = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response: any = await api.get('/whatsapp/tenant/qr');
      setState(prev => ({
        ...prev,
        qrCode: response.qrCode,
        loading: false
      }));
      startPolling();
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Impossible de generer le QR code';
      toast.error(msg);
      setState(prev => ({ ...prev, loading: false, error: msg }));
    }
  };

  // Vérifier connexion manuellement
  const handleCheckConnection = async () => {
    setState(prev => ({ ...prev, loading: true }));
    await loadStatus();
    if (state.status === 'connected') {
      toast.success('WhatsApp connecte!');
    }
  };

  // Polling pour détecter connexion après scan QR
  const startPolling = () => {
    if (pollingRef.current) return;
    setIsPolling(true);

    pollingRef.current = setInterval(async () => {
      try {
        const response: any = await api.get('/whatsapp/tenant/status');
        if (response.connected === true || response.whatsapp_status === 'connected') {
          stopPolling();
          setState(prev => ({
            ...prev,
            status: 'connected',
            connected: true,
            phoneNumber: response.phone_number || prev.phoneNumber,
            qrCode: null,
            loading: false
          }));
          toast.success('WhatsApp connecte avec succes!');
        }
      } catch (error) {
        console.error('[WhatsApp Pro] Erreur polling:', error);
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsPolling(false);
  };

  // Soft disable
  const handleDisable = async () => {
    if (!confirm('Desactiver WhatsApp dans MAX? (Votre instance reste active, vous pourrez reactiver plus tard)')) {
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      await api.post('/whatsapp/tenant/disable');
      toast.success('WhatsApp desactive');
      setState(prev => ({
        ...prev,
        status: 'disabled',
        connected: false,
        qrCode: null,
        loading: false
      }));
    } catch (error: any) {
      toast.error('Erreur lors de la desactivation');
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  // Re-enable
  const handleEnable = async () => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      const response: any = await api.post('/whatsapp/tenant/enable');
      toast.success(response.message || 'WhatsApp reactive');
      setState(prev => ({
        ...prev,
        status: response.whatsapp_status || 'qr_ready',
        connected: response.connected === true,
        loading: false
      }));
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erreur lors de la reactivation';
      toast.error(msg);
      setState(prev => ({ ...prev, loading: false, error: msg }));
    }
  };

  // Changer de numéro
  const handleChangeNumber = async () => {
    const newPhone = prompt('Nouveau numero WhatsApp (format: +33612345678):');
    if (!newPhone || !/^\+[1-9]\d{6,14}$/.test(newPhone)) {
      if (newPhone !== null) toast.error('Numero invalide');
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      await api.post('/whatsapp/tenant/change-number', { phone_number: newPhone });
      toast.success('Demande de changement enregistree');
      setState(prev => ({
        ...prev,
        status: 'pending_provisioning',
        phoneNumber: newPhone,
        connected: false,
        qrCode: null,
        loading: false
      }));
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur');
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  };

  // Loading
  if (state.loading && state.status === 'not_requested' && !state.error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  // ===== STATE: not_requested =====
  if (state.status === 'not_requested') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <div className="text-5xl mb-3">&#128172;</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Activer WhatsApp Pro</h3>
          <p className="text-gray-600">
            Envoyez et recevez des messages WhatsApp directement depuis MAX CRM.
          </p>
        </div>

        {state.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{state.error}</p>
          </div>
        )}

        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numero WhatsApp *
            </label>
            <input
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="+33612345678"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              Format international obligatoire (ex: +33612345678)
            </p>
          </div>

          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="wa-consent"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 h-4 w-4 text-green-600 rounded border-gray-300"
            />
            <label htmlFor="wa-consent" className="text-sm text-gray-600">
              J'accepte que MAX CRM se connecte a mon WhatsApp pour envoyer et recevoir
              des messages professionnels via mon numero.
            </label>
          </div>

          <button
            onClick={handleRequestActivation}
            disabled={state.loading || !phoneInput || !consent}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.loading ? 'Envoi en cours...' : 'Demander l\'activation WhatsApp'}
          </button>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-2">Ce qui est inclus:</h4>
          <div className="space-y-1 text-sm text-green-800">
            <div className="flex items-center gap-2">
              <span className="text-green-600">&#10003;</span>
              <span>Messages WhatsApp illimites</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">&#10003;</span>
              <span>Connexion via QR code (comme WhatsApp Web)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">&#10003;</span>
              <span>Historique des conversations</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">&#10003;</span>
              <span>Notifications en temps reel</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== STATE: pending_provisioning =====
  if (state.status === 'pending_provisioning') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <div className="text-5xl mb-3">&#9203;</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Activation en cours</h3>
          <p className="text-gray-600">
            Votre demande d'activation WhatsApp a ete envoyee.
          </p>
        </div>

        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6 text-center">
          <div className="animate-pulse inline-block w-4 h-4 bg-amber-400 rounded-full mb-4"></div>
          <p className="text-lg font-semibold text-amber-900 mb-2">
            En attente de provisioning
          </p>
          {state.phoneNumber && (
            <p className="text-amber-800">
              Numero demande: <strong>{state.phoneNumber}</strong>
            </p>
          )}
          <p className="text-sm text-amber-700 mt-3">
            Notre equipe configure votre instance WhatsApp. Vous recevrez le QR code
            a scanner des que l'activation sera terminee.
          </p>
        </div>

        <button
          onClick={loadStatus}
          disabled={state.loading}
          className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {state.loading ? 'Verification...' : 'Verifier le statut'}
        </button>
      </div>
    );
  }

  // ===== STATE: qr_ready =====
  if (state.status === 'qr_ready') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <div className="text-5xl mb-3">&#128247;</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Scanner le QR code</h3>
          <p className="text-gray-600">
            Scannez le QR code avec votre telephone pour connecter WhatsApp a MAX.
          </p>
        </div>

        {state.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{state.error}</p>
          </div>
        )}

        {/* QR Code */}
        {state.qrCode ? (
          <div className="bg-white border-2 border-gray-300 rounded-xl p-8 text-center">
            <div className="inline-block p-4 bg-white rounded-lg shadow-sm">
              <img
                src={state.qrCode}
                alt="QR Code WhatsApp"
                className="w-72 h-72"
              />
            </div>

            <div className="mt-6 space-y-3">
              {isPolling && (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-gray-700 font-medium">En attente de connexion...</p>
                </div>
              )}

              <button
                onClick={handleLoadQR}
                disabled={state.loading}
                className="text-gray-600 hover:text-gray-900 underline text-sm"
              >
                Generer un nouveau QR code
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <button
              onClick={handleLoadQR}
              disabled={state.loading}
              className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-lg transition-colors shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {state.loading ? 'Chargement...' : 'Afficher mon QR code'}
            </button>
          </div>
        )}

        {/* Bouton vérifier connexion */}
        <button
          onClick={handleCheckConnection}
          disabled={state.loading}
          className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {state.loading ? 'Verification...' : 'Verifier la connexion'}
        </button>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="font-semibold text-blue-900 mb-3">Comment scanner le QR code?</h4>
          <ol className="space-y-2 text-sm text-blue-800">
            <li className="flex gap-2">
              <span className="font-bold">1.</span>
              <span>Ouvrez WhatsApp sur votre telephone</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">2.</span>
              <span>Appuyez sur le menu puis <strong>Appareils connectes</strong></span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">3.</span>
              <span>Appuyez sur <strong>Connecter un appareil</strong></span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">4.</span>
              <span>Scannez le QR code affiche ci-dessus</span>
            </li>
          </ol>
        </div>
      </div>
    );
  }

  // ===== STATE: connected =====
  if (state.status === 'connected') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-3xl">&#9989;</span>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-green-900 mb-1">WhatsApp Connecte</h3>
              {state.phoneNumber && (
                <p className="text-green-700 font-medium">{state.phoneNumber}</p>
              )}
              <p className="text-sm text-green-600 mt-1">
                Messages illimites inclus dans votre plan MAX.
              </p>
              {state.expiresAt && (
                <p className="text-xs text-green-600 mt-1">
                  Valide jusqu'au {formatDate(state.expiresAt)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleChangeNumber}
            disabled={state.loading}
            className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Changer de numero
          </button>
          <button
            onClick={handleDisable}
            disabled={state.loading}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Desactiver WhatsApp dans MAX
          </button>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Astuce:</strong> Vous pouvez envoyer des messages WhatsApp depuis les fiches leads
            en cliquant sur le numero de telephone.
          </p>
        </div>
      </div>
    );
  }

  // ===== STATE: disabled =====
  if (state.status === 'disabled') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <div className="text-5xl mb-3">&#9724;&#65039;</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">WhatsApp Desactive</h3>
          <p className="text-gray-600">
            WhatsApp est desactive dans MAX. Votre instance est toujours active.
          </p>
        </div>

        <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6 text-center">
          {state.phoneNumber && (
            <p className="text-gray-700 mb-4">Numero: <strong>{state.phoneNumber}</strong></p>
          )}
          <button
            onClick={handleEnable}
            disabled={state.loading}
            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            {state.loading ? 'Reactivation...' : 'Reactiver WhatsApp'}
          </button>
        </div>
      </div>
    );
  }

  // ===== STATE: expired =====
  if (state.status === 'expired') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <div className="text-5xl mb-3">&#9888;&#65039;</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">WhatsApp Suspendu</h3>
          <p className="text-gray-600">
            Votre abonnement WhatsApp a expire.
          </p>
        </div>

        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
          {state.expiresAt && (
            <p className="text-red-800 mb-2">Expire le: <strong>{formatDate(state.expiresAt)}</strong></p>
          )}
          {state.phoneNumber && (
            <p className="text-red-700 mb-4">Numero: {state.phoneNumber}</p>
          )}
          <p className="text-sm text-red-700 mb-4">
            Contactez le support pour renouveler votre abonnement WhatsApp.
          </p>
          <a
            href="/support"
            className="inline-block px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
          >
            Contacter le support
          </a>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="max-w-2xl mx-auto text-center py-12">
      <p className="text-gray-500">Statut WhatsApp inconnu: {state.status}</p>
      <button
        onClick={loadStatus}
        className="mt-4 px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
      >
        Recharger
      </button>
    </div>
  );
}
