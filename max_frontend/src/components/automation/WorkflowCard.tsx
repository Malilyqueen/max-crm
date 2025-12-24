/**
 * components/automation/WorkflowCard.tsx
 * Carte pour afficher un workflow dans la liste
 */

import React from 'react';
import type { Workflow } from '../../types/automation';

interface WorkflowCardProps {
  workflow: Workflow;
  onSelect: (workflow: Workflow) => void;
  onToggleStatus: (workflowId: string) => void;
}

const triggerTypeLabels: Record<string, string> = {
  lead_created: 'Nouveau lead',
  lead_status_changed: 'Statut modifié',
  lead_scored: 'Score atteint',
  time_based: 'Planifié',
  manual: 'Manuel'
};

const triggerTypeIcons: Record<string, React.ReactNode> = {
  lead_created: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  lead_status_changed: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  lead_scored: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  time_based: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  manual: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
    </svg>
  )
};

export function WorkflowCard({ workflow, onSelect, onToggleStatus }: WorkflowCardProps) {
  const statusConfig = {
    active: {
      label: 'Actif',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      dotColor: 'bg-green-500'
    },
    inactive: {
      label: 'Inactif',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      dotColor: 'bg-gray-500'
    },
    draft: {
      label: 'Brouillon',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      dotColor: 'bg-yellow-500'
    }
  };

  const config = statusConfig[workflow.status];

  return (
    <div
      className="rounded-lg p-6 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(249, 250, 251, 0.95))',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08), 0 0 20px rgba(99, 102, 241, 0.05)',
        border: '1px solid rgba(99, 102, 241, 0.1)'
      }}
    >
      <div onClick={() => onSelect(workflow)}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3
              className="text-lg font-semibold mb-1"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              {workflow.name}
            </h3>
            <p className="text-sm text-gray-600">{workflow.description}</p>
          </div>

          {/* Status badge */}
          <span
            className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all duration-300 hover:scale-105"
            style={
              workflow.status === 'active'
                ? {
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(22, 163, 74, 0.15))',
                    color: '#166534',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    boxShadow: '0 2px 6px rgba(34, 197, 94, 0.2)'
                  }
                : workflow.status === 'draft'
                ? {
                    background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(202, 138, 4, 0.15))',
                    color: '#854d0e',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    boxShadow: '0 2px 6px rgba(234, 179, 8, 0.2)'
                  }
                : {
                    background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.15), rgba(107, 114, 128, 0.15))',
                    color: '#374151',
                    border: '1px solid rgba(156, 163, 175, 0.3)',
                    boxShadow: '0 2px 6px rgba(156, 163, 175, 0.2)'
                  }
            }
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background:
                  workflow.status === 'active'
                    ? '#22c55e'
                    : workflow.status === 'draft'
                    ? '#eab308'
                    : '#9ca3af'
              }}
            ></span>
            {config.label}
          </span>
        </div>

        {/* Trigger info */}
        <div className="flex items-center gap-2 mb-4">
          <div
            className="p-2 rounded-lg transition-transform duration-300 hover:scale-110"
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))',
              color: '#3b82f6',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              boxShadow: '0 2px 6px rgba(59, 130, 246, 0.15)'
            }}
          >
            {triggerTypeIcons[workflow.trigger.type]}
          </div>
          <div>
            <p className="text-xs text-gray-500">Déclencheur</p>
            <p className="text-sm font-medium text-gray-900">{workflow.trigger.label}</p>
          </div>
        </div>

        {/* Actions count */}
        <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span>{workflow.actions.length} action{workflow.actions.length > 1 ? 's' : ''}</span>
          </div>

          {workflow.stats.totalExecutions > 0 && (
            <>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>{workflow.stats.totalExecutions} exécutions</span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-green-600 font-medium">{workflow.stats.successRate.toFixed(1)}%</span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            Créé par {workflow.createdBy}
          </div>

          {/* Toggle switch */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus(workflow.id);
            }}
            disabled={workflow.status === 'draft'}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 hover:scale-110"
            style={
              workflow.status === 'active'
                ? {
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)'
                  }
                : workflow.status === 'draft'
                ? {
                    background: 'rgba(229, 231, 235, 0.8)',
                    cursor: 'not-allowed'
                  }
                : {
                    background: 'rgba(209, 213, 219, 0.8)',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }
            }
          >
            <span
              className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md"
              style={{
                transform: workflow.status === 'active' ? 'translateX(1.375rem)' : 'translateX(0.25rem)'
              }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
