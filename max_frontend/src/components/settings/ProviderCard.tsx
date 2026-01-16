/**
 * ProviderCard - Carte d'affichage d'un provider configuré
 * Affiche le statut, les actions (test, edit, delete, activate)
 */

import { useState } from 'react';
import type { Provider } from '../../types/providers';
import { PROVIDER_METADATA } from '../../types/providers';
import { useProvidersStore } from '../../stores/useProvidersStore';
import { useToast } from '../../hooks/useToast';

interface ProviderCardProps {
  provider: Provider;
  onEdit?: (provider: Provider) => void;
}

export function ProviderCard({ provider, onEdit }: ProviderCardProps) {
  const { deleteProvider, updateProvider, testConnection } = useProvidersStore();
  const toast = useToast();
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  const metadata = PROVIDER_METADATA[provider.provider_type];

  // Status badge config
  const statusConfig = {
    'non_testé': { color: 'gray', icon: '⚪', label: 'Non testé' },
    'success': { color: 'green', icon: '✅', label: 'Connecté' },
    'failed': { color: 'red', icon: '❌', label: 'Échec' },
  };

  const status = statusConfig[provider.connection_status] || statusConfig['non_testé'];

  // Test de connexion
  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await testConnection(provider.id);
      if (result.success) {
        toast.success(`✅ Test réussi : ${provider.provider_name || provider.provider_type}`);
      } else {
        toast.error(`❌ Test échoué : ${result.error || 'Erreur inconnue'}`);
      }
    } catch (error: any) {
      toast.error(`Erreur lors du test : ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  // Toggle actif/inactif
  const handleToggleActive = async () => {
    setToggling(true);
    try {
      await updateProvider(provider.id, {
        is_active: !provider.is_active
      });
      toast.success(
        provider.is_active
          ? 'Provider désactivé'
          : 'Provider activé'
      );
    } catch (error: any) {
      toast.error(`Erreur : ${error.message}`);
    } finally {
      setToggling(false);
    }
  };

  // Suppression
  const handleDelete = async () => {
    if (!confirm(`Voulez-vous vraiment supprimer "${provider.provider_name || provider.provider_type}" ?`)) {
      return;
    }

    setDeleting(true);
    try {
      await deleteProvider(provider.id);
      toast.success('Provider supprimé');
    } catch (error: any) {
      toast.error(`Erreur lors de la suppression : ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        {/* Header */}
        <div className="flex items-start gap-3 flex-1">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              provider.is_active ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              <span className="text-xl">{metadata?.icon || '📡'}</span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 truncate">
                {provider.provider_name || metadata?.label || provider.provider_type}
              </h3>
              {provider.is_active && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {metadata?.label || provider.provider_type}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
          status.color === 'green' ? 'bg-green-100 text-green-700' :
          status.color === 'red' ? 'bg-red-100 text-red-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          <span>{status.icon}</span>
          <span>{status.label}</span>
        </div>
      </div>

      {/* Erreur de test */}
      {provider.connection_status === 'failed' && provider.last_test_error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            <strong>Erreur :</strong> {provider.last_test_error}
          </p>
          {provider.last_tested_at && (
            <p className="text-xs text-red-600 mt-1">
              Testé le {new Date(provider.last_tested_at).toLocaleString('fr-FR')}
            </p>
          )}
        </div>
      )}

      {/* Dernière activité */}
      {provider.last_tested_at && provider.connection_status === 'success' && (
        <div className="mb-4 text-xs text-gray-500">
          Dernière connexion réussie : {new Date(provider.last_tested_at).toLocaleString('fr-FR')}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
        {/* Tester la connexion */}
        <button
          onClick={handleTest}
          disabled={testing || deleting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {testing ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Test...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Tester
            </>
          )}
        </button>

        {/* Activer/Désactiver */}
        <button
          onClick={handleToggleActive}
          disabled={toggling || deleting}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm font-medium transition-colors ${
            provider.is_active
              ? 'border-orange-300 text-orange-700 hover:bg-orange-50'
              : 'border-green-300 text-green-700 hover:bg-green-50'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {toggling ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {provider.is_active ? 'Désactivation...' : 'Activation...'}
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                  provider.is_active
                    ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                    : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                } />
              </svg>
              {provider.is_active ? 'Désactiver' : 'Activer'}
            </>
          )}
        </button>

        {/* Éditer */}
        {onEdit && (
          <button
            onClick={() => onEdit(provider)}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Modifier
          </button>
        )}

        {/* Supprimer */}
        <button
          onClick={handleDelete}
          disabled={deleting || toggling || testing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-300 text-red-700 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ml-auto"
        >
          {deleting ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Suppression...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Supprimer
            </>
          )}
        </button>
      </div>
    </div>
  );
}
