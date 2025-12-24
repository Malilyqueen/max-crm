export function buildHeaders({tenant, role, preview}:{tenant:string; role:string; preview:boolean}) {
  return { 'Content-Type':'application/json', 'X-Tenant':tenant, 'X-Role':role, 'X-Preview': String(preview) };
}

export async function apiGet(path: string, ctx: { apiBase: string; tenant: string; role: string; preview: boolean }) {
  const headers = buildHeaders(ctx);
  const url = `${ctx.apiBase}${path}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

export async function apiPost(path: string, body: any, ctx: { apiBase: string; tenant: string; role: string; preview: boolean }) {
  const headers = buildHeaders(ctx);
  const url = `${ctx.apiBase}${path}`;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

export async function resolveTenant(apiBase: string, headers: Record<string, string>) {
  const url = `${apiBase}/api/resolve-tenant`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Resolve tenant failed: ${res.status}`);
  return res.json();
}