import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, CircleDot, MessageCircle, CheckCircle, AlertCircle, Lightbulb, PlusCircle, HelpCircle, ChevronDown, ChevronUp, Bot, Zap, Settings, Users } from 'lucide-react';
import { apiClient } from '../api/client';

interface Ticket {
  id: number;
  ticket_number: string;
  subject: string;
  priority: 'urgent' | 'normal';
  status: 'open' | 'replied' | 'closed';
  created_at: string;
  last_activity_at: string;
}

export function SupportPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const response: any = await apiClient.get('/support/tickets');
      console.log('[Support] Response:', response);
      setTickets(response.tickets || []);
    } catch (error: any) {
      console.error('[Support] Erreur chargement tickets:', error);
      alert('Erreur lors du chargement des tickets');
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'all') return true;
    if (filter === 'open') return ticket.status === 'open' || ticket.status === 'replied';
    if (filter === 'closed') return ticket.status === 'closed';
    return true;
  });

  const stats = {
    open: tickets.filter(t => t.status === 'open').length,
    replied: tickets.filter(t => t.status === 'replied').length,
    closed: tickets.filter(t => t.status === 'closed').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2"><Ticket className="w-8 h-8" /> Support Client</h1>
            <p className="text-gray-600 mt-1">Gérez vos demandes d'assistance</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-colors"
          >
            + Nouveau Ticket
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
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
        </div>

        {/* FAQ Section */}
        <FAQSection />

        {/* Filtres */}
        <div className="bg-white rounded-lg p-4 shadow mb-6">
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

        {/* Liste des tickets */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">
              Chargement des tickets...
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 mb-4">Aucun ticket trouvé</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-blue-600 hover:underline font-medium"
              >
                Créer votre premier ticket
              </button>
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
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm text-gray-500">
                          {ticket.ticket_number}
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
      </div>

      {/* Modale création ticket */}
      {showCreateModal && (
        <CreateTicketModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadTickets();
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FAQ SECTION - Guide utilisateur M.A.X.
// ═══════════════════════════════════════════════════════════════════

function FAQSection() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const faqs = [
    {
      icon: <Bot className="w-5 h-5 text-cyan-500" />,
      question: "Comment créer un lead avec M.A.X. ?",
      answer: `Dites simplement à M.A.X. ce que vous voulez créer :

• "Crée un lead pour Jean Dupont, email jean@exemple.com, secteur Consulting"
• "Ajoute un nouveau contact : Marie Martin, tél 06 12 34 56 78, WhatsApp préféré"

M.A.X. gère automatiquement les détails techniques. S'il manque des informations, il vous les demandera.`
    },
    {
      icon: <Zap className="w-5 h-5 text-yellow-500" />,
      question: "M.A.X. bloque sur un secteur d'activité inconnu",
      answer: `Si M.A.X. ne crée pas un lead à cause d'un secteur non reconnu, dites-lui :

• "Utilise l'outil add_enum_option pour ajouter ce secteur, puis crée le lead"
• Ou simplement : "Ajoute 'Consulting' comme secteur puis crée le lead"

M.A.X. a les droits administrateur pour ajouter de nouvelles valeurs au CRM.`
    },
    {
      icon: <Settings className="w-5 h-5 text-violet-500" />,
      question: "Quels outils M.A.X. peut-il utiliser ?",
      answer: `M.A.X. dispose de nombreux outils CRM :

📋 Gestion leads : rechercher, créer, modifier, enrichir automatiquement
🔧 Configuration : ajouter des champs, modifier les layouts (avec votre accord)
📧 Communication : envoyer WhatsApp, emails
📊 Analyse : statistiques, rapports, recommandations

Si M.A.X. ne fait pas quelque chose automatiquement, vous pouvez lui demander d'utiliser un outil spécifique.`
    },
    {
      icon: <Users className="w-5 h-5 text-green-500" />,
      question: "Comment enrichir tous mes leads automatiquement ?",
      answer: `Demandez simplement :

• "Enrichis tous les leads qui n'ont pas de secteur"
• "Analyse et qualifie mes 10 derniers leads"
• "Ajoute des tags intelligents à tous mes contacts"

M.A.X. utilise l'IA pour analyser les emails, noms et descriptions, puis enrichit automatiquement chaque lead.`
    },
    {
      icon: <HelpCircle className="w-5 h-5 text-blue-500" />,
      question: "Que faire si M.A.X. ne comprend pas ma demande ?",
      answer: `Quelques astuces :

1. Soyez spécifique : "Crée un lead avec prénom Jean, nom Dupont" plutôt que "ajoute Jean"
2. Mentionnez les outils : "Utilise query_espo_leads pour trouver..."
3. Donnez le contexte : "Dans le CRM, je veux..."

Si le problème persiste, créez un ticket support avec le message exact que vous avez envoyé à M.A.X.`
    }
  ];

  return (
    <div className="bg-gradient-to-br from-cyan-50 to-violet-50 rounded-xl p-6 mb-6 border border-cyan-200">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <HelpCircle className="w-6 h-6 text-cyan-600" />
        Guide M.A.X. - Questions fréquentes
      </h2>
      <p className="text-gray-600 mb-4 text-sm">
        Avant de créer un ticket, consultez ces astuces pour mieux utiliser M.A.X.
      </p>

      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden transition-all"
          >
            <button
              onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {faq.icon}
                <span className="font-medium text-gray-900">{faq.question}</span>
              </div>
              {expandedFaq === index ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {expandedFaq === index && (
              <div className="px-4 pb-4 pt-0">
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-line">
                  {faq.answer}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-cyan-100 rounded-lg border border-cyan-200">
        <p className="text-sm text-cyan-800 flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          <strong>Astuce :</strong> M.A.X. apprend de vos retours ! Si une commande ne fonctionne pas comme prévu, décrivez ce que vous attendiez dans votre ticket.
        </p>
      </div>
    </div>
  );
}

interface CreateTicketModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreateTicketModal({ onClose, onSuccess }: CreateTicketModalProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'urgent' | 'normal'>('normal');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !message.trim()) {
      alert('Le sujet et le message sont obligatoires');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post('/support/tickets', {
        subject: subject.trim(),
        message: message.trim(),
        priority
      });

      alert('Ticket créé avec succès ! Vous recevrez une réponse par email.');
      onSuccess();
    } catch (error: any) {
      console.error('[Support] Erreur création ticket:', error);
      alert('Erreur lors de la création du ticket : ' + (error.response?.data?.error || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2"><PlusCircle className="w-6 h-6" /> Nouveau Ticket Support</h2>

        <form onSubmit={handleSubmit}>
          {/* Priorité */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Priorité *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="priority"
                  value="normal"
                  checked={priority === 'normal'}
                  onChange={(e) => setPriority(e.target.value as 'normal')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-900 flex items-center gap-1"><CircleDot className="w-4 h-4 text-yellow-500" /> Normale - Gêne mais contournable</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="priority"
                  value="urgent"
                  checked={priority === 'urgent'}
                  onChange={(e) => setPriority(e.target.value as 'urgent')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-900 flex items-center gap-1"><AlertCircle className="w-4 h-4 text-red-500" /> Urgente - Service bloqué</span>
              </label>
            </div>
          </div>

          {/* Sujet */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Sujet *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex: Impossible d'envoyer des emails via Mailjet"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              maxLength={255}
              required
            />
          </div>

          {/* Message */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description du problème *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Décrivez le problème en détail. Plus vous donnez d'informations (messages d'erreur, étapes pour reproduire, etc.), plus vite nous pourrons vous aider."
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              rows={8}
              required
            />
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Lightbulb className="w-3 h-3" /> Astuce : Incluez les messages d'erreur et étapes pour reproduire le problème.
            </p>
          </div>

          {/* Boutons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {submitting ? 'Création en cours...' : <><CheckCircle className="w-4 h-4 inline mr-1" /> Créer le Ticket</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}