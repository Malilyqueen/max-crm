/**
 * pages/CrmSetupPage.tsx
 * Page affichée pour les tenants dont le CRM n'est pas encore provisionné
 * Affiche un écran d'onboarding avec:
 * - Bouton "Activer mon CRM"
 * - Instructions pour commencer avec M.A.X.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { apiClient } from '../api/client';
import {
  Sparkles,
  MessageSquare,
  Users,
  Rocket,
  CheckCircle,
  ArrowRight,
  Loader2,
  Mail
} from 'lucide-react';

export const CrmSetupPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isActivating, setIsActivating] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);

  const handleActivateCrm = async () => {
    setIsActivating(true);
    setActivationError(null);

    try {
      // Appeler l'API pour auto-provisionner le CRM
      const response = await apiClient.post('/crm/request-activation', {
        tenantId: user?.tenantId
      });

      if (response.data?.success) {
        // CRM activé ! Rediriger vers le dashboard
        const redirectUrl = response.data.redirect || '/dashboard';
        console.log(`[CrmSetup] ✅ CRM activé ! Redirection vers ${redirectUrl}`);

        // Forcer le rechargement du dashboard pour prendre en compte le nouveau statut CRM
        // On utilise window.location pour forcer un refresh complet
        window.location.href = redirectUrl;
      } else {
        setActivationError(response.data?.error || 'Erreur lors de l\'activation');
      }
    } catch (error: any) {
      // Extraire le message d'erreur de la réponse axios
      const errorMsg = error.response?.data?.message || error.message || 'Erreur de connexion';
      setActivationError(errorMsg);
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        {/* Card principale */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          {/* Header avec animation */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-lg shadow-blue-500/30">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">
              Bienvenue sur M.A.X., {user?.name?.split(' ')[0] || 'là'} !
            </h1>
            <p className="text-lg text-blue-200">
              Votre assistant IA est prêt à vous aider à gérer vos prospects.
            </p>
          </div>

          {/* Message principal */}
          <div className="bg-gradient-to-r from-blue-600/30 to-purple-600/30 rounded-2xl p-6 mb-8 border border-blue-400/30">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-500/30 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-300" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  Votre CRM est vide pour l'instant
                </h2>
                <p className="text-blue-200">
                  Une fois votre premier prospect ajouté, il s'affichera ici avec toutes
                  ses informations et l'historique de vos échanges.
                </p>
              </div>
            </div>
          </div>

          {/* Instructions M.A.X. */}
          <div className="bg-white/5 rounded-2xl p-6 mb-8 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-400" />
              Commencez avec M.A.X.
            </h3>

            <div className="space-y-4">
              {/* Exemple 1 */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-300 font-bold">
                  1
                </div>
                <div>
                  <p className="text-white font-medium">Ajoutez votre premier prospect</p>
                  <p className="text-slate-400 text-sm mt-1">
                    Dites à M.A.X. : <span className="text-purple-300 font-mono bg-purple-500/20 px-2 py-0.5 rounded">
                      "Intègre mon premier prospect : Jean Dupont, jean@example.com, 06 12 34 56 78"
                    </span>
                  </p>
                </div>
              </div>

              {/* Exemple 2 */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-300 font-bold">
                  2
                </div>
                <div>
                  <p className="text-white font-medium">Envoyez un message</p>
                  <p className="text-slate-400 text-sm mt-1">
                    Dites : <span className="text-purple-300 font-mono bg-purple-500/20 px-2 py-0.5 rounded">
                      "Envoie un email de bienvenue à Jean Dupont"
                    </span>
                  </p>
                </div>
              </div>

              {/* Exemple 3 */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-300 font-bold">
                  3
                </div>
                <div>
                  <p className="text-white font-medium">Suivez vos activités</p>
                  <p className="text-slate-400 text-sm mt-1">
                    M.A.X. garde une trace de tout et vous propose des actions intelligentes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bouton d'activation */}
          <div className="text-center">
            {activationError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
                {activationError}
              </div>
            )}

            <button
              onClick={handleActivateCrm}
              disabled={isActivating}
              className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isActivating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Activation en cours...
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5" />
                  Activer mon CRM
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <p className="mt-4 text-slate-400 text-sm">
              Ou allez directement sur <button
                onClick={() => navigate('/chat')}
                className="text-blue-400 hover:text-blue-300 underline"
              >
                M.A.X. Chat
              </button> pour commencer à interagir.
            </p>
          </div>

          {/* Fonctionnalités incluses */}
          <div className="mt-10 pt-8 border-t border-white/10">
            <h3 className="text-center text-white font-semibold mb-6">
              Ce qui vous attend avec M.A.X. CRM
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Users, label: 'Gestion des leads' },
                { icon: MessageSquare, label: 'Chat IA intelligent' },
                { icon: Mail, label: 'Email & SMS intégrés' },
                { icon: CheckCircle, label: 'Suivi automatique' }
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-xl">
                  <Icon className="w-6 h-6 text-blue-400" />
                  <span className="text-sm text-slate-300 text-center">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-slate-400">
          <p>M.A.X. CRM - MaCrea 2025</p>
          <p className="mt-1">
            Questions ? <a href="mailto:support@macrea.fr" className="text-blue-400 hover:underline">
              support@macrea.fr
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CrmSetupPage;
