/**
 * components/crm/BulkOutreachModal.tsx
 * Modal intelligent pour marquer des leads comme contactés en masse
 *
 * LOGIQUE PRODUIT:
 * - MAX calcule la population (via filtres serveur)
 * - Affiche "X leads seront marqués comme contactés"
 * - L'utilisateur valide → MAX exécute en batch
 * - Les message_events sont typés source=user_confirmed
 */

import React, { useState, useEffect } from 'react';
import { MessageCircle, Mail, Smartphone, Phone, Check, CheckCircle, XCircle } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { LeadFilters } from '../../types/crm';

interface BulkOutreachModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: LeadFilters;
  onSuccess?: () => void;
}

type Channel = 'whatsapp' | 'email' | 'sms' | 'phone';

interface PreviewResponse {
  ok: boolean;
  mode: 'preview';
  count: number;
  filters: LeadFilters;
  message: string;
}

interface ExecuteResponse {
  ok: boolean;
  mode: 'executed';
  message: string;
  created_events: number;
  next_followup: { j1: string; j3: string };
}

export function BulkOutreachModal({
  isOpen,
  onClose,
  filters,
  onSuccess
}: BulkOutreachModalProps) {
  const colors = useThemeColors();
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('09:00');
  const [description, setDescription] = useState('');

  // États de chargement
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Charger le preview quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      loadPreview();
    } else {
      // Reset state quand fermé
      setPreviewCount(null);
      setError(null);
      setResult(null);
    }
  }, [isOpen, filters]);

  const loadPreview = async () => {
    setIsLoadingPreview(true);
    setError(null);

    try {
      const response = await apiClient.post<PreviewResponse>(
        '/max/recommendations/bulk-outreach-filtered',
        {
          filters,
          confirm: false // Mode preview
        }
      );

      if (response.ok) {
        setPreviewCount(response.count);
      } else {
        setError('Erreur lors du comptage des leads');
      }
    } catch (err) {
      console.error('[BulkOutreach] Preview error:', err);
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSubmit = async () => {
    if (previewCount === null || previewCount === 0) return;

    setIsSubmitting(true);
    setResult(null);

    try {
      // Construire le timestamp
      let timestamp: string | undefined;
      if (useCustomDate && customDate) {
        timestamp = new Date(`${customDate}T${customTime}`).toISOString();
      }

      const response = await apiClient.post<ExecuteResponse>(
        '/max/recommendations/bulk-outreach-filtered',
        {
          filters,
          channel,
          timestamp,
          description: description || undefined,
          confirm: true // Mode exécution
        }
      );

      if (response.ok && response.mode === 'executed') {
        const j1Date = new Date(response.next_followup.j1).toLocaleDateString('fr-FR');
        setResult({
          ok: true,
          message: `${response.created_events} leads marqués comme contactés. Relances J+1 le ${j1Date}`
        });
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 2500);
      } else {
        setResult({ ok: false, message: 'Erreur lors de l\'opération' });
      }
    } catch (err) {
      console.error('[BulkOutreach] Execute error:', err);
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Erreur'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const channelOptions: { value: Channel; label: string; icon: React.ReactNode }[] = [
    { value: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="w-5 h-5" /> },
    { value: 'email', label: 'Email', icon: <Mail className="w-5 h-5" /> },
    { value: 'sms', label: 'SMS', icon: <Smartphone className="w-5 h-5" /> },
    { value: 'phone', label: 'Appel', icon: <Phone className="w-5 h-5" /> }
  ];

  // Description des filtres actifs
  const getFilterDescription = () => {
    const parts: string[] = [];
    if (filters.status && filters.status.length > 0) {
      parts.push(`statut: ${filters.status.join(', ')}`);
    }
    if (filters.search) {
      parts.push(`recherche: "${filters.search}"`);
    }
    return parts.length > 0 ? parts.join(' • ') : 'tous les leads';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md mx-4 rounded-xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: colors.cardBg }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b"
          style={{
            borderColor: colors.border,
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))'
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center">
              <Check className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
                M.A.X. - Action groupée
              </h2>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                {getFilterDescription()}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Compteur de leads (calculé par MAX) */}
          <div
            className="p-4 rounded-lg text-center"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
          >
            {isLoadingPreview ? (
              <div className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-green-600" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span style={{ color: colors.textSecondary }}>M.A.X. calcule...</span>
              </div>
            ) : error ? (
              <span className="text-red-600">{error}</span>
            ) : (
              <div>
                <span className="text-3xl font-bold text-green-600">{previewCount}</span>
                <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                  leads seront marqués comme contactés
                </p>
              </div>
            )}
          </div>

          {/* Canal */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
              Canal utilisé
            </label>
            <div className="grid grid-cols-2 gap-2">
              {channelOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setChannel(opt.value)}
                  className={`
                    px-4 py-3 rounded-lg border-2 transition-all
                    flex items-center justify-center gap-2
                    ${channel === opt.value ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}
                  `}
                  style={{
                    color: channel === opt.value ? '#16a34a' : colors.textSecondary
                  }}
                >
                  {opt.icon}
                  <span className="font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date personnalisée */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useCustomDate}
                onChange={(e) => setUseCustomDate(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm" style={{ color: colors.textPrimary }}>
                Date de contact personnalisée
              </span>
            </label>

            {useCustomDate && (
              <div className="mt-2 flex gap-2">
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border"
                  style={{
                    backgroundColor: colors.cardBg,
                    borderColor: colors.border,
                    color: colors.textPrimary
                  }}
                />
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="w-24 px-3 py-2 rounded-lg border"
                  style={{
                    backgroundColor: colors.cardBg,
                    borderColor: colors.border,
                    color: colors.textPrimary
                  }}
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
              Note (optionnel)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Campagne d'appels du 27/01"
              className="w-full px-3 py-2 rounded-lg border"
              style={{
                backgroundColor: colors.cardBg,
                borderColor: colors.border,
                color: colors.textPrimary
              }}
            />
          </div>

          {/* Info */}
          <div
            className="p-3 rounded-lg text-sm"
            style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}
          >
            <strong>Effet :</strong> Les relances J+1 et J+3 seront suggérées automatiquement.
            Source: <code>user_confirmed</code> (distinct des envois automatiques)
          </div>

          {/* Résultat */}
          {result && (
            <div
              className={`p-3 rounded-lg text-sm flex items-center gap-2 ${result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
            >
              {result.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {result.message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 border-t flex justify-end gap-3"
          style={{ borderColor: colors.border }}
        >
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg font-medium transition-colors"
            style={{ color: colors.textSecondary }}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isLoadingPreview || !previewCount || previewCount === 0}
            className="px-6 py-2 rounded-lg font-medium text-white transition-all disabled:opacity-50 flex items-center gap-2"
            style={{ backgroundColor: '#16a34a' }}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                M.A.X. traite...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Confirmer ({previewCount || 0} leads)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BulkOutreachModal;
