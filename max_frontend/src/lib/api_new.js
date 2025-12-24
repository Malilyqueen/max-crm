import { apiGet, apiPost } from './fetchWithHeaders';

export function getReporting(ctx) {
  return apiGet('/api/reporting', ctx);
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

export function getDashboard(ctx) {
  return apiGet('/api/dashboard', ctx);
}

export function getWorkflows(ctx) {
  return apiGet('/api/workflows', ctx);
}

export function getWorkflowRuns(id, ctx) {
  return apiGet(`/api/workflows/${id}/runs`, ctx);
}

export function getMode(ctx) {
  return apiGet('/api/mode', ctx);
}

export function setMode(mode, ctx) {
  return apiPost('/api/mode', { mode }, ctx);
}

export function importCsv(file, ctx) {
  // For file upload, need FormData, but for now mock
  return apiPost('/api/import', { file }, ctx);
}

export function buildSegment(spec, ctx) {
  return apiPost('/api/segments/build', spec, ctx);
}

export function triggerN8n(code, mode, payload, ctx) {
  return apiPost('/api/n8n/trigger', { code, mode, payload }, ctx);
}