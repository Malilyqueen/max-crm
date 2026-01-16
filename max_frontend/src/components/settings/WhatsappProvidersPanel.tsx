/**
 * Panel WhatsApp Providers
 * Affiche Green-API et Twilio WhatsApp avec option de skip et formulaire
 */

import { useState } from 'react';
import { useProvidersStore } from '../../stores/useProvidersStore';
import { ChannelEmptyState } from './ChannelEmptyState';
import { ProviderForm } from './ProviderForm';
import { ProviderCard } from './ProviderCard';
import { getProvidersByChannel } from '../../types/providers';
import type { Provider } from '../../types/providers';
import { useToast } from '../../hooks/useToast';

export function WhatsappProvidersPanel() {
  const {
    providers,
    fetchProviders,
    isChannelSkipped,
    skipChannel,
    unskipChannel
  } = useProvidersStore();
  const toast = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | undefined>(undefined);

  const whatsappProviders = getProvidersByChannel(providers, 'whatsapp');
  const hasProviders = whatsappProviders.length > 0;
  const isSkipped = isChannelSkipped('whatsapp');

  // Callback après création/édition réussie
  const handleFormSuccess = async () => {
    await fetchProviders(); // Refresh la liste
    toast.success(editingProvider ? 'Provider modifié avec succès !' : 'Provider WhatsApp créé avec succès !');
    setEditingProvider(undefined);
  };

  // Ouvrir le formulaire d'édition
  const handleEdit = (provider: Provider) => {
    setEditingProvider(provider);
    setShowForm(true);
  };

  // État vide: montrer les options de configuration ou skip
  if (!hasProviders) {
    return (
      <>
        <ChannelEmptyState
          channel="whatsapp"
          isSkipped={isSkipped}
          onConfigure={() => setShowForm(true)}
          onSkip={() => skipChannel('whatsapp')}
          onUnskip={() => unskipChannel('whatsapp')}
        />

        {/* Formulaire modal */}
        {showForm && (
          <ProviderForm
            providerType="greenapi_whatsapp"
            existingProvider={editingProvider}
            onClose={() => {
              setShowForm(false);
              setEditingProvider(undefined);
            }}
            onSuccess={handleFormSuccess}
          />
        )}
      </>
    );
  }

  // Afficher les ProviderCard pour chaque provider
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          Vous avez {whatsappProviders.length} connexion{whatsappProviders.length > 1 ? 's' : ''} WhatsApp configurée{whatsappProviders.length > 1 ? 's' : ''}.
        </p>
        <button
          onClick={() => {
            setEditingProvider(undefined);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          + Ajouter une connexion
        </button>
      </div>

      {/* Liste des providers */}
      {whatsappProviders.map((provider) => (
        <ProviderCard
          key={provider.id}
          provider={provider}
          onEdit={handleEdit}
        />
      ))}

      {/* Formulaire modal */}
      {showForm && (
        <ProviderForm
          providerType="greenapi_whatsapp"
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
