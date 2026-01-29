/**
 * components/crm/LeadDetail.tsx
 * Panneau latéral avec détail d'un lead
 */

import React, { useState, useEffect } from 'react';
import { RefreshCw, FileText, Mail, Phone, Calendar, CheckCircle, XCircle } from 'lucide-react';
import type { Lead, LeadStatus, LeadNote, LeadActivity } from '../../types/crm';
import { useCrmStore } from '../../stores/useCrmStore';
import { useEventsStore } from '../../stores/useEventsStore';
import { UnifiedTimeline } from '../lead/UnifiedTimeline';
import { SignalsBlock, RecommendedAction } from '../lead/SignalsBlock';
import { apiClient } from '../../api/client';

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

const activityIcons: Record<LeadActivity['type'], React.ReactNode> = {
  status_change: <RefreshCw className="w-4 h-4" />,
  note_added: <FileText className="w-4 h-4" />,
  email_sent: <Mail className="w-4 h-4" />,
  call_made: <Phone className="w-4 h-4" />,
  meeting_scheduled: <Calendar className="w-4 h-4" />
};

// Type pour le formulaire d'édition (champs whitelist modifiables)
interface EditFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  industry: string;
  website: string;
  address: string;
  score: number;
  notes: string;
  tags: string[];
}

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
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Mode édition
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    source: '',
    industry: '',
    website: '',
    address: '',
    score: 0,
    notes: '',
    tags: []
  });
  const [newTag, setNewTag] = useState('');

  // Store pour updateLead
  const updateLead = useCrmStore((state) => state.updateLead);

  // Récupérer les statuts disponibles depuis le store
  const availableStatuses = useCrmStore((state) => state.availableStatuses);

  // Initialiser le formulaire quand le lead change
  useEffect(() => {
    if (lead) {
      setEditForm({
        firstName: lead.firstName || '',
        lastName: lead.lastName || '',
        email: lead.email || '',
        phone: lead.phone || '',
        company: lead.company || '',
        source: lead.source || '',
        industry: lead.industry || '',
        website: lead.website || '',
        address: lead.address || '',
        score: lead.score || 0,
        notes: lead.notes || '',
        tags: lead.tags || []
      });
    }
  }, [lead]);

  // Handlers pour le mode édition
  const handleStartEdit = () => {
    setIsEditing(true);
    setEditError(null);
  };

  const handleCancelEdit = () => {
    // Reset form to current lead values
    setEditForm({
      firstName: lead.firstName || '',
      lastName: lead.lastName || '',
      email: lead.email || '',
      phone: lead.phone || '',
      company: lead.company || '',
      source: lead.source || '',
      industry: lead.industry || '',
      website: lead.website || '',
      address: lead.address || '',
      score: lead.score || 0,
      notes: lead.notes || '',
      tags: lead.tags || []
    });
    setNewTag('');
    setIsEditing(false);
    setEditError(null);
  };

  // Handlers pour les tags
  const handleAddTag = () => {
    const tag = newTag.trim();
    if (tag && !editForm.tags.includes(tag)) {
      setEditForm(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditForm(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagToRemove)
    }));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    setEditError(null);

    try {
      // Construire l'objet avec uniquement les champs modifiés
      const updates: Partial<Lead> = {};

      if (editForm.firstName !== lead.firstName) updates.firstName = editForm.firstName;
      if (editForm.lastName !== lead.lastName) updates.lastName = editForm.lastName;
      if (editForm.email !== lead.email) updates.email = editForm.email;
      if (editForm.phone !== (lead.phone || '')) updates.phone = editForm.phone;
      if (editForm.company !== (lead.company || '')) updates.company = editForm.company;
      if (editForm.source !== (lead.source || '')) updates.source = editForm.source;
      if (editForm.industry !== (lead.industry || '')) updates.industry = editForm.industry;
      if (editForm.website !== (lead.website || '')) updates.website = editForm.website;
      if (editForm.address !== (lead.address || '')) updates.address = editForm.address;
      if (editForm.score !== (lead.score || 0)) updates.score = editForm.score;
      if (editForm.notes !== (lead.notes || '')) updates.notes = editForm.notes;

      // Vérifier si les tags ont changé
      const currentTags = lead.tags || [];
      const tagsChanged = editForm.tags.length !== currentTags.length ||
        editForm.tags.some((tag, i) => tag !== currentTags[i]);
      if (tagsChanged) {
        updates.tags = editForm.tags;
      }

      if (Object.keys(updates).length === 0) {
        setIsEditing(false);
        return;
      }

      console.log('[LeadDetail] Saving updates:', updates);
      await updateLead(lead.id, updates);

      setIsEditing(false);
      setNewTag('');
    } catch (error: any) {
      console.error('[LeadDetail] Erreur sauvegarde:', error);
      setEditError(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFormChange = (field: keyof EditFormData, value: string | number) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  // Récupérer les events du lead
  const { events, isLoading: isLoadingEvents, loadEventsByLead } = useEventsStore();

  // Charger les events quand le lead change
  // Passer phone et email pour fallback search si lead_id ne matche pas
  useEffect(() => {
    if (lead.id) {
      const phone = lead.phoneNumber || lead.phone;
      const email = lead.emailAddress || lead.email;
      loadEventsByLead(lead.id, phone, email);
    }
  }, [lead.id, lead.phone, lead.phoneNumber, lead.email, lead.emailAddress, loadEventsByLead]);

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

  // Handler pour exécuter une action recommandée
  const handleExecuteAction = async (action: RecommendedAction) => {
    console.log('[LeadDetail] Exécution action:', action);
    setIsExecutingAction(true);
    setActionFeedback(null);

    try {
      // 1. Créer un message_event pour déclencher le système de relances
      const recommendationId = `${lead.id}_${action.type}_${Date.now()}`;
      await apiClient.post(`/max/recommendations/${recommendationId}/execute`, {
        action_type: action.channel || 'whatsapp',
        lead_id: lead.id,
        lead_phone: lead.phoneNumber || lead.phone,
        lead_email: lead.emailAddress || lead.email,
        description: `${action.label} - ${action.reason}`
      });

      console.log('[LeadDetail] ✅ message_event créé, timer relance démarré');

      // 2. Mapper le type d'action vers une mise à jour de statut
      const statusMapping: Record<string, string> = {
        'premier_contact': 'Assigned',
        'relance_j1': 'In Process',
        'relance_j3': 'In Process',
        'contact_urgent': 'In Process'
      };

      const newStatus = statusMapping[action.type];

      if (newStatus && newStatus !== lead.status) {
        // Mettre à jour le statut du lead
        await updateLead(lead.id, { status: newStatus });
      }

      // 3. Ajouter une note automatique pour tracer l'action
      const noteContent = `[Action M.A.X.] ${action.label} - ${action.reason}`;
      await onAddNote(lead.id, noteContent);

      // 4. Recharger les events pour mettre à jour SignalsBlock
      const phone = lead.phoneNumber || lead.phone;
      const email = lead.emailAddress || lead.email;
      await loadEventsByLead(lead.id, phone, email);

      setActionFeedback({
        type: 'success',
        message: `Action "${action.label}" enregistrée - Relance J+1/J+3 programmée`
      });

      // Masquer le feedback après 3 secondes
      setTimeout(() => setActionFeedback(null), 3000);

    } catch (error: any) {
      console.error('[LeadDetail] ❌ Erreur exécution action:', error);
      setActionFeedback({
        type: 'error',
        message: error.message || 'Erreur lors de l\'exécution'
      });
    } finally {
      setIsExecutingAction(false);
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
            {isEditing ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editForm.firstName}
                  onChange={(e) => handleFormChange('firstName', e.target.value)}
                  className="w-32 px-2 py-1 border border-gray-300 rounded text-lg text-gray-900 bg-white"
                  placeholder="Prénom"
                />
                <input
                  type="text"
                  value={editForm.lastName}
                  onChange={(e) => handleFormChange('lastName', e.target.value)}
                  className="w-32 px-2 py-1 border border-gray-300 rounded text-lg text-gray-900 bg-white"
                  placeholder="Nom"
                />
              </div>
            ) : (
              `${lead.firstName} ${lead.lastName}`
            )}
          </h2>
          {isEditing ? (
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => handleFormChange('email', e.target.value)}
              className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 bg-white"
              placeholder="Email"
            />
          ) : (
            <p className="text-sm text-gray-600">{lead.email}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <button
              onClick={handleStartEdit}
              className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              Modifier
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Barre d'actions édition */}
      {isEditing && (
        <div className="sticky top-[73px] bg-yellow-50 border-b border-yellow-200 px-6 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="text-sm text-yellow-800">Mode édition</span>
            {editError && (
              <span className="text-sm text-red-600 bg-red-50 px-2 py-0.5 rounded">{editError}</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="px-3 py-1.5 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              )}
              Enregistrer
            </button>
          </div>
        </div>
      )}

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
                {isEditing ? (
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => handleFormChange('phone', e.target.value)}
                    className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 bg-white"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{lead.phone || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Entreprise</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.company}
                    onChange={(e) => handleFormChange('company', e.target.value)}
                    className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 bg-white"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{lead.company || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Source</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.source}
                    onChange={(e) => handleFormChange('source', e.target.value)}
                    className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 bg-white"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{lead.source || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Score</label>
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editForm.score}
                    onChange={(e) => handleFormChange('score', parseInt(e.target.value) || 0)}
                    className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 bg-white"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{lead.score || '-'}/100</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Créé le</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(lead.createdAt)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Modifié le</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(lead.updatedAt)}</p>
              </div>
              {/* V1 Starter - 4 champs supplémentaires */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Assigné à</label>
                <p className="mt-1 text-sm text-gray-500">{lead.assignedTo || '-'}</p>
                {isEditing && <span className="text-xs text-gray-400">(lecture seule)</span>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Secteur</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.industry}
                    onChange={(e) => handleFormChange('industry', e.target.value)}
                    className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 bg-white"
                    placeholder="ex: Technology, Finance..."
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{lead.industry || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Site web</label>
                {isEditing ? (
                  <input
                    type="url"
                    value={editForm.website}
                    onChange={(e) => handleFormChange('website', e.target.value)}
                    className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 bg-white"
                    placeholder="https://..."
                  />
                ) : lead.website ? (
                  <a
                    href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 text-sm text-blue-600 hover:underline block truncate"
                  >
                    {lead.website}
                  </a>
                ) : (
                  <p className="mt-1 text-sm text-gray-900">-</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Adresse</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => handleFormChange('address', e.target.value)}
                    className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 bg-white"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{lead.address || '-'}</p>
                )}
              </div>
            </div>

            {/* Tags - toujours visible, éditable en mode edit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
              {isEditing ? (
                <div className="space-y-2">
                  {/* Tags existants */}
                  <div className="flex flex-wrap gap-2">
                    {editForm.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-blue-600 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  {/* Ajouter un tag */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      placeholder="Nouveau tag..."
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      disabled={!newTag.trim()}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Ajouter
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">Appuyez sur Entrée pour ajouter un tag</p>
                </div>
              ) : (
                <>
                  {lead.tags && lead.tags.length > 0 ? (
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
                  ) : (
                    <p className="text-sm text-gray-400 italic">Aucun tag</p>
                  )}
                </>
              )}
            </div>

            {/* Description (notes du lead) */}
            {(isEditing || lead.notes) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                {isEditing ? (
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
                    placeholder="Notes et description du lead..."
                  />
                ) : (
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{lead.notes}</p>
                )}
              </div>
            )}
          </div>

          {/* Signaux du lead - Analyse M.A.X. */}
          <SignalsBlock
            lead={lead}
            events={events}
            onExecuteAction={handleExecuteAction}
            isExecuting={isExecutingAction}
          />

          {/* Feedback après exécution d'action */}
          {actionFeedback && (
            <div
              className={`rounded-lg p-4 flex items-center gap-3 ${
                actionFeedback.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              <span className="text-lg">
                {actionFeedback.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              </span>
              <span className="text-sm font-medium">{actionFeedback.message}</span>
              <button
                onClick={() => setActionFeedback(null)}
                className="ml-auto text-current opacity-50 hover:opacity-100"
              >
                ×
              </button>
            </div>
          )}

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
