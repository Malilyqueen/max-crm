/**
 * pages/CampaignDetailPage.tsx
 * Page détail d'une campagne avec KPIs Mailjet-like
 *
 * Données provenant du backend:
 * - GET /api/campaigns/:id/stats → KPIs + message + events
 *
 * Sémantique des taux (documentée):
 * - delivery_rate = delivered / sent
 * - open_rate = opened / delivered
 * - click_rate = clicked / opened
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  CheckCircle,
  XCircle,
  Eye,
  MousePointer,
  MessageSquare,
  Mail,
  Phone,
  AlertTriangle,
  Ban,
  UserX,
  Loader2,
  AlertCircle,
  Clock,
  Users
} from 'lucide-react';
import { apiClient } from '../api/client';

interface Campaign {
  id: string;
  tenant_id: string;
  name: string;
  channel: 'email' | 'sms' | 'whatsapp';
  subject?: string;
  content_preview: string;
  segment_criteria: any;
  total_recipients: number;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_opened: number;
  total_clicked: number;
  total_read: number;
  total_replied: number;
  status: string;
  meta: any;
  created_by: string;
  created_at: string;
  sent_at: string | null;
  completed_at: string | null;
}

interface KPIs {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  read: number;
  replied: number;
  bounced: number;
  spam: number;
  blocked: number;
  unsub: number;
  failed: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
}

interface StatusDistribution {
  status: string;
  count: string;
}

interface MessageEvent {
  id: string;
  lead_id: string | null;
  email: string | null;
  phone_number: string | null;
  status: string;
  message_snippet: string | null;
  event_timestamp: string;
  direction: string;
}

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution[]>([]);
  const [recentMessages, setRecentMessages] = useState<MessageEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchCampaignStats();
    }
  }, [id]);

  const fetchCampaignStats = async () => {
    setLoading(true);
    setError(null);

    try {
      // Note: apiClient interceptor returns response.data directly
      const response = await apiClient.get(`/campaigns/${id}/stats`) as {
        ok: boolean;
        campaign: Campaign;
        kpis: KPIs;
        statusDistribution: StatusDistribution[];
        recentMessages: MessageEvent[];
        message?: string;
      };

      if (response.ok) {
        setCampaign(response.campaign);
        setKpis(response.kpis);
        setStatusDistribution(response.statusDistribution || []);
        setRecentMessages(response.recentMessages || []);
      } else {
        setError(response.message || 'Erreur de chargement');
      }
    } catch (err: any) {
      console.error('[CampaignDetail] Erreur:', err);
      setError(err.response?.data?.message || 'Campagne introuvable');
    } finally {
      setLoading(false);
    }
  };

  // Format percentage
  const formatPercent = (value: number): string => {
    if (isNaN(value)) return '0%';
    return `${value.toFixed(1)}%`;
  };

  // Format date
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get channel info
  const getChannelInfo = (channel: string) => {
    switch (channel) {
      case 'email':
        return { icon: <Mail className="w-5 h-5" />, label: 'Email', color: 'bg-blue-100 text-blue-600' };
      case 'sms':
        return { icon: <Phone className="w-5 h-5" />, label: 'SMS', color: 'bg-violet-100 text-violet-600' };
      case 'whatsapp':
        return { icon: <MessageSquare className="w-5 h-5" />, label: 'WhatsApp', color: 'bg-green-100 text-green-600' };
      default:
        return { icon: <Send className="w-5 h-5" />, label: channel, color: 'bg-gray-100 text-gray-600' };
    }
  };

  // Get status badge for events
  const getEventStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      sent: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Envoyé' },
      queued: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'En file' },
      delivered: { bg: 'bg-green-100', text: 'text-green-700', label: 'Livré' },
      opened: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Ouvert' },
      clicked: { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Cliqué' },
      read: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Lu' },
      replied: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Répondu' },
      bounced: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rebond' },
      failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Échoué' },
      spam: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Spam' },
      blocked: { bg: 'bg-red-100', text: 'text-red-700', label: 'Bloqué' },
      unsub: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Désabo' }
    };

    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement de la campagne...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign || !kpis) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-medium mb-2">Erreur</p>
          <p className="text-gray-600 mb-4">{error || 'Campagne introuvable'}</p>
          <button
            onClick={() => navigate('/campagnes')}
            className="text-cyan-600 hover:text-cyan-700 font-medium"
          >
            ← Retour aux campagnes
          </button>
        </div>
      </div>
    );
  }

  const channelInfo = getChannelInfo(campaign.channel);

  // KPI cards config - Mailjet-like
  // Note: "Envois" = nombre d'événements d'envoi, distinct de "Destinataires" = nombre de personnes
  const kpiCards = [
    { label: 'Destinataires', value: campaign.total_recipients, icon: Users, color: 'text-gray-600', bg: 'bg-gray-50' },
    { label: 'Envois', value: kpis.sent, icon: Send, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Livrés', value: kpis.delivered, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Ouverts', value: kpis.opened, icon: Eye, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { label: 'Cliqués', value: kpis.clicked, icon: MousePointer, color: 'text-violet-600', bg: 'bg-violet-50' },
  ];

  // Additional KPIs for WhatsApp/SMS
  if (campaign.channel === 'whatsapp' || campaign.channel === 'sms') {
    kpiCards.push(
      { label: 'Lus', value: kpis.read, icon: Eye, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { label: 'Réponses', value: kpis.replied, icon: MessageSquare, color: 'text-teal-600', bg: 'bg-teal-50' }
    );
  }

  // Error KPIs
  const errorKpis = [
    { label: 'Rebonds', value: kpis.bounced, icon: XCircle, color: 'text-red-600' },
    { label: 'Spam', value: kpis.spam, icon: AlertTriangle, color: 'text-orange-600' },
    { label: 'Bloqués', value: kpis.blocked, icon: Ban, color: 'text-red-600' },
    { label: 'Désabonnés', value: kpis.unsub, icon: UserX, color: 'text-yellow-600' },
    { label: 'Échecs', value: kpis.failed, icon: XCircle, color: 'text-red-600' },
  ].filter(k => k.value > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Back button */}
          <button
            onClick={() => navigate('/campagnes')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux campagnes
          </button>

          {/* Campaign info */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${channelInfo.color}`}>
                  {channelInfo.icon}
                  {channelInfo.label}
                </span>
                <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
              </div>
              {campaign.subject && (
                <p className="text-gray-600 mb-2">Sujet: {campaign.subject}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDate(campaign.sent_at || campaign.created_at)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {campaign.total_recipients} destinataires
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Main KPIs */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Performances</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {kpiCards.map((kpi, index) => {
              const Icon = kpi.icon;
              return (
                <div key={index} className={`${kpi.bg} rounded-lg p-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-5 h-5 ${kpi.color}`} />
                    <span className="text-sm font-medium text-gray-700">{kpi.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Rates */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Taux</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Delivery rate */}
              <div>
                <p className="text-sm text-gray-500 mb-1">Taux de livraison</p>
                <p className="text-3xl font-bold text-green-600">{formatPercent(kpis.delivery_rate)}</p>
                <p className="text-xs text-gray-400 mt-1">livrés / envoyés</p>
              </div>

              {/* Open rate */}
              <div>
                <p className="text-sm text-gray-500 mb-1">Taux d'ouverture</p>
                <p className="text-3xl font-bold text-cyan-600">{formatPercent(kpis.open_rate)}</p>
                <p className="text-xs text-gray-400 mt-1">ouverts / livrés</p>
              </div>

              {/* Click rate */}
              <div>
                <p className="text-sm text-gray-500 mb-1">Taux de clic</p>
                <p className="text-3xl font-bold text-violet-600">{formatPercent(kpis.click_rate)}</p>
                <p className="text-xs text-gray-400 mt-1">cliqués / ouverts</p>
              </div>
            </div>
          </div>
        </section>

        {/* Error KPIs (if any) */}
        {errorKpis.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Problèmes détectés</h2>
            <div className="bg-red-50 rounded-lg border border-red-200 p-4">
              <div className="flex flex-wrap gap-6">
                {errorKpis.map((kpi, index) => {
                  const Icon = kpi.icon;
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${kpi.color}`} />
                      <span className="text-sm text-gray-700">{kpi.label}:</span>
                      <span className="font-semibold text-gray-900">{kpi.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Message content */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Contenu du message</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
              {campaign.content_preview}
            </pre>
          </div>
        </section>

        {/* Status distribution */}
        {statusDistribution.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribution des statuts</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex flex-wrap gap-4">
                {statusDistribution.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    {getEventStatusBadge(item.status)}
                    <span className="text-sm font-medium text-gray-900">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Recent events table */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Détail des envois</h2>
          {recentMessages.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-gray-500">Aucun événement enregistré</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Destinataire
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentMessages.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">
                          {event.email || event.phone_number || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        {getEventStatusBadge(event.status)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(event.event_timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}