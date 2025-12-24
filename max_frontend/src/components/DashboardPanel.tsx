import { useState, useEffect } from 'react';
import { useAppCtx } from '../store/useAppCtx';
import { getDashboard } from '../lib/api';
import { Card, CardTitle, CardValue } from './ui/Card';

interface DashboardData {
  kpis: {
    calls_attempted: number;
    calls_connected: number;
    email_opens: number;
    email_clicks: number;
    delta: {
      calls_attempted: number;
      calls_connected: number;
      email_opens: number;
      email_clicks: number;
    };
  };
  timeline: Array<{ ts: string; channel: string; event: string; count: number }>;
}

export function DashboardPanel() {
  const { apiBase, tenant, role, preview, flags } = useAppCtx();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const ctx = { apiBase, tenant, role, preview };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getDashboard(ctx, '7d', flags.useMocks);
        if (res.ok) {
          setData(res);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [flags.useMocks]);

  if (loading) return <div>Loading dashboard...</div>;
  if (!data) return <div>No data</div>;

  const k = data?.kpis ?? {};
  const d = k?.delta ?? {};
  const tl = Array.isArray(data?.timeline) ? data.timeline : [];

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="mx-kpi">
          <div className="mx-kpi-title">Calls Attempted</div>
          <div className="mx-kpi-value">{k.calls_attempted}</div>
          {d.calls_attempted !== 0 && (
            <div className={`mx-pill mt-2 ${d.calls_attempted > 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
              {d.calls_attempted > 0 ? '↑' : '↓'} {Math.abs(d.calls_attempted)}
            </div>
          )}
        </div>
        <div className="mx-kpi">
          <div className="mx-kpi-title">Calls Connected</div>
          <div className="mx-kpi-value">{k.calls_connected}</div>
          {d.calls_connected !== 0 && (
            <div className={`mx-pill mt-2 ${d.calls_connected > 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
              {d.calls_connected > 0 ? '↑' : '↓'} {Math.abs(d.calls_connected)}
            </div>
          )}
        </div>
        <div className="mx-kpi">
          <div className="mx-kpi-title">Email Opens</div>
          <div className="mx-kpi-value">{k.email_opens}</div>
          {d.email_opens !== 0 && (
            <div className={`mx-pill mt-2 ${d.email_opens > 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
              {d.email_opens > 0 ? '↑' : '↓'} {Math.abs(d.email_opens)}
            </div>
          )}
        </div>
        <div className="mx-kpi">
          <div className="mx-kpi-title">Email Clicks</div>
          <div className="mx-kpi-value">{k.email_clicks}</div>
          {d.email_clicks !== 0 && (
            <div className={`mx-pill mt-2 ${d.email_clicks > 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
              {d.email_clicks > 0 ? '↑' : '↓'} {Math.abs(d.email_clicks)}
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <div className="text-sm mb-2 text-macrea-mute">Mini Timeline</div>
        <div className="space-y-3">
          {tl.map((t,i)=>(
            <div key={i} className="flex items-center gap-3">
              <div className="w-24 text-xs text-macrea-mute">{new Date(t.ts).toLocaleTimeString()}</div>
              <div className="flex-1 h-3 rounded-full bg-macrea-line/40 overflow-hidden">
                <div className="h-full bg-macrea-neon/80" style={{ width: `${Math.min(100, t.count*8)}%` }}/>
              </div>
              <div className="w-40 text-xs text-macrea-mute">{t.count} {t.event}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}