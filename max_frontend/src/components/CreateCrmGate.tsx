/**
 * components/CreateCrmGate.tsx
 * Gate component pour les clients dont le CRM n'est pas encore cree
 * Bloque l'acces aux vues CRM et propose la creation
 */

import React, { useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { api } from '../api/client';
import { Rocket, Loader2, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';

type CrmState = 'not_created' | 'creating' | 'error' | 'active';

interface CreateCrmGateProps {
  initialState?: CrmState;
}

export const CreateCrmGate: React.FC<CreateCrmGateProps> = ({ initialState = 'not_created' }) => {
  const { user, checkAuth } = useAuthStore();
  const [state, setState] = useState<CrmState>(initialState);
  const [error, setError] = useState<string | null>(null);

  const handleCreateCrm = async () => {
    setState('creating');
    setError(null);

    try {
      const response = await api.post<{ success: boolean; message?: string; error?: string }>(
        '/auth/provision'
      );

      if (response.success) {
        setState('active');
        // Rafraichir les infos user pour mettre a jour isProvisioned
        await checkAuth();
        // Recharger la page pour acceder au dashboard
        window.location.reload();
      } else {
        throw new Error(response.error || 'Erreur lors de la creation du CRM');
      }
    } catch (err: any) {
      console.error('[CreateCrmGate] Erreur provision:', err);
      setState('error');
      setError(err.message || 'Une erreur est survenue. Veuillez reessayer.');
    }
  };

  const handleRetry = () => {
    setError(null);
    handleCreateCrm();
  };

  // Etat: Creation en cours
  if (state === 'creating') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Creation en cours...
          </h1>
          <p className="text-gray-600 mb-6">
            Nous preparons votre espace CRM personnalise.
            <br />
            Cela ne prendra que quelques secondes.
          </p>
          <div className="flex justify-center gap-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  // Etat: Erreur
  if (state === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Oups, une erreur est survenue
          </h1>
          <p className="text-gray-600 mb-2">
            La creation de votre CRM a rencontre un probleme.
          </p>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-6">
              {error}
            </p>
          )}
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Reessayer
          </button>
        </div>
      </div>
    );
  }

  // Etat: CRM cree avec succes (transition)
  if (state === 'active') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Votre CRM est pret !
          </h1>
          <p className="text-gray-600 mb-6">
            Redirection vers votre tableau de bord...
          </p>
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // Etat: Pas encore cree (defaut)
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Card principale */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-6 shadow-lg">
              <Rocket className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Creez votre CRM MaCrea
            </h1>
            <p className="text-gray-600">
              Bienvenue <strong>{user?.name}</strong> !
              <br />
              Votre CRM n'est pas encore pret.
            </p>
          </div>

          {/* Features incluses */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <h2 className="font-semibold text-gray-800 mb-4">
              Ce qui vous attend :
            </h2>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-gray-700">
                <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-sm">&#10003;</span>
                Gestion complete de vos prospects
              </li>
              <li className="flex items-center gap-3 text-gray-700">
                <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-sm">&#10003;</span>
                Campagnes email et SMS integrees
              </li>
              <li className="flex items-center gap-3 text-gray-700">
                <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-sm">&#10003;</span>
                Tableau de bord personnalise
              </li>
              {user?.plan === 'starter_whatsapp' && (
                <li className="flex items-center gap-3 text-gray-700">
                  <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-sm">&#10003;</span>
                  WhatsApp Pro (100 messages/mois)
                </li>
              )}
            </ul>
          </div>

          {/* Bouton CTA */}
          <button
            onClick={handleCreateCrm}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
          >
            Creer mon CRM
          </button>

          {/* Note */}
          <p className="text-center text-sm text-gray-500 mt-4">
            La creation prend quelques secondes
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-600">
          <p>
            {user?.tenantName || user?.tenantId} - Plan {user?.plan === 'starter_whatsapp' ? 'Starter + WhatsApp' : 'Starter'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreateCrmGate;
