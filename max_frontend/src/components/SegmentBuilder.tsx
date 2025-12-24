import { useState, useEffect } from 'react';
import { useAppCtx } from '../store/useAppCtx';
import { buildSegment } from '../lib/api';
import { ActionModal } from './ActionModal';

interface SegmentResult {
  segmentId: string;
  size: number;
  preview: Array<any>;
}

const PRESETS = ['serum_carotte_90j']; // from backend config

export function SegmentBuilder() {
  const { apiBase, tenant, role, preview, flags } = useAppCtx();
  const [mode, setMode] = useState<'preset' | 'rules'>('preset');
  const [presetCode, setPresetCode] = useState('');
  const [rules, setRules] = useState({ include: [] as string[], where: { ville: '', totalSpentGte: 0, lastPurchaseDaysLte: 0 } });
  const [result, setResult] = useState<SegmentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const ctx = { apiBase, tenant, role, preview };

  const handleBuild = async () => {
    setLoading(true);
    try {
      const spec = mode === 'preset' ? { code: presetCode } : { rules };
      const res = await buildSegment(spec, ctx, flags.useMocks);
      if (res.ok) {
        setResult(res.segment);
      } else {
        alert('Build failed');
      }
    } catch (err) {
      console.error('Build error:', err);
      alert('Error building segment');
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchNewsletter = () => {
    if (!result) return;
    setShowModal(true);
  };

  return (
    <div className="p-4">
      <h3 className="text-macrea-text mb-4">Segment Builder</h3>
      <div className="mb-4">
        <button onClick={() => setMode('preset')} className={`px-3 py-2 rounded-lg border border-macrea-line/60 hover:shadow-glow mr-2 ${mode === 'preset' ? 'bg-macrea-neon/20 text-macrea-neon' : ''}`}>
          Preset
        </button>
        <button onClick={() => setMode('rules')} className={`px-3 py-2 rounded-lg border border-macrea-line/60 hover:shadow-glow ${mode === 'rules' ? 'bg-macrea-neon/20 text-macrea-neon' : ''}`}>
          Rules
        </button>
      </div>
      {mode === 'preset' && (
        <select value={presetCode} onChange={(e) => setPresetCode(e.target.value)} className="bg-macrea-bg2/60 border border-macrea-line/50 rounded-lg px-3 py-2 text-macrea-text w-full mb-4">
          <option value="">Select preset</option>
          {PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      )}
      {mode === 'rules' && (
        <div className="space-y-2 mb-4">
          <input
            type="text"
            placeholder="Tags (comma separated)"
            value={rules.include.join(',')}
            onChange={(e) => setRules({ ...rules, include: e.target.value.split(',') })}
            className="bg-macrea-bg2/60 border border-macrea-line/50 rounded-lg px-3 py-2 text-macrea-text w-full"
          />
          <input
            type="text"
            placeholder="Ville"
            value={rules.where.ville}
            onChange={(e) => setRules({ ...rules, where: { ...rules.where, ville: e.target.value } })}
            className="bg-macrea-bg2/60 border border-macrea-line/50 rounded-lg px-3 py-2 text-macrea-text w-full"
          />
          <input
            type="number"
            placeholder="Total Spent Gte"
            value={rules.where.totalSpentGte}
            onChange={(e) => setRules({ ...rules, where: { ...rules.where, totalSpentGte: +e.target.value } })}
            className="bg-macrea-bg2/60 border border-macrea-line/50 rounded-lg px-3 py-2 text-macrea-text w-full"
          />
          <input
            type="number"
            placeholder="Last Purchase Days Lte"
            value={rules.where.lastPurchaseDaysLte}
            onChange={(e) => setRules({ ...rules, where: { ...rules.where, lastPurchaseDaysLte: +e.target.value } })}
            className="bg-macrea-bg2/60 border border-macrea-line/50 rounded-lg px-3 py-2 text-macrea-text w-full"
          />
        </div>
      )}
      <button onClick={handleBuild} disabled={loading} className="px-3 py-2 rounded-lg border border-macrea-line/60 hover:shadow-glow disabled:opacity-50">
        {loading ? 'Building...' : 'Build Segment'}
      </button>
      {result && (
        <div className="mt-4">
          <div className="text-macrea-text">Segment ID: {result.segmentId}</div>
          <div className="text-macrea-text">Size: {result.size}</div>
          <table className="w-full text-macrea-text mt-2">
            <thead>
              <tr>
                <th className="text-left p-1">Name</th>
                <th className="text-left p-1">Email</th>
              </tr>
            </thead>
            <tbody>
              {result.preview.slice(0, 10).map((row, i) => (
                <tr key={i}>
                  <td className="p-1">{row.name}</td>
                  <td className="p-1">{row.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={handleLaunchNewsletter} className="px-3 py-2 rounded-lg border border-macrea-line/60 hover:shadow-glow mt-4">
            Launch Newsletter
          </button>
        </div>
      )}
      {showModal && result && (
        <ActionModal
          code="wf-newsletter-segment"
          defaultMode="auto"
          payload={{ segmentId: result.segmentId }}
          onDone={() => setShowModal(false)}
        />
      )}
    </div>
  );
}