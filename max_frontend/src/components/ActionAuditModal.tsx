import { useEffect, useState } from "react";
import { apiGet } from "../lib/fetchWithHeaders";

export default function ActionAuditModal({ runId, ctx, onClose }:{
  runId:string; ctx:any; onClose:()=>void;
}){
  const [audit, setAudit] = useState<any>(null);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    apiGet(`/api/actions/${runId}/audit`, ctx)
      .then(setAudit)
      .catch(()=>setErr("Audit introuvable"));
  }, [runId]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-macrea-line/60 bg-macrea-card/70 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-bold">Audit du run {runId}</div>
          <button onClick={onClose} className="px-3 py-1 rounded-lg border border-macrea-line/60">Fermer</button>
        </div>
        {!audit && !err && <div className="text-macrea-mute">Chargement…</div>}
        {err && <div className="text-red-300">{err}</div>}
        {audit && (
          <div className="space-y-3 max-h-[60vh] overflow-auto">
            {audit.steps?.map((s:any, i:number)=>(
              <div key={i} className="rounded-xl border border-macrea-line/50 p-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs text-macrea-mute">{s.status}</div>
                </div>
                <div className="text-xs text-macrea-mute">
                  {s.startedAt} → {s.finishedAt} • {s.durationMs ?? "-"} ms
                </div>
                <pre className="mt-2 text-xs overflow-auto bg-macrea-bg2/60 p-2 rounded-lg">
IN: {JSON.stringify(s.in, null, 2)}
                </pre>
                <pre className="mt-2 text-xs overflow-auto bg-macrea-bg2/60 p-2 rounded-lg">
OUT: {JSON.stringify(s.out, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}