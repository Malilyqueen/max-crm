import { useState } from "react";
import api from "../lib/api";
export default function TriggerPanel(){
  const [message,setMessage] = useState("client a abandonné panier");
  const [context,setContext] = useState("ecommerce");
  const [resp,setResp] = useState(null);
  const onTrigger = async ()=>{
    setResp(null);
    try{
      const r = await api.post("/api/trigger",{ message, context });
      setResp(r.data);
    }catch(e){
      setResp({ ok:false, error:e?.response?.data?.error || String(e) });
    }
  };
  return (
    <div style={{border:"1px solid #e5e5e5",borderRadius:12,padding:16,marginBottom:16}}>
      <h3 style={{marginTop:0}}>Déclencher n8n</h3>
      <select value={context} onChange={e=>setContext(e.target.value)} style={{marginBottom:8}}>
        <option value="ecommerce">e-commerce</option>
        <option value="logistique">logistique</option>
        <option value="coach">coach</option>
      </select>
      <input value={message} onChange={e=>setMessage(e.target.value)} style={{width:"100%",marginBottom:8}} />
      <button onClick={onTrigger}>Déclencher</button>
      {resp && <pre style={{marginTop:10,whiteSpace:"pre-wrap"}}>{JSON.stringify(resp,null,2)}</pre>}
    </div>
  );
}