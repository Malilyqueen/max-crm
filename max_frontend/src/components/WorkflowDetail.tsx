import { useState, useEffect } from 'react';
import { useAppCtx } from '../store/useAppCtx';
import { getWorkflowRuns } from '../lib/api';
import { Card } from './ui/Card';
import ActionAuditModal from './ActionAuditModal';

interface WorkflowRun {
  id: string;
  status: string;
  duration: number;
  impact: string;
}

interface WorkflowDetailProps {
  workflowId: string;
  readonly: boolean;
  onExecute?: () => void;
}

export function WorkflowDetail({ workflowId, readonly, onExecute }: WorkflowDetailProps) {
  const { apiBase, tenant, role, preview, flags } = useAppCtx();
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditRunId, setAuditRunId] = useState<string | null>(null);

  const ctx = { apiBase, tenant, role, preview };

  useEffect(() => {
    if (!workflowId) return;
    const fetchData = async () => {
      try {
        const res = await getWorkflowRuns(workflowId, ctx, flags.useMocks);
        if (res.ok) {
          setRuns(res.runs || []);
        }
      } catch (err) {
        console.error('Failed to load workflow runs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [workflowId, flags.useMocks]);

  if (!workflowId) return <div>Select a workflow</div>;
  if (loading) return <div>Loading runs...</div>;

  return (
    <div>
      <div className="text-macrea-mute uppercase text-sm mb-4">Workflow Runs</div>
      {!readonly && (
        <button onClick={onExecute} className="px-3 py-2 rounded-lg border border-macrea-line/60 hover:shadow-glow mb-4">
          Execute
        </button>
      )}
      <Card>
        {runs.length === 0 ? (
          <div className="text-macrea-mute">Aucun run</div>
        ) : (
          <div className="space-y-2">
            {runs.map((run) => (
              <div key={run.id} className="bg-macrea-card border border-macrea-line p-4 rounded flex items-center justify-between">
                <div>
                  <div>Status: {run.status}</div>
                  <div>Duration: {run.duration}s</div>
                  <div>Impact: {run.impact}</div>
                </div>
                <button
                  onClick={() => setAuditRunId(run.id)}
                  className="px-3 py-1 text-macrea-neon hover:bg-macrea-neon/10 rounded border border-macrea-line/30 text-xs transition-colors"
                >
                  Audit
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
      {auditRunId && (
        <ActionAuditModal
          runId={auditRunId}
          ctx={ctx}
          onClose={() => setAuditRunId(null)}
        />
      )}
    </div>
  );
}