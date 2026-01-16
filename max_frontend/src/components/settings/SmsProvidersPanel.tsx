/**
 * Panel SMS Providers - Transactionnel uniquement
 *
 * Mode 1 (MaCréa): Sender ID personnalisable, numéro partagé
 * Mode 2 (Self-Service): Credentials Twilio propres
 *
 * ⚠️ SMS TRANSACTIONNELS UNIQUEMENT
 * - RDV, confirmation, rappel, notification système
 * - Pas de marketing, promo, prospection
 * - Clients ne peuvent pas répondre (unidirectionnel en Mode MaCréa)
 */

import { useState, useEffect } from 'react';
import { useProvidersStore } from '../../stores/useProvidersStore';
import { ProviderForm } from './ProviderForm';
import { ProviderCard } from './ProviderCard';
import { getProvidersByChannel } from '../../types/providers';
import type { Provider } from '../../types/providers';
import { useToast } from '../../hooks/useToast';

type SmsMode = 'macrea' | 'self_service';

export function SmsProvidersPanel() {
  const {
    providers,
    fetchProviders,
    smsConfig,
    loadingSms,
    fetchSmsConfig,
    updateSmsConfig,
    validateSenderId
  } = useProvidersStore();
  const toast = useToast();

  const [mode, setMode] = useState<SmsMode>('macrea');
  const [editing, setEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | undefined>(undefined);

  // Form state
  const [senderLabel, setSenderLabel] = useState('');
  const [suggestedId, setSuggestedId] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState('');

  const smsProviders = getProvidersByChannel(providers, 'sms');
  const hasCustomProvider = smsProviders.length > 0;

  // Fetch SMS config au mount
  useEffect(() => {
    fetchSmsConfig().catch(console.error);
  }, []);

  // Sync mode avec la config
  useEffect(() => {
    if (smsConfig) {
      setMode(smsConfig.sms_mode);
      setSenderLabel(smsConfig.sms_sender_label || '');
      setSuggestedId(smsConfig.sms_sender_id || '');
    } else if (hasCustomProvider) {
      setMode('self_service');
    }
  }, [smsConfig, hasCustomProvider]);

  // Valider sender ID en temps réel
  const handleLabelChange = async (label: string) => {
    setSenderLabel(label);
    setValidationError('');

    if (!label || label.length < 3) {
      setSuggestedId('');
      return;
    }

    setValidating(true);
    try {
      const result = await validateSenderId(label);
      setSuggestedId(result.suggested_id);

      if (!result.is_available) {
        setValidationError(
          `"${result.base_id}" non disponible. Suggestion: "${result.suggested_id}"`
        );
      }
    } catch (error: any) {
      setValidationError(error.message || 'Erreur validation');
    } finally {
      setValidating(false);
    }
  };

  // Sauvegarder config MaCréa
  const handleSaveMacreaConfig = async () => {
    if (!senderLabel || !suggestedId) {
      toast.error('Veuillez renseigner un nom d\'expéditeur');
      return;
    }

    try {
      await updateSmsConfig({
        sms_mode: 'macrea',
        sms_sender_label: senderLabel
      });
      toast.success('Configuration SMS sauvegardée !');
      setEditing(false);
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  // Callback après création provider Twilio
  const handleFormSuccess = async () => {
    await fetchProviders();
    await fetchSmsConfig();
    toast.success(editingProvider ? 'Provider modifié !' : 'Provider Twilio configuré !');
    setShowForm(false);
    setEditingProvider(undefined);
  };

  const handleEdit = (provider: Provider) => {
    setEditingProvider(provider);
    setShowForm(true);
  };

  // ============================================================
  // Mode MaCréa (par défaut)
  // ============================================================

  if (mode === 'macrea' && !hasCustomProvider) {
    return (
      <div className="space-y-6">
        {/* Card principale */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                📱 SMS Transactionnels activé (Par défaut)
              </h3>

              {!editing ? (
                // Mode affichage
                <>
                  <div className="bg-white bg-opacity-60 rounded-lg p-4 mb-4 border border-green-100">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Numéro:</span>
                        <span className="ml-2 font-medium text-gray-900">StudioMacrea</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Type:</span>
                        <span className="ml-2 font-medium text-orange-600">Unidirectionnel</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Nom expéditeur:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {smsConfig?.sms_sender_id || 'Non configuré'}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Templates:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          RDV, Confirmation, Rappel, Notification
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-orange-800">
                      <strong>⚠️ Unidirectionnel:</strong> Les clients ne peuvent pas répondre aux SMS.
                      <br />
                      <strong>✅ Transactionnel uniquement:</strong> Pas de gestion STOP requise.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setEditing(true)}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium text-sm"
                    >
                      ✏️ Modifier le nom
                    </button>
                    <a
                      href="/activite?channel=sms"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Statistiques
                    </a>
                  </div>
                </>
              ) : (
                // Mode édition
                <>
                  <div className="space-y-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nom affiché (marketing)
                      </label>
                      <input
                        type="text"
                        value={senderLabel}
                        onChange={(e) => handleLabelChange(e.target.value)}
                        placeholder="Ex: Cabinet Dr. Martin"
                        maxLength={50}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Nom utilisé dans l'interface MAX et les rapports
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sender ID (technique)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={suggestedId}
                          readOnly
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                        />
                        {validating && (
                          <div className="absolute right-3 top-2.5">
                            <div className="animate-spin h-5 w-5 border-2 border-green-500 border-t-transparent rounded-full"></div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        ℹ️ 3-11 caractères alphanumériques. Généré automatiquement.
                      </p>
                      {validationError && (
                        <p className="text-xs text-orange-600 mt-1">
                          {validationError}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveMacreaConfig}
                      disabled={!suggestedId || validating || loadingSms}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingSms ? 'Sauvegarde...' : 'Sauvegarder'}
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setSenderLabel(smsConfig?.sms_sender_label || '');
                        setSuggestedId(smsConfig?.sms_sender_id || '');
                      }}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Option alternative: Twilio Self-Service */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Besoin d'un numéro dédié ?</h4>

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
                <h5 className="font-medium text-gray-900 mb-1">Utiliser mon compte Twilio</h5>
                <p className="text-sm text-gray-600">
                  Apportez votre <strong>Account SID + Auth Token</strong>
                  <br />
                  Numéro dédié • Quota indépendant • Transactionnel uniquement
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // Mode Self-Service (Twilio custom)
  // ============================================================

  return (
    <div className="space-y-4">
      {hasCustomProvider && (
        <button
          onClick={() => setMode('macrea')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Revenir au SMS MaCréa
        </button>
      )}

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="text-sm text-orange-800">
            <p className="font-medium mb-1">⚠️ Transactionnel uniquement</p>
            <p>
              Même avec votre compte Twilio, les templates restent verrouillés (RDV, confirmation, rappel).
              <br />
              <strong>Pas de marketing SMS</strong> - Politique produit MAX.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          {hasCustomProvider
            ? `Vous avez ${smsProviders.length} connexion(s) Twilio configurée(s).`
            : 'Configurez votre compte Twilio (numéro dédié, quota propre)'}
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

      {/* Liste des providers custom */}
      {smsProviders.map((provider) => (
        <ProviderCard
          key={provider.id}
          provider={provider}
          onEdit={handleEdit}
        />
      ))}

      {/* Formulaire modal */}
      {showForm && (
        <ProviderForm
          providerType="twilio_sms"
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
