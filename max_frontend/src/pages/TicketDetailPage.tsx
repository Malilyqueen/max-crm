import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, CircleDot, MessageCircle, CheckCircle, RefreshCw, Wrench, User, Paperclip, PenLine, Send, AlertTriangle } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/useAuthStore';

interface Ticket {
  id: number;
  ticket_number: string;
  tenant_id: string;
  user_id: number;
  user_email: string;
  subject: string;
  priority: 'urgent' | 'normal';
  status: 'open' | 'replied' | 'closed';
  created_at: string;
  last_activity_at: string;
  closed_at: string | null;
}

interface Message {
  id: number;
  ticket_id: number;
  user_id: number;
  user_email: string;
  user_name: string;
  is_support: boolean;
  message: string;
  attachment_filename: string | null;
  attachment_url: string | null;
  attachment_size: number | null;
  created_at: string;
}

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTicket();
  }, [id]);

  const loadTicket = async () => {
    try {
      setLoading(true);
      const response: any = await apiClient.get(`/support/tickets/${id}`);
      setTicket(response.ticket);
      setMessages(response.messages || []);
    } catch (error: any) {
      console.error('[Support] Erreur chargement ticket:', error);
      alert('Erreur lors du chargement du ticket');
      navigate('/support');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim()) {
      alert('Le message ne peut pas être vide');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post(`/support/tickets/${id}/messages`, {
        message: newMessage.trim()
      });

      setNewMessage('');
      await loadTicket(); // Recharger pour voir le nouveau message
    } catch (error: any) {
      console.error('[Support] Erreur envoi message:', error);
      alert('Erreur lors de l\'envoi du message : ' + (error.response?.data?.error || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!confirm('Êtes-vous sûr de vouloir fermer ce ticket ?')) {
      return;
    }

    try {
      await apiClient.put(`/support/tickets/${id}/close`);
      await loadTicket();
      alert('Ticket fermé avec succès');
    } catch (error: any) {
      console.error('[Support] Erreur fermeture ticket:', error);
      alert('Erreur lors de la fermeture du ticket : ' + (error.response?.data?.error || error.message));
    }
  };

  const handleReopenTicket = async () => {
    try {
      await apiClient.put(`/support/tickets/${id}/reopen`);
      await loadTicket();
      alert('Ticket réouvert avec succès');
    } catch (error: any) {
      console.error('[Support] Erreur réouverture ticket:', error);
      alert('Erreur lors de la réouverture du ticket : ' + (error.response?.data?.error || error.message));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Chargement du ticket...</div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Ticket non trouvé</div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  const canClose = isAdmin && ticket.status !== 'closed';
  const canReopen = ticket.status === 'closed';
  const canReply = ticket.status !== 'closed';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/support')}
            className="text-blue-600 hover:text-blue-700 font-medium mb-4 flex items-center gap-2"
          >
            ← Retour aux tickets
          </button>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-lg text-gray-500">
                    {ticket.ticket_number}
                  </span>
                  {ticket.priority === 'urgent' && (
                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm font-semibold flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> URGENT
                    </span>
                  )}
                  <span
                    className={`px-3 py-1 rounded text-sm font-semibold flex items-center gap-1 ${
                      ticket.status === 'open'
                        ? 'bg-green-100 text-green-700'
                        : ticket.status === 'replied'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {ticket.status === 'open'
                      ? <><CircleDot className="w-4 h-4" /> OUVERT</>
                      : ticket.status === 'replied'
                      ? <><MessageCircle className="w-4 h-4" /> RÉPONDU</>
                      : <><CheckCircle className="w-4 h-4" /> FERMÉ</>}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {ticket.subject}
                </h1>
                <div className="text-sm text-gray-600">
                  <p>Créé le {new Date(ticket.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
                  {ticket.closed_at && (
                    <p className="mt-1">Fermé le {new Date(ticket.closed_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {canReopen && (
                  <button
                    onClick={handleReopenTicket}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" /> Réouvrir
                  </button>
                )}
                {canClose && (
                  <button
                    onClick={handleCloseTicket}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" /> Fermer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Conversation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><MessageCircle className="w-5 h-5" /> Conversation</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-6 ${msg.is_support ? 'bg-blue-50' : 'bg-white'}`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                      msg.is_support ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    {msg.is_support ? <Wrench className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900">
                        {msg.is_support ? 'Support MaCréa' : msg.user_name}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(msg.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="text-gray-700 whitespace-pre-wrap">
                      {msg.message}
                    </div>
                    {msg.attachment_filename && (
                      <div className="mt-3">
                        <a
                          href={msg.attachment_url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          <Paperclip className="w-4 h-4" /> {msg.attachment_filename}
                          <span className="text-gray-500">
                            ({((msg.attachment_size || 0) / 1024).toFixed(0)} KB)
                          </span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Formulaire réponse */}
        {canReply ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><PenLine className="w-5 h-5" /> Ajouter un message</h3>
            <form onSubmit={handleSendMessage}>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Votre réponse..."
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                rows={4}
                disabled={submitting}
                required
              />
              <div className="flex justify-end mt-4">
                <button
                  type="submit"
                  disabled={submitting || !newMessage.trim()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Envoi en cours...' : <><Send className="w-4 h-4 inline mr-1" /> Envoyer</>}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800 font-medium flex items-center justify-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Ce ticket est fermé. Vous ne pouvez plus ajouter de messages.
            </p>
            <button
              onClick={handleReopenTicket}
              className="mt-3 text-blue-600 hover:text-blue-700 font-medium"
            >
              Cliquez ici pour réouvrir le ticket
            </button>
          </div>
        )}
      </div>
    </div>
  );
}