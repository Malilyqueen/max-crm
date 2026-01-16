/**
 * ProviderForm - Formulaire création/édition de provider
 * Supporte Mailjet, Twilio SMS, Green-API WhatsApp (extensible)
 */

import { useState, useEffect } from 'react';
import { useProvidersStore } from '../../stores/useProvidersStore';
import type { ProviderType, Provider } from '../../types/providers';
import { PROVIDER_METADATA } from '../../types/providers';
import { useToast } from '../../hooks/useToast';

interface ProviderFormProps {
  providerType: ProviderType;
  existingProvider?: Provider; // Si fourni = mode édition
  onClose: () => void;
  onSuccess?: () => void;
}

export function ProviderForm({
  providerType,
  existingProvider,
  onClose,
  onSuccess
}: ProviderFormProps) {
  const { createProvider, updateProvider, saving } = useProvidersStore();
  const toast = useToast();

  const isEditMode = !!existingProvider;
  const metadata = PROVIDER_METADATA[providerType];

  // Form state
  const [providerName, setProviderName] = useState(existingProvider?.provider_name || '');
  const [isActive, setIsActive] = useState(existingProvider?.is_active || false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Credentials state (par provider type)
  const [mailjetApiKey, setMailjetApiKey] = useState('');
  const [mailjetApiSecret, setMailjetApiSecret] = useState('');

  const [twilioAccountSid, setTwilioAccountSid] = useState('');
  const [twilioAuthToken, setTwilioAuthToken] = useState('');
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState('');

  const [greenApiInstanceId, setGreenApiInstanceId] = useState('');
  const [greenApiToken, setGreenApiToken] = useState('');

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validation par provider type
    switch (providerType) {
      case 'mailjet':
        if (!mailjetApiKey.trim()) {
          newErrors.apiKey = 'API Key obligatoire';
        }
        if (!mailjetApiSecret.trim()) {
          newErrors.apiSecret = 'API Secret obligatoire';
        }
        break;

      case 'twilio_sms':
      case 'twilio_whatsapp':
        if (!twilioAccountSid.trim()) {
          newErrors.accountSid = 'Account SID obligatoire';
        }
        if (!twilioAuthToken.trim()) {
          newErrors.authToken = 'Auth Token obligatoire';
        }
        if (!twilioPhoneNumber.trim()) {
          newErrors.phoneNumber = 'Numéro de téléphone obligatoire';
        } else if (!twilioPhoneNumber.startsWith('+')) {
          newErrors.phoneNumber = 'Format international requis (ex: +33...)';
        }
        break;

      case 'greenapi_whatsapp':
        if (!greenApiInstanceId.trim()) {
          newErrors.instanceId = 'Instance ID obligatoire';
        }
        if (!greenApiToken.trim()) {
          newErrors.token = 'Token obligatoire';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      // Construire l'objet credentials selon le provider
      let credentials: Record<string, any> = {};

      switch (providerType) {
        case 'mailjet':
          credentials = {
            apiKey: mailjetApiKey.trim(),
            apiSecret: mailjetApiSecret.trim()
          };
          break;

        case 'twilio_sms':
        case 'twilio_whatsapp':
          credentials = {
            accountSid: twilioAccountSid.trim(),
            authToken: twilioAuthToken.trim(),
            phoneNumber: twilioPhoneNumber.trim()
          };
          break;

        case 'greenapi_whatsapp':
          credentials = {
            instanceId: greenApiInstanceId.trim(),
            token: greenApiToken.trim()
          };
          break;
      }

      if (isEditMode) {
        // Mode édition
        await updateProvider(existingProvider.id, {
          provider_name: providerName.trim() || undefined,
          credentials,
          is_active: isActive
        });
      } else {
        // Mode création
        await createProvider({
          provider_type: providerType,
          provider_name: providerName.trim() || undefined,
          credentials,
          is_active: isActive
        });
      }

      // Succès
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error: any) {
      console.error('[ProviderForm] Erreur save:', error);

      // Afficher l'erreur via toast ET dans le formulaire
      const errorMessage = error.response?.status === 409
        ? 'Un provider avec ce nom existe déjà'
        : error.response?.data?.error || error.message || 'Erreur lors de l\'enregistrement';

      toast.error(errorMessage);
      setErrors({ form: errorMessage });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{metadata.icon}</span>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {isEditMode ? 'Modifier' : 'Configurer'} {metadata.name}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {metadata.description}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
              disabled={saving}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Erreur globale */}
          {errors.form && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                ❌ {errors.form}
              </p>
            </div>
          )}

          {/* Nom de la connexion (optionnel) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nom de la connexion <span className="text-gray-500 font-normal">(optionnel)</span>
            </label>
            <input
              type="text"
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              placeholder={`Ex: "${metadata.name} Production"`}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              disabled={saving}
            />
            <p className="text-xs text-gray-500 mt-1">
              Utile si vous avez plusieurs connexions {metadata.name}
            </p>
          </div>

          {/* Champs spécifiques par provider */}
          {providerType === 'mailjet' && (
            <>
              {/* API Key */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  API Key <span className="text-red-500">*</span>
                  <a
                    href="https://app.mailjet.com/account/apikeys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:text-blue-700 text-xs font-normal"
                  >
                    ℹ️ Où trouver?
                  </a>
                </label>
                <input
                  type="text"
                  value={mailjetApiKey}
                  onChange={(e) => {
                    setMailjetApiKey(e.target.value);
                    setErrors({ ...errors, apiKey: '' });
                  }}
                  placeholder="abc123xyz..."
                  className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 ${
                    errors.apiKey ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={saving}
                  required
                />
                {errors.apiKey && (
                  <p className="text-sm text-red-600 mt-1">{errors.apiKey}</p>
                )}
              </div>

              {/* API Secret */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  API Secret <span className="text-red-500">*</span>
                  <a
                    href="https://app.mailjet.com/account/apikeys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:text-blue-700 text-xs font-normal"
                  >
                    ℹ️ Où trouver?
                  </a>
                </label>
                <input
                  type="password"
                  value={mailjetApiSecret}
                  onChange={(e) => {
                    setMailjetApiSecret(e.target.value);
                    setErrors({ ...errors, apiSecret: '' });
                  }}
                  placeholder="••••••••••••"
                  className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 ${
                    errors.apiSecret ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={saving}
                  required
                />
                {errors.apiSecret && (
                  <p className="text-sm text-red-600 mt-1">{errors.apiSecret}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  🔒 Votre secret sera chiffré et jamais visible en clair
                </p>
              </div>
            </>
          )}

          {/* Champs Twilio SMS / WhatsApp */}
          {(providerType === 'twilio_sms' || providerType === 'twilio_whatsapp') && (
            <>
              {/* Account SID */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Account SID <span className="text-red-500">*</span>
                  <a
                    href="https://console.twilio.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:text-blue-700 text-xs font-normal"
                  >
                    ℹ️ Où trouver?
                  </a>
                </label>
                <input
                  type="text"
                  value={twilioAccountSid}
                  onChange={(e) => {
                    setTwilioAccountSid(e.target.value);
                    setErrors({ ...errors, accountSid: '' });
                  }}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 ${
                    errors.accountSid ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={saving}
                  required
                />
                {errors.accountSid && (
                  <p className="text-sm text-red-600 mt-1">{errors.accountSid}</p>
                )}
              </div>

              {/* Auth Token */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Auth Token <span className="text-red-500">*</span>
                  <a
                    href="https://console.twilio.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:text-blue-700 text-xs font-normal"
                  >
                    ℹ️ Où trouver?
                  </a>
                </label>
                <input
                  type="password"
                  value={twilioAuthToken}
                  onChange={(e) => {
                    setTwilioAuthToken(e.target.value);
                    setErrors({ ...errors, authToken: '' });
                  }}
                  placeholder="••••••••••••"
                  className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 ${
                    errors.authToken ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={saving}
                  required
                />
                {errors.authToken && (
                  <p className="text-sm text-red-600 mt-1">{errors.authToken}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  🔒 Votre token sera chiffré et jamais visible en clair
                </p>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Numéro de téléphone {providerType === 'twilio_whatsapp' ? 'WhatsApp' : 'SMS'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={twilioPhoneNumber}
                  onChange={(e) => {
                    setTwilioPhoneNumber(e.target.value);
                    setErrors({ ...errors, phoneNumber: '' });
                  }}
                  placeholder="+33612345678"
                  className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 ${
                    errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={saving}
                  required
                />
                {errors.phoneNumber && (
                  <p className="text-sm text-red-600 mt-1">{errors.phoneNumber}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Format international requis (ex: +33612345678)
                </p>
              </div>
            </>
          )}

          {/* Champs Green-API WhatsApp */}
          {providerType === 'greenapi_whatsapp' && (
            <>
              {/* Instance ID */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Instance ID <span className="text-red-500">*</span>
                  <a
                    href="https://green-api.com/en/docs/before-start/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:text-blue-700 text-xs font-normal"
                  >
                    ℹ️ Où trouver?
                  </a>
                </label>
                <input
                  type="text"
                  value={greenApiInstanceId}
                  onChange={(e) => {
                    setGreenApiInstanceId(e.target.value);
                    setErrors({ ...errors, instanceId: '' });
                  }}
                  placeholder="1101234567"
                  className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 ${
                    errors.instanceId ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={saving}
                  required
                />
                {errors.instanceId && (
                  <p className="text-sm text-red-600 mt-1">{errors.instanceId}</p>
                )}
              </div>

              {/* API Token */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  API Token <span className="text-red-500">*</span>
                  <a
                    href="https://green-api.com/en/docs/before-start/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:text-blue-700 text-xs font-normal"
                  >
                    ℹ️ Où trouver?
                  </a>
                </label>
                <input
                  type="password"
                  value={greenApiToken}
                  onChange={(e) => {
                    setGreenApiToken(e.target.value);
                    setErrors({ ...errors, token: '' });
                  }}
                  placeholder="••••••••••••"
                  className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 ${
                    errors.token ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={saving}
                  required
                />
                {errors.token && (
                  <p className="text-sm text-red-600 mt-1">{errors.token}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  🔒 Votre token sera chiffré et jamais visible en clair
                </p>
              </div>
            </>
          )}

          {/* Toggle connexion active */}
          <div className="border-t border-gray-200 pt-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                disabled={saving}
              />
              <div>
                <span className="text-sm font-semibold text-gray-900">
                  Définir comme connexion active
                </span>
                <p className="text-xs text-gray-500">
                  Cette connexion sera utilisée par défaut pour envoyer des {metadata.channel === 'email' ? 'emails' : metadata.channel === 'sms' ? 'SMS' : 'messages WhatsApp'}
                </p>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              disabled={saving}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? (
                <>⏳ Enregistrement...</>
              ) : (
                <>💾 {isEditMode ? 'Mettre à jour' : 'Enregistrer'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
