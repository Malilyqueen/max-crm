import { useState } from "react";
import api from "../lib/api";
export default function TagSuggest(){
  const [text,setText] = useState("");
  const [tags,setTags] = useState([]);
  const [loading,setLoading] = useState(false);
  const onSuggest = async ()=>{
    setLoading(true);
    try{
      const r = await api.post("/api/tags/suggest", { text });
      setTags(r.data?.tags || []);
    }finally{ setLoading(false); }
  };
  return (
    <div style={{border:"1px solid #e5e5e5",borderRadius:12,padding:16,marginBottom:16}}>
      <h3 style={{marginTop:0}}>Suggérer des tags</h3>
      <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Ex: client a abandonné son panier hier" style={{width:"100%",minHeight:80,marginBottom:8}} />
      <button onClick={onSuggest} disabled={loading}>{loading?"Analyse...":"Suggérer"}</button>
      {tags.length>0 && (
        <div style={{marginTop:10}}>
          <strong>Proposés:</strong> {tags.join(" ")}
        </div>
      )}
    </div>
  );
}