/**
 * Panel Email Providers - V1 avec 3 options
 *
 * Option 1: Email MaCréa (par défaut, quota partagé)
 * Option 2: Mon domaine via MaCréa (hybride, quota partagé)
 * Option 3: Mes credentials (indépendant, quota propre)
 */

import { useState, useEffect } from 'react';
import { useProvidersStore } from '../../stores/useProvidersStore';
import { ProviderForm } from './ProviderForm';
import { ProviderCard } from './ProviderCard';
import { getProvidersByChannel } from '../../types/providers';
import type { Provider } from '../../types/providers';
import { useToast } from '../../hooks/useToast';

type EmailMode = 'default' | 'custom_domain' | 'self_service';

export function EmailProvidersPanel() {
  const { providers, fetchProviders } = useProvidersStore();
  const toast = useToast();
  const [mode, setMode] = useState<EmailMode>('default');
  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | undefined>(undefined);
  const [customDomain, setCustomDomain] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [dnsInstructions, setDnsInstructions] = useState<any>(null);

  const emailProviders = getProvidersByChannel(providers, 'email');
  const hasCustomProvider = emailProviders.length > 0;

  // Si le tenant a un provider custom, passer en mode self-service
  useEffect(() => {
    if (hasCustomProvider) {
      setMode('self_service');
    }
  }, [hasCustomProvider]);

  // Callback après création/édition provider
  const handleFormSuccess = async () => {
    await fetchProviders();
    toast.success(editingProvider ? 'Provider modifié avec succès !' : 'Provider créé avec succès !');
    setShowForm(false);
    setEditingProvider(undefined);
  };

  const handleEdit = (provider: Provider) => {
    setEditingProvider(provider);
    setShowForm(true);
  };

  // Requête validation DNS pour domaine custom
  const handleRequestCustomDomain = async () => {
    if (!customDomain || !customEmail) {
      toast.error('Veuillez renseigner le domaine et l\'email');
      return;
    }

    try {
      // TODO: Appeler API backend pour ajouter le domaine dans Mailjet
      const response = await fetch('/api/email/request-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: customDomain,
          email: customEmail
        })
      });

      if (!response.ok) throw new Error('Erreur lors de la demande');

      const data = await response.json();
      setDnsInstructions(data.dns_instructions);
      toast.success('Domaine ajouté ! Configurez les DNS ci-dessous.');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la demande');
    }
  };

  // Mode par défaut: Email MaCréa
  if (mode === 'default' && !hasCustomProvider) {
    return (
      <div className="space-y-6">
        {/* Option 1: Email par défaut MaCréa */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Email MaCréa activé (Par défaut)
              </h3>
              <p className="text-gray-700 mb-4">
                Vos emails sont envoyés via <strong>Mailjet MaCréa</strong>.
                <br />
                <span className="text-sm text-gray-600">
                  Quota partagé : 1000 emails/mois • Tracking actif
                </span>
              </p>

              <div className="bg-white bg-opacity-60 rounded-lg p-4 mb-4 border border-blue-100">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Provider:</span>
                    <span className="ml-2 font-medium text-gray-900">Mailjet</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Statut:</span>
                    <span className="ml-2 font-medium text-blue-600">Actif</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Expéditeur:</span>
                    <span className="ml-2 font-medium text-gray-900">contact@malalacrea.fr</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Quota:</span>
                    <span className="ml-2 font-medium text-orange-600">Partagé</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href="/activities?channel=email"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Voir les statistiques
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Options alternatives */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Besoin de plus ?</h4>

          <div className="space-y-3">
            {/* Option 2: Domaine custom */}
            <button
              onClick={() => setMode('custom_domain')}
              className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h5 className="font-medium text-gray-900 mb-1">Utiliser mon domaine professionnel</h5>
                  <p className="text-sm text-gray-600">
                    Envoyez depuis <strong>contact@mon-entreprise.fr</strong>
                    <br />
                    Quota partagé • Configuration DNS requise
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Option 3: Self-service */}
            <button
              onClick={() => {
                setMode('self_service');
                setShowForm(true);
              }}
              className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h5 className="font-medium text-gray-900 mb-1">Utiliser mes propres credentials</h5>
                  <p className="text-sm text-gray-600">
                    Apportez votre compte <strong>Mailjet/SendGrid</strong>
                    <br />
                    Quota indépendant • Configuration avancée
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mode custom domain
  if (mode === 'custom_domain' && !hasCustomProvider) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setMode('default')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Configurer mon domaine professionnel
          </h3>

          <p className="text-gray-600 mb-6">
            Envoyez des emails depuis votre propre domaine (ex: contact@mon-entreprise.fr)
            via l'infrastructure Mailjet MaCréa.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mon domaine
              </label>
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="mon-entreprise.fr"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email expéditeur
              </label>
              <input
                type="email"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="contact@mon-entreprise.fr"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={handleRequestCustomDomain}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Demander la validation DNS
            </button>
          </div>

          {dnsInstructions && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-2">
                📋 Configuration DNS requise
              </h4>
              <p className="text-sm text-yellow-800 mb-3">
                Ajoutez ces enregistrements chez votre hébergeur DNS :
              </p>
              <div className="bg-white p-3 rounded border border-yellow-300 font-mono text-xs space-y-2">
                <div>
                  <strong>SPF:</strong><br />
                  Type: TXT | Nom: @ | Valeur: v=spf1 include:spf.mailjet.com ~all
                </div>
                <div>
                  <strong>DKIM:</strong><br />
                  Type: TXT | Nom: mailjet._domainkey | Valeur: {dnsInstructions.dkim || 'k=rsa; p=...'}
                </div>
              </div>
              <p className="text-sm text-yellow-700 mt-3">
                ⚠️ La validation peut prendre jusqu'à 48h
              </p>
            </div>
          )}
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-sm text-orange-800">
              <p className="font-medium mb-1">Quota partagé</p>
              <p>
                Le quota de 1000 emails/mois reste partagé avec tous les tenants utilisant Mailjet MaCréa.
                Pour un quota indépendant, utilisez vos propres credentials.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mode self-service (ou providers existants)
  return (
    <div className="space-y-4">
      {hasCustomProvider && (
        <button
          onClick={() => setMode('default')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Revenir à l'email par défaut
        </button>
      )}

      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          {hasCustomProvider
            ? `Vous avez ${emailProviders.length} provider(s) email configuré(s).`
            : 'Configurez vos propres credentials email (quota indépendant)'}
        </p>
        <button
          onClick={() => {
            setEditingProvider(undefined);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          + Ajouter un provider
        </button>
      </div>

      {/* Liste des providers custom */}
      {emailProviders.map((provider) => (
        <ProviderCard
          key={provider.id}
          provider={provider}
          onEdit={handleEdit}
        />
      ))}

      {/* Formulaire modal */}
      {showForm && (
        <ProviderForm
          providerType="mailjet"
          existingProvider={editingProvider}
          onClose={() => {
            setShowForm(false);
            setEditingProvider(undefined);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}