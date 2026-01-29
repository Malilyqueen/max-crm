import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, BarChart3, CircleDot, MessageCircle, CheckCircle, AlertCircle, Building, User, Lightbulb } from 'lucide-react';
import { apiClient } from '../api/client';

interface Ticket {
  id: number;
  ticket_number: string;
  tenant_id: string;
  user_email: string;
  subject: string;
  priority: 'urgent' | 'normal';
  status: 'open' | 'replied' | 'closed';
  created_at: string;
  last_activity_at: string;
}

export function AdminSupportPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [tenantFilter, setTenantFilter] = useState<string>('all');

  useEffect(() => {
    loadAllTickets();
  }, []);

  const loadAllTickets = async () => {
    try {
      setLoading(true);
      const response: any = await apiClient.get('/support/admin/all-tickets');
      console.log('[Admin Support] Response:', response);
      setTickets(response.tickets || []);
    } catch (error: any) {
      console.error('[Admin Support] Erreur chargement tickets:', error);
      alert('Erreur lors du chargement des tickets');
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    // Filtre statut
    const statusMatch =
      filter === 'all' ? true :
      filter === 'open' ? (ticket.status === 'open' || ticket.status === 'replied') :
      filter === 'closed' ? ticket.status === 'closed' : true;

    // Filtre tenant
    const tenantMatch = tenantFilter === 'all' || ticket.tenant_id === tenantFilter;

    return statusMatch && tenantMatch;
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    replied: tickets.filter(t => t.status === 'replied').length,
    closed: tickets.filter(t => t.status === 'closed').length,
    urgent: tickets.filter(t => t.priority === 'urgent' && t.status !== 'closed').length,
  };

  // Extraire la liste unique des tenants
  const uniqueTenants = Array.from(new Set(tickets.map(t => t.tenant_id))).sort();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2"><Wrench className="w-8 h-8" /> Admin Support - Tous les Tickets</h1>
            <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold">
              MaCréa Staff
            </span>
          </div>
          <p className="text-gray-600">Vue globale de tous les tickets de tous les clients</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600 flex items-center gap-1"><BarChart3 className="w-4 h-4" /> Total</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-2xl font-bold text-green-600">{stats.open}</div>
            <div className="text-sm text-gray-600 flex items-center gap-1"><CircleDot className="w-4 h-4 text-green-500" /> Ouverts</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-2xl font-bold text-blue-600">{stats.replied}</div>
            <div className="text-sm text-gray-600 flex items-center gap-1"><MessageCircle className="w-4 h-4" /> Répondus</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-2xl font-bold text-gray-600">{stats.closed}</div>
            <div className="text-sm text-gray-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Fermés</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
            <div className="text-sm text-gray-600 flex items-center gap-1"><AlertCircle className="w-4 h-4 text-red-500" /> Urgents actifs</div>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-lg p-4 shadow mb-6">
          <div className="flex flex-col gap-4">
            {/* Filtre statut */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Statut
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Tous ({tickets.length})
                </button>
                <button
                  onClick={() => setFilter('open')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === 'open'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Actifs ({stats.open + stats.replied})
                </button>
                <button
                  onClick={() => setFilter('closed')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === 'closed'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Fermés ({stats.closed})
                </button>
              </div>
            </div>

            {/* Filtre tenant */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Client / Tenant
              </label>
              <select
                value={tenantFilter}
                onChange={(e) => setTenantFilter(e.target.value)}
                className="w-full md:w-64 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="all">Tous les clients ({uniqueTenants.length})</option>
                {uniqueTenants.map(tenant => {
                  const count = tickets.filter(t => t.tenant_id === tenant).length;
                  return (
                    <option key={tenant} value={tenant}>
                      {tenant} ({count} tickets)
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {/* Liste des tickets */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">
              Chargement des tickets de tous les clients...
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">Aucun ticket trouvé avec ces filtres</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => navigate(`/support/${ticket.id}`)}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="font-mono text-sm text-gray-500">
                          {ticket.ticket_number}
                        </span>
                        <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                          <Building className="w-3 h-3" /> {ticket.tenant_id}
                        </span>
                        <span className="text-xs text-gray-600 flex items-center gap-1">
                          <User className="w-3 h-3" /> {ticket.user_email}
                        </span>
                        {ticket.priority === 'urgent' && (
                          <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> URGENT
                          </span>
                        )}
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 ${
                            ticket.status === 'open'
                              ? 'bg-green-100 text-green-700'
                              : ticket.status === 'replied'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {ticket.status === 'open'
                            ? <><CircleDot className="w-3 h-3" /> Ouvert</>
                            : ticket.status === 'replied'
                            ? <><MessageCircle className="w-3 h-3" /> Répondu</>
                            : <><CheckCircle className="w-3 h-3" /> Fermé</>}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {ticket.subject}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Créé le {new Date(ticket.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {' • '}
                        Dernière activité: {new Date(ticket.last_activity_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                        Voir détails →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 flex items-start gap-2">
            <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" /> <span><strong>Conseil :</strong> Cliquez sur un ticket pour voir la conversation complète et répondre en tant que Support MaCréa.
            Les réponses d'admin sont automatiquement marquées comme "Support MaCréa" et changent le statut en "Répondu".</span>
          </p>
        </div>
      </div>
    </div>
  );
}