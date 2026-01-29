/**
 * pages/CampaignsPage.tsx
 * Page de gestion des campagnes bulk (Email, SMS, WhatsApp)
 *
 * Données provenant du backend:
 * - GET /api/campaigns/stats/global → stats globales
 * - GET /api/campaigns → liste des campagnes
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Users, Zap, TrendingUp, Mail, MessageSquare, Phone, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { SegmentBuilderModal } from '../components/campaigns/SegmentBuilderModal';
import { BulkSendModal } from '../components/campaigns/BulkSendModal';

interface SegmentCriteria {
  status?: string[];
  tags?: string[];
  source?: string;
  leadIds?: string[];
}

interface GlobalStats {
  total_campaigns: string;
  total_leads_reached: string;
  total_sent: string;
  total_delivered: string;
  total_opened: string;
  avg_delivery_rate: string;
  avg_open_rate: string;
}

interface Campaign {
  id: string;
  name: string;
  channel: 'email' | 'sms' | 'whatsapp';
  subject?: string;
  content_preview: string;
  total_recipients: number;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_opened: number;
  total_clicked: number;
  total_read: number;
  total_replied: number;
  status: 'draft' | 'sending' | 'sent' | 'failed' | 'cancelled';
  sent_at: string | null;
  created_at: string;
  delivery_rate: string;
  open_rate: string;
}

export function CampaignsPage() {
  const navigate = useNavigate();
  const [isSegmentModalOpen, setIsSegmentModalOpen] = useState(false);
  const [isBulkSendModalOpen, setIsBulkSendModalOpen] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<SegmentCriteria | null>(null);

  // Data from backend
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch global stats and campaigns in parallel
      // Note: apiClient interceptor returns response.data directly
      const [statsRes, campaignsRes] = await Promise.all([
        apiClient.get('/campaigns/stats/global'),
        apiClient.get('/campaigns')
      ]) as [
        { ok: boolean; stats: GlobalStats },
        { ok: boolean; campaigns: Campaign[]; pagination: any }
      ];

      if (statsRes.ok) {
        setGlobalStats(statsRes.stats);
      }

      if (campaignsRes.ok) {
        setCampaigns(campaignsRes.campaigns);
      }
    } catch (err: any) {
      console.error('[CampaignsPage] Erreur fetch:', err);
      setError(err.response?.data?.message || 'Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleSegmentConfirm = (segment: SegmentCriteria) => {
    setSelectedSegment(segment);
    setIsSegmentModalOpen(false);
    setIsBulkSendModalOpen(true);
  };

  const handleBulkSendSuccess = () => {
    // Refresh data after campaign sent
    fetchData();
  };

  // Format number with locale
  const formatNumber = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0';
    return num.toLocaleString('fr-FR');
  };

  // Format percentage
  const formatPercent = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0%';
    return `${num.toFixed(1)}%`;
  };

  // Get channel icon
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'sms': return <Phone className="w-4 h-4" />;
      case 'whatsapp': return <MessageSquare className="w-4 h-4" />;
      default: return <Send className="w-4 h-4" />;
    }
  };

  // Get channel color
  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'email': return 'bg-blue-100 text-blue-600';
      case 'sms': return 'bg-violet-100 text-violet-600';
      case 'whatsapp': return 'bg-green-100 text-green-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  // Get status badge
  // Logic:
  // - status=failed → Échouée
  // - status=sending → En cours
  // - status=sent + total_sent=0 + total_failed=0 → Non envoyée (provider non configuré)
  // - status=sent + total_sent=0 + total_failed>0 → Échec envoi
  // - status=sent + total_sent>0 + total_failed>0 → Partiel
  // - status=sent + total_sent>0 → Envoyée
  // - status=draft → Brouillon
  const getStatusBadge = (campaign: Campaign) => {
    if (campaign.status === 'failed') {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Échouée</span>;
    }
    if (campaign.status === 'sending') {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">En cours</span>;
    }
    if (campaign.status === 'sent') {
      // Case: nothing sent, nothing failed = provider issue / not configured
      if (campaign.total_sent === 0 && campaign.total_failed === 0) {
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">Non envoyée</span>;
      }
      // Case: nothing sent but failures = send errors
      if (campaign.total_sent === 0 && campaign.total_failed > 0) {
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Échec envoi</span>;
      }
      // Case: some sent, some failed = partial
      if (campaign.total_failed > 0 && campaign.total_sent > 0) {
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">Partiel</span>;
      }
      // Case: all sent successfully
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Envoyée</span>;
    }
    if (campaign.status === 'draft') {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">Brouillon</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">{campaign.status}</span>;
  };

  // Format date
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Stats cards data (from backend)
  const stats = globalStats ? [
    {
      label: 'Campagnes envoyées',
      value: formatNumber(globalStats.total_campaigns),
      icon: Send,
      color: 'cyan'
    },
    {
      label: 'Leads touchés',
      value: formatNumber(globalStats.total_leads_reached),
      icon: Users,
      color: 'violet'
    },
    {
      label: 'Taux de livraison',
      value: formatPercent(globalStats.avg_delivery_rate),
      icon: TrendingUp,
      color: 'green'
    },
    {
      label: 'Taux d\'ouverture',
      value: formatPercent(globalStats.avg_open_rate),
      icon: Zap,
      color: 'orange'
    }
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-violet-600 rounded-xl flex items-center justify-center">
                  <Send className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Campagnes</h1>
              </div>
              <p className="text-gray-600 ml-15">
                Envoyez des campagnes ciblées par Email, SMS et WhatsApp
              </p>
            </div>

            <button
              onClick={() => setIsSegmentModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-violet-600 text-white font-medium rounded-lg hover:from-cyan-700 hover:to-violet-700 transition-all shadow-lg hover:shadow-xl"
            >
              <Send className="w-5 h-5" />
              Nouvelle campagne
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Stats */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              // Loading skeleton
              [...Array(4)].map((_, index) => (
                <div key={index} className="bg-white rounded-lg p-6 border border-gray-200 animate-pulse">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                  </div>
                  <div className="h-8 bg-gray-200 rounded w-20 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-32" />
                </div>
              ))
            ) : (
              stats.map((stat, index) => {
                const Icon = stat.icon;
                const colorClasses = {
                  cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600' },
                  violet: { bg: 'bg-violet-100', text: 'text-violet-600' },
                  green: { bg: 'bg-green-100', text: 'text-green-600' },
                  orange: { bg: 'bg-orange-100', text: 'text-orange-600' }
                };
                const colors = colorClasses[stat.color as keyof typeof colorClasses];

                return (
                  <div
                    key={index}
                    className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 ${colors.text}`} />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Quick actions */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Créer une campagne</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Email campaign */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setIsSegmentModalOpen(true)}>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Campagne Email</h3>
              <p className="text-sm text-gray-600 mb-4">
                Envoyez des emails personnalisés à un segment de leads.
              </p>
              <div className="flex items-center text-cyan-600 text-sm font-medium">
                Créer une campagne email →
              </div>
            </div>

            {/* WhatsApp campaign */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setIsSegmentModalOpen(true)}>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Campagne WhatsApp</h3>
              <p className="text-sm text-gray-600 mb-4">
                Contactez vos leads directement sur WhatsApp.
              </p>
              <div className="flex items-center text-cyan-600 text-sm font-medium">
                Créer une campagne WhatsApp →
              </div>
            </div>

            {/* SMS campaign */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setIsSegmentModalOpen(true)}>
              <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center mb-4">
                <Phone className="w-6 h-6 text-violet-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Campagne SMS</h3>
              <p className="text-sm text-gray-600 mb-4">
                Envoyez des SMS en masse pour des notifications rapides.
              </p>
              <div className="flex items-center text-cyan-600 text-sm font-medium">
                Créer une campagne SMS →
              </div>
            </div>
          </div>
        </section>

        {/* Recent campaigns */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Campagnes récentes</h2>

          {loading ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Chargement des campagnes...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune campagne</h3>
              <p className="text-sm text-gray-600 mb-4">
                Créez votre première campagne pour toucher vos leads.
              </p>
              <button
                onClick={() => setIsSegmentModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-violet-600 text-white font-medium rounded-lg hover:from-cyan-700 hover:to-violet-700 transition-all"
              >
                <Send className="w-5 h-5" />
                Créer ma première campagne
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campagne
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Canal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Audience
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Livraison
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ouverture
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">

                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {campaigns.map((campaign) => (
                    <tr
                      key={campaign.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/campagnes/${campaign.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {campaign.name}
                          </p>
                          {campaign.subject && (
                            <p className="text-xs text-gray-500 truncate max-w-xs">
                              {campaign.subject}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getChannelColor(campaign.channel)}`}>
                          {getChannelIcon(campaign.channel)}
                          {campaign.channel === 'email' ? 'Email' : campaign.channel === 'sms' ? 'SMS' : 'WhatsApp'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(campaign)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {campaign.total_recipients}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatPercent(campaign.delivery_rate)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatPercent(campaign.open_rate)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(campaign.sent_at || campaign.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Modals */}
      <SegmentBuilderModal
        isOpen={isSegmentModalOpen}
        onClose={() => setIsSegmentModalOpen(false)}
        onConfirm={handleSegmentConfirm}
      />

      {selectedSegment && (
        <BulkSendModal
          isOpen={isBulkSendModalOpen}
          onClose={() => setIsBulkSendModalOpen(false)}
          segment={selectedSegment}
          onSuccess={handleBulkSendSuccess}
        />
      )}
    </div>
  );
}