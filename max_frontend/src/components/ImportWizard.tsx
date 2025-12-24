import { useState } from 'react';
import { useAppCtx } from '../store/useAppCtx';
import { importCsv } from '../lib/api';

interface ImportStats {
  rows: number;
  created: number;
  updated: number;
  skipped: number;
}

export function ImportWizard() {
  const { apiBase, tenant, role, preview, flags } = useAppCtx();
  const [file, setFile] = useState<File | null>(null);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [loading, setLoading] = useState(false);

  const ctx = { apiBase, tenant, role, preview };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await importCsv(file, ctx, flags.useMocks);
      if (res.ok) {
        setStats(res.stats);
      } else {
        alert('Import failed');
      }
    } catch (err) {
      console.error('Import error:', err);
      alert('Error importing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-macrea-text mb-4">Import CSV</h3>
      <input
        type="file"
        accept=".csv"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="bg-macrea-bg2/60 border border-macrea-line/50 rounded-lg px-3 py-2 text-macrea-text mb-4"
      />
      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="px-3 py-2 rounded-lg border border-macrea-line/60 hover:shadow-glow disabled:opacity-50"
      >
        {loading ? 'Uploading...' : 'Upload'}
      </button>
      {flags.useMocks && <div className="text-macrea-mute mt-2">Import simulated if mock ON</div>}
      {stats && (
        <div className="mt-4 text-macrea-text">
          <div>Rows: {stats.rows}</div>
          <div>Created: {stats.created}</div>
          <div>Updated: {stats.updated}</div>
          <div>Skipped: {stats.skipped}</div>
        </div>
      )}
    </div>
  );
}