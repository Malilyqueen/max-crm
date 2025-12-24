import { useState } from "react";
import api from "../lib/api";
export default function TagApply(){
  const [leadId,setLeadId] = useState("");
  const [tags,setTags] = useState("#panier_abandonné #relance_H+24");
  const [resp,setResp] = useState(null);
  const [loading,setLoading] = useState(false);
  const toArray = (s)=> s.split(/\s+/).filter(Boolean);
  const onApply = async ()=>{
    setLoading(true);
    setResp(null);
    try{
      const r = await api.post("/api/tags/apply",{ id:leadId, tags: toArray(tags) });
      setResp(r.data);
    }catch(e){
      setResp({ ok:false, error:e?.response?.data?.error || String(e) });
    }finally{ setLoading(false); }
  };
  return (
    <div style={{border:"1px solid #e5e5e5",borderRadius:12,padding:16,marginBottom:16}}>
      <h3 style={{marginTop:0}}>Appliquer des tags</h3>
      <input value={leadId} onChange={e=>setLeadId(e.target.value)} placeholder="ID du Lead (Espo)" style={{width:"100%",marginBottom:8}} />
      <input value={tags} onChange={e=>setTags(e.target.value)} placeholder="Tags séparés par espace" style={{width:"100%",marginBottom:8}} />
      <button onClick={onApply} disabled={loading || !leadId}>{loading?"Application...":"Appliquer"}</button>
      {resp && <pre style={{marginTop:10,whiteSpace:"pre-wrap"}}>{JSON.stringify(resp,null,2)}</pre>}
    </div>
  );
}