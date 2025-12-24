import { apiGet, apiPost } from './fetchWithHeaders';

// Export api object for backward compatibility
export const api = {
  get: apiGet,
  post: apiPost
};

// Utilitaire timeout
function withTimeout(promise, ms = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), ms)),
  ]);
}

// Utilitaire retry simple
async function withRetry(fn, retries = 1, backoffMs = 1200) {
  try {
    return await fn();
  } catch (e) {
    if (retries <= 0) throw e;
    await new Promise(r => setTimeout(r, backoffMs));
    return withRetry(fn, retries - 1, backoffMs * 1.5);
  }
}

// >>> PATCH SÛR : NE JAMAIS REJETER SANS AVOIR TENTÉ LE MOCK <<<
export async function safeLiveOrMock(liveFn, mockFn) {
  try {
    const live = await withRetry(() => withTimeout(liveFn(), 10000), 1);
    return live; // succès live
  } catch (e) {
    console.warn("[safeLiveOrMock] live failed → fallback mock:", e?.message || e);
    // notifier l'UI (bannière/ toast déjà branchés)
    try { window.dispatchEvent(new CustomEvent("live:fallback")); } catch { /* ignore dispatch errors */ }
    try {
      const mock = await mockFn();
      return mock; // succès mock
    } catch (e2) {
      console.error("[safeLiveOrMock] mock failed too:", e2?.message || e2);
      // Dernier recours : retourner un objet vide mais valide
      return { ok: true };
    }
  }
}

// Helpers de fetch (exemples)
async function apiGetJson(url, headers={}) {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`HTTP_${r.status}`);
  // Protéger le parse
  let json = null;
  try { json = await r.json(); } catch { /* ignore parse errors */ throw new Error("BAD_JSON"); }
  return json;
}

// EN-TÊTES
function headersFromCtx(ctx) {
  return {
    "X-Tenant": ctx?.tenant || "damath",
    "X-Role": ctx?.role || "admin",
    "X-Preview": String(ctx?.preview ?? true),
  };
}

// >>> getDashboard incassable <<<
export async function getDashboard(ctx, range = "7d", useMocks = false) {
  const h = headersFromCtx(ctx);
  const LIVE_URL = `/api/dashboard?range=${encodeURIComponent(range)}`;
  const liveFn = () => apiGetJson(LIVE_URL, h);
  const mockFn = async () => ({
    ok: true,
    range,
    kpis: {
      calls_attempted: 0,
      calls_connected: 0,
      email_opens: 0,
      email_clicks: 0,
      delta: { calls_attempted: 0, calls_connected: 0, email_opens: 0, email_clicks: 0 },
    },
    timeline: [],
  });

  const data = useMocks ? await mockFn() : await safeLiveOrMock(liveFn, mockFn);

  // Normalisation "hard"
  const k = data?.kpis || {};
  const d = k?.delta || {};
  return {
    ok: true,
    range: data?.range || range,
    kpis: {
      calls_attempted: Number(k.calls_attempted ?? 0),
      calls_connected: Number(k.calls_connected ?? 0),
      email_opens: Number(k.email_opens ?? 0),
      email_clicks: Number(k.email_clicks ?? 0),
      delta: {
        calls_attempted: Number(d.calls_attempted ?? 0),
        calls_connected: Number(d.calls_connected ?? 0),
        email_opens: Number(d.email_opens ?? 0),
        email_clicks: Number(d.email_clicks ?? 0),
      },
    },
    timeline: Array.isArray(data?.timeline) ? data.timeline : [],
  };
}

export function getReporting(ctx, useMocks = false) {
  const h = headersFromCtx(ctx);
  const liveFn = () => apiGet('/api/reporting?range=7d', h);
  const mockFn = async () => ({
    ok: true,
    events: [
      { ts: new Date(Date.now() - 1000 * 60 * 5).toISOString(), type: 'workflow', title: 'Campagne email automatisée lancée', meta: { workflowId: 'wf-123' } },
      { ts: new Date(Date.now() - 1000 * 60 * 15).toISOString(), type: 'chat', title: 'Conversation avec lead #456', meta: { leadId: '456' } },
      { ts: new Date(Date.now() - 1000 * 60 * 30).toISOString(), type: 'action', title: 'Lead mis à jour via import CSV', meta: { importId: 'imp-789' } },
      { ts: new Date(Date.now() - 1000 * 60 * 45).toISOString(), type: 'import', title: 'Import de 50 leads terminé', meta: { count: 50 } }
    ]
  });

  return useMocks ? mockFn() : safeLiveOrMock(liveFn, mockFn);
}

export function getMenu(ctx) {
  return apiGet('/api/menu', ctx);
}

export function askMAX(body, ctx) {
  return apiPost('/api/ask', body, ctx);
}

export function getExecutionLog(ctx) {
  return apiGet('/api/execution-log', ctx);
}

export function runAction(payload, ctx) {
  // Force preview:false for actions
  const actionCtx = { ...ctx, preview: false };
  return apiPost('/api/actions/execute', payload, actionCtx);
}

export function getWorkflows(ctx, useMocks = false) {
  const h = headersFromCtx(ctx);
  const liveFn = () => apiGet('/api/workflows', h);
  const mockFn = async () => [
    { id:'wf-relance-j3', name:'Relance J+3', status:'active', successRate:0.92, lastRun:'2025-11-05T09:12:00Z', kpis: { sent: 1250, opened: 340, clicked: 89, errors: 3 } },
    { id:'wf-tag-chaud', name:'Tag chaud', status:'active', successRate:0.97, lastRun:'2025-11-05T08:40:00Z', kpis: { sent: 890, opened: 267, clicked: 45, errors: 1 } },
    { id:'wf-nettoyage', name:'Nettoyage CRM', status:'inactive', successRate:0.85, lastRun:'2025-11-04T20:00:00Z', kpis: { sent: 0, opened: 0, clicked: 0, errors: 0 } },
    { id:'wf-sequence-welcome', name:'Séquence bienvenue', status:'active', successRate:0.94, lastRun:'2025-11-05T10:30:00Z', kpis: { sent: 567, opened: 189, clicked: 67, errors: 2 } }
  ];

  return useMocks ? mockFn() : safeLiveOrMock(liveFn, mockFn);
}

export function getWorkflowRuns(id, ctx, useMocks = false) {
  const h = headersFromCtx(ctx);
  const liveFn = () => apiGet(`/api/workflows/${id}/runs`, h);
  const mockFn = async () => [
    { id:'run_001', status:'success', startedAt:'2025-11-05T09:12:00Z', durationMs:4123, impact:{leads:32}},
    { id:'run_002', status:'failed', startedAt:'2025-11-04T09:00:00Z', durationMs:2500, impact:{leads:0}}
  ];

  return useMocks ? mockFn() : safeLiveOrMock(liveFn, mockFn);
}

export function getMode(ctx) {
  return apiGet('/api/mode', ctx);
}

export function setMode(mode, ctx) {
  return apiPost('/api/mode', { mode }, ctx);
}

export function importCsv(file, ctx, useMocks = false) {
  const h = headersFromCtx(ctx);
  const liveFn = () => apiPost('/api/import', { file }, h);
  const mockFn = async () => ({
    ok: true,
    stats: { rows: 25, created: 20, updated: 3, skipped: 2 },
    fileHash: 'mock-hash-' + Date.now(),
    errors: []
  });

  return useMocks ? mockFn() : safeLiveOrMock(liveFn, mockFn);
}

export function buildSegment(spec, ctx, useMocks = false) {
  const h = headersFromCtx(ctx);
  const liveFn = () => apiPost('/api/segments/build', spec, h);
  const mockFn = async () => ({
    ok: true,
    segment: {
      id: 'seg_' + Date.now(),
      count: 42,
      contacts: [
        { id: 'c1', name: 'Jean Dupont', email: 'jean@example.com' },
        { id: 'c2', name: 'Marie Martin', email: 'marie@example.com' }
      ]
    }
  });

  return useMocks ? mockFn() : safeLiveOrMock(liveFn, mockFn);
}

export function triggerN8n(code, mode, payload, ctx) {
  return apiPost('/api/n8n/trigger', { code, mode, payload }, ctx);
}

export function getEnrichmentReports(limit = 20, ctx) {
  return apiGet(`/api/enrichments?limit=${limit}`, ctx);
}

export function getEnrichmentStats(ctx) {
  return apiGet('/api/enrichments/stats', ctx);
}

export function getLeadsModified(limit = 50, ctx) {
  return apiGet(`/api/leads-modified?limit=${limit}`, ctx);
}
