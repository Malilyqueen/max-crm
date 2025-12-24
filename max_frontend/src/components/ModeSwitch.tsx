import { useEffect, useState } from "react";
import { getMode, setMode } from "../lib/api";
import { useAppCtx } from "../store/useAppCtx";

export function ModeSwitch(){
  const ctx = useAppCtx();
  const [mode, setModeState] = useState<"assist"|"auto">("assist");
  const isAdmin = (ctx.role || "").toLowerCase() === "admin";

  useEffect(() => {
    getMode(ctx).then(r => r?.mode && setModeState(r.mode)).catch(()=>{});
  }, [ctx.tenant]);

  async function onSet(m:"assist"|"auto"){
    if (!isAdmin && m==="auto") return alert("Seul admin peut activer AUTO.");
    const r = await setMode(m, ctx);
    if (r?.ok) {
      setModeState(r.mode);
      localStorage.setItem("max:mode", r.mode);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={()=>onSet("assist")} className={`px-3 py-1 rounded-lg border ${mode==="assist"?"bg-white/5":""}`}>Assist</button>
      <button onClick={()=>onSet("auto")} className={`px-3 py-1 rounded-lg border ${mode==="auto"?"bg-white/5":""}`} disabled={!isAdmin}>Auto</button>
      {mode==="auto" && <span className="badge-chip">AUTO</span>}
    </div>
  );
}