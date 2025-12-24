import { useState, useEffect } from 'react';
import { useAppCtx } from '../store/useAppCtx';
import { getWorkflows } from '../lib/api';
import { Card } from './ui/Card';

interface Workflow {
  id: string;
  name: string;
  status: string;
  successRate: number;
  lastRun: string;
}

interface WorkflowListProps {
  onSelect: (id: string) => void;
}

export function WorkflowList({ onSelect }: WorkflowListProps) {
  const { apiBase, tenant, role, preview, flags } = useAppCtx();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  const ctx = { apiBase, tenant, role, preview };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getWorkflows(ctx, flags.useMocks);
        if (res.ok) {
          setWorkflows(res.workflows || []);
        }
      } catch (err) {
        console.error('Failed to load workflows:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [flags.useMocks]);

  if (loading) return <div>Loading workflows...</div>;

  return (
    <div>
      <div className="text-macrea-mute uppercase text-sm mb-4">Workflows</div>
      <Card>
        {workflows.length === 0 ? (
          <div className="text-macrea-mute">Aucun workflow actif</div>
        ) : (
          <table className="w-full text-macrea-text">
            <thead>
              <tr className="border-b border-macrea-line">
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Success Rate</th>
                <th className="text-left p-2">Last Run</th>
              </tr>
            </thead>
            <tbody>
              {workflows.map((wf) => (
                <tr key={wf.id} className="border-b border-macrea-line hover:bg-macrea-bg2 cursor-pointer" onClick={() => onSelect(wf.id)}>
                  <td className="p-2">{wf.name}</td>
                  <td className="p-2">{wf.status}</td>
                  <td className="p-2">{wf.successRate}%</td>
                  <td className="p-2">{wf.lastRun}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}