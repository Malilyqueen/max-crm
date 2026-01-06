/**
 * hooks/useConsent.ts
 * Hook pour gérer le système de consentement
 */

import { useState } from 'react';
import { API_BASE_URL } from '../config/api';

interface ConsentRequest {
  type: string;
  description: string;
  details: any;
}

interface ConsentResponse {
  consentId: string;
  operation: string;
  expiresIn: number;
}

interface ExecuteResult {
  success: boolean;
  result?: any;
  audit?: {
    consentId: string;
    reportPath: string;
  };
  error?: string;
}

interface AuditReport {
  consentId: string;
  timestamp: string;
  consent: {
    operation: any;
    createdAt: string;
    usedAt: string;
    duration: number;
  };
  result: any;
  metadata: any;
}

export function useConsent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a consent request
   */
  const requestConsent = async (request: ConsentRequest): Promise<ConsentResponse> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/consent/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create consent request');
      }

      return data.consent;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Execute a consented operation
   */
  const executeConsent = async (consentId: string): Promise<ExecuteResult> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/consent/execute/${consentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to execute consent');
      }

      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get audit report for a consent
   */
  const getAuditReport = async (consentId: string): Promise<AuditReport> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/consent/audit/${consentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch audit report');
      }

      return data.report;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * List all audit reports
   */
  const listAuditReports = async (limit: number = 50): Promise<AuditReport[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/consent/audits?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch audit reports');
      }

      return data.reports;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    requestConsent,
    executeConsent,
    getAuditReport,
    listAuditReports,
  };
}
