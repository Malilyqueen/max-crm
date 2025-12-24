/**
 * pages/AutomationPage.tsx
 * Page Automatisations MVP1 - Liste et détail des workflows
 */

import React, { useEffect, useState } from 'react';
import { useAutomationStore } from '../stores/useAutomationStore';
import { WorkflowCard } from '../components/automation/WorkflowCard';
import { WorkflowDetail } from '../components/automation/WorkflowDetail';
import { AutoGuardConfig } from '../components/automation/AutoGuardConfig';
import { TemplatesSection } from '../components/automation/TemplatesSection';
import type { WorkflowStatus, WorkflowTriggerType } from '../types/automation';
import { useThemeColors } from '../hooks/useThemeColors';

export function AutomationPage() {
  const {
    workflows,
    selectedWorkflow,
    filters,
    autoGuardConfig,
    isLoading,
    isLoadingDetail,
    error,
    total,
    loadWorkflows,
    loadAutoGuardConfig,
    loadWorkflowDetail,
    toggleWorkflowStatus,
    setFilters,
    clearFilters,
    clearSelectedWorkflow,
    clearError
  } = useAutomationStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus[]>([]);
  const [triggerFilter, setTriggerFilter] = useState<WorkflowTriggerType[]>([]);
  const colors = useThemeColors();

  // Charger les workflows et la config au mount
  useEffect(() => {
    loadWorkflows();
    loadAutoGuardConfig();
  }, [loadWorkflows, loadAutoGuardConfig]);

  // Apply filters
  const handleApplyFilters = () => {
    setFilters({
      search: searchTerm || undefined,
      status: statusFilter.length > 0 ? statusFilter : undefined,
      triggerType: triggerFilter.length > 0 ? triggerFilter : undefined
    });
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter([]);
    setTriggerFilter([]);
    clearFilters();
  };

  const handleSelectWorkflow = (workflow: any) => {
    loadWorkflowDetail(workflow.id);
  };

  const handleToggleStatus = async (workflowId: string) => {
    await toggleWorkflowStatus(workflowId);
  };

  // Toggle status filter
  const toggleStatusFilter = (status: WorkflowStatus) => {
    setStatusFilter(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  // Toggle trigger filter
  const toggleTriggerFilter = (trigger: WorkflowTriggerType) => {
    setTriggerFilter(prev =>
      prev.includes(trigger)
        ? prev.filter(t => t !== trigger)
        : [...prev, trigger]
    );
  };

  const hasActiveFilters = searchTerm || statusFilter.length > 0 || triggerFilter.length > 0;

  if (error && !workflows.length) {
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
                loadWorkflows();
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
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            Pilote Automatique
          </h1>
          <p className="mt-1" style={{ color: colors.textSecondary }}>
            {total} workflow{total > 1 ? 's' : ''} configuré{total > 1 ? 's' : ''} • Gestion autonome de votre CRM
          </p>
        </div>
        <button
          onClick={() => loadWorkflows()}
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

      {/* Auto-Guard Config */}
      {autoGuardConfig && <AutoGuardConfig config={autoGuardConfig} />}

      {/* Templates Section */}
      <TemplatesSection />

      {/* Filters */}
      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(249, 250, 251, 0.95))',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08), 0 0 40px rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.15)'
        }}
      >
        {/* Animated gradient border */}
        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{
            background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.4), rgba(168, 85, 247, 0.4), rgba(99, 102, 241, 0.4))',
            backgroundSize: '200% 100%',
            animation: 'gradient 3s ease infinite'
          }}
        />

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2
              className="text-lg font-semibold"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              Filtres
            </h2>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-sm font-medium transition-all duration-300 hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                Réinitialiser
              </button>
            )}
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                placeholder="Rechercher un workflow..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border transition-all duration-300 focus:ring-2 focus:border-transparent focus:scale-[1.01]"
                style={{
                  borderColor: 'rgba(99, 102, 241, 0.2)',
                  background: 'rgba(255, 255, 255, 0.8)',
                  boxShadow: '0 2px 4px rgba(99, 102, 241, 0.1)'
                }}
              />
              <svg
                className="absolute left-3 top-3 w-5 h-5 text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Status filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
            <div className="flex flex-wrap gap-2">
              {(['active', 'inactive', 'draft'] as WorkflowStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => toggleStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105 ${
                    statusFilter.includes(status) ? 'text-white shadow-lg' : 'text-gray-700 hover:shadow-md'
                  }`}
                  style={
                    statusFilter.includes(status)
                      ? {
                          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                        }
                      : {
                          background: 'rgba(243, 244, 246, 0.8)',
                          border: '1px solid rgba(209, 213, 219, 0.5)'
                        }
                  }
                >
                  {status === 'active' ? 'Actif' : status === 'inactive' ? 'Inactif' : 'Brouillon'}
                </button>
              ))}
            </div>
          </div>

          {/* Trigger type filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type de déclencheur</label>
            <div className="flex flex-wrap gap-2">
              {(['lead_created', 'lead_status_changed', 'lead_scored', 'time_based', 'manual'] as WorkflowTriggerType[]).map((trigger) => (
                <button
                  key={trigger}
                  onClick={() => toggleTriggerFilter(trigger)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105 ${
                    triggerFilter.includes(trigger) ? 'text-white shadow-lg' : 'text-gray-700 hover:shadow-md'
                  }`}
                  style={
                    triggerFilter.includes(trigger)
                      ? {
                          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                        }
                      : {
                          background: 'rgba(243, 244, 246, 0.8)',
                          border: '1px solid rgba(209, 213, 219, 0.5)'
                        }
                  }
                >
                  {trigger === 'lead_created' ? 'Nouveau lead' :
                   trigger === 'lead_status_changed' ? 'Statut modifié' :
                   trigger === 'lead_scored' ? 'Score atteint' :
                   trigger === 'time_based' ? 'Planifié' : 'Manuel'}
                </button>
              ))}
            </div>
          </div>

          {/* Apply button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleApplyFilters}
              className="px-6 py-2.5 text-white rounded-lg font-medium transition-all duration-300 hover:scale-105 hover:shadow-xl"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
              }}
            >
              Appliquer les filtres
            </button>
          </div>
        </div>
      </div>

      {/* Workflows list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : workflows.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun workflow trouvé</h3>
          <p className="text-gray-600">
            {hasActiveFilters
              ? 'Essayez de modifier vos critères de recherche'
              : 'Aucun workflow configuré pour le moment'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {workflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              onSelect={handleSelectWorkflow}
              onToggleStatus={handleToggleStatus}
            />
          ))}
        </div>
      )}

      {/* Workflow detail panel */}
      {selectedWorkflow && (
        <WorkflowDetail
          workflow={selectedWorkflow}
          isLoading={isLoadingDetail}
          onClose={clearSelectedWorkflow}
          onToggleStatus={handleToggleStatus}
        />
      )}
    </div>
  );
}
