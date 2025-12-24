import { useState, useEffect } from 'react';
import { useAppCtx } from '../store/useAppCtx';
import { getExecutionLog } from '../lib/api';

interface LogEntry {
  action?: string;
  message?: string;
  timestamp?: string;
}

export function ExecutionLog() {
  const { apiBase, tenant, role, preview, flags } = useAppCtx();
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const ctx = { apiBase, tenant, role, preview };

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await getExecutionLog(ctx);
        if (res) setLogs(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error('Failed to load execution logs:', err);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {logs.length === 0 ? (
        <div className="text-sm text-macrea-mute">Aucun log d'exécution</div>
      ) : (
        logs.map((log, i) => (
          <div key={i} className="text-xs p-2 rounded bg-white/5">
            <div className="font-medium">{log.action || 'Action'}</div>
            <div className="text-macrea-mute">{log.message || 'Message'}</div>
            <div className="text-macrea-mute text-[10px] mt-1">
              {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
            </div>
          </div>
        ))
      )}
    </div>
  );
}