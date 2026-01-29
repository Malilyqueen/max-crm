/**
 * pages/CrmPage.tsx
 * Page CRM MVP1 - Liste et détail des leads
 *
 * REGLE PRODUIT V1:
 * - Si le CRM n'est pas provisionne (isProvisioned = false), afficher CreateCrmGate
 * - Sinon, afficher le Tour de Controle avec la liste des leads
 */

import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useCrmStore } from '../stores/useCrmStore';
import { useAuthStore } from '../stores/useAuthStore';
import { LeadsListEnhanced } from '../components/crm/LeadsListEnhanced';
import { LeadsFilters } from '../components/crm/LeadsFilters';
import { LeadDetail } from '../components/crm/LeadDetail';
import { CreateCrmGate } from '../components/CreateCrmGate';
import { BulkOutreachModal } from '../components/crm/BulkOutreachModal';
import { useThemeColors } from '../hooks/useThemeColors';

export function CrmPage() {
  const { user } = useAuthStore();
  const {
    leads,
    selectedLead,
    leadNotes,
    leadActivities,
    filters,
    isLoading,
    isLoadingDetail,
    error,
    total,
    page,
    pageSize,
    loadLeads,
    loadLeadDetail,
    updateLeadStatus,
    addLeadNote,
    setFilters,
    clearFilters,
    clearSelectedLead,
    clearError
  } = useCrmStore();
  const colors = useThemeColors();

  // Modal bulk outreach
  const [showBulkModal, setShowBulkModal] = useState(false);

  // GATE: Si CRM non provisionne, afficher la page de creation
  if (user && user.isProvisioned === false) {
    return <CreateCrmGate />;
  }

  // Charger les leads et statuts au mount
  useEffect(() => {
    loadLeads();
    // Charger les statuts disponibles depuis EspoCRM
    useCrmStore.getState().loadAvailableStatuses();
  }, [loadLeads]);

  const handleSelectLead = (lead: any) => {
    loadLeadDetail(lead.id);
  };

  // Wrappers pour adapter les signatures des callbacks
  const handleUpdateStatus = async (leadId: string, status: any) => {
    console.log('[CrmPage] handleUpdateStatus appelé:', { leadId, status });
    await updateLeadStatus({ leadId, status });
  };

  const handleAddNote = async (leadId: string, content: string) => {
    console.log('[CrmPage] handleAddNote appelé:', { leadId, content });
    await addLeadNote({ leadId, content });
  };

  if (error && !leads.length) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-red-800 font-semibold mb-1">Erreur</h3>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
            <button
              onClick={() => {
                clearError();
                loadLeads();
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold"
            style={{
              background: 'linear-gradient(135deg, #0091ff, #00cfff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            Tour de Contrôle
          </h1>
          <p className="mt-1" style={{ color: colors.textSecondary }}>
            {total} lead{total > 1 ? 's' : ''} au total • Vue panoramique de votre pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Bouton action de masse */}
          <button
            onClick={() => setShowBulkModal(true)}
            disabled={leads.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            title="Marquer les leads filtrés comme contactés"
          >
            <Check className="w-4 h-4" />
            Marquer contactés
          </button>

          <button
            onClick={() => loadLeads(page)}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <svg
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Actualiser
          </button>
        </div>
      </div>

      {/* Filtres */}
      <LeadsFilters
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
      />

      {/* Liste des leads */}
      <LeadsListEnhanced
        leads={leads}
        onSelectLead={handleSelectLead}
        isLoading={isLoading}
      />

      {/* Pagination */}
      {total > pageSize && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-lg"
          style={{
            background: colors.cardBg,
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: colors.border
          }}
        >
          <div className="text-sm" style={{ color: colors.textSecondary }}>
            Affichage de <span className="font-medium" style={{ color: colors.textPrimary }}>{(page - 1) * pageSize + 1}</span> à{' '}
            <span className="font-medium" style={{ color: colors.textPrimary }}>{Math.min(page * pageSize, total)}</span> sur{' '}
            <span className="font-medium" style={{ color: colors.textPrimary }}>{total}</span> résultats
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => loadLeads(page - 1)}
              disabled={page === 1 || isLoading}
              className="px-4 py-2 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110"
              style={{
                backgroundColor: page === 1 || isLoading ? '#e2e8f0' : '#3b82f6',
                color: page === 1 || isLoading ? '#94a3b8' : '#ffffff',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: page === 1 || isLoading ? '#cbd5e1' : '#3b82f6'
              }}
            >
              Précédent
            </button>
            <button
              onClick={() => loadLeads(page + 1)}
              disabled={page * pageSize >= total || isLoading}
              className="px-4 py-2 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110"
              style={{
                backgroundColor: page * pageSize >= total || isLoading ? '#e2e8f0' : '#3b82f6',
                color: page * pageSize >= total || isLoading ? '#94a3b8' : '#ffffff',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: page * pageSize >= total || isLoading ? '#cbd5e1' : '#3b82f6'
              }}
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* Détail lead (panneau latéral) */}
      {selectedLead && (
        <LeadDetail
          lead={selectedLead}
          notes={leadNotes}
          activities={leadActivities}
          isLoading={isLoadingDetail}
          onClose={clearSelectedLead}
          onUpdateStatus={handleUpdateStatus}
          onAddNote={handleAddNote}
        />
      )}

      {/* Modal action de masse - utilise les filtres serveur (pas les IDs page) */}
      <BulkOutreachModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        filters={filters}
        onSuccess={() => loadLeads(page)}
      />
    </div>
  );
}
