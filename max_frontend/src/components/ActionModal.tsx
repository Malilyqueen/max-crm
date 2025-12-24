import { useState, useEffect } from 'react';
import { useAppCtx } from '../store/useAppCtx';
import { runAction, triggerN8n } from '../lib/api';

interface ActionModalProps {
  code: string;
  defaultMode: 'assist' | 'auto';
  payload: any;
  onDone?: () => void;
}

const AUTO_WHITELIST = ["wf-relance-j3", "tag-hot", "email-seq-optimize"];

export function ActionModal({ code, defaultMode, payload, onDone }: ActionModalProps) {
  const { apiBase, tenant, role, preview, mode: globalMode } = useAppCtx();
  const [mode, setMode] = useState(defaultMode);
  const [loading, setLoading] = useState(false);

  const ctx = { apiBase, tenant, role, preview };

  // Check if this action should auto-execute
  const shouldAutoExecute = globalMode === 'auto' && role === 'admin' && AUTO_WHITELIST.includes(code);

  useEffect(() => {
    if (shouldAutoExecute) {
      // Auto-execute without showing modal
      handleConfirm();
    }
  }, [shouldAutoExecute]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      let res;
      if (code.startsWith('wf-')) {
        res = await triggerN8n(code, mode, payload, ctx);
      } else {
        res = await runAction({ code, payload }, ctx);
      }
      if (res.ok) {
        if (!shouldAutoExecute) {
          alert('Action executed successfully');
        }
        onDone?.();
      } else if (res.error === 'PREVIEW_ON') {
        if (!shouldAutoExecute) {
          alert('Cannot execute in preview mode');
        }
      } else if (res.error === 'FORBIDDEN') {
        if (!shouldAutoExecute) {
          alert('Action forbidden');
        }
      } else if (res.error === 'RATE_LIMIT') {
        if (!shouldAutoExecute) {
          alert('Rate limit exceeded');
        }
      } else {
        if (!shouldAutoExecute) {
          alert('Action failed');
        }
      }
    } catch (err) {
      console.error('Action error:', err);
      if (!shouldAutoExecute) {
        alert('Error executing action');
      }
    } finally {
      setLoading(false);
    }
  };

  // Don't render modal if auto-executing
  if (shouldAutoExecute) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-macrea-bg2 p-6 rounded-lg w-96">
        <h3 className="text-macrea-text mb-4">Confirm Action</h3>
        <div className="mb-4">
          <label className="text-macrea-text mr-2">Mode:</label>
          <select value={mode} onChange={(e) => setMode(e.target.value as 'assist' | 'auto')} className="bg-macrea-bg2/60 border border-macrea-line/50 rounded-lg px-3 py-2 text-macrea-text">
            <option value="assist">Assist</option>
            <option value="auto">Auto</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={handleConfirm} disabled={loading} className="px-3 py-2 rounded-lg border border-macrea-line/60 hover:shadow-glow disabled:opacity-50">
            {loading ? 'Executing...' : 'Confirm'}
          </button>
          <button onClick={onDone} className="px-3 py-2 rounded-lg border border-macrea-line/60 hover:shadow-glow">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}