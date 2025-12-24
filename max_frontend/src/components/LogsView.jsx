import { useEffect, useState } from "react";
import api from "../lib/api";
export default function LogsView(){
  const [list,setList] = useState([]);
  const load = async ()=>{ try{ const r = await api.get("/api/logs"); setList(r.data?.list||[]); }catch{ return null; } };
  useEffect(()=>{ load(); },[]);
  return (
    <div style={{border:"1px solid #e5e5e5",borderRadius:12,padding:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <h3 style={{margin:0}}>Logs</h3>
        <button onClick={load}>Rafraîchir</button>
      </div>
      <ol style={{marginTop:8}}>
        {list.map((it,idx)=>(<li key={idx}><code>{JSON.stringify(it)}</code></li>))}
      </ol>
    </div>
  );
}