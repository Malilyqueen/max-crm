/**
 * components/chat/AuditReportModal.tsx
 * Modal pour afficher le rapport d'audit d'un consentement
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Clock, CheckCircle } from 'lucide-react';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useConsent } from '../../hooks/useConsent';

interface AuditReportModalProps {
  consentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AuditReportModal: React.FC<AuditReportModalProps> = ({
  consentId,
  isOpen,
  onClose,
}) => {
  const colors = useThemeColors();
  const { getAuditReport, loading } = useConsent();
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    if (isOpen && consentId) {
      loadReport();
    }
  }, [isOpen, consentId]);

  const loadReport = async () => {
    try {
      const data = await getAuditReport(consentId);
      setReport(data);
    } catch (error) {
      console.error('Failed to load audit report:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          >
            {/* Modal */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden"
              style={{
                backgroundColor: colors.cardBg,
                border: `1px solid ${colors.border}`,
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-6 py-4 border-b"
                style={{ borderColor: colors.border }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #0091ff, #00cfff)',
                    }}
                  >
                    <FileText className="w-5 h-5" style={{ color: '#0b0b0d' }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: colors.textPrimary }}>
                      Rapport d'Intervention
                    </h3>
                    <p className="text-sm" style={{ color: colors.textTertiary }}>
                      {consentId}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" style={{ color: colors.textSecondary }} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 mx-auto mb-3 animate-spin" style={{ color: '#0091ff' }} />
                    <p style={{ color: colors.textSecondary }}>Chargement du rapport...</p>
                  </div>
                ) : report ? (
                  <div className="space-y-6">
                    {/* Timestamp */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2" style={{ color: colors.textSecondary }}>
                        Date d'exécution
                      </h4>
                      <p className="font-mono text-sm" style={{ color: colors.textPrimary }}>
                        {formatDate(report.timestamp)}
                      </p>
                    </div>

                    {/* Consent details */}
                    {report.consent && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2" style={{ color: colors.textSecondary }}>
                          Détails du consentement
                        </h4>
                        <div
                          className="p-4 rounded-lg space-y-2"
                          style={{ backgroundColor: colors.inputBg }}
                        >
                          <div className="flex justify-between text-sm">
                            <span style={{ color: colors.textTertiary }}>Opération:</span>
                            <span style={{ color: colors.textPrimary }}>
                              {report.consent.operation?.description || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span style={{ color: colors.textTertiary }}>Créé:</span>
                            <span className="font-mono" style={{ color: colors.textPrimary }}>
                              {formatDate(report.consent.createdAt)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span style={{ color: colors.textTertiary }}>Exécuté:</span>
                            <span className="font-mono" style={{ color: colors.textPrimary }}>
                              {formatDate(report.consent.usedAt)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span style={{ color: colors.textTertiary }}>Durée:</span>
                            <span className="font-mono" style={{ color: colors.textPrimary }}>
                              {formatDuration(report.consent.duration)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Result */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: colors.textSecondary }}>
                        <CheckCircle className="w-4 h-4" style={{ color: 'rgb(76, 175, 80)' }} />
                        Résultat
                      </h4>
                      <div
                        className="p-4 rounded-lg"
                        style={{ backgroundColor: colors.inputBg }}
                      >
                        <pre
                          className="text-xs overflow-x-auto"
                          style={{ color: colors.textPrimary }}
                        >
                          {JSON.stringify(report.result, null, 2)}
                        </pre>
                      </div>
                    </div>

                    {/* Metadata */}
                    {report.metadata && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2" style={{ color: colors.textSecondary }}>
                          Métadonnées système
                        </h4>
                        <div
                          className="p-4 rounded-lg space-y-1"
                          style={{ backgroundColor: colors.inputBg }}
                        >
                          {Object.entries(report.metadata).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-xs">
                              <span style={{ color: colors.textTertiary }}>{key}:</span>
                              <span className="font-mono" style={{ color: colors.textPrimary }}>
                                {String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p style={{ color: colors.textSecondary }}>Rapport non disponible</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div
                className="flex justify-end gap-3 px-6 py-4 border-t"
                style={{ borderColor: colors.border }}
              >
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{
                    backgroundColor: colors.inputBg,
                    color: colors.textPrimary,
                  }}
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
