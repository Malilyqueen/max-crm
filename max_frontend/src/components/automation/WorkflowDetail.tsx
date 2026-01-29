/**
 * components/automation/WorkflowDetail.tsx
 * Panneau latéral de détail d'un workflow
 */

import React, { useEffect } from 'react';
import { Smartphone, Mail, MessageSquare } from 'lucide-react';
import type { Workflow, WorkflowAction } from '../../types/automation';
import { useTemplatesStore } from '../../stores/useTemplatesStore';

interface WorkflowDetailProps {
  workflow: Workflow;
  isLoading: boolean;
  onClose: () => void;
  onToggleStatus: (workflowId: string) => void;
}

const actionTypeLabels: Record<string, string> = {
  send_email: 'Envoyer email',
  update_field: 'Mettre à jour champ',
  create_task: 'Créer tâche',
  add_tag: 'Ajouter tag',
  assign_to: 'Assigner à',
  wait: 'Attendre',
  notify: 'Notifier'
};

const actionTypeIcons: Record<string, React.ReactNode> = {
  send_email: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  update_field: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  create_task: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  add_tag: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  assign_to: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  wait: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  notify: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  )
};

const actionTypeColors: Record<string, string> = {
  send_email: 'bg-blue-50 text-blue-600',
  update_field: 'bg-purple-50 text-purple-600',
  create_task: 'bg-green-50 text-green-600',
  add_tag: 'bg-orange-50 text-orange-600',
  assign_to: 'bg-indigo-50 text-indigo-600',
  wait: 'bg-gray-50 text-gray-600',
  notify: 'bg-red-50 text-red-600'
};

function ActionCard({ action, index }: { action: WorkflowAction; index: number }) {
  // Récupérer les templates depuis le store
  const { templates, isLoading: templatesLoading } = useTemplatesStore();

  // Detect if this action has a template (channel config)
  const hasTemplate = action.config && 'channel' in action.config;
  const channel = hasTemplate ? action.config.channel : null;
  const templateName = hasTemplate ? action.config.template : null;
  const fromNumber = hasTemplate && 'from' in action.config ? action.config.from : null;

  // Channel icons and labels
  const channelConfig = {
    whatsapp: {
      icon: <Smartphone className="w-4 h-4" />,
      label: 'WhatsApp',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700'
    },
    email: {
      icon: <Mail className="w-4 h-4" />,
      label: 'Email',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700'
    },
    sms: {
      icon: <MessageSquare className="w-4 h-4" />,
      label: 'SMS',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-700'
    }
  };

  const channelInfo = channel ? channelConfig[channel as keyof typeof channelConfig] : null;

  // Rechercher le template dans le store (données réelles depuis l'API)
  const matchedTemplate = templateName
    ? templates.find(t => t.name === templateName || t.id === templateName)
    : null;
  const templatePreview = matchedTemplate?.content || null;

  return (
    <div className="flex gap-4">
      {/* Step number */}
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
          {index + 1}
        </div>
        {index < 10 && (
          <div className="w-0.5 flex-1 bg-gray-200 mt-2"></div>
        )}
      </div>

      {/* Action card */}
      <div className="flex-1 pb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${actionTypeColors[action.type]}`}>
              {actionTypeIcons[action.type]}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-medium text-gray-900">{action.label}</h4>
                <span className="text-xs text-gray-500 uppercase font-medium">
                  {actionTypeLabels[action.type]}
                </span>
              </div>
              <p className="text-sm text-gray-600">{action.description}</p>

              {/* Template information */}
              {hasTemplate && channelInfo && (
                <div className={`mt-4 p-4 rounded-lg border ${channelInfo.bgColor} ${channelInfo.borderColor}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{channelInfo.icon}</span>
                    <h5 className={`font-semibold ${channelInfo.textColor}`}>
                      Template {channelInfo.label}
                    </h5>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nom du template:</span>
                      <span className="font-medium text-gray-900">{templateName}</span>
                    </div>
                    {fromNumber && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">De:</span>
                        <span className="font-medium text-gray-900">{fromNumber}</span>
                      </div>
                    )}
                  </div>

                  {/* Message preview */}
                  {templatesLoading ? (
                    <div className="mt-3 bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-xs text-gray-500 font-medium mb-2">APERÇU DU MESSAGE:</p>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-gray-500">Chargement...</span>
                      </div>
                    </div>
                  ) : templatePreview ? (
                    <div className="mt-3 bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-xs text-gray-500 font-medium mb-2">APERÇU DU MESSAGE:</p>
                      <p className="text-sm text-gray-700 italic leading-relaxed">
                        {templatePreview}
                      </p>
                    </div>
                  ) : templateName ? (
                    <div className="mt-3 bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                      <p className="text-xs text-yellow-600 font-medium">
                        Template "{templateName}" non trouvé
                      </p>
                    </div>
                  ) : null}

                  {/* Action button */}
                  <button className="mt-3 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <span>Demander à M.A.X. de modifier ce template</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WorkflowDetail({ workflow, isLoading, onClose, onToggleStatus }: WorkflowDetailProps) {
  const { templates, loadTemplates } = useTemplatesStore();

  // Charger les templates au montage si pas déjà chargés
  useEffect(() => {
    if (templates.length === 0) {
      loadTemplates();
    }
  }, [templates.length, loadTemplates]);

  const statusConfig = {
    active: {
      label: 'Actif',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800'
    },
    inactive: {
      label: 'Inactif',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800'
    },
    draft: {
      label: 'Brouillon',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800'
    }
  };

  const config = statusConfig[workflow.status];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-2/3 lg:w-1/2 bg-white shadow-xl z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900">{workflow.name}</h2>
          <p className="text-sm text-gray-600 mt-1">{workflow.description}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-4"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {/* Status & Control */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-2">Statut du workflow</p>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.textColor}`}>
                  {config.label}
                </span>
              </div>
              <button
                onClick={() => onToggleStatus(workflow.id)}
                disabled={workflow.status === 'draft'}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  workflow.status === 'active'
                    ? 'bg-gray-600 text-white hover:bg-gray-700'
                    : workflow.status === 'draft'
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {workflow.status === 'active' ? 'Désactiver' : workflow.status === 'draft' ? 'Brouillon' : 'Activer'}
              </button>
            </div>
          </div>

          {/* Trigger */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Déclencheur</h3>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{workflow.trigger.label}</p>
                  <p className="text-sm text-gray-600">Type: {workflow.trigger.type}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Actions ({workflow.actions.length})
            </h3>
            <div className="space-y-0">
              {workflow.actions
                .sort((a, b) => a.order - b.order)
                .map((action, index) => (
                  <ActionCard key={action.id} action={action} index={index} />
                ))}
            </div>
          </div>

          {/* Statistics */}
          {workflow.stats.totalExecutions > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Statistiques</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Exécutions totales</p>
                  <p className="text-2xl font-bold text-gray-900">{workflow.stats.totalExecutions}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Taux de succès</p>
                  <p className="text-2xl font-bold text-green-600">{workflow.stats.successRate.toFixed(1)}%</p>
                </div>
                {workflow.stats.lastExecuted && (
                  <div className="bg-gray-50 rounded-lg p-4 col-span-2">
                    <p className="text-sm text-gray-600 mb-1">Dernière exécution</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(workflow.stats.lastExecuted)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Informations</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Créé par</span>
                <span className="font-medium text-gray-900">{workflow.createdBy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date de création</span>
                <span className="font-medium text-gray-900">{formatDate(workflow.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Dernière modification</span>
                <span className="font-medium text-gray-900">{formatDate(workflow.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
