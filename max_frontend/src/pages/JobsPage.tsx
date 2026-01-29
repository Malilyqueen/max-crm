/**
 * pages/JobsPage.tsx
 * Page listant tous les batch jobs du tenant
 *
 * Features:
 * - Liste des jobs avec statut, progression, dates
 * - Bouton Cancel pour jobs queued/running
 * - Bouton "Voir erreurs" pour jobs failed
 * - Smart polling: 2.5s si actif, 30s sinon
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  useJobsStore,
  selectActiveJobs,
  selectHasActiveJobs,
  JOB_STATUS_LABELS,
  JOB_STATUS_COLORS,
  JOB_TYPE_LABELS,
  type BatchJob
} from '../stores/useJobsStore';
import { useThemeColors } from '../hooks/useThemeColors';

// Modal pour afficher les erreurs
function ErrorsModal({
  job,
  errors,
  onClose
}: {
  job: BatchJob;
  errors: Array<{ item: string; error: string }>;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Erreurs du job</h3>
            <p className="text-sm text-gray-500">{job.operation_name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats */}
        <div className="px-4 py-3 bg-red-50 border-b border-red-100">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-red-700 font-medium">{job.fail_count} erreurs</span>
            <span className="text-gray-500">sur {job.total_items} items</span>
          </div>
        </div>

        {/* Errors list */}
        <div className="flex-1 overflow-y-auto p-4">
          {errors.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Aucune erreur enregistrée</p>
          ) : (
            <div className="space-y-3">
              {errors.map((err, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-red-50 border border-red-100 rounded-lg"
                >
                  <p className="text-sm font-medium text-gray-900">{err.item}</p>
                  <p className="text-sm text-red-600 mt-1">{err.error}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// Job row component
function JobRow({
  job,
  onCancel,
  onViewErrors,
  isCancelling
}: {
  job: BatchJob;
  onCancel: (jobId: string) => void;
  onViewErrors: (job: BatchJob) => void;
  isCancelling: boolean;
}) {
  const colors = useThemeColors();
  const canCancel = job.status === 'queued' || job.status === 'running';
  const hasErrors = job.fail_count > 0;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (start?: string, end?: string) => {
    if (!start) return '-';
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 60) return `${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}min`;
    const diffHour = Math.floor(diffMin / 60);
    return `${diffHour}h${diffMin % 60}min`;
  };

  return (
    <tr
      className="hover:bg-gray-50 transition-colors"
      style={{ borderBottom: `1px solid ${colors.borderLight}` }}
    >
      {/* Type + Nom */}
      <td className="px-4 py-4">
        <div>
          <p className="font-medium text-gray-900">{job.operation_name || JOB_TYPE_LABELS[job.job_type]}</p>
          <p className="text-xs text-gray-500 mt-0.5">{JOB_TYPE_LABELS[job.job_type]}</p>
          {job.file_name && (
            <p className="text-xs text-gray-400 mt-0.5">{job.file_name}</p>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${JOB_STATUS_COLORS[job.status].bg} ${JOB_STATUS_COLORS[job.status].text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${JOB_STATUS_COLORS[job.status].dot} ${job.status === 'running' ? 'animate-pulse' : ''}`} />
          {JOB_STATUS_LABELS[job.status]}
        </span>
      </td>

      {/* Progress */}
      <td className="px-4 py-4">
        {job.status === 'running' ? (
          <div className="w-32">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>{job.processed_items}/{job.total_items}</span>
              <span>{Math.round(job.progress || 0)}%</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                style={{ width: `${job.progress || 0}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600">
            <span className="text-green-600">{job.success_count}</span>
            {job.fail_count > 0 && (
              <span className="text-red-600 ml-1">/ {job.fail_count} err</span>
            )}
            {job.skip_count > 0 && (
              <span className="text-gray-400 ml-1">/ {job.skip_count} skip</span>
            )}
          </div>
        )}
      </td>

      {/* Dates */}
      <td className="px-4 py-4 text-sm text-gray-500">
        <div>{formatDate(job.created_at)}</div>
        {job.started_at && (
          <div className="text-xs text-gray-400">
            Durée: {formatDuration(job.started_at, job.completed_at)}
          </div>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          {canCancel && (
            <button
              onClick={() => onCancel(job.id)}
              disabled={isCancelling}
              className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              {isCancelling ? 'Annulation...' : 'Annuler'}
            </button>
          )}
          {hasErrors && (
            <button
              onClick={() => onViewErrors(job)}
              className="px-3 py-1.5 text-sm text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
            >
              Voir erreurs
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function JobsPage() {
  const colors = useThemeColors();
  const {
    jobs,
    isLoading,
    error,
    loadJobs,
    cancelJob,
    getJobErrors,
    startPolling,
    stopPolling,
    clearError
  } = useJobsStore();

  const hasActiveJobs = selectHasActiveJobs(jobs);

  // Local state
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);
  const [errorsModal, setErrorsModal] = useState<{ job: BatchJob; errors: Array<{ item: string; error: string }> } | null>(null);

  // Start polling on mount
  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  // Handle cancel
  const handleCancel = useCallback(async (jobId: string) => {
    setCancellingJobId(jobId);
    try {
      await cancelJob(jobId);
    } catch (err) {
      console.error('Erreur annulation:', err);
    } finally {
      setCancellingJobId(null);
    }
  }, [cancelJob]);

  // Handle view errors
  const handleViewErrors = useCallback(async (job: BatchJob) => {
    const errors = await getJobErrors(job.id);
    setErrorsModal({ job, errors });
  }, [getJobErrors]);

  return (
    <div className="min-h-screen" style={{ background: colors.background }}>
      {/* Header */}
      <div
        className="border-b"
        style={{ background: colors.cardBg, borderColor: colors.borderLight }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold" style={{ color: colors.textPrimary }}>Jobs</h1>
              </div>
              <p style={{ color: colors.textSecondary }}>
                Suivi des imports CSV et modifications en masse
              </p>
            </div>

            <button
              onClick={() => loadJobs()}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              style={{ color: colors.textSecondary }}
            >
              <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700">{error}</p>
            </div>
            <button onClick={clearError} className="text-red-600 hover:text-red-800 text-sm font-medium">
              Fermer
            </button>
          </div>
        )}

        {/* Stats bar */}
        {hasActiveJobs && (
          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse" />
              <span className="text-cyan-700 font-medium">
                {selectActiveJobs(jobs).length} job(s) actif(s)
              </span>
              <span className="text-cyan-600 text-sm">
                Actualisation automatique toutes les 2.5s
              </span>
            </div>
          </div>
        )}

        {/* Table */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: colors.cardBg, border: `1px solid ${colors.borderLight}` }}
        >
          {isLoading && jobs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p style={{ color: colors.textSecondary }}>Chargement des jobs...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-lg font-medium" style={{ color: colors.textPrimary }}>Aucun job</p>
              <p style={{ color: colors.textSecondary }}>Les imports CSV et modifications en masse apparaitront ici</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ background: 'rgba(0, 145, 255, 0.05)' }}>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Job</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Statut</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Progression</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <JobRow
                    key={job.id}
                    job={job}
                    onCancel={handleCancel}
                    onViewErrors={handleViewErrors}
                    isCancelling={cancellingJobId === job.id}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Errors Modal */}
      {errorsModal && (
        <ErrorsModal
          job={errorsModal.job}
          errors={errorsModal.errors}
          onClose={() => setErrorsModal(null)}
        />
      )}
    </div>
  );
}

export default JobsPage;
