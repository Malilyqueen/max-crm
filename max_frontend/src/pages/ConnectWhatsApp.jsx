/**
 * Page ConnectWhatsApp - Onboarding WhatsApp Green-API
 *
 * Permet de connecter une instance WhatsApp via QR code
 * Polling automatique du statut toutes les 2-3 secondes
 */

import { useState, useEffect, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005';

export default function ConnectWhatsApp() {
  // État de connexion WhatsApp
  const [waState, setWaState] = useState({
    provider: 'greenapi',
    instanceId: '',
    apiToken: '',
    status: null, // 'notAuthorized' | 'authorized' | 'blocked' | 'sleepMode'
    qrCode: null,
    error: null,
    loading: false
  });

  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef(null);

  /**
   * Crée/enregistre une instance Green-API
   */
  const handleCreateInstance = async (e) => {
    e.preventDefault();

    if (!waState.instanceId || !waState.apiToken) {
      setWaState(prev => ({
        ...prev,
        error: 'Instance ID et API Token requis'
      }));
      return;
    }

    setWaState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`${API_BASE}/api/wa/instance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idInstance: waState.instanceId,
          apiTokenInstance: waState.apiToken,
          tenant: 'macrea' // TODO: Récupérer le tenant depuis le contexte utilisateur
        })
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.message || 'Erreur lors de la création');
      }

      setWaState(prev => ({
        ...prev,
        status: data.instance.status,
        loading: false
      }));

      // Si non autorisé, récupérer le QR code
      if (data.instance.status === 'notAuthorized') {
        await fetchQrCode();
        startPolling();
      }
    } catch (error) {
      setWaState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  /**
   * Récupère le QR code depuis l'API
   */
  const fetchQrCode = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/wa/instance/${waState.instanceId}/qr?apiToken=${waState.apiToken}`
      );

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.message || 'Impossible de récupérer le QR');
      }

      setWaState(prev => ({
        ...prev,
        qrCode: data.qr.qrCode,
        error: null
      }));
    } catch (error) {
      setWaState(prev => ({
        ...prev,
        error: error.message
      }));
    }
  };

  /**
   * Vérifie le statut de l'instance
   */
  const checkStatus = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/wa/instance/${waState.instanceId}/status?apiToken=${waState.apiToken}`
      );

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.message || 'Erreur vérification statut');
      }

      setWaState(prev => ({
        ...prev,
        status: data.status.state
      }));

      // Si autorisé, stopper le polling
      if (data.status.isAuthorized) {
        stopPolling();
      }

      return data.status.state;
    } catch (error) {
      console.error('[POLLING] Erreur:', error.message);
    }
  };

  /**
   * Démarre le polling du statut
   */
  const startPolling = () => {
    if (pollingIntervalRef.current) return; // Déjà en cours

    setIsPolling(true);

    pollingIntervalRef.current = setInterval(async () => {
      await checkStatus();
    }, 3000); // Toutes les 3 secondes
  };

  /**
   * Arrête le polling
   */
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
  };

  /**
   * Rafraîchit le QR code (déconnexion + nouveau QR)
   */
  const handleRefreshQr = async () => {
    setWaState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(
        `${API_BASE}/api/wa/instance/${waState.instanceId}/refresh-qr`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiTokenInstance: waState.apiToken })
        }
      );

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.message || 'Erreur refresh QR');
      }

      setWaState(prev => ({
        ...prev,
        qrCode: data.qr.qrCode,
        status: 'notAuthorized',
        loading: false
      }));

      // Redémarrer le polling
      startPolling();
    } catch (error) {
      setWaState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  /**
   * Envoie un message de test
   */
  const handleSendTest = async () => {
    const phoneNumber = prompt('Numéro de téléphone (format international, ex: 33612345678):');
    if (!phoneNumber) return;

    setWaState(prev => ({ ...prev, loading: true }));

    try {
      const response = await fetch(
        `${API_BASE}/api/wa/instance/${waState.instanceId}/send-test`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiTokenInstance: waState.apiToken,
            phoneNumber,
            message: '🎉 Test envoyé depuis M.A.X. via Green-API!'
          })
        }
      );

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.message || 'Erreur envoi message');
      }

      alert('✅ Message envoyé avec succès!');
      setWaState(prev => ({ ...prev, loading: false }));
    } catch (error) {
      alert(`❌ Erreur: ${error.message}`);
      setWaState(prev => ({ ...prev, loading: false }));
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => stopPolling();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Connexion WhatsApp
        </h1>
        <p className="text-gray-600 mb-6">
          Connectez votre instance WhatsApp via Green-API
        </p>

        {/* Formulaire de connexion */}
        {!waState.status && (
          <form onSubmit={handleCreateInstance} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instance ID (Green-API)
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="7103123456"
                value={waState.instanceId}
                onChange={(e) => setWaState(prev => ({ ...prev, instanceId: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Token Instance
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="abc123def456..."
                value={waState.apiToken}
                onChange={(e) => setWaState(prev => ({ ...prev, apiToken: e.target.value }))}
                required
              />
            </div>

            <button
              type="submit"
              disabled={waState.loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {waState.loading ? 'Chargement...' : 'Créer / Afficher QR Code'}
            </button>
          </form>
        )}

        {/* Affichage erreur */}
        {waState.error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            ❌ {waState.error}
          </div>
        )}

        {/* Affichage QR Code */}
        {waState.qrCode && waState.status === 'notAuthorized' && (
          <div className="mt-6 text-center">
            <div className="inline-block p-6 bg-white border-2 border-gray-300 rounded-lg">
              <img
                src={waState.qrCode}
                alt="QR Code WhatsApp"
                className="w-64 h-64"
              />
            </div>

            <div className="mt-4 flex items-center justify-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
              <p className="text-gray-700 font-medium">
                ⏳ Scannez le QR code avec WhatsApp
              </p>
            </div>

            <button
              onClick={handleRefreshQr}
              disabled={waState.loading}
              className="mt-4 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
            >
              🔁 Rafraîchir le QR
            </button>

            {isPolling && (
              <p className="mt-2 text-sm text-gray-500">
                Vérification automatique du statut...
              </p>
            )}
          </div>
        )}

        {/* Statut Autorisé */}
        {waState.status === 'authorized' && (
          <div className="mt-6 p-6 bg-green-50 border-2 border-green-200 rounded-lg text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-green-800 mb-2">
              WhatsApp Connecté!
            </h2>
            <p className="text-green-700 mb-4">
              Votre instance est maintenant autorisée et prête à envoyer des messages.
            </p>

            <button
              onClick={handleSendTest}
              disabled={waState.loading}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
            >
              📤 Envoyer un Message de Test
            </button>

            <button
              onClick={handleRefreshQr}
              disabled={waState.loading}
              className="ml-4 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
            >
              🔄 Reconnecter
            </button>
          </div>
        )}

        {/* Autres statuts */}
        {waState.status && !['notAuthorized', 'authorized'].includes(waState.status) && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
            ⚠️ Statut: {waState.status}
          </div>
        )}
      </div>
    </div>
  );
}
