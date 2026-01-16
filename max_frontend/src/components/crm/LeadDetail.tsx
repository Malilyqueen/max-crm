/**
 * components/crm/LeadDetail.tsx
 * Panneau latéral avec détail d'un lead
 */

import React, { useState, useEffect } from 'react';
import type { Lead, LeadStatus, LeadNote, LeadActivity } from '../../types/crm';
import { useCrmStore } from '../../stores/useCrmStore';
import { useEventsStore } from '../../stores/useEventsStore';
import { UnifiedTimeline } from '../lead/UnifiedTimeline';

interface LeadDetailProps {
  lead: Lead;
  notes: LeadNote[];
  activities: LeadActivity[];
  isLoading: boolean;
  onClose: () => void;
  onUpdateStatus: (leadId: string, status: string) => Promise<void>;
  onAddNote: (leadId: string, content: string) => Promise<void>;
}

const statusColors: Record<LeadStatus, string> = {
  'Nouveau': 'bg-blue-100 text-blue-800',
  'Contacté': 'bg-green-100 text-green-800',
  'Qualifié': 'bg-yellow-100 text-yellow-800',
  'Proposition': 'bg-purple-100 text-purple-800',
  'Gagné': 'bg-emerald-100 text-emerald-800',
  'Perdu': 'bg-red-100 text-red-800'
};

const activityIcons: Record<LeadActivity['type'], string> = {
  status_change: '🔄',
  note_added: '📝',
  email_sent: '📧',
  call_made: '📞',
  meeting_scheduled: '📅'
};

export function LeadDetail({
  lead,
  notes,
  activities,
  isLoading,
  onClose,
  onUpdateStatus,
  onAddNote
}: LeadDetailProps) {
  const [noteContent, setNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  // Récupérer les statuts disponibles depuis le store
  const availableStatuses = useCrmStore((state) => state.availableStatuses);

  // Récupérer les events du lead
  const { events, isLoading: isLoadingEvents, loadEventsByLead } = useEventsStore();

  // Charger les events quand le lead change
  useEffect(() => {
    if (lead.id) {
      loadEventsByLead(lead.id);
    }
  }, [lead.id, loadEventsByLead]);

  const handleAddNote = async () => {
    console.log('[LeadDetail] handleAddNote appelé - noteContent:', noteContent);
    if (!noteContent.trim()) {
      console.log('[LeadDetail] Note vide, abandon');
      return;
    }

    setIsAddingNote(true);
    try {
      console.log('[LeadDetail] Appel onAddNote avec:', lead.id, noteContent);
      await onAddNote(lead.id, noteContent);
      console.log('[LeadDetail] Note ajoutée avec succès');
      setNoteContent('');
    } catch (error) {
      console.error('[LeadDetail] ❌ Erreur ajout note:', error);
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    console.log('[LeadDetail] handleStatusChange appelé - nouveau statut:', newStatus);
    if (newStatus === lead.status) {
      console.log('[LeadDetail] Même statut, abandon');
      return;
    }

    setIsChangingStatus(true);
    try {
      console.log('[LeadDetail] Appel onUpdateStatus avec:', lead.id, newStatus);
      await onUpdateStatus(lead.id, newStatus);
      console.log('[LeadDetail] Statut changé avec succès');
    } catch (error) {
      console.error('[LeadDetail] ❌ Erreur changement statut:', error);
    } finally {
      setIsChangingStatus(false);
    }
  };

  // Fonction pour obtenir la couleur d'un statut (mapping dynamique)
  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'New': 'bg-blue-100 text-blue-800',
      'Assigned': 'bg-green-100 text-green-800',
      'In Process': 'bg-yellow-100 text-yellow-800',
      'Converted': 'bg-emerald-100 text-emerald-800',
      'Recycled': 'bg-gray-100 text-gray-800',
      'Dead': 'bg-red-100 text-red-800',
      // Fallback français si nécessaire
      'Nouveau': 'bg-blue-100 text-blue-800',
      'Contacté': 'bg-green-100 text-green-800',
      'Qualifié': 'bg-yellow-100 text-yellow-800',
      'Proposition': 'bg-purple-100 text-purple-800',
      'Gagné': 'bg-emerald-100 text-emerald-800',
      'Perdu': 'bg-red-100 text-red-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-xl z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {lead.firstName} {lead.lastName}
          </h2>
          <p className="text-sm text-gray-600">{lead.email}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {/* Informations principales */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Téléphone</label>
                <p className="mt-1 text-sm text-gray-900">{lead.phone || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Entreprise</label>
                <p className="mt-1 text-sm text-gray-900">{lead.company || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Source</label>
                <p className="mt-1 text-sm text-gray-900">{lead.source || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Score</label>
                <p className="mt-1 text-sm text-gray-900">{lead.score || '-'}/100</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Créé le</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(lead.createdAt)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Modifié le</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(lead.updatedAt)}</p>
              </div>
            </div>

            {lead.tags && lead.tags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {lead.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Changer statut */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Statut actuel : <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                {lead.status}
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {(availableStatuses.length > 0 ? availableStatuses : ['New', 'Assigned', 'In Process']).map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    console.log('[LeadDetail] CLIC BOUTON STATUT:', status);
                    handleStatusChange(status);
                  }}
                  disabled={isChangingStatus || status === lead.status}
                  className={`px-3 py-1.5 text-sm rounded-full font-medium transition-all border-2 ${
                    status === lead.status
                      ? `${getStatusColor(status)} border-transparent shadow-sm`
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  } ${isChangingStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${
                    status === lead.status ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Ajouter note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ajouter une note</label>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Saisir une note..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
            />
            <button
              onClick={handleAddNote}
              disabled={!noteContent.trim() || isAddingNote}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAddingNote ? 'Ajout...' : 'Ajouter'}
            </button>
          </div>

          {/* Notes */}
          {notes.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes</h3>
              <div className="space-y-3">
                {notes.map((note) => (
                  <div key={note.id} className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-900">{note.content}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {note.createdBy} • {formatDate(note.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline Unifiée (Activités CRM + Events Communications) */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Timeline Unifiée
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Activités CRM et communications multi-canal (Email, SMS, WhatsApp)
            </p>
            <div className="bg-gray-50 rounded-lg p-6">
              <UnifiedTimeline
                activities={activities}
                events={events}
                isLoading={isLoadingEvents}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
