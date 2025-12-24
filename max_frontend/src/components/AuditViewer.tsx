import { useState, useEffect } from 'react';
import { useAppCtx } from '../store/useAppCtx';

interface AuditViewerProps {
  actionId: string;
}

export function AuditViewer({ actionId }: AuditViewerProps) {
  const { apiBase, tenant, role, preview } = useAppCtx();
  const [audit, setAudit] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const ctx = { apiBase, tenant, role, preview };

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const res = await fetch(`${ctx.apiBase}/api/actions/${actionId}/audit`, {
          headers: {
            'X-Tenant': ctx.tenant,
            'X-Role': ctx.role,
            'X-Preview': ctx.preview.toString(),
            'X-Client': 'max-ui',
          },
        });
        if (res.ok) {
          const data = await res.json();
          setAudit(data);
        }
      } catch (err) {
        console.error('Failed to load audit:', err);
      } finally {
        setLoading(false);
      }
    };
    if (actionId) fetchAudit();
  }, [actionId]);

  if (loading) return <div>Loading audit...</div>;
  if (!audit) return <div>No audit data</div>;

  return (
    <div className="p-4">
      <h3 className="text-white mb-4">Audit for Action {actionId}</h3>
      <pre className="text-white bg-bg p-4 rounded overflow-auto">{JSON.stringify(audit, null, 2)}</pre>
    </div>
  );
}