/**
 * components/dashboard/JobsWidget.tsx
 * Widget dashboard affichant l'activité des jobs batch
 */

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useJobsStore, selectActiveJobs, selectQueuedCount, selectRunningCount, JOB_STATUS_LABELS, JOB_STATUS_COLORS } from '../../stores/useJobsStore';
import { useThemeColors } from '../../hooks/useThemeColors';

export function JobsWidget() {
  const colors = useThemeColors();
  const { jobs, isLoading, startPolling, stopPolling } = useJobsStore();

  const activeJobs = selectActiveJobs(jobs);
  const queuedCount = selectQueuedCount(jobs);
  const runningCount = selectRunningCount(jobs);

  // Start/stop polling on mount/unmount
  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  // Get the currently running job (or first queued)
  const currentJob = jobs.find(j => j.status === 'running') || jobs.find(j => j.status === 'queued');

  // No active jobs - show minimal widget
  if (activeJobs.length === 0 && !isLoading) {
    return (
      <div
        className="rounded-lg p-4"
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.borderLight}`
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-medium" style={{ color: colors.textPrimary }}>Jobs batch</p>
              <p className="text-sm" style={{ color: colors.textSecondary }}>Aucun job en cours</p>
            </div>
          </div>
          <Link
            to="/jobs"
            className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
          >
            Historique
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.borderLight}`
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </div>
          <div>
            <p className="font-medium" style={{ color: colors.textPrimary }}>Jobs batch</p>
            <div className="flex items-center gap-2 text-sm" style={{ color: colors.textSecondary }}>
              {runningCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                  {runningCount} en cours
                </span>
              )}
              {queuedCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-400 rounded-full" />
                  {queuedCount} en attente
                </span>
              )}
            </div>
          </div>
        </div>
        <Link
          to="/jobs"
          className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
        >
          Voir tout
        </Link>
      </div>

      {/* Current job progress */}
      {currentJob && (
        <div
          className="rounded-lg p-3"
          style={{ background: 'rgba(0, 145, 255, 0.05)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>
              {currentJob.operation_name || `${currentJob.job_type} ${currentJob.total_items} items`}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${JOB_STATUS_COLORS[currentJob.status].bg} ${JOB_STATUS_COLORS[currentJob.status].text}`}>
              {JOB_STATUS_LABELS[currentJob.status]}
            </span>
          </div>

          {/* Progress bar */}
          {currentJob.status === 'running' && (
            <>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-1">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                  style={{ width: `${currentJob.progress || 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs" style={{ color: colors.textTertiary }}>
                <span>{currentJob.processed_items} / {currentJob.total_items}</span>
                <span>{Math.round(currentJob.progress || 0)}%</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
