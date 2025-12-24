import { useEffect, useState } from "react";
import api from "../lib/api";
import ModeBadge from "./ModeBadge";
export default function BrainStatus(){
  const [data,setData] = useState({ ok:false, brains:[], mode:"assist" });
  useEffect(()=>{ api.get("/api/brain/status").then(r=>setData(r.data)).catch(()=>{}); },[]);
  return (
    <div style={{border:"1px solid #e5e5e5",borderRadius:12,padding:16,marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <h3 style={{margin:0}}>Cerveau M.A.X.</h3>
        <ModeBadge mode={data.mode}/>
      </div>
      <div style={{marginTop:8,opacity:0.8}}>Actifs: {data.brains?.join(", ")||"–"}</div>
    </div>
  );
}