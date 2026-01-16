/**
 * components/campaigns/BulkSendModal.tsx
 * Modal d'envoi en masse (Email, SMS, WhatsApp)
 */

import { useState } from 'react';
import { X, Mail, MessageSquare, Smartphone, Send, AlertTriangle, CheckCircle } from 'lucide-react';
import { apiClient } from '../../api/client';
import type { Channel } from '../../types/events';

interface SegmentCriteria {
  status?: string[];
  tags?: string[];
  source?: string;
  leadIds?: string[];
}

interface BulkSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  segment: SegmentCriteria;
  onSuccess: () => void;
}

export function BulkSendModal({ isOpen, onClose, segment, onSuccess }: BulkSendModalProps) {
  const [channel, setChannel] = useState<Channel>('email');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const channels = [
    { id: 'email' as Channel, label: 'Email', icon: Mail, color: '#3b82f6', bgColor: '#dbeafe' },
    { id: 'whatsapp' as Channel, label: 'WhatsApp', icon: MessageSquare, color: '#10b981', bgColor: '#d1fae5' },
    { id: 'sms' as Channel, label: 'SMS', icon: Smartphone, color: '#8b5cf6', bgColor: '#ede9fe' }
  ];

  const handleSend = async () => {
    // Validation
    if (!message.trim()) {
      setError('Le message est requis');
      return;
    }

    if (channel === 'email' && !subject.trim()) {
      setError('Le sujet est requis pour les emails');
      return;
    }

    setIsSending(true);
    setError(null);
    setSendResult(null);

    try {
      const response = await apiClient.post('/campaigns/send-bulk', {
        channel,
        subject: channel === 'email' ? subject : undefined,
        message,
        segment
      });

      setSendResult(response);

      // Auto-close après succès
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 3000);

    } catch (err) {
      console.error('[BulkSend] Erreur:', err);
      const error = err as any;
      setError(error.response?.data?.message || error.message || 'Erreur lors de l\'envoi');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setChannel('email');
    setSubject('');
    setMessage('');
    setSendResult(null);
    setError(null);
    onClose();
  };

  const getSegmentSummary = () => {
    const parts = [];
    if (segment.status && segment.status.length > 0) {
      parts.push(`Statuts: ${segment.status.join(', ')}`);
    }
    if (segment.tags && segment.tags.length > 0) {
      parts.push(`Tags: ${segment.tags.join(', ')}`);
    }
    if (segment.source) {
      parts.push(`Source: ${segment.source}`);
    }
    if (segment.leadIds && segment.leadIds.length > 0) {
      parts.push(`${segment.leadIds.length} leads sélectionnés`);
    }
    return parts.length > 0 ? parts.join(' • ') : 'Aucun segment';
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={handleClose}
      ></div>

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-cyan-500 to-violet-600">
            <div className="flex items-center gap-3">
              <Send className="w-6 h-6 text-white" />
              <h2 className="text-xl font-bold text-white">Envoi en masse</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Segment summary */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Segment cible:</h4>
              <p className="text-sm text-gray-700">{getSegmentSummary()}</p>
            </div>

            {/* Channel selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Canal de communication
              </label>
              <div className="grid grid-cols-3 gap-3">
                {channels.map(({ id, label, icon: Icon, color, bgColor }) => (
                  <button
                    key={id}
                    onClick={() => setChannel(id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      channel === id
                        ? 'ring-2 ring-offset-2'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: bgColor,
                      color: color,
                      borderColor: channel === id ? color : 'transparent'
                    }}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="font-medium text-sm">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Subject (Email only) */}
            {channel === 'email' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sujet de l'email
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex: Nouvelle offre exclusive pour vous"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
            )}

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Variables disponibles: {'{{firstName}}, {{lastName}}, {{email}}, {{phone}}, {{company}}'}
              </p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  channel === 'email'
                    ? "Bonjour {{firstName}},\n\nNous sommes ravis de vous présenter notre nouvelle offre...\n\nCordialement,\nL'équipe"
                    : "Bonjour {{firstName}}, découvrez notre nouvelle offre..."
                }
                rows={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 font-mono text-sm"
              />
            </div>

            {/* Warning */}
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-800">
                <p className="font-semibold mb-1">Attention</p>
                <p>
                  Cet envoi sera effectué vers tous les leads du segment. Vérifiez bien votre message avant d'envoyer.
                </p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 rounded-lg p-4 border border-red-200 flex gap-3">
                <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">
                  <p className="font-semibold mb-1">Erreur</p>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {/* Success */}
            {sendResult && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200 flex gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-semibold mb-2">Envoi terminé</p>
                  <div className="space-y-1">
                    <p>✅ Envoyés: <span className="font-medium">{sendResult.sent}</span></p>
                    <p>❌ Échecs: <span className="font-medium">{sendResult.failed}</span></p>
                    <p>📊 Total: <span className="font-medium">{sendResult.totalLeads}</span> leads traités</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <button
              onClick={handleClose}
              disabled={isSending}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              {sendResult ? 'Fermer' : 'Annuler'}
            </button>
            {!sendResult && (
              <button
                onClick={handleSend}
                disabled={isSending || !message.trim() || (channel === 'email' && !subject.trim())}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-cyan-600 to-violet-600 text-white font-medium rounded-lg hover:from-cyan-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Envoyer la campagne
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
