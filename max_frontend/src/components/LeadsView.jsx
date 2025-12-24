import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const ORDER = ["hotLeads", "duplicates", "leads"];

const Pill = ({ active, onClick, children, count }) => (
  <button
    onClick={onClick}
    className={
      "px-3 py-2 text-sm rounded-lg transition " +
      (active ? "bg-white/15 text-white" : "bg-white/5 text-white/70 hover:bg-white/10")
    }
  >
    {children}{typeof count === "number" ? ` (${count})` : ""}
  </button>
);

function chooseFirstArray(payload) {
  if (!payload) return { key: null, rows: [] };
  if (Array.isArray(payload)) return { key: "leads", rows: payload };
  for (const k of ORDER) {
    const v = payload[k];
    if (Array.isArray(v) && v.length) return { key: k, rows: v };
  }
  for (const [k, v] of Object.entries(payload)) {
    if (Array.isArray(v) && v.length && typeof v[0] === "object") return { key: k, rows: v };
  }
  return { key: null, rows: [] };
}

const PRIORITY_COLS = ["name","firstName","lastName","email","phone","source","status","interestScore"];

function displayName(r){
  return r?.name || [r?.firstName, r?.lastName].filter(Boolean).join(" ") || "—";
}
function cell(v){
  if (v == null) return "—";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export default function LeadsView(){
  const [data, setData] = useState(null);
  const [tab, setTab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  async function load(){
    setLoading(true);
    try{
      const d = await api.get("/api/leads/analyze"); // ← même route
      setData(d?.ok ? d : d);                        // tolère {ok:true,...} ou objet direct
      const { key } = chooseFirstArray(d);
      setTab(key ?? "leads");
      setMsg("");
    }catch(e){
      setMsg(`Erreur /api/leads/analyze : ${e.message || e}`);
    }finally{
      setLoading(false);
    }
  }
  useEffect(()=>{ load(); }, []);

  const counts = useMemo(()=>({
    hotLeads: Array.isArray(data?.hotLeads) ? data.hotLeads.length : 0,
    duplicates: Array.isArray(data?.duplicates) ? data.duplicates.length : 0,
    leads: Array.isArray(data?.leads) ? data.leads.length : (Array.isArray(data) ? data.length : 0),
  }), [data]);

  const rows = useMemo(()=>{
    if (!data) return [];
    if (tab && Array.isArray(data?.[tab])) return data[tab];
    if (Array.isArray(data)) return data;
    return chooseFirstArray(data).rows;
  }, [data, tab]);

  const columns = useMemo(()=>{
    const set = new Set(PRIORITY_COLS.filter(c => rows.some(r => r?.[c] != null)));
    rows.forEach(r => Object.keys(r||{}).forEach(k => { if (!set.has(k) && !PRIORITY_COLS.includes(k)) set.add(k); }));
    return Array.from(set);
  }, [rows]);

  return (
    <div className="glass rounded-2xl p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Leads</h2>
        <div className="flex gap-2">
          <Pill active={tab==='hotLeads'} onClick={()=>setTab('hotLeads')} count={counts.hotLeads}>Leads chauds</Pill>
          <Pill active={tab==='duplicates'} onClick={()=>setTab('duplicates')} count={counts.duplicates}>Doublons</Pill>
          <Pill active={tab==='leads'} onClick={()=>setTab('leads')} count={counts.leads}>Tous</Pill>
          <button onClick={load} className="btn pill px-3 py-2 rounded-lg hover:bg-white/15">Analyser</button>
        </div>
      </div>

      {/* Résumé si fourni par analyzeLeads() */}
      {data && typeof data === "object" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {"total" in data && (
            <div className="glass rounded-xl p-3">
              <div className="text-xs text-white/60">Total</div>
              <div className="text-lg font-semibold">{data.total ?? "—"}</div>
            </div>
          )}
          {"sources" in data && data.sources && (
            <div className="glass rounded-xl p-3 col-span-2">
              <div className="text-xs text-white/60 mb-1">Sources</div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(data.sources).map(([k,v])=>(
                  <span key={k} className="inline-block text-xs bg-white/10 text-white/90 px-2 py-1 rounded-full mr-2">{k}:{v}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tableau */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-4">Chargement…</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-white/60">
                {columns.map(c => <th key={c} className="text-left py-2 pr-4 whitespace-nowrap">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r,i)=>(
                <tr key={i} className="border-b border-white/10 hover:bg-white/5">
                  {columns.map(c => (
                    <td key={c} className="py-2 pr-4 align-top">
                      {c==='name' ? displayName(r) : cell(r?.[c])}
                    </td>
                  ))}
                </tr>
              ))}
              {!rows.length && (
                <tr><td className="py-4 text-white/60">Aucun lead.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {!!msg && <div className="text-xs text-red-300">{msg}</div>}
    </div>
  );
}
