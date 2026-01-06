import { create } from 'zustand';
import { getTenant, getRole, getPreviewDefault } from '../lib/tenant';
import { API_BASE_URL } from '../config/api';

interface AppState {
  apiBase: string;
  tenant: string;
  role: string;
  preview: boolean;
  mode: string;
  flags: {
    useMocks: boolean;
    readonly: boolean;
    previewDefault: boolean;
  };
  setTenant: (tenant: string) => void;
  setRole: (role: string) => void;
  setPreview: (preview: boolean) => void;
  refreshMode: () => Promise<void>;
}

// Helper to get flags from env or localStorage
function getFlags(){
  const env = {
    useMocks: import.meta.env.VITE_FLAG_USE_MOCKS === "true",
    workflowsReadonly: import.meta.env.VITE_FLAG_WORKFLOWS_READONLY === "true",
    previewDefault: import.meta.env.VITE_FLAG_PREVIEW_DEFAULT !== "false"
  };
  const over = JSON.parse(localStorage.getItem("max:flags") || "{}");
  return { ...env, ...over };
}

function restoreCtxFromQSOrStorage(){
  const qs = new URLSearchParams(location.search);
  let tenant = qs.get("tenant");
  let role = qs.get("role");
  let preview = qs.get("preview");
  if (!tenant || !role || preview==null){
    const saved = JSON.parse(localStorage.getItem("max:ctx") || "{}");
    tenant = tenant || saved.tenant || "damath";
    role = role || saved.role || "admin";
    preview = (preview==null ? saved.preview : preview);
    if (preview==null) preview = "true";
  }
  return { tenant: tenant || "damath", role: role || "admin", preview: preview==="true" };
}

function persistCtx(ctx:any){
  localStorage.setItem("max:ctx", JSON.stringify({ tenant:ctx.tenant, role:ctx.role, preview:ctx.preview }));
}

// Quand une réponse back contient un tenant/role "confirmés",
// ne jamais overwriter avec localStorage.
export function applyServerCtxIfPresent(set: any, get: any, resp:any){
  if (!resp) return;
  const t = resp?.tenant || resp?.ctx?.tenant;
  const r = resp?.role   || resp?.ctx?.role;
  const p = typeof resp?.preview === "boolean" ? resp.preview : resp?.ctx?.preview;
  if (t || r || (p !== undefined)) {
    set({ tenant: t || get().tenant, role: r || get().role, preview: (p !== undefined) ? p : get().preview });
  }
}

export const useAppCtx = create<AppState>((set, get) => {
  // Initialize context from QS or storage
  const initialCtx = typeof window !== 'undefined' ? restoreCtxFromQSOrStorage() : { tenant: 'damath', role: 'admin', preview: true };

  return {
    apiBase: API_BASE_URL,
    tenant: initialCtx.tenant,
    role: initialCtx.role,
    preview: initialCtx.preview,
    mode: 'assist',
    flags: getFlags(),
    setTenant: (tenant) => {
      set({ tenant });
      // Persist to localStorage
      const state = get();
      persistCtx({ tenant: state.tenant, role: state.role, preview: state.preview });
    },
    setRole: (role) => {
      set({ role });
      // Persist to localStorage
      const state = get();
      persistCtx({ tenant: state.tenant, role: state.role, preview: state.preview });
    },
    setPreview: (preview) => {
      set({ preview });
      // Persist to localStorage
      const state = get();
      persistCtx({ tenant: state.tenant, role: state.role, preview: state.preview });
    },
    refreshMode: async () => {
      try {
        const { apiBase, tenant, role, preview } = get();
        const ctx = { apiBase, tenant, role, preview };
        const res = await import('../lib/api').then(m => m.getMode(ctx));
        if (res.ok) {
          set({ mode: res.mode });
        }
      } catch (err) {
        console.error('Failed to refresh mode:', err);
      }
    },
  };
});