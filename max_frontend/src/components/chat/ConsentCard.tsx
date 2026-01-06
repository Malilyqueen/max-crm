/**
 * components/chat/ConsentCard.tsx
 * Carte d'intervention assistée avec consentement one-shot
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, CheckCircle, XCircle, FileText } from 'lucide-react';
import { useThemeColors } from '../../hooks/useThemeColors';
import { API_BASE_URL } from '../../config/api';

interface Operation {
  type: string;
  description: string;
  details: Record<string, any>;
}

interface ConsentCardProps {
  consentId: string;
  operation: Operation;
  expiresIn: number; // seconds
  sessionId?: string;
  onExecuteComplete?: (result: any) => void;
  onViewAudit?: (consentId: string) => void;
}

export const ConsentCard: React.FC<ConsentCardProps> = ({
  consentId,
  operation,
  expiresIn,
  sessionId,
  onExecuteComplete,
  onViewAudit
}) => {
  const colors = useThemeColors();
  const [timeLeft, setTimeLeft] = useState(expiresIn);
  const [status, setStatus] = useState<'pending' | 'executing' | 'success' | 'error' | 'expired'>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasAuditReport, setHasAuditReport] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (status !== 'pending') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setStatus('expired');
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  const handleApprove = async () => {
    setStatus('executing');
    setErrorMessage(null);

    try {
      // POST direct à /api/consent/execute/:consentId
      const response = await fetch(
        `${API_BASE_URL}/api/consent/execute/${consentId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant': 'macrea-admin'
          },
          body: JSON.stringify({ sessionId })
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Échec de l\'exécution');
      }

      setStatus('success');
      setHasAuditReport(true);
      setResultMessage(data.result?.message || 'Opération exécutée avec succès');

      // Callback avec résultat complet
      if (onExecuteComplete) {
        onExecuteComplete(data);
      }
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'Erreur lors de l\'exécution');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    switch (status) {
      case 'pending': return 'rgb(255, 193, 7)'; // warning yellow
      case 'executing': return 'rgb(0, 145, 255)'; // primary blue
      case 'success': return 'rgb(76, 175, 80)'; // success green
      case 'error': return 'rgb(244, 67, 54)'; // error red
      case 'expired': return 'rgb(158, 158, 158)'; // gray
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'pending': return <AlertTriangle className="w-5 h-5" />;
      case 'executing': return <Clock className="w-5 h-5 animate-spin" />;
      case 'success': return <CheckCircle className="w-5 h-5" />;
      case 'error': return <XCircle className="w-5 h-5" />;
      case 'expired': return <XCircle className="w-5 h-5" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending': return 'Autorisation requise';
      case 'executing': return 'Exécution en cours...';
      case 'success': return 'Intervention terminée';
      case 'error': return 'Erreur';
      case 'expired': return 'Consentement expiré';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-4 p-4 rounded-lg border"
      style={{
        backgroundColor: colors.inputBg,
        borderColor: getStatusColor(),
        borderWidth: '2px'
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: `${getStatusColor()}20`,
            color: getStatusColor()
          }}
        >
          {getStatusIcon()}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold mb-1" style={{ color: colors.textPrimary }}>
            {getStatusText()}
          </h4>
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            {operation.description}
          </p>
        </div>
      </div>

      {/* Operation Details (collapsible) */}
      {status === 'pending' && Object.keys(operation.details || {}).length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs hover:underline"
            style={{ color: colors.textTertiary }}
          >
            {showDetails ? 'Masquer' : 'Voir'} détails techniques
          </button>
          {showDetails && (
            <pre className="mt-2 p-2 text-xs rounded overflow-x-auto" style={{ backgroundColor: colors.cardBg }}>
              {JSON.stringify(operation.details, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Countdown timer (only for pending) */}
      {status === 'pending' && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded" style={{ backgroundColor: colors.cardBg }}>
          <Clock className="w-4 h-4" style={{ color: getStatusColor() }} />
          <span className="text-sm font-mono" style={{ color: colors.textSecondary }}>
            Expire dans: <span style={{ color: getStatusColor() }}>{formatTime(timeLeft)}</span>
          </span>
        </div>
      )}

      {/* Success message */}
      {status === 'success' && resultMessage && (
        <div className="mb-3 p-3 rounded" style={{ backgroundColor: 'rgba(76, 175, 80, 0.1)' }}>
          <p className="text-sm" style={{ color: 'rgb(76, 175, 80)' }}>
            {resultMessage}
          </p>
        </div>
      )}

      {/* Error message */}
      {status === 'error' && errorMessage && (
        <div className="mb-3 p-3 rounded" style={{ backgroundColor: 'rgba(244, 67, 54, 0.1)' }}>
          <p className="text-sm" style={{ color: 'rgb(244, 67, 54)' }}>
            {errorMessage}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {status === 'pending' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleApprove}
            className="flex-1 py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, rgb(255, 193, 7), rgb(255, 152, 0))',
              color: '#0b0b0d'
            }}
          >
            <AlertTriangle className="w-4 h-4" />
            Autoriser cette intervention
          </motion.button>
        )}

        {status === 'success' && hasAuditReport && onViewAudit && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onViewAudit(consentId)}
            className="flex-1 py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #0091ff, #00cfff)',
              color: '#0b0b0d'
            }}
          >
            <FileText className="w-4 h-4" />
            Voir le rapport
          </motion.button>
        )}

        {status === 'expired' && (
          <div className="flex-1 text-center py-2 text-sm" style={{ color: colors.textTertiary }}>
            Veuillez redemander l'opération
          </div>
        )}
      </div>

      {/* Consent ID (for debugging) */}
      <div className="mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
        <p className="text-xs font-mono" style={{ color: colors.textTertiary }}>
          ID: {consentId}
        </p>
      </div>
    </motion.div>
  );
};
