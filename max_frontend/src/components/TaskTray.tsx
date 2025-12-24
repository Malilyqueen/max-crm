import { useState, useEffect } from 'react';
import { useAppCtx } from '../store/useAppCtx';
import { connectTaskStream } from '../lib/sse';
import ActionAuditModal from './ActionAuditModal';

interface Task {
  id: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  progress: number;
  label: string;
  tenant: string;
  type?: string;
  result?: any;
  error?: any;
  updatedAt?: number;
}

interface TaskEvent {
  type: string;
  data: Task;
  ts: number;
}

export function TaskTray() {
  const { apiBase, tenant, role, preview } = useAppCtx();
  const [tasks, setTasks] = useState<Map<string, Task>>(new Map());
  const [auditRunId, setAuditRunId] = useState<string | null>(null);

  const ctx = { apiBase, tenant, role, preview };

  useEffect(() => {
    const onEvent = (event: TaskEvent) => {
      if (event.type === 'status') {
        setTasks((prev) => {
          const newTasks = new Map(prev);
          const task = event.data;

          if (task.status === 'done' || task.status === 'failed') {
            // Remove completed/failed tasks after a delay
            setTimeout(() => {
              setTasks((prev) => {
                const updated = new Map(prev);
                updated.delete(task.id);
                return updated;
              });
            }, 5000); // Keep for 5 seconds then remove
          }

          newTasks.set(task.id, { ...task, updatedAt: event.ts });
          return newTasks;
        });
      }
    };

    const es = connectTaskStream(ctx.apiBase, ctx.tenant, onEvent);

    return () => {
      es.close();
    };
  }, [ctx.apiBase, ctx.tenant]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued': return 'bg-yellow-500/15 text-yellow-300';
      case 'running': return 'bg-sky-500/15 text-sky-300';
      case 'done': return 'bg-emerald-500/15 text-emerald-300';
      case 'failed': return 'bg-rose-500/15 text-rose-300';
      default: return 'bg-gray-500/15 text-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'queued': return 'En attente';
      case 'running': return 'En cours';
      case 'done': return 'Terminé';
      case 'failed': return 'Échec';
      default: return status;
    }
  };

  const handleAudit = (task: Task) => {
    setAuditRunId(task.id);
  };

  const activeTasks = Array.from(tasks.values()).filter(task =>
    task.status === 'queued' || task.status === 'running'
  );

  return (
    <div className="rounded-2xl border border-white/5 bg-[rgba(20,24,28,0.9)] p-6 md:p-7">
      <div className="text-sm font-semibold mb-3">Task Tray</div>

      {activeTasks.length === 0 ? (
        <div className="text-[12px] text-white/45">Aucune tâche active</div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {activeTasks.map((task) => (
            <div key={task.id} className="bg-macrea-bg2/30 rounded-lg p-4 border border-macrea-line/30">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-medium text-macrea-text mb-1">{task.label}</h4>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
                      {getStatusText(task.status)}
                    </span>
                    {task.type && (
                      <span className="text-macrea-mute text-xs">{task.type}</span>
                    )}
                  </div>
                </div>
                {(task.status === 'done' || task.status === 'failed') && (
                  <button
                    onClick={() => handleAudit(task)}
                    className="px-3 py-1 text-cyan-400 hover:bg-cyan-400/10 rounded border border-cyan-400/30 text-xs uppercase transition-colors"
                  >
                    Audit
                  </button>
                )}
              </div>

              {task.status === 'running' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-macrea-mute">Progression</span>
                    <span className="text-macrea-text font-medium">{task.progress}%</span>
                  </div>
                  <div className="w-full bg-macrea-bg2 rounded-full h-2">
                    <div
                      className="bg-macrea-neon h-2 rounded-full transition-all duration-300"
                      style={{ width: `${task.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {task.status === 'failed' && task.error && (
                <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                  {typeof task.error === 'string' ? task.error : 'Erreur inconnue'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
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